import React from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import InputField from '../../components/InputField';
import { fetchJson } from '../../utils/fetchWithTimeout';
import { storageGet, storageSet } from '../../utils/storage';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';

type Props = { onBack: () => void };

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SGD', 'SAR', 'JPY', 'CAD'] as const;
type CurrencyCode = typeof CURRENCIES[number];

const CURRENCY_META: Record<CurrencyCode, { flag: string; name: string }> = {
    USD: { flag: '🇺🇸', name: 'US Dollar' },
    EUR: { flag: '🇪🇺', name: 'Euro' },
    GBP: { flag: '🇬🇧', name: 'British Pound' },
    AED: { flag: '🇦🇪', name: 'UAE Dirham' },
    SGD: { flag: '🇸🇬', name: 'Singapore Dollar' },
    SAR: { flag: '🇸🇦', name: 'Saudi Riyal' },
    JPY: { flag: '🇯🇵', name: 'Japanese Yen' },
    CAD: { flag: '🇨🇦', name: 'Canadian Dollar' },
};

const CACHE_KEY   = 'currency_rates_cache_v1';
const CACHE_TTL   = 6 * 60 * 60 * 1000; // 6 hours
type RateMap = Record<string, number>;
type Cache   = { rates: RateMap; fetchedAt: number };

async function loadRates(): Promise<RateMap> {
    const cached = await storageGet<Cache>(CACHE_KEY);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.rates;

    // Frankfurter gives free CORS-enabled exchange rates
    const data = await fetchJson<{ rates: RateMap }>(
        `https://api.frankfurter.app/latest?from=INR&to=${CURRENCIES.join(',')}`
    );
    await storageSet(CACHE_KEY, { rates: data.rates, fetchedAt: Date.now() });
    return data.rates;
}

export default function CurrencyScreen({ onBack }: Props) {
    const [amount, setAmount]       = React.useState('1');
    const [baseCurrency, setBase]   = React.useState<CurrencyCode>('USD');
    const [rates, setRates]         = React.useState<RateMap | null>(null);
    const [loading, setLoading]     = React.useState(true);
    const [error, setError]         = React.useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = React.useState<number>(0);

    React.useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const r = await loadRates();
                setRates(r);
                const cached = await storageGet<Cache>(CACHE_KEY);
                if (cached) setUpdatedAt(cached.fetchedAt);
            } catch (err) {
                const stale = await storageGet<Cache>(CACHE_KEY).catch(() => null);
                if (stale) {
                    setRates(stale.rates);
                    setUpdatedAt(stale.fetchedAt);
                    setError('Showing cached rates');
                } else {
                    setError('Unable to fetch rates');
                }
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Convert `amount` in `baseCurrency` to INR
    const inrAmount = React.useMemo(() => {
        const a = parseFloat(amount);
        if (!rates || isNaN(a) || a <= 0) return null;
        const rateForBase = rates[baseCurrency]; // how many of baseCurrency per 1 INR
        if (!rateForBase) return null;
        return a / rateForBase; // INR amount
    }, [amount, baseCurrency, rates]);

    function fmtInr(v: number) {
        return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    }

    function fmtTime(ms: number) {
        return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.backRow}>
                    <Pressable onPress={onBack} style={styles.backBtn}>
                        <Text style={styles.backText}>‹ Back</Text>
                    </Pressable>
                </View>
                <Text style={styles.title}>Currency → INR</Text>
                <Text style={styles.subtitle}>
                    {updatedAt ? `Rates updated at ${fmtTime(updatedAt)}` : 'Live exchange rates'}
                </Text>

                {error ? (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {/* Currency selector */}
                <Text style={styles.sectionLabel}>From Currency</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.currencyRow}
                >
                    {CURRENCIES.map(c => (
                        <Pressable
                            key={c}
                            onPress={() => setBase(c)}
                            style={[
                                styles.currencyBtn,
                                baseCurrency === c && { backgroundColor: Colors.tool.currency + '25', borderColor: Colors.tool.currency },
                            ]}
                        >
                            <Text style={styles.currencyFlag}>{CURRENCY_META[c].flag}</Text>
                            <Text style={[styles.currencyCode, baseCurrency === c && { color: Colors.tool.currency }]}>
                                {c}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>

                <InputField
                    label={`Amount (${baseCurrency})`}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="1"
                />

                {loading && (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color={Colors.tool.currency} />
                    </View>
                )}

                {inrAmount !== null && (
                    <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>
                            {amount} {baseCurrency} =
                        </Text>
                        <Text style={[styles.resultValue, { color: Colors.tool.currency }]}>
                            {fmtInr(inrAmount)}
                        </Text>
                        <Text style={styles.resultRate}>
                            1 {baseCurrency} = {fmtInr(1 / (rates?.[baseCurrency] ?? 1))}
                        </Text>
                    </View>
                )}

                {/* All currencies at once */}
                {rates && inrAmount !== null && (
                    <View style={styles.allRates}>
                        <Text style={styles.sectionLabel}>All Rates → INR</Text>
                        {CURRENCIES.map(c => {
                            const rate = rates[c];
                            if (!rate) return null;
                            const inr = 1 / rate;
                            return (
                                <View key={c} style={styles.rateRow}>
                                    <Text style={styles.rateFlag}>{CURRENCY_META[c].flag}</Text>
                                    <Text style={styles.rateCode}>{c}</Text>
                                    <Text style={styles.rateName}>{CURRENCY_META[c].name}</Text>
                                    <Text style={[styles.rateValue, { color: Colors.tool.currency }]}>
                                        {fmtInr(inr)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    content: { padding: Spacing.xl, paddingBottom: 40 },
    backRow: { marginBottom: Spacing.lg },
    backBtn: { alignSelf: 'flex-start' },
    backText: { color: Colors.tool.currency, fontSize: FontSize.body, fontWeight: '600' },
    title: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.xs },
    subtitle: { color: Colors.text.muted, fontSize: FontSize.xs, marginBottom: Spacing.xl },
    errorBanner: { backgroundColor: Colors.errorSoft, borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.lg },
    errorText: { color: Colors.error, fontSize: FontSize.sm },
    sectionLabel: {
        color: Colors.text.secondary,
        fontSize: FontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: Spacing.sm,
    },
    currencyRow: { gap: Spacing.sm, marginBottom: Spacing.xl, paddingBottom: 2 },
    currencyBtn: {
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        minWidth: 56,
    },
    currencyFlag: { fontSize: 20 },
    currencyCode: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
    loadingBox: { paddingVertical: Spacing.xl, alignItems: 'center' },
    resultBox: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.tool.currency + '40',
        padding: Spacing.xl,
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    resultLabel: { color: Colors.text.secondary, fontSize: FontSize.body },
    resultValue: { fontSize: 36, fontWeight: '700', marginVertical: Spacing.sm },
    resultRate: { color: Colors.text.muted, fontSize: FontSize.sm },
    allRates: { gap: Spacing.xs },
    rateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    rateFlag: { fontSize: 18, marginRight: Spacing.md },
    rateCode: { color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '700', width: 36 },
    rateName: { flex: 1, color: Colors.text.muted, fontSize: FontSize.xs },
    rateValue: { fontSize: FontSize.body, fontWeight: '700' },
});
