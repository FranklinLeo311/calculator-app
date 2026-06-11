import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import type { HistoryItem } from '../hooks/useCalculator';
import { Colors, Radii, Spacing, FontSize } from '../config/theme';

type Props = {
    item: HistoryItem;
    onSelect: (item: HistoryItem) => void;
    isLast: boolean;
};

export default React.memo(function HistoryItemCard({ item, onSelect, isLast }: Props) {
    return (
        <TouchableOpacity
            onPress={() => onSelect(item)}
            style={[styles.card, isLast && styles.lastCard]}
            activeOpacity={0.7}
        >
            <View style={styles.content}>
                <Text style={styles.expression} numberOfLines={1} ellipsizeMode="tail">
                    {item.expression}
                </Text>
                <View style={styles.badge}>
                    <Text style={styles.result} numberOfLines={1}>{item.result}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.historyCard,
        borderRadius: Radii.lg,
        padding: 8,
        marginBottom: 5,
        borderLeftWidth: 3,
        borderLeftColor: Colors.accent,
        borderWidth: 1,
        borderColor: Colors.surfaceBorder,
    },
    lastCard: { marginBottom: 2 },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    expression: {
        color: '#cbd5e1',
        fontSize: 11,
        flex: 1,
        fontWeight: '500',
    },
    badge: {
        backgroundColor: Colors.accentSoft,
        borderRadius: Radii.sm,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: Colors.accent,
    },
    result: {
        color: Colors.accent,
        fontSize: 11,
        fontWeight: '700',
    },
});
