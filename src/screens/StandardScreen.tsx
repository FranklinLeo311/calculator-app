import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import GradientBackground from '../components/GradientBackground';
import Display from '../components/Display';
import ButtonGrid from '../components/ButtonGrid';
import HistoryItemCard from '../components/HistoryItemCard';
import { STANDARD_LAYOUT } from '../config/buttonLayouts';
import type { CalcActions } from '../components/ButtonGrid';
import type { HistoryItem } from '../hooks/useCalculator';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

type Props = {
    expression: string;
    result: string;
    actions: CalcActions;
    history: HistoryItem[];
    onHistorySelect: (item: HistoryItem) => void;
    onHistoryClear: () => void;
};

export default function StandardScreen({ expression, result, actions, history, onHistorySelect, onHistoryClear }: Props) {
    return (
        <GradientBackground>
            {/* Top: display + history — flex:1 fills space above buttons */}
            <View style={styles.top}>
                <Display formula={expression} result={result} />

                <View style={styles.historySection}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.historyTitle}>History</Text>
                        {history.length > 0 && (
                            <TouchableOpacity onPress={onHistoryClear} style={styles.clearBtn} activeOpacity={0.7}>
                                <Text style={styles.clearBtnText}>Clear</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {history.length === 0 ? (
                        <Text style={styles.emptyText}>No calculations yet</Text>
                    ) : (
                        <FlatList
                            data={history}
                            keyExtractor={item => item.id}
                            renderItem={({ item, index }) => (
                                <HistoryItemCard
                                    item={item}
                                    onSelect={onHistorySelect}
                                    isLast={index === history.length - 1}
                                />
                            )}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </View>

            {/* Bottom: buttons — always pinned, never pushed off screen */}
            <View style={styles.buttonArea}>
                <ButtonGrid layout={STANDARD_LAYOUT} actions={actions} />
            </View>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    top: {
        flex: 1,
    },
    historySection: {
        maxHeight: 130,
        marginHorizontal: Spacing.xl,
        marginBottom: 4,
        backgroundColor: Colors.surface,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.surfaceBorder,
        padding: Spacing.md,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    historyTitle: {
        fontSize: FontSize.sm,
        fontWeight: '700',
        color: Colors.text.secondary,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    clearBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 3,
        borderRadius: Radii.sm,
        backgroundColor: Colors.errorSoft,
        borderWidth: 1,
        borderColor: Colors.error,
    },
    clearBtnText: {
        color: Colors.error,
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    emptyText: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        textAlign: 'center',
        paddingVertical: Spacing.sm,
    },
    listContent: {
        paddingBottom: 2,
    },
    buttonArea: {
        // Fixed height: 5 rows × 52px + 4 gaps × 5px + paddingTop 4 + paddingBottom 10
        height: 294,
    },
});
