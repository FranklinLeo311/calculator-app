import React from 'react';
import { View, Text, Pressable, StyleSheet, Vibration } from 'react-native';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';

type Mode = 'verify' | 'setup' | 'confirm';

type Props = {
    mode: Mode;
    onSuccess: (pin: string) => void;
    storedPin?: string;   // required when mode === 'verify'
    setupPin?: string;    // required when mode === 'confirm'
    title?: string;
    subtitle?: string;
};

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function PinGate({ mode, onSuccess, storedPin, setupPin, title, subtitle }: Props) {
    const [entered, setEntered] = React.useState('');
    const [shake,   setShake]   = React.useState(false);

    const PIN_LEN = 4;

    function handleKey(k: string) {
        if (k === '⌫') { setEntered(p => p.slice(0, -1)); return; }
        if (entered.length >= PIN_LEN) return;

        const next = entered + k;
        setEntered(next);

        if (next.length < PIN_LEN) return;

        // Full PIN entered — validate
        if (mode === 'verify') {
            if (next === storedPin) { onSuccess(next); }
            else { triggerShake(); }
        } else if (mode === 'setup') {
            onSuccess(next);
        } else if (mode === 'confirm') {
            if (next === setupPin) { onSuccess(next); }
            else { triggerShake(); }
        }
    }

    function triggerShake() {
        Vibration.vibrate(200);
        setShake(true);
        setEntered('');
        setTimeout(() => setShake(false), 500);
    }

    return (
        <View style={styles.container}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.title}>{title ?? (mode === 'verify' ? 'Enter PIN' : mode === 'setup' ? 'Set PIN' : 'Confirm PIN')}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

            {/* Dot indicators */}
            <View style={[styles.dotsRow, shake && styles.shake]}>
                {Array.from({ length: PIN_LEN }, (_, i) => (
                    <View key={i} style={[styles.dot, entered.length > i && styles.dotFilled]} />
                ))}
            </View>

            {/* Numpad */}
            <View style={styles.pad}>
                {KEYS.map((k, i) => (
                    k === '' ? <View key={i} style={styles.keyPlaceholder} /> :
                    <Pressable
                        key={i}
                        onPress={() => handleKey(k)}
                        style={({ pressed }) => [styles.key, k === '⌫' && styles.keyDel, pressed && styles.keyPressed]}
                    >
                        <Text style={[styles.keyText, k === '⌫' && styles.keyDelText]}>{k}</Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
    lockIcon: { fontSize: 48, marginBottom: Spacing.xl },
    title: { color: Colors.text.primary, fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.sm },
    subtitle: { color: Colors.text.muted, fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.xl },
    dotsRow: { flexDirection: 'row', gap: 20, marginVertical: Spacing.xl * 2 },
    shake: { transform: [{ translateX: 8 }] },
    dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Colors.text.muted, backgroundColor: 'transparent' },
    dotFilled: { backgroundColor: Colors.accent, borderColor: Colors.accent },
    pad: { width: 240, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, justifyContent: 'center' },
    key: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: Colors.card,
        borderWidth: 1, borderColor: Colors.cardBorder,
        alignItems: 'center', justifyContent: 'center',
    },
    keyPlaceholder: { width: 72, height: 72 },
    keyDel: { backgroundColor: 'transparent', borderColor: 'transparent' },
    keyPressed: { backgroundColor: Colors.accent + '30' },
    keyText: { color: Colors.text.primary, fontSize: FontSize.xl, fontWeight: '600' },
    keyDelText: { color: Colors.text.muted, fontSize: FontSize.xxl },
});
