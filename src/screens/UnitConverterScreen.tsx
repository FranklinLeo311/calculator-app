import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Dimensions,
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

// ─── Conversion tables ──────────────────────────────────────────────────────

const LENGTH: Record<string, number> = {
    km: 1000, m: 1, cm: 0.01, mm: 0.001, mile: 1609.34, ft: 0.3048, in: 0.0254, yard: 0.9144,
};
const WEIGHT: Record<string, number> = {
    kg: 1000, g: 1, mg: 0.001, tonne: 1e6, lb: 453.592, oz: 28.3495,
};
const SPEED: Record<string, number> = {
    'km/h': 1 / 3.6, 'm/s': 1, mph: 0.44704, knot: 0.514444,
};
const AREA: Record<string, number> = {
    'm²': 1, 'km²': 1e6, 'ft²': 0.092903, acre: 4046.86, hectare: 10000,
};
const VOLUME: Record<string, number> = {
    L: 1000, mL: 1, 'm³': 1e6, gallon: 3785.41, 'fl oz': 29.5735,
};
const DATA: Record<string, number> = {
    B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776,
};

type Category = {
    key: string;
    label: string;
    emoji: string;
    color: string;
    units: Record<string, number> | null; // null = temperature (special)
    unitList: string[];
};

const CATEGORIES: Category[] = [
    { key: 'length',  label: 'Length',  emoji: '📏', color: Colors.chart.blue,   units: LENGTH, unitList: Object.keys(LENGTH) },
    { key: 'weight',  label: 'Weight',  emoji: '⚖️', color: Colors.chart.amber,  units: WEIGHT, unitList: Object.keys(WEIGHT) },
    { key: 'temp',    label: 'Temp',    emoji: '🌡',  color: Colors.chart.red,    units: null,   unitList: ['°C', '°F', 'K'] },
    { key: 'speed',   label: 'Speed',   emoji: '🚀', color: Colors.chart.purple, units: SPEED,  unitList: Object.keys(SPEED) },
    { key: 'area',    label: 'Area',    emoji: '📐', color: Colors.chart.cyan,   units: AREA,   unitList: Object.keys(AREA) },
    { key: 'volume',  label: 'Volume',  emoji: '💧', color: Colors.chart.green,  units: VOLUME, unitList: Object.keys(VOLUME) },
    { key: 'data',    label: 'Data',    emoji: '💾', color: Colors.chart.pink,   units: DATA,   unitList: Object.keys(DATA) },
];

// ─── Temperature helpers ─────────────────────────────────────────────────────

function tempConvert(value: number, from: string, to: string): number {
    if (from === to) return value;
    // Convert to Celsius first
    let celsius: number;
    if (from === '°C') celsius = value;
    else if (from === '°F') celsius = (value - 32) * 5 / 9;
    else celsius = value - 273.15; // K

    if (to === '°C') return celsius;
    if (to === '°F') return celsius * 9 / 5 + 32;
    return celsius + 273.15; // K
}

// ─── Generic converter ───────────────────────────────────────────────────────

function convert(value: number, from: string, to: string, table: Record<string, number>): number {
    const base = value * table[from];
    return base / table[to];
}

// ─── Format ──────────────────────────────────────────────────────────────────

