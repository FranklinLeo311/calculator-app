import React from 'react';
import { SafeAreaView, StyleSheet, Dimensions } from 'react-native';
import { TabView, TabBar } from 'react-native-tab-view';
import useCalculator from './src/hooks/useCalculator';
import ErrorBoundary from './src/components/ErrorBoundary';
import StandardScreen from './src/screens/StandardScreen';
// import ScientificScreen from './src/screens/ScientificScreen';
// import HistoryScreen from './src/screens/HistoryScreen';
import GoldSilverScreen from './src/screens/GoldSilverScreen';
// import InstagramTrackerScreen from './src/screens/InstagramTrackerScreen';
import ToolsScreen from './src/screens/ToolsScreen';
import CurrencyConverterScreen from './src/screens/CurrencyConverterScreen';
import UnitConverterScreen from './src/screens/UnitConverterScreen';
import TechNewsScreen from './src/screens/TechNewsScreen';
import PasswordManagerScreen from './src/screens/PasswordManagerScreen';
import DocumentManagerScreen from './src/screens/DocumentManagerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import JobsScreen from './src/screens/JobsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { Colors, FontSize } from './src/config/theme';

const INITIAL_LAYOUT = { width: Dimensions.get('window').width };

const ROUTES = [
    { key: 'standard',  title: 'Standard'  },
    // { key: 'scientific',title: 'Scientific' },
    // { key: 'history',   title: 'History'   },
    { key: 'metals',    title: 'Metals'    },
    // { key: 'tracker',   title: 'Tracker'   },
    { key: 'tools',     title: 'Tools'     },
    { key: 'currency',  title: '🌍 Currency' },
    { key: 'units',     title: '📐 Units'    },
    { key: 'news',      title: '📰 Tech'      },
    { key: 'passwords', title: '🔐 Vault'     },
    { key: 'documents', title: '📁 Docs'      },
    { key: 'profile',   title: '👤 Profile'   },
    { key: 'jobs',      title: '💼 Jobs'      },
    { key: 'settings',  title: '⚙️ Settings'  },
] as const;

type RouteKey = typeof ROUTES[number]['key'];

export default function App() {
    const standardCalc = useCalculator('calc_history_standard_v1');
    const [index, setIndex] = React.useState(0);

    const renderScene = React.useCallback(
        ({ route }: { route: { key: string } }) => {
            try {
                switch (route.key as RouteKey) {
                    case 'standard':
                        return (
                            <ErrorBoundary>
                                <StandardScreen
                                    expression={standardCalc.expression}
                                    result={standardCalc.result}
                                    actions={standardCalc}
                                    history={standardCalc.history}
                                    onHistorySelect={standardCalc.loadFromHistory}
                                    onHistoryClear={standardCalc.clearHistory}
                                />
                            </ErrorBoundary>
                        );
                    // case 'scientific':
                    //     return (
                    //         <ErrorBoundary>
                    //             <ScientificScreen
                    //                 expression={scientificCalc.expression}
                    //                 result={scientificCalc.result}
                    //                 actions={scientificCalc}
                    //             />
                    //         </ErrorBoundary>
                    //     );
                    // case 'history':
                    //     return (
                    //         <ErrorBoundary>
                    //             <HistoryScreen
                    //                 history={combinedHistory}
                    //                 onSelect={handleHistorySelect}
                    //                 onClear={handleHistoryClear}
                    //             />
                    //         </ErrorBoundary>
                    //     );
                    case 'metals':
                        return (
                            <ErrorBoundary>
                                <GoldSilverScreen />
                            </ErrorBoundary>
                        );
                    // case 'tracker':
                    //     return (
                    //         <ErrorBoundary>
                    //             <InstagramTrackerScreen />
                    //         </ErrorBoundary>
                    //     );
                    case 'tools':
                        return (
                            <ErrorBoundary>
                                <ToolsScreen />
                            </ErrorBoundary>
                        );
                    case 'currency':
                        return (
                            <ErrorBoundary>
                                <CurrencyConverterScreen />
                            </ErrorBoundary>
                        );
                    case 'units':
                        return (
                            <ErrorBoundary>
                                <UnitConverterScreen />
                            </ErrorBoundary>
                        );
                    case 'news':
                        return (
                            <ErrorBoundary>
                                <TechNewsScreen />
                            </ErrorBoundary>
                        );
                    case 'passwords':
                        return (
                            <ErrorBoundary>
                                <PasswordManagerScreen />
                            </ErrorBoundary>
                        );
                    case 'documents':
                        return (
                            <ErrorBoundary>
                                <DocumentManagerScreen />
                            </ErrorBoundary>
                        );
                    case 'profile':
                        return (
                            <ErrorBoundary>
                                <ProfileScreen isFocused={index === ROUTES.findIndex(r => r.key === 'profile')} />
                            </ErrorBoundary>
                        );
                    case 'jobs':
                        return (
                            <ErrorBoundary>
                                <JobsScreen />
                            </ErrorBoundary>
                        );
                    case 'settings':
                        return (
                            <ErrorBoundary>
                                <SettingsScreen />
                            </ErrorBoundary>
                        );
                    default:
                        return null;
                }
            } catch {
                return null;
            }
        },
        [standardCalc],
    );

    return (
        <ErrorBoundary fallbackMessage="The calculator encountered an unexpected error. Tap Try Again to restart.">
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
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    tabBar: {
        backgroundColor: Colors.tabBar,
        borderBottomWidth: 1,
        borderBottomColor: Colors.tabBarBorder,
    },
    tabItem: {
        width: 'auto',
        paddingHorizontal: 14,
        minWidth: 80,
    },
    indicator: {
        backgroundColor: Colors.accent,
        height: 3,
    },
    tabLabel: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
});
