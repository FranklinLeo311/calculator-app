import React from 'react';
import { SafeAreaView, StyleSheet, Dimensions } from 'react-native';
import { TabView, TabBar } from 'react-native-tab-view';
import useCalculator from './src/hooks/useCalculator';
import ErrorBoundary from './src/components/ErrorBoundary';
import StandardScreen from './src/screens/StandardScreen';
import ScientificScreen from './src/screens/ScientificScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { Colors, FontSize } from './src/config/theme';

const INITIAL_LAYOUT = { width: Dimensions.get('window').width };

const ROUTES = [
    { key: 'standard',   title: 'Standard' },
    { key: 'scientific', title: 'Scientific' },
    { key: 'history',    title: 'History' },
] as const;

type RouteKey = typeof ROUTES[number]['key'];

export default function App() {
    const standardCalc = useCalculator('calc_history_standard_v1');
    const scientificCalc = useCalculator('calc_history_scientific_v1');
    const [index, setIndex] = React.useState(0);

    const renderScene = ({ route }: { route: { key: string } }) => {
        try {
            switch (route.key as RouteKey) {
                case 'standard':
                    return (
                        <ErrorBoundary>
                            <StandardScreen
                                expression={standardCalc.expression}
                                result={standardCalc.result}
                                actions={standardCalc}
                            />
                        </ErrorBoundary>
                    );
                case 'scientific':
                    return (
                        <ErrorBoundary>
                            <ScientificScreen
                                expression={scientificCalc.expression}
                                result={scientificCalc.result}
                                actions={scientificCalc}
                            />
                        </ErrorBoundary>
                    );
                case 'history': {
                    const combinedHistory = [
                        ...standardCalc.history,
                        ...scientificCalc.history,
                    ].sort((a, b) => b.time - a.time);
                    return (
                        <ErrorBoundary>
                            <HistoryScreen
                                history={combinedHistory}
                                onSelect={item => {
                                    standardCalc.loadFromHistory(item);
                                    scientificCalc.loadFromHistory(item);
                                }}
                                onClear={() => {
                                    standardCalc.clearHistory();
                                    scientificCalc.clearHistory();
                                }}
                            />
                        </ErrorBoundary>
                    );
                }
                default:
                    return null;
            }
        } catch {
            return null;
        }
    };

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
                            indicatorStyle={styles.indicator}
                            style={styles.tabBar}
                            activeColor={Colors.accent}
                            inactiveColor={Colors.text.secondary}
                            labelStyle={styles.tabLabel}
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
    indicator: {
        backgroundColor: Colors.accent,
        height: 4,
    },
    tabLabel: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
});
