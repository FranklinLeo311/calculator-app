import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

export type ResultRow = {
    label: string;
    value: string;
    highlight?: boolean;
    color?: string;
};

type Props = {
    title?: string;
    rows: ResultRow[];
    accentColor?: string;
};

export default function ResultCard({ title, rows, accentColor = Colors.accent }: Props) {
    if (rows.length === 0) return null;

    return (
        <View style={[styles.card, { borderColor: accentColor + '40' }]}>
            {title ? (
                <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
            ) : null}
            {rows.map((row, i) => (
                <View
                    key={i}
                    style={[
                        styles.row,
                        row.highlight && { backgroundColor: accentColor + '18' },
                        i < rows.length - 1 && styles.rowBorder,
                    ]}
                >
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    <Text
                        style={[
                            styles.rowValue,
                            row.highlight && styles.rowValueHighlight,
                            row.color ? { color: row.color } : null,
                        ]}
                    >
                        {row.value}
                    </Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSize.sm,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    rowLabel: {
        color: Colors.text.secondary,
        fontSize: FontSize.body,
        flex: 1,
    },
    rowValue: {
        color: Colors.text.primary,
        fontSize: FontSize.body,
        fontWeight: '600',
        textAlign: 'right',
    },
    rowValueHighlight: {
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
});
