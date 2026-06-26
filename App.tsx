import React, { useEffect } from 'react';
import { ActivityIndicator, DeviceEventEmitter, SafeAreaView, StyleSheet, Dimensions, View } from 'react-native';
import { setupAutoSmsListener, NAVIGATE_TO_EVENTS_EVENT } from './src/utils/eventNotifications';
import { loadTabOrder, TAB_ORDER_CHANGED } from './src/utils/orderPreferences';
import { TabView, TabBar } from 'react-native-tab-view';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AuthScreen from './src/screens/AuthScreen';
import StandardScreen from './src/screens/StandardScreen';
import GoldSilverScreen from './src/screens/GoldSilverScreen';
import ToolsScreen from './src/screens/ToolsScreen';
import CurrencyConverterScreen from './src/screens/CurrencyConverterScreen';
import UnitConverterScreen from './src/screens/UnitConverterScreen';
import TechNewsScreen from './src/screens/TechNewsScreen';
import PasswordManagerScreen from './src/screens/PasswordManagerScreen';
import DocumentManagerScreen from './src/screens/DocumentManagerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import JobsScreen from './src/screens/JobsScreen';
import EventsScreen from './src/screens/EventsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';
import { FontSize } from './src/config/theme';

const INITIAL_LAYOUT = { width: Dimensions.get('window').width };

const USER_ROUTES = [
    { key: 'standard',  title: 'Standard'   },
    { key: 'events',    title: '📅 Events'   },
    { key: 'tools',     title: 'Tools'      },
    { key: 'passwords', title: '🔐 Vault'    },
    { key: 'documents', title: '📁 Docs'     },
    { key: 'units',     title: '📐 Units'    },
    { key: 'metals',    title: 'Metals'     },
    { key: 'currency',  title: '🌍 Currency' },
    { key: 'news',      title: '📰 Tech'     },
    { key: 'profile',   title: '👤 Profile'  },
    { key: 'jobs',      title: '💼 Jobs'     },
    { key: 'settings',  title: '⚙️ Settings' },
] as const;

const ADMIN_ROUTES = [
    ...USER_ROUTES,
    { key: 'admin',     title: '🛡️ Admin'   },
] as const;

type UserRouteKey  = typeof USER_ROUTES[number]['key'];
type AdminRouteKey = typeof ADMIN_ROUTES[number]['key'];
type RouteKey = UserRouteKey | AdminRouteKey;

// ── Main app (authenticated) ──────────────────────────────────────────────────

function MainApp() {
    const { isAdmin, signOut } = useAuth();
    const { colors } = useTheme();
    const BASE_ROUTES = isAdmin ? ADMIN_ROUTES : USER_ROUTES;
    const [tabOrder, setTabOrder] = React.useState<string[] | null>(null);
    const [index,    setIndex]    = React.useState(0);

    const ROUTES = React.useMemo(() => {
        if (!tabOrder) return BASE_ROUTES as any[];
        return [...BASE_ROUTES].sort((a, b) => {
            const ai = tabOrder.indexOf(a.key);
            const bi = tabOrder.indexOf(b.key);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
    }, [BASE_ROUTES, tabOrder]);

    const profileIndex = ROUTES.findIndex((r: any) => r.key === 'profile');
    const eventsIndex  = ROUTES.findIndex((r: any) => r.key === 'events');

    useEffect(() => {
        loadTabOrder().then(setTabOrder);
        const orderSub = DeviceEventEmitter.addListener(TAB_ORDER_CHANGED, () => {
            loadTabOrder().then(setTabOrder);
        });
        const eventsSub = DeviceEventEmitter.addListener(NAVIGATE_TO_EVENTS_EVENT, () => {
            const idx = ROUTES.findIndex((r: any) => r.key === 'events');
            if (idx >= 0) setIndex(idx);
        });
        return () => { orderSub.remove(); eventsSub.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderScene = React.useCallback(
        ({ route }: { route: { key: string } }) => {
            try {
                switch (route.key as RouteKey) {
                    case 'standard':   return <ErrorBoundary><StandardScreen /></ErrorBoundary>;
                    case 'metals':     return <ErrorBoundary><GoldSilverScreen /></ErrorBoundary>;
                    case 'tools':      return <ErrorBoundary><ToolsScreen /></ErrorBoundary>;
                    case 'currency':   return <ErrorBoundary><CurrencyConverterScreen /></ErrorBoundary>;
                    case 'units':      return <ErrorBoundary><UnitConverterScreen /></ErrorBoundary>;
                    case 'news':       return <ErrorBoundary><TechNewsScreen /></ErrorBoundary>;
                    case 'passwords':  return <ErrorBoundary><PasswordManagerScreen /></ErrorBoundary>;
                    case 'documents':  return <ErrorBoundary><DocumentManagerScreen /></ErrorBoundary>;
                    case 'profile':    return <ErrorBoundary><ProfileScreen isFocused={index === profileIndex} /></ErrorBoundary>;
                    case 'jobs':       return <ErrorBoundary><JobsScreen /></ErrorBoundary>;
                    case 'events':     return <ErrorBoundary><EventsScreen /></ErrorBoundary>;
                    case 'settings':   return <ErrorBoundary><SettingsScreen onSignOut={signOut} /></ErrorBoundary>;
                    case 'admin':      return <ErrorBoundary><AdminPanelScreen /></ErrorBoundary>;
                    default:           return null;
                }
            } catch { return null; }
        },
        [index, isAdmin, signOut],
    );

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
            <TabView
                navigationState={{ index, routes: ROUTES as any }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={INITIAL_LAYOUT}
                renderTabBar={props => (
                    <TabBar
                        {...props}
                        scrollEnabled
                        indicatorStyle={{ backgroundColor: colors.accent, height: 3 }}
                        style={{ backgroundColor: colors.tabBar, borderBottomWidth: 1, borderBottomColor: colors.tabBarBorder }}
                        activeColor={colors.accent}
                        inactiveColor={colors.text.secondary}
                        labelStyle={styles.tabLabel}
                        tabStyle={styles.tabItem}
                    />
                )}
            />
        </SafeAreaView>
    );
}

// ── Root — handles auth gate ──────────────────────────────────────────────────

function Root() {
    const { user, isLoading } = useAuth();
    const { colors } = useTheme();

    if (isLoading) {
        return (
            <View style={[styles.splash, { backgroundColor: colors.background }]}>
                <ActivityIndicator color={colors.accent} size="large" />
            </View>
        );
    }

    if (!user) return <AuthScreen />;
    return <MainApp />;
}

export default function App() {
    useEffect(() => {
        const unsub = setupAutoSmsListener();
        return unsub;
    }, []);

    return (
        <ErrorBoundary>
            <ThemeProvider>
                <AuthProvider>
                    <Root />
                </AuthProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    splash: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabItem: { width: 'auto', paddingHorizontal: 14, minWidth: 80 },
    tabLabel: { fontSize: FontSize.sm, fontWeight: '600', textTransform: 'capitalize' },
});
