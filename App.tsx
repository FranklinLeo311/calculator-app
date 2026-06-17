import React from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Dimensions, View } from 'react-native';
import { TabView, TabBar } from 'react-native-tab-view';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
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
import { Colors, FontSize } from './src/config/theme';

const INITIAL_LAYOUT = { width: Dimensions.get('window').width };

const USER_ROUTES = [
    { key: 'standard',  title: 'Standard'   },
    { key: 'metals',    title: 'Metals'     },
    { key: 'tools',     title: 'Tools'      },
    { key: 'currency',  title: '🌍 Currency' },
    { key: 'units',     title: '📐 Units'    },
    { key: 'news',      title: '📰 Tech'     },
    { key: 'passwords', title: '🔐 Vault'    },
    { key: 'documents', title: '📁 Docs'     },
    { key: 'profile',   title: '👤 Profile'  },
    { key: 'jobs',      title: '💼 Jobs'     },
    { key: 'events',    title: '📅 Events'   },
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
    const ROUTES = isAdmin ? ADMIN_ROUTES : USER_ROUTES;
    const [index, setIndex] = React.useState(0);
    const profileIndex = ROUTES.findIndex(r => r.key === 'profile');

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
        <SafeAreaView style={styles.root}>
            <TabView
                navigationState={{ index, routes: ROUTES as any }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={INITIAL_LAYOUT}
                renderTabBar={props => (
                    <TabBar
                        {...props}
                        scrollEnabled
                        indicatorStyle={styles.indicator}
                        style={styles.tabBar}
                        activeColor={Colors.accent}
                        inactiveColor={Colors.text.secondary}
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

    if (isLoading) {
        return (
            <View style={styles.splash}>
                <ActivityIndicator color={Colors.accent} size="large" />
            </View>
        );
    }

    if (!user) return <AuthScreen />;
    return <MainApp />;
}

export default function App() {
    return (
        <ErrorBoundary fallbackMessage="An unexpected error occurred. Please restart the app.">
            <AuthProvider>
                <Root />
            </AuthProvider>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    splash: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
    tabBar: { backgroundColor: Colors.tabBar, borderBottomWidth: 1, borderBottomColor: Colors.tabBarBorder },
    tabItem: { width: 'auto', paddingHorizontal: 14, minWidth: 80 },
    indicator: { backgroundColor: Colors.accent, height: 3 },
    tabLabel: { fontSize: FontSize.sm, fontWeight: '600', textTransform: 'capitalize' },
});
