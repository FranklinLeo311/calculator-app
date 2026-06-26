import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import GradientBackground from '../components/GradientBackground';
import Display from '../components/Display';
import ButtonGrid from '../components/ButtonGrid';
import HistoryItemCard from '../components/HistoryItemCard';
import { STANDARD_LAYOUT } from '../config/buttonLayouts';
import useCalculator from '../hooks/useCalculator';
import type { HistoryItem } from '../hooks/useCalculator';
import type { CalcActions } from '../components/ButtonGrid';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';
import { storageGet } from '../utils/storage';

const DEFAULT_HISTORY_HEIGHT = 130;

export default function StandardScreen() {
    const calc = useCalculator('calc_history_standard_v1');
    const [historyBoxHeight, setHistoryBoxHeight] = useState(DEFAULT_HISTORY_HEIGHT);

    useEffect(() => {
        storageGet<{ calcHistoryBoxHeight?: number }>('app_settings_v1').then(s => {
            if (s?.calcHistoryBoxHeight) setHistoryBoxHeight(s.calcHistoryBoxHeight);
        });
    }, []);
    const { expression, result, history } = calc;
    const onHistorySelect = calc.loadFromHistory;
    const onHistoryClear = calc.clearHistory;
    const actions: CalcActions = {
        input: calc.input,
        inputOperator: calc.inputOperator,
        clearEntry: calc.clearEntry,
        backspace: calc.backspace,
        toggleSign: calc.toggleSign,
        evaluateExpression: calc.evaluateExpression,
    };
    return (
        <GradientBackground>
            {/* Top: display + history — flex:1 fills space above buttons */}
            <View style={styles.top}>
                <Display formula={expression} result={result} />

                <View style={[styles.historySection, { maxHeight: historyBoxHeight }]}>
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
