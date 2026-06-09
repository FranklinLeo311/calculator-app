import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

type Props = {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    suffix?: string;
    keyboardType?: 'numeric' | 'decimal-pad' | 'number-pad' | 'default';
};

export default function InputField({
    label,
    value,
    onChangeText,
    placeholder = '0',
    suffix,
    keyboardType = 'decimal-pad',
}: Props) {
    return (
        <View style={styles.wrapper}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.row}>
                <TextInput
                    style={[styles.input, suffix ? styles.inputWithSuffix : null]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.text.muted}
                    keyboardType={keyboardType}
                    selectTextOnFocus
                />
                {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: Spacing.lg,
    },
    label: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        fontWeight: '600',
        marginBottom: Spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.input,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
    },
    input: {
        flex: 1,
        color: Colors.text.primary,
        fontSize: FontSize.body,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontWeight: '500',
    },
    inputWithSuffix: {
        paddingRight: 0,
    },
    suffix: {
        color: Colors.text.secondary,
        fontSize: FontSize.body,
        paddingHorizontal: Spacing.lg,
        fontWeight: '500',
    },
});
