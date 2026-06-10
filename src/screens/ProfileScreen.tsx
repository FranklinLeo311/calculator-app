import React, { useEffect, useRef, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import { Colors, FontSize, Radii, Spacing } from '../config/theme';
import { storageGet, storageSet } from '../utils/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type UserProfile = {
    name: string;
    title: string;
    experienceLevel: 'Fresher' | 'Junior' | 'Mid-Level' | 'Senior' | 'Lead/Principal';
    jobType: 'Remote' | 'Hybrid' | 'On-site' | 'Any';
    skills: string[];
    location: string;
    expectedCtc: string;
};

const DEFAULT_PROFILE: UserProfile = {
    name: '',
    title: '',
    experienceLevel: 'Junior',
    jobType: 'Any',
    skills: [],
    location: 'Chennai, Tamil Nadu',
    expectedCtc: '',
};

const STORAGE_KEY = 'user_profile_v1';

// ─── Skill categories ─────────────────────────────────────────────────────────

const SKILL_CATEGORIES = [
    { label: 'Frontend',     color: '#3B82F6', skills: ['React','Vue','Angular','HTML/CSS','JavaScript','TypeScript','Next.js','Tailwind'] },
    { label: 'Backend',      color: '#10B981', skills: ['Node.js','.NET','Java','Python','PHP','Go','Ruby','Spring Boot','FastAPI'] },
    { label: 'Mobile',       color: '#8B5CF6', skills: ['React Native','Flutter','iOS/Swift','Android/Kotlin','Expo'] },
    { label: 'Testing',      color: '#F59E0B', skills: ['Manual Testing','Selenium','Jest','Cypress','Appium','Playwright','JUnit','QA Automation'] },
    { label: 'Database',     color: '#EF4444', skills: ['MySQL','PostgreSQL','MongoDB','Redis','Oracle','SQL Server','Firebase'] },
    { label: 'Cloud/DevOps', color: '#06B6D4', skills: ['AWS','Azure','GCP','Docker','Kubernetes','CI/CD','Jenkins','Terraform'] },
    { label: 'Tools',        color: '#84CC16', skills: ['Git','Jira','Agile/Scrum','Figma','REST APIs','GraphQL','Microservices'] },
];

const EXPERIENCE_LEVELS: UserProfile['experienceLevel'][] = [
    'Fresher', 'Junior', 'Mid-Level', 'Senior', 'Lead/Principal',
];

