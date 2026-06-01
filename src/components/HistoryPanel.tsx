import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import type { HistoryItem } from '../hooks/useCalculator';

type Props = {
    items: HistoryItem[];
    onSelect: (item: HistoryItem) => void;
    onClear: () => void;
};

export default function HistoryPanel({ items, onSelect, onClear }: Props) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Calculation History</Text>
                <TouchableOpacity
                    onPress={onClear}
                    style={styles.clearButton}
                >
                    <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
            </View>
            {items.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No history yet</Text>
                    <Text style={styles.emptySubtext}>Your calculations will appear here</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={i => i.id}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            onPress={() => onSelect(item)}
                            style={[
                                styles.historyItem,
                                { marginBottom: index === items.length - 1 ? 20 : 12 }
                            ]}
                        >
                            <View style={styles.itemContent}>
                                <Text style={styles.expression}>{item.expression}</Text>
                                <View style={styles.resultBadge}>
                                    <Text style={styles.resultText}>{item.result}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.listContent}
                    scrollEnabled={true}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#f1f5f9',
        letterSpacing: 0.3,
    },
    clearButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    clearButtonText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 10,
    },
    historyItem: {
        backgroundColor: 'rgba(71, 85, 105, 0.4)',
        borderRadius: 12,
        padding: 14,
        borderLeftWidth: 4,
        borderLeftColor: '#10b981',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    itemContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    expression: {
        color: '#cbd5e1',
        fontSize: 14,
        flex: 1,
        fontWeight: '500',
    },
    resultBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#10b981',
    },
    resultText: {
        color: '#10b981',
        fontSize: 14,
        fontWeight: '700',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#94a3b8',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#64748b',
    },
});
