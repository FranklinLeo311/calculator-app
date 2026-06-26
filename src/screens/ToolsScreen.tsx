import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GradientBackground from '../components/GradientBackground';
import ToolCard from '../components/ToolCard';
import { Colors, FontSize, Radii, Spacing } from '../config/theme';
import { loadToolsOrder, saveToolsOrder } from '../utils/orderPreferences';

import CTCScreen        from './tools/CTCScreen';
import EMIScreen        from './tools/EMIScreen';
import GSTScreen        from './tools/GSTScreen';
import CurrencyScreen   from './tools/CurrencyScreen';
import AgeScreen        from './tools/AgeScreen';
import PercentageScreen from './tools/PercentageScreen';
import InterestScreen   from './tools/InterestScreen';
import DiscountScreen   from './tools/DiscountScreen';
import FDScreen         from './tools/FDScreen';
import SIPScreen        from './tools/SIPScreen';
import ProfitLossScreen from './tools/ProfitLossScreen';

type ToolId =
    | 'ctc' | 'emi' | 'gst' | 'currency' | 'age' | 'percentage'
    | 'interest' | 'discount' | 'fd' | 'sip' | 'profitloss';

const TOOLS: { id: ToolId; icon: string; title: string; description: string; color: string }[] = [
    // ─── Financial ────────────────────────────────────────────────
    { id: 'ctc',        icon: '💼', title: 'CTC Calculator',      description: 'Annual CTC ↔ Monthly in-hand (New Tax Regime, Tamil Nadu)', color: Colors.tool.ctc },
    { id: 'emi',        icon: '🏦', title: 'EMI Calculator',      description: 'Home / car / personal loan EMI with interest chart',         color: Colors.tool.emi },
    { id: 'fd',         icon: '🏧', title: 'FD Calculator',       description: 'Fixed Deposit maturity with TDS estimate & growth chart',    color: Colors.chart.blue },
    { id: 'sip',        icon: '📈', title: 'SIP Calculator',      description: 'Mutual fund SIP returns with corpus growth line chart',      color: Colors.chart.purple },
    { id: 'interest',   icon: '💰', title: 'Interest Calculator', description: 'Simple & Compound Interest with effective annual rate',      color: Colors.chart.cyan },
    { id: 'profitloss', icon: '📦', title: 'Profit & Loss',       description: 'Cost vs selling price → P&L, markup %, margin %',          color: Colors.chart.green },
    // ─── Tax & Shopping ───────────────────────────────────────────
    { id: 'gst',        icon: '📋', title: 'GST Calculator',      description: 'Ex-GST / Inc-GST with CGST + SGST split, 5/12/18/28%',      color: Colors.tool.gst },
    { id: 'discount',   icon: '🏷️', title: 'Discount Calculator', description: 'Original price + discount % → final price & savings',      color: Colors.chart.amber },
    { id: 'percentage', icon: '📊', title: 'Percentage Tools',    description: 'X% of Y · what % is X of Y · % increase / decrease',        color: Colors.tool.percentage },
    // ─── Utility ──────────────────────────────────────────────────
    { id: 'currency',   icon: '💱', title: 'Currency → INR',      description: 'USD, EUR, GBP, AED, SGD and more → ₹ (live rates)',         color: Colors.tool.currency },
    { id: 'age',        icon: '🎂', title: 'Age Calculator',      description: 'Exact age in years / months / days + next birthday',        color: Colors.tool.age },
];

const DEFAULT_ORDER = TOOLS.map(t => t.id);

