import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
    formula: string;
    result: string;
};

export default function Display({ formula, result }: Props) {
    return (
        <View style={styles.container}>
            <View style={styles.displayBox}>
                <Text
                    style={styles.formula}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {formula || '0'}
                </Text>
                <Text
                    style={styles.result}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {result || '0'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    displayBox: {
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    formula: {
        color: '#94a3b8',
        fontSize: 14,
        textAlign: 'right',
        marginBottom: 8,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    result: {
        color: '#10b981',
        fontSize: 48,
        fontWeight: '700',
        textAlign: 'right',
        letterSpacing: -1,
    }
});
