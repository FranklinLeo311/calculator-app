import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    AppState,
    AppStateStatus,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import GradientBackground from '../components/GradientBackground';
import { Colors, FontSize, Radii, Spacing } from '../config/theme';
import { pickAndParseResume, ParsedResume } from '../utils/resumeParser';
import { storageGet, storageSet } from '../utils/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type UserProfile = {
    name: string;
    title: string;
    email: string;
    phone: string;
    linkedIn: string;
    github: string;
    experienceYears: number;
    experienceLevel: 'Fresher' | 'Junior' | 'Mid-Level' | 'Senior' | 'Lead/Principal';
    noticePeriod: '0' | '15' | '30' | '60' | '90' | 'Serving Notice';
    jobType: 'Remote' | 'Hybrid' | 'On-site' | 'Any';
    location: string;
    currentCompany: string;
    expectedCtc: string;
    currentCtc: string;
    skills: string[];
    resumeFileName?: string;
    resumeSizeKb?: number;
    resumeBase64Uri?: string;
};

const DEFAULT_PROFILE: UserProfile = {
    name: '',
    title: '',
    email: '',
    phone: '',
    linkedIn: '',
    github: '',
    experienceYears: 2,
    experienceLevel: 'Junior',
    noticePeriod: '30',
    jobType: 'Any',
    location: 'Chennai, Tamil Nadu',
    currentCompany: '',
    expectedCtc: '',
    currentCtc: '',
    skills: ['React', 'Node.js', 'MySQL'],
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

const NOTICE_PERIODS: UserProfile['noticePeriod'][] = ['0', '15', '30', '60', '90', 'Serving Notice'];

const JOB_TYPES: UserProfile['jobType'][] = ['Remote', 'Hybrid', 'On-site', 'Any'];

const CITY_CHIPS = [
    'Chennai', 'Bangalore', 'Mumbai', 'Hyderabad', 'Pune',
    'Delhi NCR', 'Noida', 'Gurgaon', 'Kochi', 'Coimbatore', 'Remote',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen({ isFocused }: { isFocused?: boolean }) {
    const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [resumeSuccess, setResumeSuccess] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Load from storage ─────────────────────────────────────────────────────
    const loadProfile = useCallback(async () => {
        const data = await storageGet<UserProfile>(STORAGE_KEY);
        if (data) {
            setProfile({ ...DEFAULT_PROFILE, ...data });
        }
        setLoading(false);
    }, []);

    // Load on mount and on refreshKey change
    useEffect(() => {
        loadProfile();
    }, [loadProfile, refreshKey]);

    // Reload when tab becomes focused
    useEffect(() => {
        if (isFocused) loadProfile();
    }, [isFocused, loadProfile]);

    // Reload when app comes to foreground
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') loadProfile();
        });
        return () => sub.remove();
    }, [loadProfile]);

    // ── Persist with debounce ─────────────────────────────────────────────────
    const debounceSave = useCallback((updated: UserProfile) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(async () => {
            await storageSet(STORAGE_KEY, updated);
            setSaved(true);
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => setSaved(false), 2000);
        }, 500);
    }, []);

    const update = useCallback((key: keyof UserProfile, value: UserProfile[keyof UserProfile]) => {
        setProfile(prev => {
            const next = { ...prev, [key]: value };
            debounceSave(next);
            return next;
        });
    }, [debounceSave]);

    // ── Skill toggle ──────────────────────────────────────────────────────────
    const toggleSkill = useCallback((skill: string) => {
        setProfile(prev => {
            const skills = prev.skills.includes(skill)
                ? prev.skills.filter(s => s !== skill)
                : [...prev.skills, skill];
            const next = { ...prev, skills };
            debounceSave(next);
            return next;
        });
    }, [debounceSave]);

    // ── Resume upload ─────────────────────────────────────────────────────────
    const handleUploadResume = useCallback(async () => {
        setUploading(true);
        try {
            const parsed: ParsedResume | null = await pickAndParseResume();
            if (!parsed) return;

            setProfile(prev => {
                const next: UserProfile = {
                    ...prev,
                    resumeFileName: parsed.fileName,
                    resumeSizeKb: parsed.sizeKb,
                    resumeBase64Uri: parsed.base64Uri,
                    ...(parsed.name ? { name: parsed.name } : {}),
                    ...(parsed.title ? { title: parsed.title } : {}),
                    ...(parsed.email ? { email: parsed.email } : {}),
                    ...(parsed.phone ? { phone: parsed.phone } : {}),
                    ...(parsed.linkedIn ? { linkedIn: parsed.linkedIn } : {}),
                    ...(parsed.github ? { github: parsed.github } : {}),
                    ...(parsed.location ? { location: parsed.location } : {}),
                    ...(parsed.experienceYears !== undefined ? { experienceYears: parsed.experienceYears } : {}),
                    skills: parsed.skills.length > 0 ? parsed.skills : prev.skills,
                };
                storageSet(STORAGE_KEY, next);
                return next;
            });

            if (successTimerRef.current) clearTimeout(successTimerRef.current);
            setResumeSuccess(true);
            successTimerRef.current = setTimeout(() => setResumeSuccess(false), 3000);
        } catch {
            // silently ignore
        } finally {
            setUploading(false);
        }
    }, []);

    const handleRemoveResume = useCallback(() => {
        setProfile(prev => {
            const next: UserProfile = {
                ...prev,
                resumeFileName: undefined,
                resumeSizeKb: undefined,
                resumeBase64Uri: undefined,
            };
            storageSet(STORAGE_KEY, next);
            return next;
        });
    }, []);

    const handleViewResume = useCallback(async () => {
        if (!profile.resumeBase64Uri || !profile.resumeFileName) return;
        try {
            const available = await Sharing.isAvailableAsync();
            if (!available) return;

            const ext = profile.resumeFileName.split('.').pop() ?? 'pdf';
            const tempPath = FileSystem.cacheDirectory + 'resume_preview.' + ext;

            const base64Data = profile.resumeBase64Uri.split(',')[1] ?? profile.resumeBase64Uri;
            await FileSystem.writeAsStringAsync(tempPath, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
            });
            await Sharing.shareAsync(tempPath);
        } catch {
            // silently ignore
        }
    }, [profile.resumeBase64Uri, profile.resumeFileName]);

    if (loading) {
        return (
            <GradientBackground>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </GradientBackground>
        );
    }

    const hasResume = !!profile.resumeFileName;
    const detectedSkillsPreview = hasResume ? profile.skills.slice(0, 6) : [];
    const detectedOverflow = hasResume ? Math.max(0, profile.skills.length - 6) : 0;

    return (
        <GradientBackground>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ── Page header ──────────────────────────────────────────── */}
                <View style={styles.pageHeader}>
                    <View style={styles.pageHeaderLeft}>
                        <Text style={styles.pageTitle}>Profile</Text>
                        <Text style={styles.pageSubtitle}>
                            {profile.skills.length} skills · {profile.experienceYears} yrs exp
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.refreshBtn}
                        onPress={() => setRefreshKey(k => k + 1)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.refreshIcon}>↻</Text>
                    </TouchableOpacity>
                    {saved && (
                        <View style={styles.savedBadge}>
                            <Text style={styles.savedText}>✓ Saved</Text>
                        </View>
                    )}
                </View>

                {/* ── Resume success banner ────────────────────────────────── */}
                {resumeSuccess && (
                    <View style={styles.successBanner}>
                        <Text style={styles.successBannerText}>Profile auto-filled from resume</Text>
                    </View>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* 1. RESUME CARD                                              */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <View style={styles.resumeCard}>
                    <View style={styles.resumeCardAccent} />
                    {!hasResume ? (
                        <View style={styles.resumeEmpty}>
                            <Text style={styles.resumeEmptyIcon}>📄</Text>
                            <Text style={styles.resumeEmptyTitle}>No Resume Uploaded</Text>
                            <Text style={styles.resumeEmptySubtitle}>
                                Upload your resume to auto-fill everything
                            </Text>
                            <TouchableOpacity
                                style={[styles.resumeUploadBtn, uploading && styles.resumeUploadBtnDisabled]}
                                onPress={handleUploadResume}
                                activeOpacity={0.8}
                                disabled={uploading}
                            >
                                <Text style={styles.resumeUploadBtnText}>
                                    {uploading ? 'Uploading...' : '📤  Upload Resume'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.resumeFilled}>
                            <View style={styles.resumeFileRow}>
                                <Text style={styles.resumeFileIcon}>📄</Text>
                                <View style={styles.resumeFileMeta}>
                                    <Text style={styles.resumeFileName} numberOfLines={1}>
                                        {profile.resumeFileName}
                                    </Text>
                                    <Text style={styles.resumeFileSub}>
                                        {profile.resumeSizeKb} KB · {profile.skills.length} skills auto-detected
                                    </Text>
                                </View>
                            </View>

                            {detectedSkillsPreview.length > 0 && (
                                <View style={styles.resumeSkillsRow}>
                                    {detectedSkillsPreview.map(skill => (
                                        <View key={skill} style={styles.resumeSkillChip}>
                                            <Text style={styles.resumeSkillChipText}>{skill}</Text>
                                        </View>
                                    ))}
                                    {detectedOverflow > 0 && (
                                        <View style={styles.resumeSkillChipMore}>
                                            <Text style={styles.resumeSkillChipMoreText}>+{detectedOverflow} more</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            <View style={styles.resumeActions}>
                                <TouchableOpacity
                                    style={styles.resumeActionBtn}
                                    onPress={handleViewResume}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.resumeActionBtnText}>👁  View</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.resumeActionBtn, uploading && styles.resumeUploadBtnDisabled]}
                                    onPress={handleUploadResume}
                                    activeOpacity={0.8}
                                    disabled={uploading}
                                >
                                    <Text style={styles.resumeActionBtnText}>
                                        {uploading ? '...' : '🔄  Change'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.resumeActionBtn, styles.resumeActionBtnDanger]}
                                    onPress={handleRemoveResume}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.resumeActionBtnText, styles.resumeActionBtnTextDanger]}>
                                        ✕  Remove
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* 2. PERSONAL INFO                                            */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <SectionCard title="Personal Info">
                    <FieldLabel label="Name" />
                    <TextInput
                        style={styles.textInput}
                        value={profile.name}
                        onChangeText={v => update('name', v)}
                        placeholder="Your full name"
                        placeholderTextColor={Colors.text.muted}
                    />

                    <FieldLabel label="Job Title" />
                    <TextInput
                        style={styles.textInput}
                        value={profile.title}
                        onChangeText={v => update('title', v)}
                        placeholder="e.g. Frontend Developer"
                        placeholderTextColor={Colors.text.muted}
                    />

                    <FieldLabel label="Email" />
                    <TextInput
                        style={styles.textInput}
                        value={profile.email}
                        onChangeText={v => update('email', v)}
                        placeholder="you@email.com"
                        placeholderTextColor={Colors.text.muted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <FieldLabel label="Phone" />
                    <TextInput
                        style={styles.textInput}
                        value={profile.phone}
                        onChangeText={v => update('phone', v)}
                        placeholder="+91 9XXXXXXXXX"
                        placeholderTextColor={Colors.text.muted}
                        keyboardType="phone-pad"
                    />

                    <FieldLabel label="LinkedIn" />
                    <TextInput
                        style={styles.textInput}
                        value={profile.linkedIn}
                        onChangeText={v => update('linkedIn', v)}
                        placeholder="linkedin.com/in/..."
                        placeholderTextColor={Colors.text.muted}
                        keyboardType="url"
                        autoCapitalize="none"
                    />

                    <FieldLabel label="GitHub" />
                    <TextInput
                        style={styles.textInput}
                        value={profile.github}
                        onChangeText={v => update('github', v)}
                        placeholder="github.com/..."
                        placeholderTextColor={Colors.text.muted}
                        keyboardType="url"
                        autoCapitalize="none"
                    />

                    <FieldLabel label="Current Company (optional)" />
                    <TextInput
                        style={[styles.textInput, styles.textInputLast]}
                        value={profile.currentCompany}
                        onChangeText={v => update('currentCompany', v)}
                        placeholder="Where do you work now?"
                        placeholderTextColor={Colors.text.muted}
                    />
                </SectionCard>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* 3. EXPERIENCE                                               */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <SectionCard title="Experience">
                    <FieldLabel label="Years of Experience" />
                    <View style={styles.stepperRow}>
                        <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => update('experienceYears', Math.max(0, profile.experienceYears - 1))}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.stepperBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{profile.experienceYears} years</Text>
                        <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => update('experienceYears', Math.min(30, profile.experienceYears + 1))}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.stepperBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>

                    <FieldLabel label="Experience Level" />
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

                    <FieldLabel label="Notice Period" />
                    <View style={[styles.chipRow, styles.chipRowLast]}>
                        {NOTICE_PERIODS.map(np => {
                            const active = profile.noticePeriod === np;
                            const label = np === 'Serving Notice' ? 'Serving Notice' : `${np} days`;
                            return (
                                <TouchableOpacity
                                    key={np}
                                    style={[styles.chip, active && styles.chipActive]}
                                    onPress={() => update('noticePeriod', np)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </SectionCard>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* 4. JOB PREFERENCES                                          */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <SectionCard title="Job Preferences">
                    <FieldLabel label="Job Type" />
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

                    <FieldLabel label="Location" />
                    <TextInput
                        style={styles.textInput}
                        value={profile.location}
                        onChangeText={v => update('location', v)}
                        placeholder="City, State"
                        placeholderTextColor={Colors.text.muted}
                    />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.cityScrollView}
                        contentContainerStyle={styles.cityScrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {CITY_CHIPS.map(city => {
                            const active = profile.location === city || profile.location.startsWith(city);
                            return (
                                <TouchableOpacity
                                    key={city}
                                    style={[styles.cityChip, active && styles.cityChipActive]}
                                    onPress={() => update('location', city)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>
                                        {city}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <FieldLabel label="Expected CTC" />
                    <TextInput
                        style={styles.textInput}
                        value={profile.expectedCtc}
                        onChangeText={v => update('expectedCtc', v)}
                        placeholder="e.g. 12-15 LPA"
                        placeholderTextColor={Colors.text.muted}
                    />

                    <FieldLabel label="Current CTC" />
                    <TextInput
                        style={[styles.textInput, styles.textInputLast]}
                        value={profile.currentCtc}
                        onChangeText={v => update('currentCtc', v)}
                        placeholder="e.g. 8 LPA (optional)"
                        placeholderTextColor={Colors.text.muted}
                    />
                </SectionCard>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* 5. SKILLS                                                   */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <SectionCard title="Skills">
                    <View style={styles.skillsHeaderRow}>
                        <View style={styles.skillsCountBadge}>
                            <Text style={styles.skillsCountText}>{profile.skills.length} skills selected</Text>
                        </View>
                    </View>

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
                                                        { color: selected ? '#fff' : cat.color },
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
                </SectionCard>

                <View style={{ height: 40 }} />
            </ScrollView>
        </GradientBackground>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>{title.toUpperCase()}</Text>
            {children}
        </View>
    );
}

function FieldLabel({ label }: { label: string }) {
    return <Text style={styles.fieldLabel}>{label}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    container: {
        padding: Spacing.xl,
        paddingTop: Spacing.xxl,
    },

    // Loading
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: Colors.text.muted,
        fontSize: FontSize.body,
    },

    // Page header
    pageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xl,
        gap: Spacing.md,
    },
    pageHeaderLeft: {
        flex: 1,
    },
    pageTitle: {
        color: Colors.text.primary,
        fontSize: FontSize.xl,
        fontWeight: '700',
    },
    pageSubtitle: {
        color: Colors.text.muted,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    refreshBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    refreshIcon: {
        color: Colors.accent,
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    savedBadge: {
        backgroundColor: Colors.accentSoft,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
    },
    savedText: {
        color: Colors.accent,
        fontSize: FontSize.xs,
        fontWeight: '600',
    },

    // Success banner
    successBanner: {
        backgroundColor: '#059669',
        borderRadius: Radii.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.xl,
        alignItems: 'center',
    },
    successBannerText: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: '600',
    },

    // Resume card
    resumeCard: {
        backgroundColor: Colors.card,
        borderRadius: Radii.xl,
        borderWidth: 1,
        borderColor: Colors.accent + '60',
        marginBottom: Spacing.xl,
        overflow: 'hidden',
    },
    resumeCardAccent: {
        height: 3,
        backgroundColor: Colors.accent,
    },
    resumeEmpty: {
        alignItems: 'center',
        padding: Spacing.xxxl,
        gap: Spacing.md,
    },
    resumeEmptyIcon: {
        fontSize: 48,
    },
    resumeEmptyTitle: {
        color: Colors.text.primary,
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    resumeEmptySubtitle: {
        color: Colors.text.muted,
        fontSize: FontSize.sm,
        textAlign: 'center',
    },
    resumeUploadBtn: {
        marginTop: Spacing.md,
        backgroundColor: Colors.accent,
        borderRadius: Radii.lg,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xxxl,
    },
    resumeUploadBtnDisabled: {
        opacity: 0.5,
    },
    resumeUploadBtnText: {
        color: '#fff',
        fontSize: FontSize.body,
        fontWeight: '700',
    },
    resumeFilled: {
        padding: Spacing.xl,
        gap: Spacing.lg,
    },
    resumeFileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    resumeFileIcon: {
        fontSize: 32,
    },
    resumeFileMeta: {
        flex: 1,
    },
    resumeFileName: {
        color: Colors.text.primary,
        fontSize: FontSize.body,
        fontWeight: '600',
    },
    resumeFileSub: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        marginTop: 2,
    },
    resumeSkillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    resumeSkillChip: {
        backgroundColor: Colors.accentSoft,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
    },
    resumeSkillChipText: {
        color: Colors.accent,
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    resumeSkillChipMore: {
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
    },
    resumeSkillChipMoreText: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    resumeActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    resumeActionBtn: {
        flex: 1,
        backgroundColor: Colors.input,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: Radii.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    resumeActionBtnDanger: {
        borderColor: Colors.error + '60',
    },
    resumeActionBtnText: {
        color: Colors.text.primary,
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    resumeActionBtnTextDanger: {
        color: Colors.error,
    },

    // Section card
    sectionCard: {
        backgroundColor: Colors.card,
        borderRadius: Radii.xl,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    sectionCardTitle: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: Spacing.xl,
    },

    // Field label
    fieldLabel: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        fontWeight: '600',
        marginBottom: Spacing.sm,
        marginTop: Spacing.md,
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
    textInputLast: {
        marginBottom: 0,
    },

    // Stepper
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    stepperBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.input,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperBtnText: {
        color: Colors.text.primary,
        fontSize: FontSize.xl,
        fontWeight: '700',
        lineHeight: 24,
    },
    stepperValue: {
        color: Colors.text.primary,
        fontSize: FontSize.lg,
        fontWeight: '700',
        minWidth: 80,
        textAlign: 'center',
    },

    // Chips
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    chipRowLast: {
        marginBottom: 0,
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

    // City chips
    cityScrollView: {
        marginBottom: Spacing.lg,
    },
    cityScrollContent: {
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    cityChip: {
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: Radii.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    cityChipActive: {
        backgroundColor: Colors.accentSoft,
        borderColor: Colors.accent,
    },
    cityChipText: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        fontWeight: '500',
    },
    cityChipTextActive: {
        color: Colors.accent,
        fontWeight: '700',
    },

    // Skills section
    skillsHeaderRow: {
        marginBottom: Spacing.xl,
    },
    skillsCountBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.accentSoft,
        borderRadius: Radii.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs,
    },
    skillsCountText: {
        color: Colors.accent,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
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
});
