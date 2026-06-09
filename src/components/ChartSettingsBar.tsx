import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

export type ChartType = 'bar' | 'line';

const PALETTE: string[] = [
    Colors.chart.green,
    Colors.chart.blue,
    Colors.chart.amber,
    Colors.chart.red,
    Colors.chart.purple,
    Colors.chart.pink,
    Colors.chart.cyan,
    Colors.chart.orange,
];

type Props = {
    chartType: ChartType;
    onChartTypeChange: (t: ChartType) => void;
    color: string;
    onColorChange: (c: string) => void;
};

export default function ChartSettingsBar({
    chartType,
    onChartTypeChange,
    color,
    onColorChange,
}: Props) {
    return (
        <View style={styles.container}>
            {/* Chart type toggle */}
            <View style={styles.typeRow}>
                {(['bar', 'line'] as ChartType[]).map(t => (
                    <Pressable
                        key={t}
                        onPress={() => onChartTypeChange(t)}
                        style={[
                            styles.typeBtn,
                            chartType === t && { backgroundColor: color + '30', borderColor: color },
                        ]}
                    >
                        <Text
                            style={[
                                styles.typeBtnLabel,
                                chartType === t && { color },
                            ]}
                        >
                            {t === 'bar' ? '▊ Bar' : '╱ Line'}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Color palette */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.palette}
            >
                {PALETTE.map(c => (
                    <Pressable
                        key={c}
                        onPress={() => onColorChange(c)}
                        style={[
                            styles.swatch,
                            { backgroundColor: c },
                            color === c && styles.swatchSelected,
                        ]}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    typeRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        alignItems: 'center',
    },
    typeBtnLabel: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    palette: {
        gap: Spacing.md,
        paddingVertical: 2,
    },
    swatch: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    swatchSelected: {
        borderWidth: 3,
        borderColor: Colors.text.white,
    },
});
