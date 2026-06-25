import React from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import MetalRateCard from '../components/MetalRateCard';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import ChartSettingsBar from '../components/ChartSettingsBar';
import useMetalRates from '../hooks/useMetalRates';
import { storageGet, storageSet } from '../utils/storage';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';
import type { ChartType } from '../components/ChartSettingsBar';
import type { ChartDataPoint } from '../components/charts/BarChart';

// ── History storage ──────────────────────────────────────────────────────────
const HISTORY_KEY = 'metal_rates_history_v2';
const MAX_HISTORY = 365;

type HistoryEntry = {
    isoDate: string;  // "2026-06-10"
    gold24k: number;
    gold22k: number;
    silver:  number;
    usdInr:  number;
};

type MetricKey = 'gold24k' | 'gold22k' | 'silver';
type GroupMode  = 'day' | 'week' | 'month';

const METRIC_OPTS: { key: MetricKey; label: string; color: string }[] = [
    { key: 'gold24k', label: '24K Gold', color: Colors.gold },
    { key: 'gold22k', label: '22K Gold', color: '#D97706' },
    { key: 'silver',  label: 'Silver',   color: Colors.silver },
];

const PRESETS: { label: string; days: number }[] = [
    { label: '7D',   days: 7   },
    { label: '1M',   days: 30  },
    { label: '3M',   days: 90  },
    { label: '6M',   days: 180 },
    { label: '1Y',   days: 365 },
    { label: 'All',  days: 0   },
];

