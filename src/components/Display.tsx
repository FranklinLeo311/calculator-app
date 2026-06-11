import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

type Props = {
    formula: string;
    result: string;
};

export default React.memo(function Display({ formula, result }: Props) {
    const displayFormula = formula?.trim() ? formula : '0';
    const displayResult = result?.trim() ? result : '0';

    return (
        <View style={styles.container}>
            <View style={styles.box}>
                <Text
                    style={styles.formula}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    accessibilityLabel={`Expression: ${displayFormula}`}
                >
                    {displayFormula}
                </Text>
                <Text
                    style={styles.result}
                    numberOfLines={1}
                    ellipsizeMode="tail"
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
