import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    DeviceEventEmitter,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { loadTabOrder, saveTabOrder, TAB_ORDER_CHANGED } from '../utils/orderPreferences';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import GradientBackground from '../components/GradientBackground';
import { Colors, FontSize, Radii, Spacing } from '../config/theme';
import { storageGet, storageRemove, storageSet } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemeMode } from '../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppSettings = {
    calcHistoryLimit: number;
    calcHistoryBoxHeight: number;
    defaultTab: string;
    metalCacheTtlHours: number;
    metalDutyFactor: number;
    autoRefreshJobs: boolean;
    jobsResultLimit: number;
    appName: string;
    showTechNewsOnOpen: boolean;
    // Appearance
    fontSize: 'Small' | 'Default' | 'Large';
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    // Privacy
    clipboardClearSeconds: number;  // 0 = disabled
    // Jobs
    jobAlertKeywords: string;       // comma-separated
    hideSalarylesJobs: boolean;
    // Notifications
    jobsNotifyEnabled: boolean;
    // Events
    eventNotifyHour: number;
    eventNotifyMinute: number;
    eventNotifyDaysBefore: number;
    cloudSyncUrl: string;
    // UX
    hapticFeedback: boolean;
};

const DEFAULTS: AppSettings = {
    calcHistoryLimit: 50,
    calcHistoryBoxHeight: 130,
    defaultTab: 'standard',
    metalCacheTtlHours: 6,
    metalDutyFactor: 1.1495,
    autoRefreshJobs: true,
    jobsResultLimit: 50,
    appName: 'My Calc',
    showTechNewsOnOpen: false,
    fontSize: 'Default',
    dateFormat: 'DD/MM/YYYY',
    clipboardClearSeconds: 30,
    jobAlertKeywords: 'React, Node.js',
    hideSalarylesJobs: false,
    jobsNotifyEnabled: false,
    eventNotifyHour: 8,
    eventNotifyMinute: 0,
    eventNotifyDaysBefore: 3,
    cloudSyncUrl: '',
    hapticFeedback: true,
};

const STORAGE_KEY = 'app_settings_v1';

