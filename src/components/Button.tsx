import React from 'react';
import { Pressable, Text, StyleSheet, Animated, View, Platform } from 'react-native';
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

async function triggerHaptic(): Promise<void> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
        // haptics unavailable on this device
    }
}

export default function Button({ label, onPress, variant = 'number' }: Props) {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    const shadowAnim = React.useRef(new Animated.Value(0)).current;

    const handlePressIn = async () => {
        await triggerHaptic();
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 0.92,
                useNativeDriver: true,
                friction: 5,
                tension: 40,
            }),
            Animated.timing(shadowAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: false,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 5,
                tension: 40,
            }),
            Animated.timing(shadowAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: false,
            }),
        ]).start();
    };

    const shadowOpacity = shadowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.6],
    });

    const shadowRadius = shadowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [8, 12],
    });

    const handlePress = () => {
        try {
            onPress();
        } catch {
            // swallow unexpected errors from press handlers
        }
    };

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.animatedWrapper,
                    { transform: [{ scale: scaleAnim }], shadowOpacity, shadowRadius },
                ]}
            >
                <Pressable
                    style={[styles.button, { backgroundColor: VARIANT_COLORS[variant] }]}
                    onPress={handlePress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    <Text style={styles.label}>{label}</Text>
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    animatedWrapper: {
        flex: 1,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
        overflow: 'hidden',
    },
    button: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    label: {
        color: Colors.text.white,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
        textAlign: 'center',
    },
});
