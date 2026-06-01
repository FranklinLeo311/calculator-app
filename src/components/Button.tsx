import React from 'react';
import { Pressable, Text, StyleSheet, Animated, View } from 'react-native';
import * as Haptics from 'expo-haptics';

type Props = {
    label: string;
    onPress: () => void;
    className?: string;
};

const getButtonColor = (className: string) => {
    if (className.includes('from-red')) return '#dc2626';
    if (className.includes('from-green')) return '#16a34a';
    if (className.includes('from-orange')) return '#ea580c';
    if (className.includes('from-purple')) return '#9333ea';
    if (className.includes('from-blue')) return '#2563eb';
    return '#475569';
};

export default function Button({ label, onPress, className = '' }: Props) {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    const shadowAnim = React.useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

    const backgroundColor = getButtonColor(className);

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    {
                        transform: [{ scale: scaleAnim }],
                        shadowOpacity,
                        shadowRadius,
                    },
                    styles.animatedWrapper,
                ]}
            >
                <Pressable
                    style={({ pressed }) => [
                        styles.button,
                        { backgroundColor },
                    ]}
                    onPress={() => {
                        onPress();
                    }}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    <Text style={styles.buttonText}>{label}</Text>
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        margin: 0,
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
    buttonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
        textAlign: 'center',
    },
});