export default function ToolsScreen() {
    const [active,       setActive]       = useState<ToolId | null>(null);
    const [toolOrder,    setToolOrder]    = useState<string[]>(DEFAULT_ORDER);
    const [editingOrder, setEditingOrder] = useState(false);

    useEffect(() => {
        loadToolsOrder().then(saved => {
            if (saved && saved.length === DEFAULT_ORDER.length) setToolOrder(saved);
        });
    }, []);

    const sortedTools = useMemo(
        () => [...TOOLS].sort((a, b) => toolOrder.indexOf(a.id) - toolOrder.indexOf(b.id)),
        [toolOrder],
    );

    const move = (idx: number, dir: -1 | 1) => {
        const swap = idx + dir;
        if (swap < 0 || swap >= toolOrder.length) return;
        const next = [...toolOrder];
        [next[idx], next[swap]] = [next[swap], next[idx]];
        setToolOrder(next);
        saveToolsOrder(next);
    };

    if (active) {
        const back = () => setActive(null);
        return (
            <GradientBackground>
                {active === 'ctc'        && <CTCScreen        onBack={back} />}
                {active === 'emi'        && <EMIScreen        onBack={back} />}
                {active === 'gst'        && <GSTScreen        onBack={back} />}
                {active === 'currency'   && <CurrencyScreen   onBack={back} />}
                {active === 'age'        && <AgeScreen        onBack={back} />}
                {active === 'percentage' && <PercentageScreen onBack={back} />}
                {active === 'interest'   && <InterestScreen   onBack={back} />}
                {active === 'discount'   && <DiscountScreen   onBack={back} />}
                {active === 'fd'         && <FDScreen         onBack={back} />}
                {active === 'sip'        && <SIPScreen        onBack={back} />}
                {active === 'profitloss' && <ProfitLossScreen onBack={back} />}
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header row */}
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.heading}>Tools</Text>
                        <Text style={styles.subheading}>Financial calculators & utilities</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.editBtn, editingOrder && styles.editBtnActive]}
                        onPress={() => setEditingOrder(v => !v)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.editBtnText, editingOrder && styles.editBtnTextActive]}>
                            {editingOrder ? '✓ Done' : '⇅ Reorder'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {editingOrder && (
                    <Text style={styles.reorderHint}>Tap ▲ ▼ to change the order of tools</Text>
                )}

                {sortedTools.map((t, idx) => (
                    <View key={t.id} style={styles.toolRow}>
                        {editingOrder && (
                            <View style={styles.arrowCol}>
                                <TouchableOpacity
                                    onPress={() => move(idx, -1)}
                                    style={[styles.arrowBtn, idx === 0 && styles.arrowBtnDisabled]}
                                    disabled={idx === 0}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.arrowText}>▲</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => move(idx, 1)}
                                    style={[styles.arrowBtn, idx === sortedTools.length - 1 && styles.arrowBtnDisabled]}
                                    disabled={idx === sortedTools.length - 1}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.arrowText}>▼</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.cardWrap}>
                            <ToolCard
                                icon={t.icon}
                                title={t.title}
                                description={t.description}
                                accentColor={t.color}
                                onPress={editingOrder ? () => {} : () => setActive(t.id)}
                            />
                        </View>
                    </View>
                ))}
            </ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    content: { padding: Spacing.xl, paddingBottom: 40 },

    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
    },
    heading: {
        color: Colors.text.primary,
        fontSize: FontSize.xxl,
        fontWeight: '700',
    },
    subheading: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        marginTop: 2,
    },

    editBtn: {
        borderWidth: 1,
        borderColor: Colors.accent,
        borderRadius: Radii.xl,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginTop: 6,
    },
    editBtnActive: {
        backgroundColor: Colors.accent,
    },
    editBtnText: {
        color: Colors.accent,
        fontSize: FontSize.xs,
        fontWeight: '700',
    },
    editBtnTextActive: {
        color: '#fff',
    },

    reorderHint: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        marginBottom: Spacing.md,
        fontStyle: 'italic',
    },

    toolRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    arrowCol: {
        width: 32,
        marginRight: Spacing.sm,
        gap: 4,
    },
    arrowBtn: {
        width: 28,
        height: 28,
        borderRadius: Radii.sm,
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowBtnDisabled: {
        opacity: 0.2,
    },
    arrowText: {
        color: Colors.accent,
        fontSize: 11,
        fontWeight: '700',
    },
    cardWrap: {
        flex: 1,
    },
});
