import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ScrollView,
    Modal,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';
import { fetchJson } from '../utils/fetchWithTimeout';

const CURRENCY_NAMES: Record<string, string> = {
    USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', INR: 'Indian Rupee',
    JPY: 'Japanese Yen', CNY: 'Chinese Yuan', AUD: 'Australian Dollar',
    CAD: 'Canadian Dollar', CHF: 'Swiss Franc', HKD: 'Hong Kong Dollar',
    SGD: 'Singapore Dollar', MYR: 'Malaysian Ringgit', AED: 'UAE Dirham',
    SAR: 'Saudi Riyal', KWD: 'Kuwaiti Dinar', THB: 'Thai Baht',
    IDR: 'Indonesian Rupiah', ZAR: 'South African Rand', BRL: 'Brazilian Real',
    MXN: 'Mexican Peso',
};

const CURRENCY_FLAGS: Record<string, string> = {
    USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', INR: '🇮🇳', JPY: '🇯🇵', CNY: '🇨🇳',
    AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', HKD: '🇭🇰', SGD: '🇸🇬', MYR: '🇲🇾',
    AED: '🇦🇪', SAR: '🇸🇦', KWD: '🇰🇼', THB: '🇹🇭', IDR: '🇮🇩', ZAR: '🇿🇦',
    BRL: '🇧🇷', MXN: '🇲🇽',
};

const CURRENCIES = Object.keys(CURRENCY_NAMES);

type ApiResponse = {
    result: string;
    rates: Record<string, number>;
    time_last_update_utc?: string;
};

function formatNumber(val: number): string {
    if (!isFinite(val)) return '—';
    if (val === 0) return '0';
    if (val > 1e9 || (val < 0.0001 && val > 0)) return val.toExponential(4);
    if (val >= 1000) return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return val.toPrecision(6).replace(/\.?0+$/, '');
}

