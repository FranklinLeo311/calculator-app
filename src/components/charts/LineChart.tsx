import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize } from '../../config/theme';
import type { ChartDataPoint } from './BarChart';

type Props = {
    data: ChartDataPoint[];
    color?: string;
    height?: number;
};

type Point = { x: number; y: number; label: string; value: number };

export default function LineChart({
    data,
    color = Colors.chart.green,
    height = 180,
}: Props) {
    const [containerWidth, setContainerWidth] = React.useState(0);

    if (data.length === 0) {
        return (
            <View style={[styles.empty, { height }]}>
                <Text style={styles.emptyText}>No data yet</Text>
            </View>
        );
    }

    const LABEL_AREA = 24;
    const chartH = height - LABEL_AREA;
    const PAD_V = 12;
    const PAD_H = 8;
    const drawH = chartH - PAD_V * 2;

    const values = data.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    let points: Point[] = [];
    if (containerWidth > 0 && data.length >= 2) {
        const drawW = containerWidth - PAD_H * 2;
        points = data.map((d, i) => ({
            x: PAD_H + (i / (data.length - 1)) * drawW,
            y: PAD_V + (1 - (d.value - minVal) / range) * drawH,
            label: d.label,
            value: d.value,
        }));
    } else if (containerWidth > 0 && data.length === 1) {
        const drawW = containerWidth - PAD_H * 2;
        points = [{
            x: PAD_H + drawW / 2,
            y: PAD_V + drawH / 2,
            label: data[0].label,
            value: data[0].value,
        }];
    }

    // Build line segments between consecutive points
    const segments = points.slice(0, -1).map((p, i) => {
        const next = points[i + 1];
        const dx = next.x - p.x;
        const dy = next.y - p.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return {
            cx: (p.x + next.x) / 2,
            cy: (p.y + next.y) / 2,
            length,
            angle,
        };
    });

    // Build grid lines (3 horizontal guides)
    const gridLines = [0.25, 0.5, 0.75].map(f => ({
        y: PAD_V + f * drawH,
        value: maxVal - f * range,
    }));

    return (
        <View style={{ height }}>
            <View
                style={{ height: chartH }}
                onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
            >
                {containerWidth > 0 && (
                    <View style={StyleSheet.absoluteFill}>
                        {/* grid lines */}
                        {gridLines.map((g, i) => (
                            <View
                                key={i}
                                style={[styles.gridLine, { top: g.y }]}
                            />
                        ))}

                        {/* line segments */}
                        {segments.map((seg, i) => (
                            <View
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: seg.length,
                                    height: 2,
                                    backgroundColor: color,
                                    left: seg.cx - seg.length / 2,
                                    top: seg.cy - 1,
                                    transform: [{ rotate: `${seg.angle}deg` }],
                                    borderRadius: 1,
                                }}
                            />
                        ))}

                        {/* data point dots */}
                        {points.map((p, i) => (
                            <View
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: color,
                                    borderWidth: 2,
                                    borderColor: Colors.background,
                                    left: p.x - 4,
                                    top: p.y - 4,
                                }}
                            />
                        ))}
                    </View>
                )}
            </View>

            {/* x-axis labels — only first, middle, last */}
            <View style={styles.labelsRow}>
                {data.length > 0 && (
                    <>
                        <Text style={styles.axisLabel}>{data[0].label}</Text>
                        {data.length > 2 && (
                            <Text style={[styles.axisLabel, styles.axisCenter]}>
                                {data[Math.floor(data.length / 2)].label}
                            </Text>
                        )}
                        {data.length > 1 && (
                            <Text style={[styles.axisLabel, styles.axisRight]}>
                                {data[data.length - 1].label}
                            </Text>
                        )}
                    </>
                )}
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
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(148, 163, 184, 0.08)',
    },
    labelsRow: {
        flexDirection: 'row',
        height: 24,
        alignItems: 'center',
    },
    axisLabel: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
    },
    axisCenter: {
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
    },
    axisRight: {
        marginLeft: 'auto',
    },
});
