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
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import ChartSettingsBar from '../components/ChartSettingsBar';
import useVideoTracker from '../hooks/useVideoTracker';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';
import type { ChartType } from '../components/ChartSettingsBar';

function todayDateStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function InstagramTrackerScreen() {
    const { entries, chartData, addEntry, deleteEntry, clearAll } = useVideoTracker();

    const [date, setDate]   = React.useState(todayDateStr());
    const [count, setCount] = React.useState('');
    const [chartType, setChartType]   = React.useState<ChartType>('bar');
    const [chartColor, setChartColor] = React.useState(Colors.chart.pink);

    const handleAdd = () => {
        try {
            const n = parseInt(count, 10);
            if (!count || isNaN(n) || n < 0) return;
            addEntry(date, n);
            setCount('');
            setDate(todayDateStr());
        } catch {
            // ignore
        }
    };

    const handleDelete = (id: string) => {
        if (Platform.OS === 'web') {
            deleteEntry(id);
            return;
        }
        Alert.alert('Delete entry?', '', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(id) },
        ]);
    };

    const handleClear = () => {
        if (Platform.OS === 'web') {
            clearAll();
            return;
        }
        Alert.alert('Clear all entries?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear all', style: 'destructive', onPress: clearAll },
        ]);
    };

    const total = entries.reduce((s, e) => s + e.count, 0);

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
                        <Text style={styles.headerTitle}>Reel Tracker</Text>
                        <Text style={styles.headerSub}>Daily Instagram scroll count</Text>
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

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: Colors.chart.pink }]}>
                            {entries.length}
                        </Text>
                        <Text style={styles.statLabel}>Days tracked</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: Colors.chart.pink }]}>
                            {total.toLocaleString()}
                        </Text>
                        <Text style={styles.statLabel}>Total reels</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: Colors.chart.pink }]}>
                            {entries.length > 0 ? Math.round(total / entries.length) : 0}
                        </Text>
                        <Text style={styles.statLabel}>Daily avg</Text>
                    </View>
                </View>

                {/* Add entry */}
                <View style={styles.addCard}>
                    <Text style={styles.addTitle}>Log today's count</Text>
                    <View style={styles.addRow}>
                        <TextInput
                            style={styles.dateInput}
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={Colors.text.muted}
                        />
                        <TextInput
                            style={styles.countInput}
                            value={count}
                            onChangeText={setCount}
                            placeholder="Count"
                            placeholderTextColor={Colors.text.muted}
                            keyboardType="number-pad"
                        />
                        <Pressable
                            onPress={handleAdd}
                            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
                        >
                            <Text style={styles.addBtnText}>+ Add</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Chart */}
                {chartData.length > 0 && (
                    <View style={styles.chartSection}>
                        <Text style={styles.sectionTitle}>Trend (last {chartData.length} days)</Text>
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

                {/* History list */}
                {entries.length > 0 && (
                    <View style={styles.listSection}>
                        <Text style={styles.sectionTitle}>History</Text>
                        {entries.map(e => (
                            <View key={e.id} style={styles.entryRow}>
                                <Text style={styles.entryDate}>{e.date}</Text>
                                <Text style={[styles.entryCount, { color: chartColor }]}>
                                    {e.count.toLocaleString()}
                                </Text>
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
                        <Text style={styles.emptyText}>No entries yet. Add your first count above!</Text>
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
    addCard: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    addTitle: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: Spacing.md,
    },
    addRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        alignItems: 'center',
    },
    dateInput: {
        flex: 2,
        backgroundColor: Colors.input,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        color: Colors.text.primary,
        fontSize: FontSize.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    countInput: {
        flex: 1,
        backgroundColor: Colors.input,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        color: Colors.text.primary,
        fontSize: FontSize.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        textAlign: 'center',
    },
    addBtn: {
        backgroundColor: Colors.chart.pink + '30',
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.chart.pink + '60',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    addBtnText: {
        color: Colors.chart.pink,
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
    chartSection: {
        marginBottom: Spacing.xl,
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
        flex: 1,
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
    },
    entryCount: {
        fontSize: FontSize.body,
        fontWeight: '700',
        marginRight: Spacing.lg,
    },
    deleteBtn: {
        padding: Spacing.sm,
    },
    deleteText: {
        color: Colors.text.muted,
        fontSize: FontSize.sm,
    },
    emptyBox: {
        paddingVertical: Spacing.xxxl,
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.text.muted,
        fontSize: FontSize.sm,
        textAlign: 'center',
    },
});
