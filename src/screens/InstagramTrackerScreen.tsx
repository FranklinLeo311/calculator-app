import React from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    StyleSheet,
    Alert,
    Platform,
    LayoutAnimation,
    UIManager,
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import ChartSettingsBar from '../components/ChartSettingsBar';
import useVideoTracker from '../hooks/useVideoTracker';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';
import type { ChartType } from '../components/ChartSettingsBar';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Metric = 'videos' | 'time';

function todayDateStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── How-to guide steps ───────────────────────────────────────────────────────
const STEPS = [
    { icon: '1️⃣', text: 'Open the Instagram app on your phone.' },
    { icon: '2️⃣', text: 'Tap your Profile picture (bottom-right corner).' },
    { icon: '3️⃣', text: 'Tap the ☰ menu icon (top-right corner).' },
    { icon: '4️⃣', text: 'Tap "Your Activity" from the menu.' },
    { icon: '5️⃣', text: 'Tap "Time Spent" to see minutes per day.' },
    { icon: '6️⃣', text: 'Tap "Videos Watched" to see your reel count.' },
    { icon: '📝', text: 'Come back here and log the numbers below.' },
];

export default function InstagramTrackerScreen() {
    const { entries, chartDataCount, chartDataMinutes, addEntry, deleteEntry, clearAll } =
        useVideoTracker();

    const [date, setDate]     = React.useState(todayDateStr());
    const [videos, setVideos] = React.useState('');
    const [minutes, setMinutes] = React.useState('');
    const [guideOpen, setGuideOpen] = React.useState(true);
    const [metric, setMetric] = React.useState<Metric>('videos');
    const [chartType, setChartType]   = React.useState<ChartType>('bar');
    const [chartColor, setChartColor] = React.useState(Colors.chart.pink);

    const toggleGuide = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setGuideOpen(v => !v);
    };

    const handleAdd = () => {
        try {
            const v = parseInt(videos, 10)   || 0;
            const m = parseInt(minutes, 10)  || 0;
            if (!date || (v === 0 && m === 0)) return;
            addEntry(date, v, m);
            setVideos('');
            setMinutes('');
            setDate(todayDateStr());
        } catch {
            // ignore
        }
    };

    const handleDelete = (id: string) => {
        if (Platform.OS === 'web') { deleteEntry(id); return; }
        Alert.alert('Delete entry?', '', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(id) },
        ]);
    };

    const handleClear = () => {
        if (Platform.OS === 'web') { clearAll(); return; }
        Alert.alert('Clear all entries?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear all', style: 'destructive', onPress: clearAll },
        ]);
    };

    const totalVideos  = entries.reduce((s, e) => s + (e.count   ?? 0), 0);
    const totalMinutes = entries.reduce((s, e) => s + (e.minutes ?? 0), 0);
    const avgVideos    = entries.length ? Math.round(totalVideos  / entries.length) : 0;
    const avgMinutes   = entries.length ? Math.round(totalMinutes / entries.length) : 0;
    const chartData    = metric === 'videos' ? chartDataCount : chartDataMinutes;

    return (
        <GradientBackground>
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Instagram Tracker</Text>
                        <Text style={styles.headerSub}>Log from Instagram → Your Activity</Text>
                    </View>
                    {entries.length > 0 && (
                        <Pressable
                            onPress={handleClear}
                            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.6 }]}
                        >
                            <Text style={styles.clearBtnText}>Clear all</Text>
                        </Pressable>
                    )}
                </View>

                {/* ── Guide ──────────────────────────────────────────── */}
                <View style={styles.guideCard}>
                    <Pressable onPress={toggleGuide} style={styles.guideHeader}>
                        <View style={styles.guideHeaderLeft}>
                            <Text style={styles.guideIcon}>📍</Text>
                            <Text style={styles.guideTitle}>How to find your stats in Instagram</Text>
                        </View>
                        <Text style={[styles.guideChevron, { color: Colors.chart.pink }]}>
                            {guideOpen ? '▲' : '▼'}
                        </Text>
                    </Pressable>

                    {guideOpen && (
                        <View style={styles.guideBody}>
                            {STEPS.map((step, i) => (
                                <View key={i} style={styles.stepRow}>
                                    <Text style={styles.stepIcon}>{step.icon}</Text>
                                    <Text style={styles.stepText}>{step.text}</Text>
                                </View>
                            ))}
                            <View style={styles.tipBox}>
                                <Text style={styles.tipText}>
                                    💡 Instagram resets the "Videos Watched" counter daily at midnight. Log it before you sleep for accurate numbers.
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* ── Stats row ─────────────────────────────────────── */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: Colors.chart.pink }]}>
                            {entries.length}
                        </Text>
                        <Text style={styles.statLabel}>Days logged</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: Colors.chart.pink }]}>
                            {avgVideos}
                        </Text>
                        <Text style={styles.statLabel}>Avg videos/day</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: Colors.chart.pink }]}>
                            {avgMinutes}
                        </Text>
                        <Text style={styles.statLabel}>Avg min/day</Text>
                    </View>
                </View>

                {/* ── Log entry form ────────────────────────────────── */}
                <View style={styles.logCard}>
                    <Text style={styles.logTitle}>Log today's data</Text>

                    <View style={styles.logDateRow}>
                        <Text style={styles.logFieldLabel}>Date</Text>
                        <TextInput
                            style={styles.logDateInput}
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={Colors.text.muted}
                        />
                    </View>

                    <View style={styles.logInputsRow}>
                        <View style={styles.logInputBox}>
                            <Text style={styles.logFieldLabel}>📹 Videos Watched</Text>
                            <TextInput
                                style={styles.logInput}
                                value={videos}
                                onChangeText={setVideos}
                                placeholder="From Instagram"
                                placeholderTextColor={Colors.text.muted}
                                keyboardType="number-pad"
                            />
                            <Text style={styles.logHint}>Instagram → Your Activity → Videos Watched</Text>
                        </View>
                        <View style={styles.logInputBox}>
                            <Text style={styles.logFieldLabel}>⏱ Time Spent (min)</Text>
                            <TextInput
                                style={styles.logInput}
                                value={minutes}
                                onChangeText={setMinutes}
                                placeholder="Minutes"
                                placeholderTextColor={Colors.text.muted}
                                keyboardType="number-pad"
                            />
                            <Text style={styles.logHint}>Instagram → Your Activity → Time Spent</Text>
                        </View>
                    </View>

                    <Pressable
                        onPress={handleAdd}
                        style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.7 }]}
                    >
                        <Text style={styles.saveBtnText}>Save Entry</Text>
                    </Pressable>
                </View>

                {/* ── Chart ─────────────────────────────────────────── */}
                {chartData.length > 0 && (
                    <View style={styles.chartSection}>
                        {/* Metric toggle */}
                        <View style={styles.metricRow}>
                            {(['videos', 'time'] as Metric[]).map(m => (
                                <Pressable
                                    key={m}
                                    onPress={() => setMetric(m)}
                                    style={[
                                        styles.metricBtn,
                                        metric === m && { backgroundColor: chartColor + '25', borderColor: chartColor },
                                    ]}
                                >
                                    <Text style={[styles.metricBtnText, metric === m && { color: chartColor }]}>
                                        {m === 'videos' ? '📹 Videos' : '⏱ Time (min)'}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.sectionTitle}>
                            {metric === 'videos' ? 'Videos Watched' : 'Time Spent (min)'} — last {chartData.length} days
                        </Text>

                        <ChartSettingsBar
                            chartType={chartType}
                            onChartTypeChange={setChartType}
                            color={chartColor}
                            onColorChange={setChartColor}
                        />
                        <View style={styles.chartBox}>
                            {chartType === 'bar'
                                ? <BarChart data={chartData} color={chartColor} height={200} />
                                : <LineChart data={chartData} color={chartColor} height={200} />
                            }
                        </View>
                    </View>
                )}

                {/* ── History list ──────────────────────────────────── */}
                {entries.length > 0 && (
                    <View style={styles.listSection}>
                        <Text style={styles.sectionTitle}>History</Text>
                        {entries.map(e => (
                            <View key={e.id} style={styles.entryRow}>
                                <Text style={styles.entryDate}>{e.date}</Text>
                                <View style={styles.entryMetrics}>
                                    <Text style={[styles.entryVideos, { color: chartColor }]}>
                                        📹 {(e.count ?? 0).toLocaleString()}
                                    </Text>
                                    <Text style={styles.entryMinutes}>
                                        ⏱ {(e.minutes ?? 0)}m
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() => handleDelete(e.id)}
                                    style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}
                                >
                                    <Text style={styles.deleteText}>✕</Text>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}

                {entries.length === 0 && (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>📊</Text>
                        <Text style={styles.emptyText}>
                            Follow the guide above, then log your first entry.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: Spacing.xl,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    headerTitle: {
        color: Colors.text.primary,
        fontSize: FontSize.xxl,
        fontWeight: '700',
    },
    headerSub: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    clearBtn: {
        backgroundColor: Colors.errorSoft,
        borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    clearBtnText: {
        color: Colors.error,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },

    // Guide
    guideCard: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.chart.pink + '40',
        marginBottom: Spacing.xl,
        overflow: 'hidden',
    },
    guideHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    guideHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: Spacing.sm,
    },
    guideIcon: { fontSize: 16 },
    guideTitle: {
        color: Colors.text.primary,
        fontSize: FontSize.sm,
        fontWeight: '700',
        flex: 1,
    },
    guideChevron: {
        fontSize: FontSize.xs,
        fontWeight: '700',
    },
    guideBody: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
        gap: Spacing.md,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        marginTop: Spacing.md,
    },
    stepIcon: { fontSize: 16, width: 26 },
    stepText: {
        flex: 1,
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        lineHeight: 20,
    },
    tipBox: {
        backgroundColor: Colors.chart.pink + '12',
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.chart.pink + '30',
        padding: Spacing.md,
        marginTop: Spacing.md,
    },
    tipText: {
        color: Colors.text.secondary,
        fontSize: FontSize.xs,
        lineHeight: 18,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: Spacing.lg,
        alignItems: 'center',
    },
    statValue: {
        fontSize: FontSize.xl,
        fontWeight: '700',
    },
    statLabel: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        marginTop: 2,
        textAlign: 'center',
    },

    // Log form
    logCard: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    logTitle: {
        color: Colors.text.primary,
        fontSize: FontSize.body,
        fontWeight: '700',
        marginBottom: Spacing.lg,
    },
    logDateRow: {
        marginBottom: Spacing.lg,
    },
    logFieldLabel: {
        color: Colors.text.secondary,
        fontSize: FontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        marginBottom: Spacing.xs,
    },
    logDateInput: {
        backgroundColor: Colors.input,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        color: Colors.text.primary,
        fontSize: FontSize.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    logInputsRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    logInputBox: {
        flex: 1,
    },
    logInput: {
        backgroundColor: Colors.input,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        color: Colors.text.primary,
        fontSize: FontSize.body,
        fontWeight: '600',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        textAlign: 'center',
        marginBottom: 4,
    },
    logHint: {
        color: Colors.text.muted,
        fontSize: 10,
        lineHeight: 13,
    },
    saveBtn: {
        backgroundColor: Colors.chart.pink + '25',
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.chart.pink + '60',
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    saveBtnText: {
        color: Colors.chart.pink,
        fontSize: FontSize.body,
        fontWeight: '700',
    },

    // Chart
    chartSection: {
        marginBottom: Spacing.xl,
    },
    metricRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    metricBtn: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        alignItems: 'center',
    },
    metricBtnText: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    sectionTitle: {
        color: Colors.text.primary,
        fontSize: FontSize.body,
        fontWeight: '700',
        marginBottom: Spacing.md,
    },
    chartBox: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: Spacing.lg,
    },

    // History list
    listSection: {
        marginBottom: Spacing.xl,
    },
    entryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        marginBottom: Spacing.sm,
    },
    entryDate: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        width: 90,
    },
    entryMetrics: {
        flex: 1,
        flexDirection: 'row',
        gap: Spacing.lg,
    },
    entryVideos: {
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
    entryMinutes: {
        color: Colors.text.muted,
        fontSize: FontSize.sm,
    },
    deleteBtn: { padding: Spacing.sm },
    deleteText: { color: Colors.text.muted, fontSize: FontSize.sm },

    // Empty
    emptyBox: {
        paddingVertical: Spacing.xxxl,
        alignItems: 'center',
        gap: Spacing.md,
    },
    emptyEmoji: { fontSize: 40 },
    emptyText: {
        color: Colors.text.muted,
        fontSize: FontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
});
