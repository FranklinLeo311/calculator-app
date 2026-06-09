import React from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import MetalRateCard from '../components/MetalRateCard';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import ChartSettingsBar from '../components/ChartSettingsBar';
import useMetalRates from '../hooks/useMetalRates';
import { storageGet } from '../utils/storage';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';
import type { ChartType } from '../components/ChartSettingsBar';
import type { ChartDataPoint } from '../components/charts/BarChart';

const HISTORY_KEY = 'metal_gold_history_v1';
const MAX_HISTORY = 30;

type HistoryEntry = { date: string; gold24k: number };

function todayLabel(): string {
    const d = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
}

export default function GoldSilverScreen() {
    const { rates, loading, error, refresh } = useMetalRates();
    const [chartType, setChartType]   = React.useState<ChartType>('line');
    const [chartColor, setChartColor] = React.useState(Colors.gold);
    const [history, setHistory]       = React.useState<HistoryEntry[]>([]);

    // Load and append today's rate to chart history
    React.useEffect(() => {
        (async () => {
            try {
                const saved = (await storageGet<HistoryEntry[]>(HISTORY_KEY)) ?? [];
                setHistory(saved);
            } catch {
                // ignore
            }
        })();
    }, []);

    React.useEffect(() => {
        if (!rates) return;
        (async () => {
            try {
                const saved = (await storageGet<HistoryEntry[]>(HISTORY_KEY)) ?? [];
                const today = todayLabel();
                const existing = saved.filter(e => e.date !== today);
                const updated = [{ date: today, gold24k: rates.gold24k }, ...existing]
                    .slice(0, MAX_HISTORY);
                const { storageSet } = await import('../utils/storage');
                await storageSet(HISTORY_KEY, updated);
                setHistory(updated);
            } catch {
                // ignore
            }
        })();
    }, [rates]);

    const chartData: ChartDataPoint[] = history
        .slice(0, 14)
        .reverse()
        .map(e => ({ label: e.date, value: e.gold24k }));

    function formatTime(ms: number): string {
        const d = new Date(ms);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <GradientBackground>
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
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

                {/* Rate cards */}
                {rates ? (
                    <>
                        <MetalRateCard
                            icon="🥇"
                            title="Gold 24K (999)"
                            subtitle="Pure gold · per gram"
                            rateLabel="Today"
                            rate={rates.gold24k}
                            unit="/ gram"
                            accentColor={Colors.gold}
                        />
                        <MetalRateCard
                            icon="⭐"
                            title="Gold 22K (916)"
                            subtitle="Jewellery grade · per gram"
                            rateLabel="Today"
                            rate={rates.gold22k}
                            unit="/ gram"
                            accentColor="#D97706"
                        />
                        <MetalRateCard
                            icon="🥈"
                            title="Silver"
                            subtitle="999 purity · per gram"
                            rateLabel="Today"
                            rate={rates.silver}
                            unit="/ gram"
                            accentColor={Colors.silver}
                        />

                        {/* Exchange rate note */}
                        <View style={styles.note}>
                            <Text style={styles.noteText}>
                                1 USD = ₹{rates.usdInr} · Updated {formatTime(rates.updatedAt)}
                            </Text>
                            <Text style={styles.noteText}>
                                Rates are indicative (international spot price). Retail prices include making charges + GST.
                            </Text>
                        </View>
                    </>
                ) : loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={Colors.gold} />
                        <Text style={styles.loadingText}>Fetching live rates…</Text>
                    </View>
                ) : null}

                {/* Chart section */}
                {chartData.length > 0 && (
                    <View style={styles.chartSection}>
                        <Text style={styles.sectionTitle}>24K Gold — Price History</Text>
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
    refreshBtn: {
        backgroundColor: Colors.goldSoft,
        borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        minWidth: 90,
        alignItems: 'center',
    },
    refreshText: {
        color: Colors.gold,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    errorBanner: {
        backgroundColor: Colors.errorSoft,
        borderRadius: Radii.md,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    errorText: {
        color: Colors.error,
        fontSize: FontSize.sm,
    },
    note: {
        marginTop: Spacing.xs,
        marginBottom: Spacing.xl,
        gap: 4,
    },
    noteText: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        lineHeight: 16,
    },
    loadingBox: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        gap: Spacing.lg,
    },
    loadingText: {
        color: Colors.text.muted,
        fontSize: FontSize.sm,
    },
    chartSection: {
        marginTop: Spacing.md,
    },
    sectionTitle: {
        color: Colors.text.primary,
        fontSize: FontSize.body,
        fontWeight: '700',
        marginBottom: Spacing.lg,
    },
    chartBox: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: Spacing.lg,
    },
});
