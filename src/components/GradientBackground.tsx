import React, { ReactNode } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { Colors } from '../config/theme';

type Props = { children: ReactNode };

// Load the native gradient once at module level, with a safe fallback.
let NativeGradient: React.ComponentType<any> | null = null;
try {
    if (Platform.OS !== 'web') {
        NativeGradient = require('expo-linear-gradient').LinearGradient;
    }
} catch {
    // expo-linear-gradient unavailable; plain background used instead
}

const GRADIENT_COLORS = [Colors.background, Colors.backgroundEnd];

export default function GradientBackground({ children }: Props) {
    if (NativeGradient) {
        return (
            <NativeGradient colors={GRADIENT_COLORS} style={styles.fill}>
                {children}
            </NativeGradient>
        );
    }

    return (
        <View style={[styles.fill, styles.fallback]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1 },
    fallback: { backgroundColor: Colors.background },
});
