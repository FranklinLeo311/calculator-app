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

function fireHaptic(): void {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function Button({ label, onPress, variant = 'number' }: Props) {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        fireHaptic();
        // useNativeDriver: true only — mixing true/false in Animated.parallel
        // crashes Android. Shadow is static (elevation on Android, shadowXxx on iOS).
        Animated.spring(scaleAnim, {
            toValue: 0.92,
            useNativeDriver: true,
            friction: 5,
            tension: 40,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 5,
            tension: 40,
        }).start();
    };

    const handlePress = () => {
        try {
            const result = onPress() as unknown;
            // evaluateExpression is async — catch its rejection so Hermes
            // does not terminate the app for an unhandled promise rejection
            if (result instanceof Promise) {
                result.catch(() => {});
            }
        } catch {
            // swallow any synchronous errors
        }
    };

    return (
        <View style={styles.container}>
            <Animated.View
                style={[styles.shadow, { transform: [{ scale: scaleAnim }] }]}
            >
                <Pressable
                    style={[styles.button, { backgroundColor: VARIANT_COLORS[variant] }]}
                    onPress={handlePress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    android_ripple={null}
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
    shadow: {
        flex: 1,
        borderRadius: 10,
        // Android depth — static, no animation
        elevation: 3,
        // iOS depth — static, no animation (shadowXxx cannot be mixed with
        // useNativeDriver:true so they must never be animated)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
    },
    button: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    label: {
        color: Colors.text.white,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.2,
        textAlign: 'center',
    },
});
