import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light' | 'system';

const THEME_KEY = 'app_theme_mode_v1';

// ── Dark palette (original) ───────────────────────────────────────────────────
export const DarkColors = {
    background: '#0f172a',
    backgroundEnd: '#1e293b',
    surface: 'rgba(15, 23, 42, 0.6)',
    surfaceBorder: 'rgba(148, 163, 184, 0.2)',
    card: 'rgba(30, 41, 59, 0.8)',
    cardBorder: 'rgba(148, 163, 184, 0.15)',
    input: 'rgba(15, 23, 42, 0.9)',
    inputBorder: 'rgba(148, 163, 184, 0.3)',
    divider: 'rgba(148, 163, 184, 0.1)',
    text: {
        primary: '#f1f5f9',
        secondary: '#94a3b8',
        muted: '#64748b',
        white: '#ffffff',
    },
    accent: '#10b981',
    accentSoft: 'rgba(16, 185, 129, 0.2)',
    error: '#ef4444',
    errorSoft: 'rgba(239, 68, 68, 0.1)',
    tabBar: '#0f172a',
    tabBarBorder: '#334155',
    button: {
        number: '#475569',
        operator: '#ea580c',
        equals: '#16a34a',
        clear: '#dc2626',
        scientific: '#9333ea',
        backspace: '#2563eb',
    },
    historyCard: 'rgba(71, 85, 105, 0.4)',
    gold: '#F59E0B',
    goldSoft: 'rgba(245, 158, 11, 0.15)',
    silver: '#94A3B8',
    silverSoft: 'rgba(148, 163, 184, 0.15)',
    chart: {
        green: '#10b981',
        blue: '#3B82F6',
        amber: '#F59E0B',
        red: '#EF4444',
        purple: '#8B5CF6',
        pink: '#EC4899',
        cyan: '#06B6D4',
        orange: '#F97316',
    },
    tool: {
        ctc: '#10b981',
        emi: '#3B82F6',
        gst: '#F59E0B',
        currency: '#8B5CF6',
        age: '#EC4899',
        percentage: '#06B6D4',
    },
    isDark: true,
};

// ── Light palette ─────────────────────────────────────────────────────────────
export const LightColors = {
    background: '#f1f5f9',
    backgroundEnd: '#e2e8f0',
    surface: 'rgba(255, 255, 255, 0.95)',
    surfaceBorder: 'rgba(0, 0, 0, 0.08)',
    card: 'rgba(255, 255, 255, 0.98)',
    cardBorder: 'rgba(0, 0, 0, 0.06)',
    input: 'rgba(248, 250, 252, 0.98)',
    inputBorder: 'rgba(0, 0, 0, 0.15)',
    divider: 'rgba(0, 0, 0, 0.06)',
    text: {
        primary: '#0f172a',
        secondary: '#475569',
        muted: '#94a3b8',
        white: '#ffffff',
    },
    accent: '#059669',
    accentSoft: 'rgba(5, 150, 105, 0.1)',
    error: '#dc2626',
    errorSoft: 'rgba(220, 38, 38, 0.08)',
    tabBar: '#ffffff',
    tabBarBorder: '#e2e8f0',
    button: {
        number: '#334155',
        operator: '#ea580c',
        equals: '#16a34a',
        clear: '#dc2626',
        scientific: '#9333ea',
        backspace: '#2563eb',
    },
    historyCard: 'rgba(226, 232, 240, 0.8)',
    gold: '#D97706',
    goldSoft: 'rgba(217, 119, 6, 0.1)',
    silver: '#64748B',
    silverSoft: 'rgba(100, 116, 139, 0.1)',
    chart: {
        green: '#059669',
        blue: '#2563EB',
        amber: '#D97706',
        red: '#DC2626',
        purple: '#7C3AED',
        pink: '#DB2777',
        cyan: '#0891B2',
        orange: '#EA580C',
    },
    tool: {
        ctc: '#059669',
        emi: '#2563EB',
        gst: '#D97706',
        currency: '#7C3AED',
        age: '#DB2777',
        percentage: '#0891B2',
    },
    isDark: false,
};

export type AppColors = typeof DarkColors;

// ── Context ───────────────────────────────────────────────────────────────────

type ThemeCtx = {
    themeMode: ThemeMode;
    isDark: boolean;
    colors: AppColors;
    setThemeMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeCtx>({
    themeMode: 'dark',
    isDark: true,
    colors: DarkColors,
    setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY).then(saved => {
            if (saved === 'light' || saved === 'dark' || saved === 'system') {
                setThemeModeState(saved);
            }
        });
    }, []);

    const setThemeMode = useCallback((m: ThemeMode) => {
        setThemeModeState(m);
        AsyncStorage.setItem(THEME_KEY, m);
    }, []);

    const systemIsDark = Appearance.getColorScheme() === 'dark';
    const isDark =
        themeMode === 'dark' ? true :
        themeMode === 'light' ? false :
        systemIsDark;

    const colors = isDark ? DarkColors : LightColors;

    return (
        <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
