import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Colors, FontSize, Spacing } from '../../config/theme';

export type ChartDataPoint = {
    label: string;
    value: number;
    extra?: Record<string, number>;
};

type Props = {
    data: ChartDataPoint[];
    color?: string;
    height?: number;
    showValues?: boolean;
    showYAxis?: boolean;
    selectedIndex?: number;
    onPointPress?: (point: ChartDataPoint, index: number) => void;
};

const Y_AXIS_W = 52;
const MIN_BAR_WIDTH = 36;

function fmtY(n: number): string {
    if (n >= 10000000) return (n / 10000000).toFixed(1) + 'Cr';
    if (n >= 100000)   return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000)     return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
    return n < 10 ? n.toFixed(1) : Math.round(n).toString();
}

export default function BarChart({
    data,
    color = Colors.chart.green,
    height = 180,
    showValues = true,
    showYAxis = false,
    selectedIndex,
    onPointPress,
}: Props) {
    if (data.length === 0) {
        return (
            <View style={[styles.empty, { height }]}>
                <Text style={styles.emptyText}>No data yet</Text>
            </View>
        );
    }

    const values   = data.map(d => d.value);
    const maxVal   = Math.max(...values, 1);
    // Reserve space: value text on top + label text below + some padding
    const VALUE_H  = showValues ? 18 : 0;
    const LABEL_H  = 20;
    const BAR_AREA = height - VALUE_H - LABEL_H;

    // Y-axis ticks
    const yTicks = showYAxis ? [0, 0.5, 1].map(f => ({
        pct: f,
        value: maxVal * (1 - f),
    })) : [];

    return (
        <View style={{ height, flexDirection: 'row' }}>

            {/* Y-axis (fixed, doesn't scroll) */}
            {showYAxis && (
                <View style={{ width: Y_AXIS_W, height }}>
                    {/* grid line markers + labels */}
                    {yTicks.map((t, i) => (
                        <View
                            key={i}
                            style={{
                                position: 'absolute',
                                top: VALUE_H + t.pct * BAR_AREA - 8,
                                right: 4,
                                alignItems: 'flex-end',
                            }}
                        >
                            <Text style={styles.yAxisLabel}>{fmtY(t.value)}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Bars scroll */}
            <View style={{ flex: 1, overflow: 'hidden' }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Y-axis grid lines (drawn behind bars) */}
                    {showYAxis && yTicks.map((t, i) => (
                        <View
                            key={`grid-${i}`}
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: VALUE_H + t.pct * BAR_AREA,
                                height: 1,
                                backgroundColor: 'rgba(148, 163, 184, 0.15)',
                            }}
                        />
                    ))}

                    {data.map((d, i) => {
                        const barH    = Math.max(4, (d.value / maxVal) * BAR_AREA);
                        const selected = selectedIndex === i;
                        return (
                            <Pressable
                                key={i}
                                onPress={() => onPointPress?.(d, i)}
                                style={styles.column}
                            >
                                {showValues ? (
                                    <Text
                                        style={[styles.valueText, { color: selected ? Colors.text.white : color, height: VALUE_H }]}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                    >
                                        {fmtY(d.value)}
                                    </Text>
                                ) : null}
                                <View style={[styles.barWrapper, { height: BAR_AREA }]}>
                                    <View
                                        style={[
                                            styles.bar,
                                            {
                                                height: barH,
                                                backgroundColor: color,
                                                opacity: selected ? 1 : 0.75,
                                                borderWidth: selected ? 2 : 0,
                                                borderColor: Colors.text.white,
                                            },
                                        ]}
                                    />
                                </View>
                                <Text
                                    style={[styles.labelText, { height: LABEL_H }, selected && { color: Colors.text.primary }]}
                                    numberOfLines={1}
                                >
                                    {d.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    empty: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.text.muted,
        fontSize: FontSize.sm,
    },
    yAxisLabel: {
        color: Colors.text.muted,
        fontSize: 10,
        textAlign: 'right',
    },
    scrollContent: {
        alignItems: 'flex-start',
        paddingBottom: Spacing.xs,
    },
    column: {
        width: MIN_BAR_WIDTH + 8,
        alignItems: 'center',
        marginHorizontal: 3,
    },
    barWrapper: {
        justifyContent: 'flex-end',
        width: MIN_BAR_WIDTH,
    },
    bar: {
        width: MIN_BAR_WIDTH,
        borderRadius: 4,
    },
    valueText: {
        fontSize: FontSize.xs,
        fontWeight: '700',
        marginBottom: 2,
        width: MIN_BAR_WIDTH + 8,
        textAlign: 'center',
    },
    labelText: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        marginTop: 4,
        width: MIN_BAR_WIDTH + 8,
        textAlign: 'center',
    },
});
