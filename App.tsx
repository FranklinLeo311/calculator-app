import React from 'react';
import { SafeAreaView, View, Text, Dimensions, StyleSheet, Platform } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import useCalculator from './src/hooks/useCalculator';
import Display from './src/components/Display';
import Button from './src/components/Button';
import HistoryPanel from './src/components/HistoryPanel';

let LinearGradient: any = View;
if (Platform.OS !== 'web') {
    const LG = require('expo-linear-gradient').LinearGradient;
    LinearGradient = LG;
}

const initialLayout = { width: Dimensions.get('window').width };

export default function App() {
    const calc = useCalculator();

    const gradientProps = Platform.OS === 'web'
        ? { style: { backgroundColor: '#0f172a', flex: 1 } }
        : { colors: ['#0f172a', '#1e293b'], style: { flex: 1 } };

    const Standard = () => (
        <LinearGradient {...gradientProps}>
            <Display formula={calc.expression} result={calc.result} />
            <View style={styles.buttonContainer}>
                {/* Row 1 */}
                <View style={styles.row}>
                    <Button label="C" onPress={calc.clearEntry} className="from-red-600 to-red-700" />
                    <Button label="+/-" onPress={calc.toggleSign} className="bg-slate-700" />
                    <Button label="%" onPress={() => calc.input('%')} className="bg-slate-700" />
                    <Button label="÷" onPress={() => calc.inputOperator('÷')} className="from-orange-500 to-orange-600" />
                    <Button label="-" onPress={() => calc.inputOperator('-')} className="from-orange-500 to-orange-600" />
                </View>

                {/* Row 2 */}
                <View style={styles.row}>
                    <Button label="7" onPress={() => calc.input('7')} className="bg-slate-800" />
                    <Button label="8" onPress={() => calc.input('8')} className="bg-slate-800" />
                    <Button label="9" onPress={() => calc.input('9')} className="bg-slate-800" />
                    <Button label="×" onPress={() => calc.inputOperator('×')} className="from-orange-500 to-orange-600" />
                    <Button label="+" onPress={() => calc.inputOperator('+')} className="from-orange-500 to-orange-600" />
                </View>

                {/* Row 3 */}
                <View style={styles.row}>
                    <Button label="4" onPress={() => calc.input('4')} className="bg-slate-800" />
                    <Button label="5" onPress={() => calc.input('5')} className="bg-slate-800" />
                    <Button label="6" onPress={() => calc.input('6')} className="bg-slate-800" />
                    <Button label="=" onPress={() => calc.evaluateExpression()} className="from-green-500 to-green-600" />
                </View>

                {/* Row 4 */}
                <View style={styles.row}>
                    <Button label="1" onPress={() => calc.input('1')} className="bg-slate-800" />
                    <Button label="2" onPress={() => calc.input('2')} className="bg-slate-800" />
                    <Button label="3" onPress={() => calc.input('3')} className="bg-slate-800" />
                </View>

                {/* Row 5 */}
                <View style={styles.row}>
                    <View style={{ flex: 2 }}>
                        <Button label="0" onPress={() => calc.input('0')} className="bg-slate-800" />
                    </View>
                    <Button label="." onPress={() => calc.input('.')} className="bg-slate-800" />
                </View>
            </View>
        </LinearGradient>
    );

    const Scientific = () => (
        <LinearGradient {...gradientProps}>
            <Display formula={calc.expression} result={calc.result} />
            <View style={styles.buttonContainer}>
                {/* Row 1 */}
                <View style={styles.row}>
                    <Button label="sin" onPress={() => calc.input('sin(')} className="bg-slate-700" />
                    <Button label="cos" onPress={() => calc.input('cos(')} className="bg-slate-700" />
                    <Button label="tan" onPress={() => calc.input('tan(')} className="bg-slate-700" />
                    <Button label="π" onPress={() => calc.input('π')} className="from-purple-600 to-purple-700" />
                </View>

                {/* Row 2 */}
                <View style={styles.row}>
                    <Button label="ln" onPress={() => calc.input('ln(')} className="bg-slate-700" />
                    <Button label="log" onPress={() => calc.input('log(')} className="bg-slate-700" />
                    <Button label="x^y" onPress={() => calc.inputOperator('^')} className="bg-slate-700" />
                    <Button label="e" onPress={() => calc.input('e')} className="from-purple-600 to-purple-700" />
                </View>

                {/* Row 3 */}
                <View style={styles.row}>
                    <Button label="(" onPress={() => calc.input('(')} className="bg-slate-700" />
                    <Button label=")" onPress={() => calc.input(')')} className="bg-slate-700" />
                    <Button label="√" onPress={() => calc.input('sqrt(')} className="bg-slate-700" />
                    <Button label="^2" onPress={() => calc.input('^2')} className="bg-slate-700" />
                </View>

                {/* Row 4 */}
                <View style={styles.row}>
                    <Button label="back" onPress={calc.backspace} className="from-blue-600 to-blue-700" />
                    <Button label="AC" onPress={calc.clearEntry} className="from-red-600 to-red-700" />
                    <Button label="%" onPress={() => calc.input('%')} className="bg-slate-700" />
                    <Button label="=" onPress={() => calc.evaluateExpression()} className="from-green-500 to-green-600" />
                </View>
            </View>
        </LinearGradient>
    );

    const HistoryRoute = () => (
        <LinearGradient {...gradientProps}>
            <HistoryPanel items={calc.history} onSelect={calc.loadFromHistory} onClear={calc.clearHistory} />
        </LinearGradient>
    );

    const [index, setIndex] = React.useState(0);
    const [routes] = React.useState([
        { key: 'standard', title: 'Standard' },
        { key: 'scientific', title: 'Scientific' },
        { key: 'history', title: 'History' }
    ]);

    const renderScene = SceneMap({
        standard: Standard,
        scientific: Scientific,
        history: HistoryRoute
    });

    return (
        <SafeAreaView style={{ flex: 1 }} className="bg-dark">
            <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={initialLayout}
                renderTabBar={props => (
                    <TabBar
                        {...props}
                        indicatorStyle={{ backgroundColor: '#10b981', height: 4 }}
                        style={{ backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#334155' }}
                        activeColor='#10b981'
                        inactiveColor="#94a3b8"
                        labelStyle={styles.tabLabel}
                    />
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        flex: 1,
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 6,
        justifyContent: 'flex-end',
        paddingBottom: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 6,
        height: 44,
    },
    tabLabel: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'capitalize',
    }
});
