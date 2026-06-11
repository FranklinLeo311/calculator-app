import React from 'react';
import { Pressable, Text, StyleSheet, View, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../config/theme';

export type ButtonVariant = 'number' | 'operator' | 'equals' | 'clear' | 'scientific' | 'backspace';

const VARIANT_COLORS: Record<ButtonVariant, string> = {
    number:     Colors.button.number,
    operator:   Colors.button.operator,
    equals:     Colors.button.equals,
    clear:      Colors.button.clear,
    scientific: Colors.button.scientific,
    backspace:  Colors.button.backspace,
};

type Props = {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
};

function fireHaptic(): void {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default React.memo(function Button({ label, onPress, variant = 'number' }: Props) {
    const bg = VARIANT_COLORS[variant];

    const handlePress = () => {
        fireHaptic();
        try {
            onPress();
        } catch {}
    };

    return (
        <View style={styles.wrapper}>
            <Pressable
                style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: pressed ? 0.75 : 1 }]}
                onPress={handlePress}
                android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
            >
                <Text style={styles.label}>{label}</Text>
            </Pressable>
        </View>
    );
});

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        borderRadius: 10,
        // no elevation — 20 shadow layers per frame kills Android GPU
    },
    button: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    label: {
        color: Colors.text.white,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
});
