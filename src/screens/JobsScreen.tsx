import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Linking,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import { Colors, FontSize, Radii, Spacing } from '../config/theme';
import { storageGet } from '../utils/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type JobItem = {
    id: number;
    url: string;
    title: string;
    company_name: string;
    category: string;
    tags: string[];
    job_type: string;
    publication_date: string;
    candidate_required_location: string;
    salary: string;
    description: string;
};

type UserProfile = {
    name: string;
    title: string;
    experienceLevel: string;
    jobType: string;
    skills: string[];
    location: string;
    expectedCtc: string;
};

type FilterType = 'all' | 'full_time' | 'contract' | 'part_time';

const FILTER_LABELS: Record<FilterType, string> = {
    all: 'All',
    full_time: 'Full-time',
    contract: 'Contract',
    part_time: 'Part-time',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const ms = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(ms / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month ago';
    return `${months} months ago`;
}

function jobTypeColor(jobType: string): string {
    const t = (jobType || '').toLowerCase();
    if (t.includes('full')) return Colors.chart.green;
    if (t.includes('contract')) return Colors.chart.amber;
    if (t.includes('part')) return Colors.chart.blue;
    return Colors.text.muted;
}

function jobTypeBadgeLabel(jobType: string): string {
    const t = (jobType || '').toLowerCase();
    if (t.includes('full')) return 'Full-time';
    if (t.includes('contract')) return 'Contract';
    if (t.includes('part')) return 'Part-time';
    return jobType || 'Remote';
}

function matchesFilter(job: JobItem, filter: FilterType): boolean {
    if (filter === 'all') return true;
    const t = (job.job_type || '').toLowerCase();
    if (filter === 'full_time') return t.includes('full');
    if (filter === 'contract') return t.includes('contract');
    if (filter === 'part_time') return t.includes('part');
    return true;
}

function jobMatchesSkills(job: JobItem, skills: string[]): boolean {
    if (skills.length === 0) return true;
    const titleLower = job.title.toLowerCase();
    const tagsLower = (job.tags || []).map(t => t.toLowerCase());
    return skills.some(skill => {
        const s = skill.toLowerCase();
        return titleLower.includes(s) || tagsLower.some(tag => tag.includes(s));
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobsScreen() {
    const [allJobs, setAllJobs] = useState<JobItem[]>([]);
    const [userSkills, setUserSkills] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const abortRef = useRef<AbortController | null>(null);

    const fetchJobs = useCallback(async () => {
        if (abortRef.current) abortRef.current.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                'https://remotive.com/api/remote-jobs?category=software-dev&limit=50',
                { signal: ctrl.signal },
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setAllJobs((data.jobs as JobItem[]) || []);
        } catch (e: any) {
            if (e?.name !== 'AbortError') {
                setError('Failed to load jobs. Check your internet connection.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Load profile skills + fetch jobs on mount
    useEffect(() => {
        storageGet<UserProfile>('user_profile_v1').then(p => {
            setUserSkills(p?.skills ?? []);
        });
        fetchJobs();
        return () => abortRef.current?.abort();
    }, [fetchJobs]);

    // Derived list
    const visibleJobs = allJobs.filter(job => {
        if (!jobMatchesSkills(job, userSkills)) return false;
        if (!matchesFilter(job, filter)) return false;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            return (
                job.title.toLowerCase().includes(q) ||
                job.company_name.toLowerCase().includes(q)
            );
        }
        return true;
    });

    // ── Render ────────────────────────────────────────────────────────────────

    const renderHeader = () => (
        <View>
            {/* Title row */}
            <View style={styles.titleRow}>
                <View>
                    <Text style={styles.screenTitle}>Job Search</Text>
                    <Text style={styles.matchText}>
                        {loading
                            ? 'Loading jobs...'
                            : error
                            ? 'Error loading jobs'
                            : `${visibleJobs.length} jobs matched your skills`}
                    </Text>
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={fetchJobs} activeOpacity={0.7}>
                    <Text style={styles.refreshBtnText}>↻ Refresh</Text>
                </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.searchRow}>
                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search title or company..."
                    placeholderTextColor={Colors.text.muted}
                    returnKeyType="search"
                />
                {search.length > 0 && (
                    <TouchableOpacity style={styles.clearBtn} onPress={() => setSearch('')}>
                        <Text style={styles.clearBtnText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter chips */}
            <View style={styles.filterRow}>
                {(Object.keys(FILTER_LABELS) as FilterType[]).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterChip, filter === f && styles.filterChipActive]}
                        onPress={() => setFilter(f)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                            {FILTER_LABELS[f]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Skills info */}
            {userSkills.length > 0 && (
                <View style={styles.skillsInfoRow}>
                    <Text style={styles.skillsInfoText}>
                        Filtering by {userSkills.length} skills from your profile
                    </Text>
                </View>
            )}
            {userSkills.length === 0 && !loading && (
                <View style={styles.skillsInfoRow}>
                    <Text style={styles.skillsInfoText}>
                        Set skills in your Profile tab to get personalized matches
                    </Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <GradientBackground>
                {renderHeader()}
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={styles.loadingText}>Fetching remote jobs...</Text>
                </View>
            </GradientBackground>
        );
    }

    if (error) {
        return (
            <GradientBackground>
                <View style={styles.container}>
                    {renderHeader()}
                    <View style={styles.centerBox}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={fetchJobs}>
                            <Text style={styles.retryBtnText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <FlatList
                data={visibleJobs}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyText}>No jobs matched your criteria</Text>
                        <Text style={styles.emptySubText}>Try adjusting your search or skills</Text>
                    </View>
                }
                renderItem={({ item }) => <JobCard job={item} />}
                showsVerticalScrollIndicator={false}
            />
        </GradientBackground>
    );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: JobItem }) {
    const borderColor = jobTypeColor(job.job_type);
    const firstTags = (job.tags || []).slice(0, 3);

    const handleApply = () => {
        if (job.url) Linking.openURL(job.url).catch(() => {});
    };

    return (
        <View style={[styles.card, { borderLeftColor: borderColor }]}>
            {/* Company row */}
            <View style={styles.cardTopRow}>
                <Text style={styles.companyName} numberOfLines={1}>
                    {job.company_name}
                </Text>
                <View style={[styles.jobTypeBadge, { backgroundColor: borderColor + '25' }]}>
                    <Text style={[styles.jobTypeBadgeText, { color: borderColor }]}>
                        {jobTypeBadgeLabel(job.job_type)}
                    </Text>
                </View>
            </View>

            {/* Title */}
            <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>

            {/* Location */}
            {!!job.candidate_required_location && (
                <Text style={styles.jobMeta} numberOfLines={1}>
                    📍 {job.candidate_required_location}
                </Text>
            )}

            {/* Salary */}
            {!!job.salary && (
                <Text style={styles.jobMeta} numberOfLines={1}>
                    💰 {job.salary}
                </Text>
            )}

            {/* Tags */}
            {firstTags.length > 0 && (
                <View style={styles.tagsRow}>
                    {firstTags.map((tag, i) => (
                        <View key={i} style={styles.tagChip}>
                            <Text style={styles.tagChipText}>🏷 {tag}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Footer */}
            <View style={styles.cardFooter}>
                <Text style={styles.postedDate}>{timeAgo(job.publication_date)}</Text>
                <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.8}>
                    <Text style={styles.applyBtnText}>Apply →</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: {
        padding: Spacing.xl,
        paddingTop: Spacing.xxl,
        paddingBottom: 32,
    },

    // Title row
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.lg,
    },
    screenTitle: {
        color: Colors.text.primary,
        fontSize: FontSize.xl,
        fontWeight: '700',
    },
    matchText: {
        color: Colors.accent,
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    refreshBtn: {
        backgroundColor: Colors.accentSoft,
        borderRadius: Radii.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    refreshBtnText: {
        color: Colors.accent,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },

    // Search
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.input,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    searchInput: {
        flex: 1,
        paddingVertical: Spacing.md,
        color: Colors.text.primary,
        fontSize: FontSize.body,
    },
    clearBtn: { padding: Spacing.sm },
    clearBtnText: { color: Colors.text.muted, fontSize: FontSize.body },

    // Filter chips
    filterRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
        flexWrap: 'wrap',
    },
    filterChip: {
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: Radii.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs + 2,
    },
    filterChipActive: {
        backgroundColor: Colors.accent,
        borderColor: Colors.accent,
    },
    filterChipText: {
        color: Colors.text.secondary,
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    filterChipTextActive: { color: '#fff' },

    // Skills info
    skillsInfoRow: {
        backgroundColor: Colors.accentSoft,
        borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    skillsInfoText: {
        color: Colors.accent,
        fontSize: FontSize.xs,
    },

    // Center states
    centerBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        color: Colors.text.secondary,
        fontSize: FontSize.body,
        marginTop: Spacing.lg,
    },
    errorText: {
        color: Colors.error,
        fontSize: FontSize.body,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    retryBtn: {
        backgroundColor: Colors.accent,
        borderRadius: Radii.lg,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.lg,
    },
    retryBtnText: { color: '#fff', fontWeight: '700' },

    // Empty
    emptyBox: { alignItems: 'center', paddingTop: Spacing.xxxl * 2 },
    emptyIcon: { fontSize: 40, marginBottom: Spacing.lg },
    emptyText: {
        color: Colors.text.primary,
        fontSize: FontSize.lg,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    emptySubText: {
        color: Colors.text.muted,
        fontSize: FontSize.sm,
    },

    // Job card
    card: {
        backgroundColor: Colors.card,
        borderRadius: Radii.xl,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        borderLeftWidth: 4,
        padding: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    companyName: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        fontWeight: '600',
        flex: 1,
        marginRight: Spacing.sm,
    },
    jobTypeBadge: {
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    jobTypeBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: '700',
    },
    jobTitle: {
        color: Colors.text.primary,
        fontSize: FontSize.body,
        fontWeight: '700',
        marginBottom: Spacing.sm,
        lineHeight: FontSize.body * 1.4,
    },
    jobMeta: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        marginBottom: Spacing.xs,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    tagChip: {
        backgroundColor: Colors.surface,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    tagChipText: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    postedDate: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
    },
    applyBtn: {
        backgroundColor: Colors.accent,
        borderRadius: Radii.lg,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
    },
    applyBtnText: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
});