// ── Date helpers ─────────────────────────────────────────────────────────────
function todayISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
function isoToDisplay(iso: string): string {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [, m, d] = iso.split('-').map(Number);
    return `${months[m - 1]} ${d}`;
}
function isoToMonthLabel(iso: string): string {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [y, m] = iso.split('-').map(Number);
    return `${months[m - 1]} ${y}`;
}
function isoToWeekLabel(iso: string): string {
    // Return "Jun W2" style
    const [, m, d] = iso.split('-').map(Number);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const week = Math.ceil(d / 7);
    return `${months[m - 1]} W${week}`;
}
function isValidISO(s: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
}
function daysBetween(a: string, b: string): number {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
function subtractDays(iso: string, days: number): string {
    const d = new Date(iso);
    d.setDate(d.getDate() - days);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── Grouping logic ───────────────────────────────────────────────────────────
function resolveGroupMode(startISO: string, endISO: string): GroupMode {
    const diff = daysBetween(startISO, endISO);
    if (diff <= 45)  return 'day';
    if (diff <= 180) return 'week';
    return 'month';
}

function groupEntries(
    entries: HistoryEntry[],
    startISO: string,
    endISO: string,
    metric: MetricKey,
): ChartDataPoint[] {
    const filtered = entries.filter(e => e.isoDate >= startISO && e.isoDate <= endISO);
    if (filtered.length === 0) return [];

    const mode = resolveGroupMode(startISO, endISO);

    function groupKey(e: HistoryEntry): string {
        if (mode === 'month') return e.isoDate.slice(0, 7);
        if (mode === 'week')  return `${e.isoDate.slice(0, 7)}-W${Math.ceil(+e.isoDate.slice(8) / 7)}`;
        return e.isoDate;
    }

    type Bucket = { sums: Record<string, number>; count: number; firstISO: string };
    const buckets = new Map<string, Bucket>();

    for (const e of filtered) {
        const k = groupKey(e);
        const prev = buckets.get(k);
        if (prev) {
            prev.sums.gold24k += e.gold24k;
            prev.sums.gold22k += e.gold22k;
            prev.sums.silver  += e.silver;
            prev.sums.usdInr  += e.usdInr;
            prev.count++;
        } else {
            buckets.set(k, {
                sums: { gold24k: e.gold24k, gold22k: e.gold22k, silver: e.silver, usdInr: e.usdInr },
                count: 1,
                firstISO: e.isoDate,
            });
        }
    }

    return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => ({
            label: mode === 'month'
                ? isoToMonthLabel(v.firstISO)
                : mode === 'week'
                    ? isoToWeekLabel(v.firstISO)
                    : isoToDisplay(v.firstISO),
            value: Math.round(v.sums[metric] / v.count),
            extra: {
                gold24k: Math.round(v.sums.gold24k / v.count),
                gold22k: Math.round(v.sums.gold22k / v.count),
                silver:  Math.round((v.sums.silver  / v.count) * 100) / 100,
                usdInr:  Math.round((v.sums.usdInr  / v.count) * 100) / 100,
            },
        }));
}

// ── Component ────────────────────────────────────────────────────────────────
export default function GoldSilverScreen() {
    const { rates, loading, error, refresh } = useMetalRates();

    const [history,    setHistory]    = React.useState<HistoryEntry[]>([]);
    const [chartType,      setChartType]      = React.useState<ChartType>('line');
    const [chartColor,     setChartColor]     = React.useState(Colors.gold);
    const [metric,         setMetric]         = React.useState<MetricKey>('gold24k');
    const [selectedIndex,  setSelectedIndex]  = React.useState<number | null>(null);
    const [tooltipPoint,   setTooltipPoint]   = React.useState<ChartDataPoint | null>(null);

    // Date range
    const [startInput, setStartInput] = React.useState('');
    const [endInput,   setEndInput]   = React.useState('');
    const [activeStart, setActiveStart] = React.useState('');
    const [activeEnd,   setActiveEnd]   = React.useState('');
    const [dateError,   setDateError]   = React.useState('');
    const [presetDays,  setPresetDays]  = React.useState(30);

    // Load history
    React.useEffect(() => {
        (async () => {
            try {
                const saved = (await storageGet<HistoryEntry[]>(HISTORY_KEY)) ?? [];
                setHistory(saved);
            } catch { /* ignore */ }
        })();
    }, []);

    // Append today when rates arrive
    React.useEffect(() => {
        if (!rates) return;
        (async () => {
            try {
                const saved  = (await storageGet<HistoryEntry[]>(HISTORY_KEY)) ?? [];
                const today  = todayISO();
                const others = saved.filter(e => e.isoDate !== today);
                const entry: HistoryEntry = {
                    isoDate: today,
                    gold24k: rates.gold24k,
                    gold22k: rates.gold22k,
                    silver:  rates.silver,
                    usdInr:  rates.usdInr,
                };
                const updated = [entry, ...others]
                    .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
                    .slice(0, MAX_HISTORY);
                await storageSet(HISTORY_KEY, updated);
                setHistory(updated);
            } catch { /* ignore */ }
        })();
    }, [rates]);

    // Init date range from preset (skip when in custom mode)
    React.useEffect(() => {
        if (presetDays === -1) return;
        const today = todayISO();
        const start = presetDays === 0
            ? (history.length > 0 ? history[history.length - 1].isoDate : subtractDays(today, 365))
            : subtractDays(today, presetDays - 1);
        setActiveStart(start);
        setActiveEnd(today);
        setStartInput(start);
        setEndInput(today);
        setDateError('');
        setSelectedIndex(null);
        setTooltipPoint(null);
    }, [presetDays, history]); // history needed so "All" preset recalculates when data loads

    function applyCustomDates() {
        if (!isValidISO(startInput)) { setDateError('Start date format: YYYY-MM-DD'); return; }
        if (!isValidISO(endInput))   { setDateError('End date format: YYYY-MM-DD');   return; }
        if (startInput > endInput)   { setDateError('Start must be before end date'); return; }
        setDateError('');
        setActiveStart(startInput);
        setActiveEnd(endInput);
        setSelectedIndex(null);
        setTooltipPoint(null);
        // deselect preset without triggering the preset useEffect
        if (presetDays !== -1) setPresetDays(-1);
    }

    const chartData = React.useMemo<ChartDataPoint[]>(() => {
        if (!activeStart || !activeEnd) return [];
        return groupEntries(history, activeStart, activeEnd, metric);
    }, [history, activeStart, activeEnd, metric]);

    const metricMeta = METRIC_OPTS.find(m => m.key === metric)!;
    const groupMode  = activeStart && activeEnd ? resolveGroupMode(activeStart, activeEnd) : 'day';

    function fmtTime(ms: number): string {
        return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <GradientBackground>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Gold & Silver</Text>
                        <Text style={styles.headerSub}>Live rates · Chennai, Tamil Nadu</Text>
                    </View>
                    <Pressable
                        onPress={refresh}
                        style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.6 }]}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator size="small" color={Colors.gold} />
                            : <Text style={styles.refreshText}>↻ Refresh</Text>
                        }
                    </Pressable>
                </View>

                {error ? (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {/* ── Live Rate Cards ── */}
                {rates ? (
                    <>
                        <MetalRateCard
                            icon="🥇" title="Gold 24K (999)" subtitle="Pure gold · per gram"
                            rateLabel="Today" rate={rates.gold24k} unit="/ gram"
                            accentColor={Colors.gold}
                        />
                        <MetalRateCard
                            icon="⭐" title="Gold 22K (916)" subtitle="Jewellery grade · per gram"
                            rateLabel="Today" rate={rates.gold22k} unit="/ gram"
                            accentColor="#D97706"
                        />
                        <MetalRateCard
                            icon="🥈" title="Silver" subtitle="999 purity · per gram"
                            rateLabel="Today" rate={rates.silver} unit="/ gram"
                            accentColor={Colors.silver}
                        />

                        {/* ── USD / INR today ── */}
                        <View style={styles.usdCard}>
                            <View style={styles.usdLeft}>
                                <Text style={styles.usdFlag}>🇺🇸 → 🇮🇳</Text>
                                <View>
                                    <Text style={styles.usdLabel}>USD to Indian Rupee</Text>
                                    <Text style={styles.usdSub}>Today's rate · {fmtTime(rates.updatedAt)}</Text>
                                </View>
                            </View>
                            <View style={styles.usdRight}>
                                <Text style={styles.usdValue}>₹{rates.usdInr.toFixed(2)}</Text>
                                <Text style={styles.usdUnit}>per USD</Text>
                            </View>
                        </View>

                        <Text style={styles.rateNote}>
                            Includes import duty (6%) + AIDC (5%) + GST (3%). Approx. Indian market rates.
                        </Text>
                    </>
                ) : loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={Colors.gold} />
                        <Text style={styles.loadingText}>Fetching live rates…</Text>
                    </View>
                ) : null}

                {/* ── Chart Section ── */}
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>Price History</Text>

                    {/* Metric selector */}
                    <View style={styles.metricRow}>
                        {METRIC_OPTS.map(m => (
                            <Pressable
                                key={m.key}
                                onPress={() => { setMetric(m.key); setChartColor(m.color); }}
                                style={[
                                    styles.metricBtn,
                                    metric === m.key && { backgroundColor: m.color + '25', borderColor: m.color },
                                ]}
                            >
                                <Text style={[styles.metricLabel, metric === m.key && { color: m.color }]}>
                                    {m.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Preset quick ranges */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                        {PRESETS.map(p => (
                            <Pressable
                                key={p.label}
                                onPress={() => setPresetDays(p.days)}
                                style={[
                                    styles.presetBtn,
                                    presetDays === p.days && { backgroundColor: metricMeta.color + '25', borderColor: metricMeta.color },
                                ]}
                            >
                                <Text style={[styles.presetLabel, presetDays === p.days && { color: metricMeta.color }]}>
                                    {p.label}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    {/* Manual date inputs */}
                    <View style={styles.dateRow}>
                        <View style={styles.dateField}>
                            <Text style={styles.dateFieldLabel}>From</Text>
                            <TextInput
                                style={styles.dateInput}
                                value={startInput}
                                onChangeText={setStartInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={Colors.text.muted}
                                maxLength={10}
                                keyboardType="numbers-and-punctuation"
                            />
                        </View>
                        <View style={styles.dateSep}>
                            <Text style={styles.dateSepText}>→</Text>
                        </View>
                        <View style={styles.dateField}>
                            <Text style={styles.dateFieldLabel}>To</Text>
                            <TextInput
                                style={styles.dateInput}
                                value={endInput}
                                onChangeText={setEndInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={Colors.text.muted}
                                maxLength={10}
                                keyboardType="numbers-and-punctuation"
                            />
                        </View>
                        <Pressable onPress={applyCustomDates} style={[styles.applyBtn, { borderColor: metricMeta.color }]}>
                            <Text style={[styles.applyLabel, { color: metricMeta.color }]}>Apply</Text>
                        </Pressable>
                    </View>

                    {dateError ? (
                        <Text style={styles.dateError}>{dateError}</Text>
                    ) : activeStart && activeEnd ? (
                        <Text style={styles.groupLabel}>
                            {isoToDisplay(activeStart)} – {isoToDisplay(activeEnd)}
                            {'  ·  '}{groupMode === 'day' ? 'Day-wise' : groupMode === 'week' ? 'Week-wise' : 'Month-wise'}
                        </Text>
                    ) : null}

                    {/* Chart */}
                    {chartData.length > 0 ? (
                        <>
                            <ChartSettingsBar
                                chartType={chartType}
                                onChartTypeChange={setChartType}
                                color={chartColor}
                                onColorChange={setChartColor}
                            />
                            <View style={styles.chartBox}>
                                {chartType === 'bar'
                                    ? <BarChart
                                        data={chartData}
                                        color={chartColor}
                                        height={220}
                                        showYAxis
                                        selectedIndex={selectedIndex ?? undefined}
                                        onPointPress={(pt, idx) => {
                                            setSelectedIndex(idx === selectedIndex ? null : idx);
                                            setTooltipPoint(idx === selectedIndex ? null : pt);
                                        }}
                                      />
                                    : <LineChart
                                        data={chartData}
                                        color={chartColor}
                                        height={220}
                                        selectedIndex={selectedIndex ?? undefined}
                                        onPointPress={(pt, idx) => {
                                            setSelectedIndex(idx === selectedIndex ? null : idx);
                                            setTooltipPoint(idx === selectedIndex ? null : pt);
                                        }}
                                      />
                                }
                            </View>

                            {/* Tooltip card — shown when a point is tapped */}
                            {tooltipPoint && (
                                <View style={[styles.tooltip, { borderColor: chartColor + '60' }]}>
                                    <View style={styles.tooltipHeader}>
                                        <Text style={[styles.tooltipDate, { color: chartColor }]}>
                                            {tooltipPoint.label}
                                        </Text>
                                        <Pressable onPress={() => { setSelectedIndex(null); setTooltipPoint(null); }}>
                                            <Text style={styles.tooltipClose}>✕</Text>
                                        </Pressable>
                                    </View>
                                    <View style={styles.tooltipGrid}>
                                        <View style={styles.tooltipItem}>
                                            <Text style={styles.tooltipItemLabel}>🥇 Gold 24K</Text>
                                            <Text style={[styles.tooltipItemValue, { color: Colors.gold }]}>
                                                ₹{(tooltipPoint.extra?.gold24k ?? tooltipPoint.value).toLocaleString('en-IN')}
                                            </Text>
                                            <Text style={styles.tooltipItemUnit}>/ gram</Text>
                                        </View>
                                        <View style={styles.tooltipItem}>
                                            <Text style={styles.tooltipItemLabel}>⭐ Gold 22K</Text>
                                            <Text style={[styles.tooltipItemValue, { color: '#D97706' }]}>
                                                ₹{(tooltipPoint.extra?.gold22k ?? 0).toLocaleString('en-IN')}
                                            </Text>
                                            <Text style={styles.tooltipItemUnit}>/ gram</Text>
                                        </View>
                                        <View style={styles.tooltipItem}>
                                            <Text style={styles.tooltipItemLabel}>🥈 Silver</Text>
                                            <Text style={[styles.tooltipItemValue, { color: Colors.silver }]}>
                                                ₹{(tooltipPoint.extra?.silver ?? 0).toLocaleString('en-IN')}
                                            </Text>
                                            <Text style={styles.tooltipItemUnit}>/ gram</Text>
                                        </View>
                                        <View style={styles.tooltipItem}>
                                            <Text style={styles.tooltipItemLabel}>🇺🇸 USD/INR</Text>
                                            <Text style={[styles.tooltipItemValue, { color: Colors.chart.green }]}>
                                                ₹{(tooltipPoint.extra?.usdInr ?? 0).toFixed(2)}
                                            </Text>
                                            <Text style={styles.tooltipItemUnit}>per USD</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.emptyChart}>
                            <Text style={styles.emptyText}>
                                {history.length === 0
                                    ? 'No history yet — rates are saved each time you open this screen.'
                                    : 'No data in selected date range.'}
                            </Text>
                        </View>
                    )}
                </View>

            </ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    content: { padding: Spacing.xl, paddingBottom: 40 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
    headerTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700' },
    headerSub: { color: Colors.text.muted, fontSize: FontSize.xs, marginTop: 2 },
    refreshBtn: {
        backgroundColor: Colors.goldSoft,
        borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        minWidth: 90,
        alignItems: 'center',
    },
    refreshText: { color: Colors.gold, fontSize: FontSize.sm, fontWeight: '600' },
    errorBanner: { backgroundColor: Colors.errorSoft, borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.lg },
    errorText: { color: Colors.error, fontSize: FontSize.sm },

    // USD card
    usdCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.2)',
        padding: Spacing.lg,
        marginTop: Spacing.md,
    },
    usdLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    usdFlag: { fontSize: 22 },
    usdLabel: { color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '600' },
    usdSub: { color: Colors.text.muted, fontSize: FontSize.xs, marginTop: 2 },
    usdRight: { alignItems: 'flex-end' },
    usdValue: { color: Colors.chart.green, fontSize: FontSize.xl, fontWeight: '700' },
    usdUnit: { color: Colors.text.muted, fontSize: FontSize.xs },
    rateNote: { color: Colors.text.muted, fontSize: FontSize.xs, lineHeight: 16, marginTop: Spacing.md, marginBottom: Spacing.xl },

    loadingBox: { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.lg },
    loadingText: { color: Colors.text.muted, fontSize: FontSize.sm },

    // Chart section
    chartSection: { marginTop: Spacing.md },
    sectionTitle: { color: Colors.text.primary, fontSize: FontSize.body, fontWeight: '700', marginBottom: Spacing.lg },

    metricRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    metricBtn: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        alignItems: 'center',
    },
    metricLabel: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600' },

    presetRow: { gap: Spacing.sm, marginBottom: Spacing.lg, paddingBottom: 2 },
    presetBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
    },
    presetLabel: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600' },

    // Date inputs
    dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginBottom: Spacing.sm },
    dateField: { flex: 1 },
    dateFieldLabel: { color: Colors.text.muted, fontSize: FontSize.xs, marginBottom: 4 },
    dateInput: {
        backgroundColor: Colors.input,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        color: Colors.text.primary,
        fontSize: FontSize.xs,
    },
    dateSep: { paddingBottom: Spacing.sm },
    dateSepText: { color: Colors.text.muted, fontSize: FontSize.sm },
    applyBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radii.md,
        borderWidth: 1,
        marginBottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyLabel: { fontSize: FontSize.xs, fontWeight: '700' },
    dateError: { color: Colors.error, fontSize: FontSize.xs, marginBottom: Spacing.sm },
    groupLabel: { color: Colors.text.muted, fontSize: FontSize.xs, marginBottom: Spacing.md },

    chartBox: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: Spacing.lg,
        marginTop: Spacing.sm,
    },
    emptyChart: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: Spacing.xl,
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    emptyText: { color: Colors.text.muted, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },

    tooltip: {
        marginTop: Spacing.md,
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        padding: Spacing.lg,
    },
    tooltipHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    tooltipDate: { fontSize: FontSize.sm, fontWeight: '700' },
    tooltipClose: { color: Colors.text.muted, fontSize: FontSize.body, paddingHorizontal: 4 },
    tooltipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    tooltipItem: {
        width: '47%',
        backgroundColor: Colors.input,
        borderRadius: Radii.md,
        padding: Spacing.md,
    },
    tooltipItemLabel: { color: Colors.text.muted, fontSize: FontSize.xs, marginBottom: 4 },
    tooltipItemValue: { fontSize: FontSize.body, fontWeight: '700' },
    tooltipItemUnit: { color: Colors.text.muted, fontSize: FontSize.xs, marginTop: 2 },
});
