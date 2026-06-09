import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, FontSize, Spacing } from '../../config/theme';

export type ChartDataPoint = {
    label: string;
    value: number;
};

type Props = {
    data: ChartDataPoint[];
    color?: string;
    height?: number;
    showValues?: boolean;
};

export default function BarChart({
    data,
    color = Colors.chart.green,
    height = 180,
    showValues = true,
}: Props) {
    if (data.length === 0) {
        return (
            <View style={[styles.empty, { height }]}>
                <Text style={styles.emptyText}>No data yet</Text>
            </View>
        );
    }

    const values = data.map(d => d.value);
    const maxVal = Math.max(...values, 1);

    const BAR_AREA = height - 48; // reserve space for labels + value text

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
        >
            {data.map((d, i) => {
                const barH = Math.max(4, (d.value / maxVal) * BAR_AREA);
                return (
                    <View key={i} style={styles.column}>
                        {showValues ? (
                            <Text style={[styles.valueText, { color }]} numberOfLines={1}>
                                {d.value}
                            </Text>
                        ) : null}
                        <View style={styles.barWrapper}>
                            <View
                                style={[
                                    styles.bar,
                                    {
                                        height: barH,
                                        backgroundColor: color,
                                        opacity: 0.85 + (i / data.length) * 0.15,
                                    },
                                ]}
                            />
                        </View>
                        <Text style={styles.labelText} numberOfLines={1}>{d.label}</Text>
                    </View>
                );
            })}
        </ScrollView>
    );
}

const MIN_BAR_WIDTH = 36;

const styles = StyleSheet.create({
    empty: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.text.muted,
        fontSize: FontSize.sm,
    },
    scrollContent: {
        alignItems: 'flex-end',
        paddingBottom: Spacing.xs,
    },
    column: {
        width: MIN_BAR_WIDTH + 8,
        alignItems: 'center',
        marginHorizontal: 3,
    },
    barWrapper: {
        justifyContent: 'flex-end',
        height: 140,
    },
    bar: {
        width: MIN_BAR_WIDTH,
        borderRadius: 4,
    },
    valueText: {
        fontSize: FontSize.xs,
        fontWeight: '700',
        marginBottom: 2,
    },
    labelText: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        marginTop: 4,
        width: MIN_BAR_WIDTH + 8,
        textAlign: 'center',
    },
});
