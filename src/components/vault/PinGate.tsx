import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';

type Mode = 'verify' | 'setup' | 'confirm';

type Props = {
    mode: Mode;
    onSuccess: (pin: string) => void;
    storedPin?: string;
    setupPin?: string;
    title?: string;
    subtitle?: string;
};

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
const PIN_LEN = 4;

export default function PinGate({ mode, onSuccess, storedPin, setupPin, title, subtitle }: Props) {
    const [entered,  setEntered]  = React.useState('');
    const [errorMsg, setErrorMsg] = React.useState('');
    const shakeAnim = React.useRef(new Animated.Value(0)).current;

    // Reset fully whenever mode prop changes
    React.useEffect(() => {
        setEntered('');
        setErrorMsg('');
        shakeAnim.setValue(0);
    }, [mode]);

    function handleKey(k: string) {
        if (errorMsg) return; // block input during error display briefly
        if (k === '⌫') { setEntered(p => p.slice(0, -1)); return; }
        if (entered.length >= PIN_LEN) return;

        const next = entered + k;
        setEntered(next);
        if (next.length < PIN_LEN) return;

        if (mode === 'setup') {
            onSuccess(next);
            return;
        }

        const correct = mode === 'verify' ? storedPin : setupPin;
        if (next === correct) {
            onSuccess(next);
        } else {
            triggerError(mode === 'verify' ? 'Incorrect PIN. Try again.' : 'PINs do not match. Try again.');
        }
    }

    function triggerError(msg: string) {
        setEntered('');
        setErrorMsg(msg);

        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 12,  duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8,   duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8,  duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
        ]).start();

        setTimeout(() => setErrorMsg(''), 1800);
    }

    const defaultTitle    = mode === 'verify' ? 'Enter PIN' : mode === 'setup' ? 'Create PIN' : 'Confirm PIN';
    const defaultSubtitle = mode === 'setup'   ? 'Choose a 4-digit PIN to lock your vault'
                          : mode === 'confirm'  ? 'Re-enter your PIN to confirm'
                          : 'Enter your PIN to unlock';

    return (
        <View style={styles.container}>
            <Text style={styles.lockIcon}>{mode === 'verify' ? '🔒' : '🔐'}</Text>
            <Text style={styles.title}>{title ?? defaultTitle}</Text>
            <Text style={styles.subtitle}>{subtitle ?? defaultSubtitle}</Text>

            {/* Dot indicators with shake */}
            <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
                {Array.from({ length: PIN_LEN }, (_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            entered.length > i && styles.dotFilled,
                            errorMsg && styles.dotError,
                        ]}
                    />
                ))}
            </Animated.View>

            {/* Error message */}
            <View style={styles.errorArea}>
                {errorMsg ? (
                    <Text style={styles.errorMsg}>{errorMsg}</Text>
                ) : null}
            </View>

            {/* Numpad */}
            <View style={styles.pad}>
                {KEYS.map((k, i) => (
                    k === '' ? (
                        <View key={i} style={styles.keyPlaceholder} />
                    ) : (
                        <Pressable
                            key={i}
                            onPress={() => handleKey(k)}
                            style={({ pressed }) => [
                                styles.key,
                                k === '⌫' && styles.keyDel,
                                pressed && styles.keyPressed,
                            ]}
                        >
                            <Text style={[styles.keyText, k === '⌫' && styles.keyDelText]}>{k}</Text>
                        </Pressable>
                    )
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
    lockIcon:  { fontSize: 52, marginBottom: Spacing.lg },
    title:     { color: Colors.text.primary, fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.sm },
    subtitle:  { color: Colors.text.muted, fontSize: FontSize.sm, textAlign: 'center' },

    dotsRow:   { flexDirection: 'row', gap: 20, marginVertical: 36 },
    dot: {
        width: 18, height: 18, borderRadius: 9,
        borderWidth: 2, borderColor: Colors.text.muted,
        backgroundColor: 'transparent',
    },
    dotFilled: { backgroundColor: Colors.accent, borderColor: Colors.accent },
    dotError:  { borderColor: Colors.error },

    errorArea: { height: 24, alignItems: 'center', marginBottom: Spacing.xl },
    errorMsg:  { color: Colors.error, fontSize: FontSize.sm, fontWeight: '600' },

    pad: { width: 252, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg, justifyContent: 'center' },
    key: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: Colors.card,
        borderWidth: 1, borderColor: Colors.cardBorder,
        alignItems: 'center', justifyContent: 'center',
    },
    keyPlaceholder: { width: 72, height: 72 },
    keyDel:    { backgroundColor: 'transparent', borderColor: 'transparent' },
    keyPressed:{ backgroundColor: Colors.accent + '30', transform: [{ scale: 0.93 }] },
    keyText:    { color: Colors.text.primary, fontSize: FontSize.xl, fontWeight: '600' },
    keyDelText: { color: Colors.text.muted, fontSize: FontSize.xxl },
});
