import React from 'react';
import { View, StyleSheet } from 'react-native';
import Button from './Button';
import type { ButtonLayout, ButtonDef } from '../config/buttonLayouts';

export type CalcActions = {
    input: (value: string) => void;
    inputOperator: (op: string) => void;
    clearEntry: () => void;
    backspace: () => void;
    toggleSign: () => void;
    evaluateExpression: () => void;
};

type Props = {
    layout: ButtonLayout;
    actions: CalcActions;
};

function resolveHandler(btn: ButtonDef, actions: CalcActions): () => void {
    switch (btn.kind) {
        case 'input':      return () => actions.input(btn.value ?? '');
        case 'operator':   return () => actions.inputOperator(btn.value ?? '');
        case 'clearEntry': return actions.clearEntry;
        case 'backspace':  return actions.backspace;
        case 'toggleSign': return actions.toggleSign;
        case 'evaluate':   return actions.evaluateExpression;
        default:           return () => {};
    }
}

export default React.memo(function ButtonGrid({ layout, actions }: Props) {
    return (
        <View style={styles.container}>
            {layout.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.row}>
                    {row.map((btn, btnIndex) => (
                        <View key={btnIndex} style={[styles.cell, { flex: btn.flex ?? 1 }]}>
                            <Button
                                label={btn.label}
                                variant={btn.variant}
                                onPress={resolveHandler(btn, actions)}
                            />
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 8,
        paddingTop: 4,
        paddingBottom: 10,
        gap: 5,
    },
    row: {
        height: 52,
        flexDirection: 'row',
        gap: 5,
    },
    cell: {
        flex: 1,
    },
});