// Tab definitions for reorder UI (mirrors App.tsx USER_ROUTES)
const ALL_TABS: { key: string; title: string }[] = [
    { key: 'standard',  title: 'Standard'    },
    { key: 'events',    title: '📅 Events'    },
    { key: 'tools',     title: 'Tools'       },
    { key: 'passwords', title: '🔐 Vault'     },
    { key: 'documents', title: '📁 Docs'      },
    { key: 'units',     title: '📐 Units'     },
    { key: 'metals',    title: 'Metals'      },
    { key: 'currency',  title: '🌍 Currency'  },
    { key: 'news',      title: '📰 Tech'      },
    { key: 'profile',   title: '👤 Profile'   },
    { key: 'jobs',      title: '💼 Jobs'      },
    { key: 'settings',  title: '⚙️ Settings'  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsScreen({ onSignOut }: { onSignOut?: () => void }) {
    const { themeMode, setThemeMode } = useTheme();
    const [settings, setSettings]     = useState<AppSettings>(DEFAULTS);
    const [savedAt,  setSavedAt]      = useState<number | null>(null);
    const [tabOrder, setTabOrder]     = useState<string[]>(ALL_TABS.map(t => t.key));
    const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load on mount
    useEffect(() => {
        storageGet<AppSettings>(STORAGE_KEY).then(data => {
            if (data) setSettings({ ...DEFAULTS, ...data });
        });
        loadTabOrder().then(saved => {
            if (saved && saved.length >= ALL_TABS.length) setTabOrder(saved);
        });
    }, []);

    // Auto-hide toast
    useEffect(() => {
        if (savedAt === null) return;
        if (hideToastRef.current) clearTimeout(hideToastRef.current);
        hideToastRef.current = setTimeout(() => setSavedAt(null), 2000);
    }, [savedAt]);

    // ── Save helpers ──────────────────────────────────────────────────────────

    const saveImmediate = useCallback(async (next: AppSettings) => {
        await storageSet(STORAGE_KEY, next);
        setSavedAt(Date.now());
    }, []);

    const saveDebounced = useCallback((next: AppSettings) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => saveImmediate(next), 300);
    }, [saveImmediate]);

    const updateImmediate = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        const next = { ...settings, [key]: value };
        setSettings(next);
        saveImmediate(next);
    };

    const updateDebounced = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        const next = { ...settings, [key]: value };
        setSettings(next);
        saveDebounced(next);
    };

    // ── Stepper ───────────────────────────────────────────────────────────────

    const stepper = (
        key: keyof AppSettings,
        value: number,
        min: number,
        max: number,
        step: number,
        suffix?: string,
    ) => (
        <View style={styles.stepperRow}>
            <TouchableOpacity
                style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
                onPress={() => {
                    if (value > min) updateImmediate(key, (value - step) as AppSettings[typeof key]);
                }}
                activeOpacity={0.7}
            >
                <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{value}{suffix ?? ''}</Text>
            <TouchableOpacity
                style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
                onPress={() => {
                    if (value < max) updateImmediate(key, (value + step) as AppSettings[typeof key]);
                }}
                activeOpacity={0.7}
            >
                <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
        </View>
    );

    // ── Duty factor percentage display ────────────────────────────────────────

    const dutyPct = ((settings.metalDutyFactor - 1) * 100).toFixed(2) + '%';

    // ── Data management actions ───────────────────────────────────────────────

    const clearCalcHistory = () => {
        storageSet('calc_history_standard_v1', []).then(() => setSavedAt(Date.now()));
    };

    const clearMetalHistory = () => {
        storageRemove('metal_rates_history_v2').then(() => setSavedAt(Date.now()));
    };

    const clearMetalCache = () => {
        storageRemove('metal_rates_cache_v1').then(() => setSavedAt(Date.now()));
    };

    const exportData = async () => {
        try {
            const keys = [
                'calc_history_standard_v1',
                'user_profile_v1',
                'app_settings_v1',
                'metal_rates_history_v2',
            ];
            const pairs = await AsyncStorage.multiGet(keys);
            const obj: Record<string, any> = {};
            for (const [k, v] of pairs) {
                try { obj[k] = v ? JSON.parse(v) : null; } catch { obj[k] = v; }
            }
            const json = JSON.stringify(obj, null, 2);
            const path = (FileSystem.cacheDirectory ?? '') + 'mycalc_export.json';
            await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
            await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export App Data' });
        } catch (err: any) {
            Alert.alert('Export Failed', err?.message ?? 'Could not export data.');
        }
    };

    const moveTab = (idx: number, dir: -1 | 1) => {
        const swap = idx + dir;
        if (swap < 0 || swap >= tabOrder.length) return;
        const next = [...tabOrder];
        [next[idx], next[swap]] = [next[swap], next[idx]];
        setTabOrder(next);
        saveTabOrder(next).then(() => {
            DeviceEventEmitter.emit(TAB_ORDER_CHANGED);
            setSavedAt(Date.now());
        });
    };

    const clearAllData = () => {
        Alert.alert(
            'Clear All App Data',
            'This will erase calculator history, metal cache, profile, and settings. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        const keys = [
                            'calc_history_standard_v1',
                            'metal_rates_cache_v1',
                            'metal_rates_history_v2',
                            'user_profile_v1',
                            'app_settings_v1',
                            'password_manager_v1',
                        ];
                        try {
                            await AsyncStorage.multiRemove(keys);
                        } catch {}
                        setSettings(DEFAULTS);
                        setSavedAt(Date.now());
                    },
                },
            ],
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <GradientBackground>
            {/* Saved toast */}
            {savedAt !== null && (
                <View style={styles.toast}>
                    <Text style={styles.toastText}>✓ Settings saved</Text>
                </View>
            )}

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.pageTitle}>⚙️ Settings</Text>

                {/* ── Calculator ────────────────────────────────────────── */}
                <SectionHeader label="Calculator" />
                <View style={styles.card}>
                    <SettingRow label="History Limit">
                        {stepper('calcHistoryLimit', settings.calcHistoryLimit, 10, 200, 10)}
                    </SettingRow>
                    <Divider />
                    <SettingRow label="History Box Height">
                        {stepper('calcHistoryBoxHeight', settings.calcHistoryBoxHeight, 80, 320, 20, 'px')}
                    </SettingRow>
                    <Divider />
                    <SettingRow label="Default Tab">
                        <Text style={styles.infoValue}>{settings.defaultTab}</Text>
                    </SettingRow>
                </View>

                {/* ── Metals & Rates ────────────────────────────────────── */}
                <SectionHeader label="Metals & Rates" />
                <View style={styles.card}>
                    <SettingRow label="Cache Duration">
                        {stepper('metalCacheTtlHours', settings.metalCacheTtlHours, 1, 24, 1, 'h')}
                    </SettingRow>
                    <Divider />
                    <View style={styles.dutyRow}>
                        <View style={styles.dutyLeft}>
                            <Text style={styles.rowLabel}>India Duty Factor</Text>
                            <Text style={styles.helperText}>BCD 6% + AIDC 5% + GST 3% = 1.1495</Text>
                        </View>
                        <View style={styles.dutyInputWrap}>
                            <TextInput
                                style={styles.dutyInput}
                                value={String(settings.metalDutyFactor)}
                                onChangeText={v => {
                                    const num = parseFloat(v);
                                    if (!isNaN(num) && num >= 1.0 && num <= 1.5) {
                                        updateDebounced('metalDutyFactor', parseFloat(num.toFixed(4)));
                                    } else {
                                        // Allow partial typing
                                        const next = { ...settings, metalDutyFactor: settings.metalDutyFactor };
                                        setSettings(prev => ({ ...prev, metalDutyFactor: parseFloat(v) || prev.metalDutyFactor }));
                                    }
                                }}
                                keyboardType="decimal-pad"
                                placeholder="1.1495"
                                placeholderTextColor={Colors.text.muted}
                            />
                            <Text style={styles.dutyPct}>{dutyPct}</Text>
                        </View>
                    </View>
                    <Divider />
                    <TouchableOpacity
                        style={styles.dangerOutlineBtn}
                        onPress={clearMetalCache}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.dangerOutlineBtnText}>Force Clear Cache</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Jobs & Profile ────────────────────────────────────── */}
                <SectionHeader label="Jobs & Profile" />
                <View style={styles.card}>
                    <SettingRow label="Auto-refresh Jobs">
                        <Switch
                            value={settings.autoRefreshJobs}
                            onValueChange={v => updateImmediate('autoRefreshJobs', v)}
                            trackColor={{ false: Colors.inputBorder, true: Colors.accentSoft }}
                            thumbColor={settings.autoRefreshJobs ? Colors.accent : Colors.text.muted}
                        />
                    </SettingRow>
                    <Divider />
                    <SettingRow label="Jobs Result Limit">
                        {stepper('jobsResultLimit', settings.jobsResultLimit, 10, 100, 10)}
                    </SettingRow>
                </View>

                {/* ── App ──────────────────────────────────────────────── */}
                <SectionHeader label="App" />
                <View style={styles.card}>
                    <SettingRow label="App Name">
                        <TextInput
                            style={styles.inlineInput}
                            value={settings.appName}
                            onChangeText={v => updateDebounced('appName', v)}
                            placeholder="My Calc"
                            placeholderTextColor={Colors.text.muted}
                            returnKeyType="done"
                        />
                    </SettingRow>
                    <Divider />
                    <SettingRow label="Show Tech News on Open">
                        <Switch
                            value={settings.showTechNewsOnOpen}
                            onValueChange={v => updateImmediate('showTechNewsOnOpen', v)}
                            trackColor={{ false: Colors.inputBorder, true: Colors.accentSoft }}
                            thumbColor={settings.showTechNewsOnOpen ? Colors.accent : Colors.text.muted}
                        />
                    </SettingRow>
                </View>

                {/* ── Appearance ───────────────────────────────────────── */}
                <SectionHeader label="Appearance" />
                <View style={styles.card}>
                    {/* Theme */}
                    <View style={styles.chipSettingRow}>
                        <View>
                            <Text style={styles.rowLabel}>Theme</Text>
                            <Text style={styles.helperText}>Dark, Light, or follow device setting</Text>
                        </View>
                    </View>
                    <View style={[styles.chipRowInline, { marginTop: 6, marginBottom: 4 }]}>
                        {([
                            { key: 'dark',   label: '🌙 Dark'   },
                            { key: 'light',  label: '☀️ Light'  },
                            { key: 'system', label: '📱 System' },
                        ] as { key: ThemeMode; label: string }[]).map(opt => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[styles.optChip, themeMode === opt.key && styles.optChipActive]}
                                onPress={() => setThemeMode(opt.key)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.optChipText, themeMode === opt.key && styles.optChipTextActive]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Divider />
                    <View style={styles.chipSettingRow}>
                        <Text style={styles.rowLabel}>Font Size</Text>
                        <View style={styles.chipRowInline}>
                            {(['Small', 'Default', 'Large'] as const).map(opt => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[styles.optChip, settings.fontSize === opt && styles.optChipActive]}
                                    onPress={() => updateImmediate('fontSize', opt)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.optChipText, settings.fontSize === opt && styles.optChipTextActive]}>
                                        {opt}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    <Divider />
                    <View style={styles.chipSettingRow}>
                        <Text style={styles.rowLabel}>Date Format</Text>
                        <View style={styles.chipRowInline}>
                            {(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const).map(opt => (
                                <TouchableOpacity
                                    key={opt}
                                    style={[styles.optChip, settings.dateFormat === opt && styles.optChipActive]}
                                    onPress={() => updateImmediate('dateFormat', opt)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.optChipText, settings.dateFormat === opt && styles.optChipTextActive]}>
                                        {opt}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* ── Privacy ──────────────────────────────────────────── */}
                <SectionHeader label="Privacy" />
                <View style={styles.card}>
                    <View style={styles.chipSettingRow}>
                        <View>
                            <Text style={styles.rowLabel}>Auto-clear Clipboard</Text>
                            <Text style={styles.helperText}>Clear copied results after N seconds (0 = off)</Text>
                        </View>
                    </View>
                    <View style={{ height: Spacing.sm }} />
                    {stepper('clipboardClearSeconds', settings.clipboardClearSeconds, 0, 120, 10, 's')}
                </View>

                {/* ── Jobs (extended) ───────────────────────────────────── */}
                <SectionHeader label="Job Alerts" />
                <View style={styles.card}>
                    <View style={styles.chipSettingRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowLabel}>Alert Keywords</Text>
                            <Text style={styles.helperText}>Comma-separated (e.g. React, Node.js, Senior)</Text>
                        </View>
                    </View>
                    <TextInput
                        style={[styles.inlineInput, { marginTop: Spacing.sm, flex: 0, width: '100%' }]}
                        value={settings.jobAlertKeywords}
                        onChangeText={v => updateDebounced('jobAlertKeywords', v)}
                        placeholder="React, Node.js, Senior"
                        placeholderTextColor={Colors.text.muted}
                        returnKeyType="done"
                    />
                    <Divider />
                    <SettingRow label="Hide Jobs Without Salary">
                        <Switch
                            value={settings.hideSalarylesJobs}
                            onValueChange={v => updateImmediate('hideSalarylesJobs', v)}
                            trackColor={{ false: Colors.inputBorder, true: Colors.accentSoft }}
                            thumbColor={settings.hideSalarylesJobs ? Colors.accent : Colors.text.muted}
                        />
                    </SettingRow>
                </View>

                {/* ── Events & Reminders ───────────────────────────────── */}
                <SectionHeader label="Events & Reminders" />
                <View style={styles.card}>
                    <View style={styles.chipSettingRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowLabel}>Daily Notification Time</Text>
                            <Text style={styles.helperText}>When to get your morning event reminder</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: Spacing.sm }}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.helperText, { marginBottom: 4 }]}>Hour (0–23)</Text>
                            {stepper('eventNotifyHour', settings.eventNotifyHour, 0, 23, 1)}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.helperText, { marginBottom: 4 }]}>Minute</Text>
                            {stepper('eventNotifyMinute', settings.eventNotifyMinute, 0, 55, 5)}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.helperText, { marginBottom: 4 }]}>Days ahead</Text>
                            {stepper('eventNotifyDaysBefore', settings.eventNotifyDaysBefore, 0, 14, 1)}
                        </View>
                    </View>
                    <Divider />
                    <View style={styles.chipSettingRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rowLabel}>☁️ Cloud Sync URL</Text>
                            <Text style={styles.helperText}>Firebase Realtime DB URL for event backup</Text>
                        </View>
                    </View>
                    <TextInput
                        style={[styles.inlineInput, { marginTop: Spacing.sm, flex: 0, width: '100%', fontSize: 12 }]}
                        value={settings.cloudSyncUrl}
                        onChangeText={v => updateDebounced('cloudSyncUrl', v.trim())}
                        placeholder="https://your-app.firebaseio.com"
                        placeholderTextColor={Colors.text.muted}
                        autoCapitalize="none"
                        keyboardType="url"
                        returnKeyType="done"
                    />
                    <Text style={[styles.helperText, { marginTop: 6, lineHeight: 16 }]}>
                        Setup: firebase.google.com → New project → Realtime Database (test mode) → copy URL
                    </Text>
                </View>

                {/* ── Haptic Feedback ──────────────────────────────────── */}
                <SectionHeader label="Touch & Feedback" />
                <View style={styles.card}>
                    <SettingRow label="Haptic Feedback">
                        <Switch
                            value={settings.hapticFeedback}
                            onValueChange={v => updateImmediate('hapticFeedback', v)}
                            trackColor={{ false: Colors.inputBorder, true: Colors.accentSoft }}
                            thumbColor={settings.hapticFeedback ? Colors.accent : Colors.text.muted}
                        />
                    </SettingRow>
                    <View style={styles.hapticHint}>
                        <Text style={styles.helperText}>Vibration on button presses and actions</Text>
                    </View>
                </View>

                {/* ── Menu Order ───────────────────────────────────────── */}
                <SectionHeader label="Menu Tab Order" />
                <View style={styles.card}>
                    <View style={styles.reorderHeaderRow}>
                        <Text style={styles.helperText}>Drag ▲ ▼ to reorder the top navigation tabs</Text>
                    </View>
                    {tabOrder.map((key, idx) => {
                        const tab = ALL_TABS.find(t => t.key === key);
                        if (!tab) return null;
                        return (
                            <View key={key}>
                                <View style={styles.tabOrderRow}>
                                    <View style={styles.tabOrderArrows}>
                                        <TouchableOpacity
                                            onPress={() => moveTab(idx, -1)}
                                            style={[styles.tabArrowBtn, idx === 0 && styles.tabArrowBtnDisabled]}
                                            disabled={idx === 0}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.tabArrowText}>▲</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => moveTab(idx, 1)}
                                            style={[styles.tabArrowBtn, idx === tabOrder.length - 1 && styles.tabArrowBtnDisabled]}
                                            disabled={idx === tabOrder.length - 1}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.tabArrowText}>▼</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={styles.tabOrderLabel}>{tab.title}</Text>
                                    <Text style={styles.tabOrderIndex}>{idx + 1}</Text>
                                </View>
                                {idx < tabOrder.length - 1 && <Divider />}
                            </View>
                        );
                    })}
                </View>

                {/* ── Data Management ──────────────────────────────────── */}
                <SectionHeader label="Data Management" />
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.exportBtn}
                        onPress={exportData}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.exportBtnText}>📤 Export All Data (JSON)</Text>
                    </TouchableOpacity>
                    <View style={{ height: Spacing.sm }} />
                    <TouchableOpacity
                        style={styles.dangerBtn}
                        onPress={() => {
                            Alert.alert('Clear Calculator History', 'This will erase all calculation history.', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Clear', style: 'destructive', onPress: clearCalcHistory },
                            ]);
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.dangerBtnText}>Clear Calculator History</Text>
                    </TouchableOpacity>
                    <View style={{ height: Spacing.sm }} />
                    <TouchableOpacity
                        style={styles.dangerBtn}
                        onPress={() => {
                            Alert.alert('Clear Metal Rate History', 'Remove stored rate history?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Clear', style: 'destructive', onPress: clearMetalHistory },
                            ]);
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.dangerBtnText}>Clear Metal Rate History</Text>
                    </TouchableOpacity>
                    <View style={{ height: Spacing.sm }} />
                    <TouchableOpacity
                        style={[styles.dangerBtn, styles.dangerBtnDark]}
                        onPress={clearAllData}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.dangerBtnText}>⚠ Clear All App Data</Text>
                    </TouchableOpacity>
                </View>

                {/* ── About ────────────────────────────────────────────── */}
                <SectionHeader label="About" />
                <View style={styles.card}>
                    <AboutRow label="Version" value="1.0.0" />
                    <Divider />
                    <AboutRow label="Developer" value="Franklin" />
                    <Divider />
                    <AboutRow label="Built with" value="React Native · Expo SDK 48" />
                    <Divider />
                    <AboutRow label="Rates powered by" value="metals.live · open.er-api.com · frankfurter.app" />
                    <Divider />
                    <AboutRow label="Jobs powered by" value="Remotive.com" />
                </View>

                {/* ── Account ──────────────────────────────────────────── */}
                {onSignOut && (
                    <>
                        <SectionHeader label="Account" />
                        <TouchableOpacity
                            style={[styles.dangerBtn, { backgroundColor: '#1e293b', borderWidth: 1, borderColor: Colors.error }]}
                            onPress={() =>
                                Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Sign Out', style: 'destructive', onPress: onSignOut },
                                ])
                            }
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.dangerBtnText, { color: Colors.error }]}>Sign Out</Text>
                        </TouchableOpacity>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </GradientBackground>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
    return <Text style={styles.sectionHeader}>{label.toUpperCase()}</Text>;
}

