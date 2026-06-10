import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import { Colors, FontSize, Radii, Spacing } from '../config/theme';
import { storageGet, storageRemove, storageSet } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickAndParseResume } from '../utils/resumeParser';
import type { ParsedResume } from '../utils/resumeParser';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppSettings = {
    calcHistoryLimit: number;
    defaultTab: string;
    metalCacheTtlHours: number;
    metalDutyFactor: number;
    autoRefreshJobs: boolean;
    jobsResultLimit: number;
    appName: string;
    showTechNewsOnOpen: boolean;
};

const DEFAULTS: AppSettings = {
    calcHistoryLimit: 50,
    defaultTab: 'standard',
    metalCacheTtlHours: 6,
    metalDutyFactor: 1.1495,
    autoRefreshJobs: true,
    jobsResultLimit: 50,
    appName: 'My Calc',
    showTechNewsOnOpen: false,
};

const STORAGE_KEY = 'app_settings_v1';

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
    const [settings, setSettings]     = useState<AppSettings>(DEFAULTS);
    const [savedAt,  setSavedAt]      = useState<number | null>(null);
    const [resume,   setResume]       = useState<ParsedResume | null>(null);
    const [parsing,  setParsing]      = useState(false);
    const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load saved resume info on mount
    useEffect(() => {
        storageGet<ParsedResume>('user_resume_v1').then(r => { if (r) setResume(r); });
    }, []);

    // Load on mount
    useEffect(() => {
        storageGet<AppSettings>(STORAGE_KEY).then(data => {
            if (data) setSettings({ ...DEFAULTS, ...data });
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

    // ── Resume upload & auto-fill ─────────────────────────────────────────────
    const uploadResume = async () => {
        setParsing(true);
        try {
            const parsed = await pickAndParseResume();
            if (!parsed) { setParsing(false); return; }

            // Store the resume metadata (not the full base64 to save space)
            const toSave: ParsedResume = { ...parsed };
            await storageSet('user_resume_v1', toSave);
            setResume(toSave);

            // Auto-fill profile from resume
            const existingProfile = await storageGet<any>('user_profile_v1') ?? {};
            const updatedProfile = {
                ...existingProfile,
                name:      parsed.name     ?? existingProfile.name     ?? '',
                title:     parsed.title    ?? existingProfile.title    ?? '',
                location:  existingProfile.location || 'Chennai, Tamil Nadu',
                skills:    parsed.skills.length > 0 ? parsed.skills : (existingProfile.skills ?? []),
            };
            await storageSet('user_profile_v1', updatedProfile);
            setSavedAt(Date.now());

            Alert.alert(
                '✅ Resume Imported',
                `Detected ${parsed.skills.length} skill${parsed.skills.length !== 1 ? 's' : ''}${parsed.name ? ` · Name: ${parsed.name}` : ''}.\n\nProfile and Jobs have been updated. Go to the Profile tab to review.`,
            );
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Could not parse resume.');
        } finally {
            setParsing(false);
        }
    };

    const removeResume = () => {
        Alert.alert('Remove Resume', 'Clear the uploaded resume?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: async () => {
                await storageRemove('user_resume_v1');
                setResume(null);
                setSavedAt(Date.now());
            }},
        ]);
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

                {/* ── Resume ───────────────────────────────────────────── */}
                <SectionHeader label="Resume" />
                <View style={styles.resumeCard}>
                    {resume ? (
                        <View style={styles.resumeRow}>
                            <View style={styles.resumeIcon}>
                                <Text style={{ fontSize: 28 }}>📄</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.resumeName} numberOfLines={1}>{resume.fileName}</Text>
                                <Text style={styles.resumeMeta}>
                                    {resume.sizeKb} KB · {resume.skills.length} skills detected
                                    {resume.name ? ` · ${resume.name}` : ''}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={removeResume} style={styles.resumeRemoveBtn}>
                                <Text style={styles.resumeRemoveText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Text style={styles.resumeEmpty}>
                            No resume uploaded. Upload to auto-fill your profile and job filters.
                        </Text>
                    )}

                    <TouchableOpacity
                        style={[styles.resumeUploadBtn, parsing && { opacity: 0.6 }]}
                        onPress={uploadResume}
                        disabled={parsing}
                        activeOpacity={0.8}
                    >
                        {parsing
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={styles.resumeUploadText}>
                                {resume ? '🔄 Re-upload Resume' : '📤 Upload Resume (PDF / DOC)'}
                              </Text>
                        }
                    </TouchableOpacity>

                    {resume && resume.skills.length > 0 && (
                        <View style={styles.detectedSkillsRow}>
                            {resume.skills.slice(0, 8).map(s => (
                                <View key={s} style={styles.detectedSkillChip}>
                                    <Text style={styles.detectedSkillText}>{s}</Text>
                                </View>
                            ))}
                            {resume.skills.length > 8 && (
                                <View style={styles.detectedSkillChip}>
                                    <Text style={styles.detectedSkillText}>+{resume.skills.length - 8} more</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* ── Calculator ────────────────────────────────────────── */}
                <SectionHeader label="Calculator" />
                <View style={styles.card}>
                    <SettingRow label="History Limit">
                        {stepper('calcHistoryLimit', settings.calcHistoryLimit, 10, 200, 10)}
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

                {/* ── Data Management ──────────────────────────────────── */}
                <SectionHeader label="Data Management" />
                <View style={styles.card}>
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
                    <AboutRow label="Built with" value="React Native · Expo SDK 48" />
                    <Divider />
                    <AboutRow label="Rates powered by" value="metals.live · open.er-api.com · frankfurter.app" />
                    <Divider />
                    <AboutRow label="Jobs powered by" value="Remotive.com" />
                </View>

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