export default function CurrencyConverterScreen() {
    const [rates, setRates] = React.useState<Record<string, number>>({});
    const [fromCurrency, setFromCurrency] = React.useState('USD');
    const [toCurrency, setToCurrency] = React.useState('INR');
    const [amount, setAmount] = React.useState('1');
    const [pickerFor, setPickerFor] = React.useState<'from' | 'to' | null>(null);
    const [search, setSearch] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);

    const fetchRates = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchJson<ApiResponse>(
                'https://open.er-api.com/v6/latest/USD',
            );
            if (data.result === 'success' && data.rates) {
                setRates(data.rates);
                setLastUpdated(data.time_last_update_utc ?? null);
            } else {
                setError('Failed to load rates');
            }
        } catch (e: any) {
            setError(e?.message ?? 'Network error');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchRates();
    }, [fetchRates]);

    const convertAmount = React.useCallback(
        (val: string, from: string, to: string): string => {
            const num = parseFloat(val);
            if (!num || !rates[from] || !rates[to]) return '—';
            const result = num * (rates[to] / rates[from]);
            return formatNumber(result);
        },
        [rates],
    );

    const convertedValue = convertAmount(amount, fromCurrency, toCurrency);

    const handleSwap = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    const filteredCurrencies = React.useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return CURRENCIES;
        return CURRENCIES.filter(
            c =>
                c.toLowerCase().includes(q) ||
                CURRENCY_NAMES[c].toLowerCase().includes(q),
        );
    }, [search]);

    const allRatesRows = React.useMemo(() => {
        return CURRENCIES.filter(c => c !== fromCurrency).map(c => {
            const rate = rates[fromCurrency] && rates[c]
                ? rates[c] / rates[fromCurrency]
                : null;
            return { code: c, rate };
        });
    }, [rates, fromCurrency]);

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
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Currency Converter</Text>
                        {lastUpdated && (
                            <Text style={styles.subtitle}>
                                Updated: {new Date(lastUpdated).toLocaleDateString()}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.refreshBtn}
                        onPress={fetchRates}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={Colors.accent} />
                        ) : (
                            <Text style={styles.refreshIcon}>↻</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {error && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* Converter Cards */}
                <View style={styles.converterSection}>
                    {/* From Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>FROM</Text>
                        <TouchableOpacity
                            style={styles.currencySelector}
                            onPress={() => { setSearch(''); setPickerFor('from'); }}
                        >
                            <Text style={styles.currencyFlag}>{CURRENCY_FLAGS[fromCurrency]}</Text>
                            <Text style={styles.currencyCode}>{fromCurrency}</Text>
                            <Text style={styles.dropArrow}>▾</Text>
                        </TouchableOpacity>
                        <TextInput
                            style={styles.amountInput}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={Colors.text.muted}
                            selectionColor={Colors.accent}
                        />
                        <Text style={styles.currencyName}>{CURRENCY_NAMES[fromCurrency]}</Text>
                    </View>

                    {/* Swap */}
                    <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}>
                        <Text style={styles.swapIcon}>⇄</Text>
                    </TouchableOpacity>

                    {/* To Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>TO</Text>
                        <TouchableOpacity
                            style={styles.currencySelector}
                            onPress={() => { setSearch(''); setPickerFor('to'); }}
                        >
                            <Text style={styles.currencyFlag}>{CURRENCY_FLAGS[toCurrency]}</Text>
                            <Text style={styles.currencyCode}>{toCurrency}</Text>
                            <Text style={styles.dropArrow}>▾</Text>
                        </TouchableOpacity>
                        <Text style={styles.resultValue}>{convertedValue}</Text>
                        <Text style={styles.currencyName}>{CURRENCY_NAMES[toCurrency]}</Text>
                    </View>
                </View>

                {/* Rate hint */}
                {rates[fromCurrency] && rates[toCurrency] && (
                    <View style={styles.rateHint}>
                        <Text style={styles.rateHintText}>
                            1 {fromCurrency} = {formatNumber(rates[toCurrency] / rates[fromCurrency])} {toCurrency}
                        </Text>
                    </View>
                )}

                {/* All Rates Grid */}
                <Text style={styles.sectionTitle}>All Rates (1 {fromCurrency})</Text>
                {loading && !Object.keys(rates).length ? (
                    <View style={styles.skeletonWrap}>
                        {Array.from({ length: 10 }).map((_, i) => (
                            <View key={i} style={[styles.skeletonItem, { width: colWidth }]} />
                        ))}
                    </View>
                ) : (
                    <View style={styles.ratesGrid}>
                        {allRatesRows.map(({ code, rate }) => (
                            <View key={code} style={[styles.rateCell, { width: colWidth }]}>
                                <Text style={styles.rateCellFlag}>{CURRENCY_FLAGS[code]}</Text>
                                <View style={styles.rateCellInfo}>
                                    <Text style={styles.rateCellCode}>{code}</Text>
                                    <Text style={styles.rateCellValue}>
                                        {rate !== null ? formatNumber(rate) : '—'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Picker Modal */}
            <Modal
                visible={pickerFor !== null}
                animationType="slide"
                transparent
                onRequestClose={() => setPickerFor(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Select {pickerFor === 'from' ? 'From' : 'To'} Currency
                            </Text>
                            <TouchableOpacity
                                onPress={() => setPickerFor(null)}
                                style={styles.modalClose}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.searchInput}
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search currency..."
                            placeholderTextColor={Colors.text.muted}
                            autoFocus
                            selectionColor={Colors.accent}
                        />
                        <FlatList
                            data={filteredCurrencies}
                            keyExtractor={item => item}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.pickerItem,
                                        (pickerFor === 'from' ? fromCurrency : toCurrency) === item &&
                                        styles.pickerItemActive,
                                    ]}
                                    onPress={() => {
                                        if (pickerFor === 'from') setFromCurrency(item);
                                        else setToCurrency(item);
                                        setPickerFor(null);
                                        setSearch('');
                                    }}
                                >
                                    <Text style={styles.pickerFlag}>{CURRENCY_FLAGS[item]}</Text>
                                    <View style={styles.pickerTextWrap}>
                                        <Text style={styles.pickerCode}>{item}</Text>
                                        <Text style={styles.pickerName}>{CURRENCY_NAMES[item]}</Text>
                                    </View>
                                    {(pickerFor === 'from' ? fromCurrency : toCurrency) === item && (
                                        <Text style={styles.pickerCheck}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.xl, paddingBottom: 40 },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    subtitle: {
        fontSize: FontSize.xs,
        color: Colors.text.muted,
        marginTop: 2,
    },
    refreshBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    refreshIcon: {
        fontSize: 22,
        color: Colors.accent,
        fontWeight: '600',
    },

    errorBox: {
        backgroundColor: Colors.errorSoft,
        borderWidth: 1,
        borderColor: Colors.error,
        borderRadius: Radii.md,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    errorText: {
        color: Colors.error,
        fontSize: FontSize.sm,
        textAlign: 'center',
    },

    converterSection: {
        marginBottom: Spacing.lg,
    },
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
        marginBottom: Spacing.sm,
    },
    currencySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.surfaceBorder,
        borderRadius: Radii.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        alignSelf: 'flex-start',
        marginBottom: Spacing.lg,
    },
    currencyFlag: { fontSize: 24, marginRight: Spacing.sm },
    currencyCode: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.text.primary,
        marginRight: Spacing.sm,
    },
    dropArrow: { fontSize: FontSize.sm, color: Colors.text.secondary },
    amountInput: {
        fontSize: 36,
        fontWeight: '300',
        color: Colors.text.primary,
        padding: 0,
        marginBottom: Spacing.xs,
    },
    resultValue: {
        fontSize: 36,
        fontWeight: '300',
        color: Colors.chart.green,
        marginBottom: Spacing.xs,
    },
    currencyName: {
        fontSize: FontSize.sm,
        color: Colors.text.muted,
    },

    swapBtn: {
        alignSelf: 'center',
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.accentSoft,
        borderWidth: 1,
        borderColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: -Spacing.sm,
        zIndex: 1,
    },
    swapIcon: {
        fontSize: 22,
        color: Colors.accent,
        fontWeight: '700',
    },

    rateHint: {
        backgroundColor: Colors.accentSoft,
        borderRadius: Radii.md,
        padding: Spacing.lg,
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    rateHintText: {
        fontSize: FontSize.md,
        color: Colors.accent,
        fontWeight: '600',
    },

    sectionTitle: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.text.secondary,
        letterSpacing: 0.5,
        marginBottom: Spacing.lg,
    },

    skeletonWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.lg,
    },
    skeletonItem: {
        height: 60,
        backgroundColor: Colors.card,
        borderRadius: Radii.md,
        opacity: 0.5,
    },

    ratesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.lg,
    },
    rateCell: {
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        borderRadius: Radii.lg,
        padding: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
    },
    rateCellFlag: { fontSize: 20, marginRight: Spacing.sm },
    rateCellInfo: { flex: 1 },
    rateCellCode: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.text.secondary,
    },
    rateCellValue: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.chart.green,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingBottom: 30,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    modalTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    modalClose: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCloseText: {
        fontSize: FontSize.sm,
        color: Colors.text.secondary,
        fontWeight: '700',
    },
    searchInput: {
        backgroundColor: Colors.input,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: Radii.lg,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        fontSize: FontSize.md,
        color: Colors.text.primary,
        margin: Spacing.xl,
        marginTop: Spacing.lg,
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    pickerItemActive: {
        backgroundColor: Colors.accentSoft,
    },
    pickerFlag: { fontSize: 22, marginRight: Spacing.lg },
    pickerTextWrap: { flex: 1 },
    pickerCode: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    pickerName: {
        fontSize: FontSize.sm,
        color: Colors.text.muted,
        marginTop: 1,
    },
    pickerCheck: {
        fontSize: FontSize.md,
        color: Colors.accent,
        fontWeight: '700',
    },
});