function Divider() {
    return <View style={styles.divider} />;
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={styles.settingRow}>
            <Text style={styles.rowLabel}>{label}</Text>
            {children}
        </View>
    );
}

function AboutRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{label}</Text>
            <Text style={styles.aboutValue}>{value}</Text>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    container: {
        padding: Spacing.xl,
        paddingTop: Spacing.xxl,
    },

    pageTitle: {
        color: Colors.text.primary,
        fontSize: FontSize.xl,
        fontWeight: '700',
        marginBottom: Spacing.xxl,
    },

    // Toast
    toast: {
        position: 'absolute',
        top: Spacing.xl,
        alignSelf: 'center',
        backgroundColor: Colors.accent,
        borderRadius: Radii.lg,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        zIndex: 999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    toastText: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: '700',
    },

    // Section header
    sectionHeader: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: Spacing.sm,
        marginTop: Spacing.xl,
    },

    // Card
    card: {
        backgroundColor: Colors.card,
        borderRadius: Radii.xl,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.sm,
    },

    // Setting row
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.lg,
    },
    rowLabel: {
        color: Colors.text.primary,
        fontSize: FontSize.body,
        flex: 1,
    },
    infoValue: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: Colors.divider,
    },

    // Stepper
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    stepBtn: {
        width: 32,
        height: 32,
        borderRadius: Radii.sm,
        borderWidth: 1,
        borderColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepBtnDisabled: {
        borderColor: Colors.inputBorder,
        opacity: 0.4,
    },
    stepBtnText: {
        color: Colors.accent,
        fontSize: FontSize.lg,
        fontWeight: '700',
        lineHeight: FontSize.lg + 2,
    },
    stepperValue: {
        color: Colors.text.primary,
        fontSize: FontSize.sm,
        fontWeight: '600',
        minWidth: 40,
        textAlign: 'center',
    },

    // Inline input
    inlineInput: {
        backgroundColor: Colors.input,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs + 2,
        color: Colors.text.primary,
        fontSize: FontSize.sm,
        minWidth: 100,
        textAlign: 'right',
    },

    // Duty row
    dutyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.lg,
    },
    dutyLeft: { flex: 1, marginRight: Spacing.md },
    helperText: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    dutyInputWrap: { alignItems: 'flex-end', gap: 4 },
    dutyInput: {
        backgroundColor: Colors.input,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs + 2,
        color: Colors.text.primary,
        fontSize: FontSize.sm,
        width: 90,
        textAlign: 'right',
    },
    dutyPct: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
    },

    // Danger buttons
    dangerBtn: {
        backgroundColor: Colors.error,
        borderRadius: Radii.md,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    dangerBtnDark: {
        backgroundColor: '#7f1d1d',
    },
    dangerBtnText: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
    dangerOutlineBtn: {
        borderWidth: 1,
        borderColor: Colors.error,
        borderRadius: Radii.md,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        marginVertical: Spacing.sm,
    },
    dangerOutlineBtnText: {
        color: Colors.error,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },

    // Resume section
    resumeCard: {
        backgroundColor: Colors.card,
        borderRadius: Radii.xl,
        borderWidth: 1,
        borderColor: Colors.accent + '40',
        padding: Spacing.xl,
        marginBottom: Spacing.sm,
        gap: Spacing.md,
    },
    resumeRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    },
    resumeIcon: {
        width: 48, height: 48,
        borderRadius: Radii.md,
        backgroundColor: Colors.accentSoft,
        alignItems: 'center', justifyContent: 'center',
    },
    resumeName: {
        color: Colors.text.primary,
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
    resumeMeta: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    resumeRemoveBtn: {
        padding: 6,
    },
    resumeRemoveText: {
        color: Colors.text.muted,
        fontSize: FontSize.body,
    },
    resumeEmpty: {
        color: Colors.text.muted,
        fontSize: FontSize.sm,
        lineHeight: 20,
    },
    resumeUploadBtn: {
        backgroundColor: Colors.accent,
        borderRadius: Radii.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    resumeUploadText: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
    detectedSkillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    detectedSkillChip: {
        backgroundColor: Colors.accent + '20',
        borderRadius: Radii.xl,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: Colors.accent + '50',
    },
    detectedSkillText: {
        color: Colors.accent,
        fontSize: FontSize.xs,
        fontWeight: '600',
    },

    // Export button
    exportBtn: {
        backgroundColor: Colors.accentSoft,
        borderRadius: Radii.md,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.accent + '40',
    },
    exportBtnText: {
        color: Colors.accent,
        fontSize: FontSize.sm,
        fontWeight: '700',
    },

    // Chip option row (for font size, date format)
    chipSettingRow: {
        paddingVertical: Spacing.lg,
    },
    chipRowInline: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: Spacing.sm,
    },
    optChip: {
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: Radii.xl,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    optChipActive: {
        backgroundColor: Colors.accent,
        borderColor: Colors.accent,
    },
    optChipText: {
        color: Colors.text.secondary,
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    optChipTextActive: {
        color: '#fff',
    },

    // Haptic hint
    hapticHint: {
        paddingBottom: Spacing.sm,
    },

    // Tab order reorder
    reorderHeaderRow: {
        paddingVertical: Spacing.lg,
    },
    tabOrderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    tabOrderArrows: {
        flexDirection: 'row',
        gap: 4,
        marginRight: Spacing.md,
    },
    tabArrowBtn: {
        width: 26,
        height: 26,
        borderRadius: Radii.sm,
        backgroundColor: Colors.input,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabArrowBtnDisabled: {
        opacity: 0.2,
    },
    tabArrowText: {
        color: Colors.accent,
        fontSize: 11,
        fontWeight: '700',
    },
    tabOrderLabel: {
        flex: 1,
        color: Colors.text.primary,
        fontSize: FontSize.body,
    },
    tabOrderIndex: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        minWidth: 20,
        textAlign: 'right',
    },

    // About
    aboutRow: {
        paddingVertical: Spacing.lg,
    },
    aboutLabel: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        marginBottom: 2,
    },
    aboutValue: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
    },
});
