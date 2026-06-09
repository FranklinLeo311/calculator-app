import React from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import InputField from '../../components/InputField';
import ResultCard from '../../components/ResultCard';
import type { ResultRow } from '../../components/ResultCard';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';

type Props = { onBack: () => void };

function computeAge(dob: Date, today: Date) {
    let years  = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth()    - dob.getMonth();
    let days   = today.getDate()     - dob.getDate();

    if (days < 0) {
        months -= 1;
        const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) {
        years  -= 1;
        months += 12;
    }

    // Days until next birthday
    const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (nextBirthday <= today) nextBirthday.setFullYear(today.getFullYear() + 1);
    const msToNextBd  = nextBirthday.getTime() - today.getTime();
    const daysToNext  = Math.ceil(msToNextBd / (1000 * 60 * 60 * 24));

    const totalDays   = Math.floor((today.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
    const totalMonths = years * 12 + months;
    const totalWeeks  = Math.floor(totalDays / 7);

    return { years, months, days, daysToNext, totalDays, totalMonths, totalWeeks };
}

export default function AgeScreen({ onBack }: Props) {
    const [year,  setYear]  = React.useState('');
    const [month, setMonth] = React.useState('');
    const [day,   setDay]   = React.useState('');

    const result = React.useMemo(() => {
        const y = parseInt(year, 10);
        const m = parseInt(month, 10);
        const d = parseInt(day, 10);
        if (!y || !m || !d) return null;
        if (m < 1 || m > 12 || d < 1 || d > 31) return null;
        const dob   = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dob > today || y < 1900) return null;
        return computeAge(dob, today);
    }, [year, month, day]);

    const mainRows: ResultRow[] = result ? [
        {
            label: 'Your Age',
            value: `${result.years} yrs, ${result.months} mo, ${result.days} days`,
            highlight: true,
            color: Colors.tool.age,
        },
        { label: 'Next Birthday', value: `In ${result.daysToNext} day${result.daysToNext === 1 ? '' : 's'}` },
    ] : [];

    const detailRows: ResultRow[] = result ? [
        { label: 'Total Days',   value: result.totalDays.toLocaleString() },
        { label: 'Total Weeks',  value: result.totalWeeks.toLocaleString() },
        { label: 'Total Months', value: result.totalMonths.toLocaleString() },
    ] : [];

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
                <Text style={styles.title}>Age Calculator</Text>
                <Text style={styles.subtitle}>Date of birth → exact age + next birthday</Text>

                <View style={styles.dobRow}>
                    <View style={styles.dobField}>
                        <InputField label="Year" value={year} onChangeText={setYear} placeholder="1990" keyboardType="number-pad" />
                    </View>
                    <View style={styles.dobField}>
                        <InputField label="Month" value={month} onChangeText={setMonth} placeholder="01" keyboardType="number-pad" />
                    </View>
                    <View style={styles.dobField}>
                        <InputField label="Day" value={day} onChangeText={setDay} placeholder="01" keyboardType="number-pad" />
                    </View>
                </View>

                {result && (
                    <>
                        <ResultCard title="Age" rows={mainRows} accentColor={Colors.tool.age} />
                        <ResultCard title="Stats" rows={detailRows} accentColor={Colors.tool.age} />
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    content: { padding: Spacing.xl, paddingBottom: 40 },
    backRow: { marginBottom: Spacing.lg },
    backBtn: { alignSelf: 'flex-start' },
    backText: { color: Colors.tool.age, fontSize: FontSize.body, fontWeight: '600' },
    title: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.xs },
    subtitle: { color: Colors.text.muted, fontSize: FontSize.xs, marginBottom: Spacing.xl },
    dobRow: { flexDirection: 'row', gap: Spacing.md },
    dobField: { flex: 1 },
});