function smartFormat(val: number): string {
    if (!isFinite(val)) return '—';
    if (val === 0) return '0';
    const abs = Math.abs(val);
    if (abs >= 1e6 || (abs < 0.0001 && abs > 0)) {
        return val.toExponential(4);
    }
    // Up to 6 significant figures
    const str = parseFloat(val.toPrecision(6)).toString();
    return str;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function UnitConverterScreen() {
    const [categoryKey, setCategoryKey] = React.useState('length');
    const [fromUnit, setFromUnit] = React.useState('m');
    const [toUnit, setToUnit] = React.useState('ft');
    const [inputValue, setInputValue] = React.useState('1');
    const [fromPickerOpen, setFromPickerOpen] = React.useState(false);
    const [toPickerOpen, setToPickerOpen] = React.useState(false);

    const category = React.useMemo(
        () => CATEGORIES.find(c => c.key === categoryKey)!,
        [categoryKey],
    );

    // When category changes, reset units to first two in list
    React.useEffect(() => {
        const list = category.unitList;
        setFromUnit(list[0]);
        setToUnit(list.length > 1 ? list[1] : list[0]);
    }, [category]);

    const computeResult = React.useCallback(
        (val: string, from: string, to: string): string => {
            const num = parseFloat(val);
            if (isNaN(num)) return '—';
            let result: number;
            if (category.key === 'temp') {
                result = tempConvert(num, from, to);
            } else {
                result = convert(num, from, to, category.units!);
            }
            return smartFormat(result);
        },
        [category],
    );

    const result = computeResult(inputValue, fromUnit, toUnit);

    const handleSwap = () => {
        setFromUnit(toUnit);
        setToUnit(fromUnit);
    };

    const handleCategoryChange = (key: string) => {
        setCategoryKey(key);
        setInputValue('1');
    };

    // Quick reference: all units converted from fromUnit for current inputValue
    const quickRef = React.useMemo(() => {
        return category.unitList.map(unit => ({
            unit,
            value: computeResult(inputValue, fromUnit, unit),
        }));
    }, [category, inputValue, fromUnit, computeResult]);

    const screenWidth = Dimensions.get('window').width;
    const colWidth = (screenWidth - Spacing.xl * 2 - Spacing.lg) / 2;

    return (
        <GradientBackground>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Text style={styles.title}>Unit Converter</Text>

                {/* Category Chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipsScroll}
                    contentContainerStyle={styles.chipsContent}
                >
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat.key}
                            style={[
                                styles.chip,
                                categoryKey === cat.key && { backgroundColor: cat.color, borderColor: cat.color },
                            ]}
                            onPress={() => handleCategoryChange(cat.key)}
                        >
                            <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                            <Text
                                style={[
                                    styles.chipLabel,
                                    categoryKey === cat.key && styles.chipLabelActive,
                                ]}
                            >
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Input Card */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>FROM</Text>
                    <View style={styles.cardRow}>
                        <View style={styles.unitPickerWrap}>
                            <TouchableOpacity
                                style={[styles.unitPickerBtn, { borderColor: category.color }]}
                                onPress={() => { setFromPickerOpen(v => !v); setToPickerOpen(false); }}
                            >
                                <Text style={[styles.unitPickerText, { color: category.color }]}>
                                    {fromUnit}
                                </Text>
                                <Text style={styles.dropArrow}>▾</Text>
                            </TouchableOpacity>
                            {fromPickerOpen && (
                                <View style={styles.dropdownList}>
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                                        {category.unitList.map(u => (
                                            <TouchableOpacity
                                                key={u}
                                                style={[
                                                    styles.dropdownItem,
                                                    fromUnit === u && styles.dropdownItemActive,
                                                ]}
                                                onPress={() => { setFromUnit(u); setFromPickerOpen(false); }}
                                            >
                                                <Text style={[
                                                    styles.dropdownItemText,
                                                    fromUnit === u && { color: category.color },
                                                ]}>
                                                    {u}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                        <TextInput
                            style={styles.valueInput}
                            value={inputValue}
                            onChangeText={setInputValue}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={Colors.text.muted}
                            selectionColor={category.color}
                        />
                    </View>
                </View>

                {/* Swap + Arrow */}
                <View style={styles.arrowRow}>
                    <View style={styles.arrowLine} />
                    <TouchableOpacity
                        style={[styles.swapBtn, { borderColor: category.color, backgroundColor: `${category.color}22` }]}
                        onPress={handleSwap}
                    >
                        <Text style={[styles.swapIcon, { color: category.color }]}>⇄</Text>
                    </TouchableOpacity>
                    <View style={styles.arrowLine} />
                </View>

                {/* Output Card */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>TO</Text>
                    <View style={styles.cardRow}>
                        <View style={styles.unitPickerWrap}>
                            <TouchableOpacity
                                style={[styles.unitPickerBtn, { borderColor: category.color }]}
                                onPress={() => { setToPickerOpen(v => !v); setFromPickerOpen(false); }}
                            >
                                <Text style={[styles.unitPickerText, { color: category.color }]}>
                                    {toUnit}
                                </Text>
                                <Text style={styles.dropArrow}>▾</Text>
                            </TouchableOpacity>
                            {toPickerOpen && (
                                <View style={styles.dropdownList}>
                                    <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                                        {category.unitList.map(u => (
                                            <TouchableOpacity
                                                key={u}
                                                style={[
                                                    styles.dropdownItem,
                                                    toUnit === u && styles.dropdownItemActive,
                                                ]}
                                                onPress={() => { setToUnit(u); setToPickerOpen(false); }}
                                            >
                                                <Text style={[
                                                    styles.dropdownItemText,
                                                    toUnit === u && { color: category.color },
                                                ]}>
                                                    {u}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.resultText, { color: category.color }]}>{result}</Text>
                    </View>
                </View>

                {/* Quick Reference */}
                <Text style={styles.sectionTitle}>Quick Reference</Text>
                <Text style={styles.sectionSub}>
                    {inputValue || '1'} {fromUnit} equals...
                </Text>
                <View style={styles.quickGrid}>
                    {quickRef.map(({ unit, value }) => (
                        <View key={unit} style={[styles.quickCell, { width: colWidth }]}>
                            <Text style={[styles.quickUnit, { color: category.color }]}>{unit}</Text>
                            <Text style={styles.quickValue}>{value}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.xl, paddingBottom: 40 },

    title: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: Spacing.xl,
    },

    // Chips
    chipsScroll: { marginBottom: Spacing.xl, marginHorizontal: -Spacing.xl },
    chipsContent: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        borderRadius: 20,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        gap: Spacing.xs,
    },
    chipEmoji: { fontSize: 15 },
    chipLabel: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.text.secondary,
    },
    chipLabelActive: { color: Colors.text.white },

    // Cards
    card: {
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        borderRadius: Radii.xl,
        padding: Spacing.xl,
        marginBottom: Spacing.md,
    },
    cardLabel: {
        fontSize: FontSize.xs,
        fontWeight: '700',
        color: Colors.text.muted,
        letterSpacing: 1.5,
        marginBottom: Spacing.lg,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },

    unitPickerWrap: { position: 'relative', zIndex: 10 },
    unitPickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: Radii.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        minWidth: 70,
    },
    unitPickerText: {
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    dropArrow: { fontSize: FontSize.xs, color: Colors.text.secondary },

    dropdownList: {
        position: 'absolute',
        top: '110%',
        left: 0,
        minWidth: 100,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        borderRadius: Radii.md,
        zIndex: 999,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    dropdownItem: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    dropdownItemActive: { backgroundColor: Colors.accentSoft },
    dropdownItemText: {
        fontSize: FontSize.md,
        color: Colors.text.primary,
        fontWeight: '500',
    },

    valueInput: {
        flex: 1,
        fontSize: 34,
        fontWeight: '300',
        color: Colors.text.primary,
        padding: 0,
        textAlign: 'right',
    },
    resultText: {
        flex: 1,
        fontSize: 34,
        fontWeight: '300',
        textAlign: 'right',
    },

    // Swap row
    arrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: -Spacing.xs,
        zIndex: 1,
        marginBottom: Spacing.md,
    },
    arrowLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.divider,
    },
    swapBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: Spacing.lg,
    },
    swapIcon: {
        fontSize: 20,
        fontWeight: '700',
    },

    // Quick Reference
    sectionTitle: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.text.secondary,
        letterSpacing: 0.5,
        marginTop: Spacing.xl,
        marginBottom: Spacing.xs,
    },
    sectionSub: {
        fontSize: FontSize.sm,
        color: Colors.text.muted,
        marginBottom: Spacing.lg,
    },
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.lg,
    },
    quickCell: {
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        borderRadius: Radii.lg,
        padding: Spacing.lg,
    },
    quickUnit: {
        fontSize: FontSize.sm,
        fontWeight: '700',
        marginBottom: 2,
    },
    quickValue: {
        fontSize: FontSize.md,
        color: Colors.text.primary,
        fontWeight: '500',
    },
});
