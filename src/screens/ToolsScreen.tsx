import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import GradientBackground from '../components/GradientBackground';
import ToolCard from '../components/ToolCard';
import { Colors, FontSize, Spacing } from '../config/theme';

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

export default function ToolsScreen() {
    const [active, setActive] = React.useState<ToolId | null>(null);

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
                <Text style={styles.heading}>Tools</Text>
                <Text style={styles.subheading}>Financial calculators & utilities</Text>
                {TOOLS.map(t => (
                    <ToolCard
                        key={t.id}
                        icon={t.icon}
                        title={t.title}
                        description={t.description}
                        accentColor={t.color}
                        onPress={() => setActive(t.id)}
                    />
                ))}
            </ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    content: { padding: Spacing.xl, paddingBottom: 40 },
    heading: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.xs },
    subheading: { color: Colors.text.muted, fontSize: FontSize.xs, marginBottom: Spacing.xl },
});
