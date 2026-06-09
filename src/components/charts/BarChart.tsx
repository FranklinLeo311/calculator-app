import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Colors, FontSize, Spacing } from '../../config/theme';

export type ChartDataPoint = {
    label: string;
    value: number;
    extra?: Record<string, number>; // additional values shown in tooltip
};

type Props = {
    data: ChartDataPoint[];
    color?: string;
    height?: number;
    showValues?: boolean;
    selectedIndex?: number;
    onPointPress?: (point: ChartDataPoint, index: number) => void;
};

export default function BarChart({
    data,
    color = Colors.chart.green,
    height = 180,
    showValues = true,
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

    const values  = data.map(d => d.value);
    const maxVal  = Math.max(...values, 1);
    const BAR_AREA = height - 48;

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
        >
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
                                style={[styles.valueText, { color: selected ? Colors.text.white : color }]}
                                numberOfLines={1}
                            >
                                {d.value.toLocaleString('en-IN')}
                            </Text>
                        ) : null}
                        <View style={styles.barWrapper}>
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
                            style={[styles.labelText, selected && { color: Colors.text.primary }]}
                            numberOfLines={1}
                        >
                            {d.label}
                        </Text>
                    </Pressable>
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
