import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import type { HistoryItem } from '../hooks/useCalculator';
import { Colors, Radii, Spacing, FontSize } from '../config/theme';

type Props = {
    item: HistoryItem;
    onSelect: (item: HistoryItem) => void;
    isLast: boolean;
};

export default function HistoryItemCard({ item, onSelect, isLast }: Props) {
    const handlePress = () => {
        try {
            onSelect(item);
        } catch {
            // ignore navigation errors
        }
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={[styles.card, isLast && styles.lastCard]}
            activeOpacity={0.7}
        >
            <View style={styles.content}>
                <Text
                    style={styles.expression}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {item.expression}
                </Text>
                <View style={styles.badge}>
                    <Text style={styles.result} numberOfLines={1}>
                        {item.result}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.historyCard,
        borderRadius: Radii.lg,
        padding: 14,
        marginBottom: Spacing.lg,
        borderLeftWidth: 4,
        borderLeftColor: Colors.accent,
        borderWidth: 1,
        borderColor: Colors.surfaceBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    lastCard: {
        marginBottom: Spacing.xxl,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    expression: {
        color: '#cbd5e1',
        fontSize: FontSize.md,
        flex: 1,
        fontWeight: '500',
    },
    badge: {
        backgroundColor: Colors.accentSoft,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs + 2,
        borderWidth: 1,
        borderColor: Colors.accent,
    },
    result: {
        color: Colors.accent,
        fontSize: FontSize.md,
        fontWeight: '700',
    },
});