const JOB_TYPES: UserProfile['jobType'][] = ['Remote', 'Hybrid', 'On-site', 'Any'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
    const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
    const [saved, setSaved] = useState(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load on mount
    useEffect(() => {
        storageGet<UserProfile>(STORAGE_KEY).then(data => {
            if (data) setProfile(data);
        });
    }, []);

    // ── Persist ────────────────────────────────────────────────────────────────
    const saveProfile = async (updated: UserProfile) => {
        await storageSet(STORAGE_KEY, updated);
        setSaved(true);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaved(false), 2000);
    };

    const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
        const next = { ...profile, [key]: value };
        setProfile(next);
        saveProfile(next);
    };

    // ── Skill toggle ──────────────────────────────────────────────────────────
    const toggleSkill = (skill: string) => {
        const skills = profile.skills.includes(skill)
            ? profile.skills.filter(s => s !== skill)
            : [...profile.skills, skill];
        update('skills', skills);
    };

    return (
        <GradientBackground>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header card ─────────────────────────────────────────── */}
                <View style={styles.headerCard}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
                    </View>
                    <View style={styles.headerInputs}>
                        <TextInput
                            style={styles.nameInput}
                            value={profile.name}
                            onChangeText={v => update('name', v)}
                            placeholder="Your Name"
                            placeholderTextColor={Colors.text.muted}
                        />
                        <TextInput
                            style={styles.titleInput}
                            value={profile.title}
                            onChangeText={v => update('title', v)}
                            placeholder="Job Title (e.g. Frontend Developer)"
                            placeholderTextColor={Colors.text.muted}
                        />
                    </View>
                    <View style={styles.skillCountBadge}>
                        <Text style={styles.skillCountText}>{profile.skills.length} skills selected</Text>
                    </View>
                    {saved && (
                        <View style={styles.savedBadge}>
                            <Text style={styles.savedText}>✓ Saved</Text>
                        </View>
                    )}
                </View>

                {/* ── Experience level ────────────────────────────────────── */}
                <SectionHeader label="Experience Level" />
                <View style={styles.chipRow}>
                    {EXPERIENCE_LEVELS.map(level => {
                        const active = profile.experienceLevel === level;
                        return (
                            <TouchableOpacity
                                key={level}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => update('experienceLevel', level)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                    {level}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── Job type ────────────────────────────────────────────── */}
                <SectionHeader label="Job Type" />
                <View style={styles.chipRow}>
                    {JOB_TYPES.map(jt => {
                        const active = profile.jobType === jt;
                        return (
                            <TouchableOpacity
                                key={jt}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => update('jobType', jt)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                    {jt}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── Location ────────────────────────────────────────────── */}
                <SectionHeader label="Location" />
                <TextInput
                    style={styles.textInput}
                    value={profile.location}
                    onChangeText={v => update('location', v)}
                    placeholder="e.g. Bangalore, India"
                    placeholderTextColor={Colors.text.muted}
                />

                {/* ── Expected CTC ────────────────────────────────────────── */}
                <SectionHeader label="Expected CTC" />
                <TextInput
                    style={styles.textInput}
                    value={profile.expectedCtc}
                    onChangeText={v => update('expectedCtc', v)}
                    placeholder="e.g. 12-15 LPA"
                    placeholderTextColor={Colors.text.muted}
                />

                {/* ── Skills ──────────────────────────────────────────────── */}
                <SectionHeader label="Skills" />
                {SKILL_CATEGORIES.map(cat => {
                    const selectedCount = cat.skills.filter(s => profile.skills.includes(s)).length;
                    return (
                        <View key={cat.label} style={styles.categoryBlock}>
                            <View style={styles.categoryHeader}>
                                <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                                <Text style={styles.categoryLabel}>{cat.label}</Text>
                                {selectedCount > 0 && (
                                    <View style={[styles.categoryBadge, { backgroundColor: cat.color + '30' }]}>
                                        <Text style={[styles.categoryBadgeText, { color: cat.color }]}>
                                            {selectedCount}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.skillsWrap}>
                                {cat.skills.map(skill => {
                                    const selected = profile.skills.includes(skill);
                                    return (
                                        <TouchableOpacity
                                            key={skill}
                                            style={[
                                                styles.skillChip,
                                                selected
                                                    ? { backgroundColor: cat.color, borderColor: cat.color }
                                                    : { borderColor: cat.color + '60' },
                                            ]}
                                            onPress={() => toggleSkill(skill)}
                                            activeOpacity={0.7}
                                        >
                                            <Text
                                                style={[
                                                    styles.skillChipText,
                                                    selected
                                                        ? { color: '#fff' }
                                                        : { color: cat.color },
                                                ]}
                                            >
                                                {skill}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}

                {/* ── Save button ─────────────────────────────────────────── */}
                <TouchableOpacity
                    style={[styles.saveBtn, saved && styles.saveBtnDone]}
                    onPress={() => saveProfile(profile)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.saveBtnText}>{saved ? '✓ Saved' : 'Save Profile'}</Text>
                </TouchableOpacity>

                <View style={{ height: 32 }} />
            </ScrollView>
        </GradientBackground>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
    return (
        <Text style={styles.sectionHeader}>{label.toUpperCase()}</Text>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    container: {
        padding: Spacing.xl,
        paddingTop: Spacing.xxl,
    },

    // Header card
    headerCard: {
        backgroundColor: Colors.card,
        borderRadius: Radii.xl,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: Spacing.xl,
        marginBottom: Spacing.xxl,
        alignItems: 'center',
    },
    avatarCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.accent + '30',
        borderWidth: 2,
        borderColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    avatarText: {
        color: Colors.accent,
        fontSize: FontSize.xl,
        fontWeight: '700',
    },
    headerInputs: { width: '100%', gap: Spacing.sm },
    nameInput: {
        backgroundColor: Colors.input,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        color: Colors.text.primary,
        fontSize: FontSize.lg,
        fontWeight: '600',
        textAlign: 'center',
    },
    titleInput: {
        backgroundColor: Colors.input,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        textAlign: 'center',
    },
    skillCountBadge: {
        marginTop: Spacing.lg,
        backgroundColor: Colors.accentSoft,
        borderRadius: Radii.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs,
    },
    skillCountText: {
        color: Colors.accent,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    savedBadge: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
        backgroundColor: Colors.accentSoft,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    savedText: {
        color: Colors.accent,
        fontSize: FontSize.xs,
        fontWeight: '600',
    },

    // Section header
    sectionHeader: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: Spacing.md,
        marginTop: Spacing.lg,
    },

    // Chip row (experience / job type)
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    chip: {
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: Radii.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    chipActive: {
        backgroundColor: Colors.accent,
        borderColor: Colors.accent,
    },
    chipText: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#fff',
        fontWeight: '700',
    },

    // Text inputs
    textInput: {
        backgroundColor: Colors.input,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        color: Colors.text.primary,
        fontSize: FontSize.body,
        marginBottom: Spacing.sm,
    },

    // Skill categories
    categoryBlock: {
        marginBottom: Spacing.xl,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    categoryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    categoryLabel: {
        color: Colors.text.primary,
        fontSize: FontSize.sm,
        fontWeight: '600',
        flex: 1,
    },
    categoryBadge: {
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    categoryBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: '700',
    },
    skillsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    skillChip: {
        borderWidth: 1,
        borderRadius: Radii.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs + 2,
    },
    skillChipText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },

    // Save button
    saveBtn: {
        backgroundColor: Colors.accent,
        borderRadius: Radii.lg,
        paddingVertical: Spacing.xl,
        alignItems: 'center',
        marginTop: Spacing.xxl,
    },
    saveBtnDone: {
        backgroundColor: '#059669',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: FontSize.body,
        fontWeight: '700',
    },
});
