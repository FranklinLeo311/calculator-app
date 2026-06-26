import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSize, Radii } from '../config/theme';

type Props = {
    value: number;
    onChange: (n: number) => void;
    min?: number;
    max?: number;
    step?: number;
    padZero?: number;   // pad to this many digits, e.g. 2 → "09"
    width?: number;     // width of the text input area
    color?: string;
};

export default function StepperInput({
    value,
    onChange,
    min = 0,
    max = 9999,
    step = 1,
    padZero,
    width = 52,
    color = Colors.accent,
}: Props) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');

    const clamp = (n: number) => Math.min(max, Math.max(min, n));

    const display = padZero
        ? String(value).padStart(padZero, '0')
        : String(value);

    const commitDraft = () => {
        const parsed = parseInt(draft, 10);
        if (!isNaN(parsed)) onChange(clamp(parsed));
        setEditing(false);
        setDraft('');
    };

    return (
        <View style={styles.row}>
            <TouchableOpacity
                onPress={() => onChange(clamp(value - step))}
                style={[styles.btn, { borderColor: color + '60' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Text style={[styles.btnText, { color }]}>−</Text>
            </TouchableOpacity>

            {editing ? (
                <TextInput
                    style={[styles.input, { width, color: Colors.text.primary }]}
                    value={draft}
                    onChangeText={setDraft}
                    keyboardType="number-pad"
                    autoFocus
                    selectTextOnFocus
                    onBlur={commitDraft}
                    onSubmitEditing={commitDraft}
                    maxLength={String(max).length}
                />
            ) : (
                <TouchableOpacity onPress={() => { setDraft(String(value)); setEditing(true); }} style={[styles.valueBox, { width }]}>
                    <Text style={[styles.valueText, { color: Colors.text.primary }]}>{display}</Text>
                    <Text style={styles.editHint}>✎</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity
                onPress={() => onChange(clamp(value + step))}
                style={[styles.btn, { borderColor: color + '60' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Text style={[styles.btnText, { color }]}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.surfaceBorder,
        overflow: 'hidden',
    },
    btn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRightWidth: 1,
        borderLeftWidth: 1,
        borderColor: Colors.surfaceBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: {
        fontSize: 20,
        fontWeight: '700',
        lineHeight: 22,
    },
    valueBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        flexDirection: 'row',
        gap: 3,
    },
    valueText: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        textAlign: 'center',
    },
    editHint: {
        fontSize: 10,
        color: Colors.text.muted,
        marginTop: 2,
    },
    input: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        textAlign: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        backgroundColor: Colors.accentSoft,
    },
});
