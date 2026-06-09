import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

type Props = {
    icon: string;
    title: string;
    description: string;
    accentColor: string;
    onPress: () => void;
};

export default function ToolCard({ icon, title, description, accentColor, onPress }: Props) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            android_ripple={{ color: accentColor + '30' }}
        >
            <View style={[styles.iconBox, { backgroundColor: accentColor + '20' }]}>
                <Text style={[styles.icon, { color: accentColor }]}>{icon}</Text>
            </View>
            <View style={styles.text}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description} numberOfLines={2}>{description}</Text>
            </View>
            <Text style={[styles.arrow, { color: accentColor }]}>›</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    pressed: {
        opacity: 0.75,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: Radii.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.lg,
    },
    icon: {
        fontSize: 22,
    },
    text: {
        flex: 1,
    },
    title: {
        color: Colors.text.primary,
        fontSize: FontSize.body,
        fontWeight: '700',
        marginBottom: 2,
    },
    description: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        lineHeight: 18,
    },
    arrow: {
        fontSize: 24,
        fontWeight: '300',
        marginLeft: Spacing.sm,
    },
});
