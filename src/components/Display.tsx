import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

type Props = {
    formula: string;
    result: string;
};

function resultFontSize(text: string): number {
    const len = text.length;
    if (len <= 9)  return FontSize.display;   // 48
    if (len <= 12) return 36;
    if (len <= 16) return 28;
    return 22;
}

function formulaFontSize(text: string): number {
    const len = text.length;
    if (len <= 20) return FontSize.lg;        // 18
    if (len <= 30) return 15;
    return 12;
}

export default React.memo(function Display({ formula, result }: Props) {
    const displayFormula = formula?.trim() ? formula : '0';
    const displayResult = result?.trim() ? result : '0';

    return (
        <View style={styles.container}>
            <View style={styles.box}>
                <Text
                    style={[styles.formula, { fontSize: formulaFontSize(displayFormula) }]}
                    numberOfLines={2}
                    ellipsizeMode="head"
                    accessibilityLabel={`Expression: ${displayFormula}`}
                >
                    {displayFormula}
                </Text>
                <Text
                    style={[styles.result, { fontSize: resultFontSize(displayResult) }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                    ellipsizeMode="head"
                    accessibilityLabel={`Result: ${displayResult}`}
                >
                    {displayResult}
                </Text>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.xxxl,
    },
    box: {
        backgroundColor: Colors.surface,
        borderRadius: Radii.xl,
        padding: Spacing.xxl,
        borderWidth: 1,
        borderColor: Colors.surfaceBorder,
        // removed heavy elevation/shadow — repainted every keystroke
    },
    formula: {
        color: Colors.text.secondary,
        fontSize: FontSize.lg,
        textAlign: 'right',
        marginBottom: Spacing.md,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    result: {
        color: Colors.accent,
        fontSize: FontSize.display,
        fontWeight: '700',
        textAlign: 'right',
        letterSpacing: -1,
    },
});
