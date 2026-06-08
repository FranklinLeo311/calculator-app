import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import HistoryItemCard from './HistoryItemCard';
import type { HistoryItem } from '../hooks/useCalculator';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

type Props = {
    items: HistoryItem[];
    onSelect: (item: HistoryItem) => void;
    onClear: () => void;
};

export default function HistoryPanel({ items, onSelect, onClear }: Props) {
    const handleClear = () => {
        try {
            onClear();
        } catch {
            // ignore
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Calculation History</Text>
                {items.length > 0 && (
                    <TouchableOpacity
                        onPress={handleClear}
                        style={styles.clearButton}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.clearButtonText}>Clear All</Text>
                    </TouchableOpacity>
                )}
            </View>

            {items.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyTitle}>No history yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Your calculations will appear here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item.id}
                    renderItem={({ item, index }) => (
                        <HistoryItemCard
                            item={item}
                            onSelect={onSelect}
                            isLast={index === items.length - 1}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
        paddingHorizontal: Spacing.xs,
    },
    title: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.text.primary,
        letterSpacing: 0.3,
    },
    clearButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs + 2,
        borderRadius: Radii.sm,
        backgroundColor: Colors.errorSoft,
        borderWidth: 1,
        borderColor: Colors.error,
    },
    clearButtonText: {
        color: Colors.error,
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: Spacing.md,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: FontSize.lg,
        fontWeight: '600',
        color: Colors.text.secondary,
        marginBottom: Spacing.md,
    },
    emptySubtitle: {
        fontSize: FontSize.md,
        color: Colors.text.muted,
    },
});
