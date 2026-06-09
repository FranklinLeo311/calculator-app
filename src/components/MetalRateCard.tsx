import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

type Props = {
    title: string;
    subtitle: string;
    rateLabel: string;
    rate: number;
    unit: string;
    accentColor: string;
    icon: string;
};

export default function MetalRateCard({
    title,
    subtitle,
    rateLabel,
    rate,
    unit,
    accentColor,
    icon,
}: Props) {
    return (
        <View style={[styles.card, { borderColor: accentColor + '40' }]}>
            <View style={[styles.iconBox, { backgroundColor: accentColor + '20' }]}>
                <Text style={styles.icon}>{icon}</Text>
            </View>
            <View style={styles.info}>
                <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <View style={styles.rateBox}>
                <Text style={styles.rateLabel}>{rateLabel}</Text>
                <Text style={[styles.rate, { color: accentColor }]}>
                    ₹{rate.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.unit}>{unit}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: Radii.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.lg,
    },
    icon: {
        fontSize: 20,
    },
    info: {
        flex: 1,
    },
    title: {
        fontSize: FontSize.body,
        fontWeight: '700',
    },
    subtitle: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    rateBox: {
        alignItems: 'flex-end',
    },
    rateLabel: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
    },
    rate: {
        fontSize: FontSize.xl,
        fontWeight: '700',
    },
    unit: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
    },
});
