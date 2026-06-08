import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

type Props = {
    children: ReactNode;
    fallbackMessage?: string;
};

type State = {
    hasError: boolean;
    errorMessage: string;
};

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, errorMessage: '' };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorMessage: error?.message ?? 'Unknown error' };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary]', error, info?.componentStack);
    }

    reset = () => {
        this.setState({ hasError: false, errorMessage: '' });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.message}>
                        {this.props.fallbackMessage ?? this.state.errorMessage}
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={this.reset}>
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: Spacing.xxxl,
    },
    title: {
        color: Colors.text.primary,
        fontSize: FontSize.xl,
        fontWeight: '700',
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    message: {
        color: Colors.text.secondary,
        fontSize: FontSize.md,
        textAlign: 'center',
        marginBottom: Spacing.xxxl,
    },
    button: {
        backgroundColor: Colors.accent,
        paddingHorizontal: Spacing.xxxl,
        paddingVertical: Spacing.lg,
        borderRadius: Radii.sm,
    },
    buttonText: {
        color: Colors.text.white,
        fontSize: FontSize.lg,
        fontWeight: '600',
    },
});
