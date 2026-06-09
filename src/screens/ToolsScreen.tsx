import React from 'react';
import { View, StyleSheet } from 'react-native';
import GradientBackground from '../components/GradientBackground';
import ToolCard from '../components/ToolCard';
import { Colors, Spacing } from '../config/theme';
import { ScrollView, Text } from 'react-native';
import { FontSize } from '../config/theme';

import CTCScreen        from './tools/CTCScreen';
import EMIScreen        from './tools/EMIScreen';
import GSTScreen        from './tools/GSTScreen';
import CurrencyScreen   from './tools/CurrencyScreen';
import AgeScreen        from './tools/AgeScreen';
import PercentageScreen from './tools/PercentageScreen';

type ToolId = 'ctc' | 'emi' | 'gst' | 'currency' | 'age' | 'percentage';

const TOOLS: {
    id: ToolId;
    icon: string;
    title: string;
    description: string;
    color: string;
}[] = [
    {
        id: 'ctc',
        icon: '💼',
        title: 'CTC Calculator',
        description: 'Annual CTC → monthly in-hand (New Tax Regime, Tamil Nadu)',
        color: Colors.tool.ctc,
    },
    {
        id: 'emi',
        icon: '🏦',
        title: 'EMI Calculator',
        description: 'Loan / home / car EMI with interest breakdown',
        color: Colors.tool.emi,
    },
    {
        id: 'gst',
        icon: '📋',
        title: 'GST Calculator',
        description: 'Ex-GST / Inc-GST breakdown with CGST + SGST split',
        color: Colors.tool.gst,
    },
    {
        id: 'currency',
        icon: '💱',
        title: 'Currency → INR',
        description: 'USD, EUR, GBP, AED, SGD and more → Indian Rupee (live rates)',
        color: Colors.tool.currency,
    },
    {
        id: 'age',
        icon: '🎂',
        title: 'Age Calculator',
        description: 'Exact age in years/months/days + next birthday countdown',
        color: Colors.tool.age,
    },
    {
        id: 'percentage',
        icon: '📊',
        title: 'Percentage Tools',
        description: 'X% of Y · X is what % of Y · % increase/decrease',
        color: Colors.tool.percentage,
    },
];

type ActiveTool = { id: ToolId } | null;

export default function ToolsScreen() {
    const [active, setActive] = React.useState<ActiveTool>(null);

    if (active) {
        const onBack = () => setActive(null);
        return (
            <GradientBackground>
                {active.id === 'ctc'        && <CTCScreen onBack={onBack} />}
                {active.id === 'emi'        && <EMIScreen onBack={onBack} />}
                {active.id === 'gst'        && <GSTScreen onBack={onBack} />}
                {active.id === 'currency'   && <CurrencyScreen onBack={onBack} />}
                {active.id === 'age'        && <AgeScreen onBack={onBack} />}
                {active.id === 'percentage' && <PercentageScreen onBack={onBack} />}
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.heading}>Tools</Text>
                <Text style={styles.subheading}>Financial calculators & utilities</Text>
                {TOOLS.map(tool => (
                    <ToolCard
                        key={tool.id}
                        icon={tool.icon}
                        title={tool.title}
                        description={tool.description}
                        accentColor={tool.color}
                        onPress={() => setActive({ id: tool.id })}
                    />
                ))}
            </ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: Spacing.xl,
        paddingBottom: 40,
    },
    heading: {
        color: Colors.text.primary,
        fontSize: FontSize.xxl,
        fontWeight: '700',
        marginBottom: Spacing.xs,
    },
    subheading: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        marginBottom: Spacing.xl,
    },
});
