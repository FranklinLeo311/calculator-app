import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors, FontSize, Radii, Spacing } from '../config/theme';
import { storageGet } from '../utils/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type UnifiedJob = {
    id: string;
    source: string;
    title: string;
    company: string;
    jobType: string;
    tags: string[];
    location: string;
    salary: string;
    postedAt: string;
    applyUrl: string;
};

type UserProfile = { skills: string[]; location?: string };
type FilterType = 'all' | 'full_time' | 'contract' | 'remote';

const FILTER_LABELS: Record<FilterType, string> = {
    all: 'All',
    full_time: 'Full-time',
    contract: 'Contract',
    remote: 'Remote',
};

const SOURCE_COLOR: Record<string, string> = {
    Remotive:   '#3B82F6',
    Arbeitnow:  '#10B981',
    RemoteOK:   '#8B5CF6',
    Jobicy:     '#F59E0B',
    'HN Hiring': '#FF6600',
};

// ─── Skill detection (for HN comment parsing) ────────────────────────────────

const SKILL_KEYWORDS = [
    'react','react native','vue','angular','next.js','typescript','javascript','html','css','tailwind',
    'node.js','node','python','java','ruby','go','php','.net','c#','swift','kotlin','flutter',
    'spring','django','fastapi','express','rails',
    'aws','azure','gcp','docker','kubernetes','terraform','ci/cd',
    'postgresql','mysql','mongodb','redis','firebase','sql','graphql',
    'machine learning','ai','llm','openai','rust','scala',
];

function extractSkillTags(text: string): string[] {
    const lower = text.toLowerCase();
    const found: string[] = [];
    for (const kw of SKILL_KEYWORDS) {
        if (lower.includes(kw) && found.length < 6) {
            // Capitalise nicely
            const pretty = kw === 'node.js' ? 'Node.js' : kw === 'react native' ? 'React Native' : kw === 'next.js' ? 'Next.js' : kw.charAt(0).toUpperCase() + kw.slice(1);
            if (!found.includes(pretty)) found.push(pretty);
        }
    }
    return found;
}

// ─── HTML strip / entity decode ───────────────────────────────────────────────

function stripHtml(html: string): string {
    return html
        .replace(/<p>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        // keep href text visible
        .replace(/<a[^>]+href="(https?:[^"]+)"[^>]*>[^<]*<\/a>/gi, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#x2F;/g, '/')
        .replace(/&#x27;/g, "'")
        .replace(/&#x60;/g, '`')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, ' ')
        .replace(/ {2,}/g, ' ')
        .trim();
}

// ─── HN comment → UnifiedJob ──────────────────────────────────────────────────

function parseHNComment(item: any): UnifiedJob | null {
    if (!item?.text || item.deleted || item.dead) return null;

    const raw = stripHtml(item.text);
    if (raw.length < 40) return null;

    const lines = raw.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const firstLine = lines[0] ?? '';
    const parts = firstLine.split('|').map((p: string) => p.trim());

    const company = parts[0] || 'Unknown';

    // Find title — look for role keyword in first line parts or first few lines
    const rolePattern = /engineer|developer|designer|manager|analyst|scientist|architect|lead|head of|vp |director|devops|fullstack|front.?end|back.?end|mobile|intern/i;
    let title = '';
    for (const p of parts.slice(1, 5)) {
        if (rolePattern.test(p) && p.length < 100) { title = p; break; }
    }
    if (!title) {
        for (const line of lines.slice(1, 4)) {
            if (rolePattern.test(line) && line.length < 120 && !line.startsWith('http')) {
                title = line.split('|')[0].trim(); break;
            }
        }
    }
    if (!title) title = `Software Engineer at ${company}`;

    // Location — find part with a city/remote keyword, else parts[1]
    const locPattern = /remote|onsite|on-site|hybrid|usa|uk|london|berlin|new york|san francisco|toronto|austin|chicago|bangalore|india|europe/i;
    const locPart = parts.find((p, i) => i > 0 && locPattern.test(p)) || parts[1] || 'Remote';
    const isRemote = raw.toLowerCase().includes('remote');
    const location = isRemote && !locPart.toLowerCase().includes('remote')
        ? `${locPart} / Remote`
        : locPart;

    // Job type
    let jobType = 'full_time';
    if (/contract/i.test(firstLine)) jobType = 'contract';
    else if (/part.?time/i.test(firstLine)) jobType = 'part_time';
    else if (/remote/i.test(firstLine) && !/full.?time/i.test(firstLine)) jobType = 'remote';

    // Salary
    const salaryMatch = raw.match(/\$[\d,]+[kK]?\s*(?:[-–—]\s*\$?[\d,]+[kK]?)?(?:\s*(?:\/yr|\/year|per year))?/);
    const salary = salaryMatch ? salaryMatch[0] : '';

    // Apply URL — first http link in text
    const urlMatch = raw.match(/https?:\/\/[^\s<>")\]]+/);
    const applyUrl = urlMatch
        ? urlMatch[0].replace(/[.,;)>]+$/, '')
        : `https://news.ycombinator.com/item?id=${item.id}`;

    return {
        id: `hn-${item.id}`,
        source: 'HN Hiring',
        title: title.length > 100 ? title.slice(0, 97) + '…' : title,
        company: company.length > 60 ? company.slice(0, 57) + '…' : company,
        jobType,
        tags: extractSkillTags(raw),
        location: location.length > 60 ? location.slice(0, 57) + '…' : location,
        salary,
        postedAt: new Date(item.time * 1000).toISOString(),
        applyUrl,
    };
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

function timed(url: string, opts: RequestInit = {}, ms = 12000): Promise<Response> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

async function getJson<T>(url: string, opts?: RequestInit): Promise<T> {
    const r = await timed(url, opts);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<T>;
}

// ─── Source normalisers ───────────────────────────────────────────────────────

function normRemotive(raw: any[]): UnifiedJob[] {
    return (raw ?? []).map(j => ({
        id: `rem-${j.id}`,
        source: 'Remotive',
        title: j.title ?? '',
        company: j.company_name ?? '',
        jobType: j.job_type ?? 'full_time',
        tags: Array.isArray(j.tags) ? j.tags.slice(0, 5) : [],
        location: j.candidate_required_location || 'Remote',
        salary: j.salary ?? '',
        postedAt: j.publication_date ?? new Date().toISOString(),
        applyUrl: j.url ?? '',
    }));
}

function normArbeitnow(raw: any[]): UnifiedJob[] {
    return (raw ?? []).map((j, i) => ({
        id: `arb-${j.slug ?? i}`,
        source: 'Arbeitnow',
        title: j.title ?? '',
        company: j.company_name ?? '',
        jobType: Array.isArray(j.job_types) && j.job_types.length ? j.job_types[0] : (j.remote ? 'remote' : 'full_time'),
        tags: Array.isArray(j.tags) ? j.tags.slice(0, 5) : [],
        location: j.location || 'Remote',
        salary: '',
        postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : new Date().toISOString(),
        applyUrl: j.url ?? '',
    }));
}

function normRemoteOK(raw: any[]): UnifiedJob[] {
    return (raw ?? []).slice(1).map(j => ({
        id: `rok-${j.id ?? j.slug}`,
        source: 'RemoteOK',
        title: j.position ?? '',
        company: j.company ?? '',
        jobType: 'remote',
        tags: Array.isArray(j.tags) ? j.tags.slice(0, 5) : [],
        location: 'Remote',
        salary: j.salary_min && j.salary_max ? `$${j.salary_min}–$${j.salary_max}` : '',
        postedAt: j.date ?? new Date().toISOString(),
        applyUrl: j.url ?? '',
    }));
}

function normJobicy(raw: any[]): UnifiedJob[] {
    return (raw ?? []).map((j, i) => ({
        id: `jcy-${j.id ?? i}`,
        source: 'Jobicy',
        title: j.jobTitle ?? '',
        company: j.companyName ?? '',
        jobType: (j.jobType ?? 'full_time').toLowerCase().replace(' ', '_'),
        tags: Array.isArray(j.jobIndustry) ? j.jobIndustry.slice(0, 5) : [],
        location: j.jobGeo || 'Remote',
        salary: j.annualSalaryMin ? `$${j.annualSalaryMin}–$${j.annualSalaryMax ?? '?'}` : '',
        postedAt: j.pubDate ?? new Date().toISOString(),
        applyUrl: j.url ?? '',
    }));
}

// ─── HN "Who is Hiring?" fetch ────────────────────────────────────────────────

async function fetchHNHiringJobs(): Promise<UnifiedJob[]> {
    // 1. Get whoishiring user's latest posts (uses Firebase — known to work)
    const HN = 'https://hacker-news.firebaseio.com/v0';
    const user = await getJson<{ submitted: number[] }>(`${HN}/user/whoishiring.json`);
    const ids = user.submitted ?? [];

    // 2. Find the latest "Who is Hiring?" story (not "Who Wants to Be Hired")
    let storyId: number | null = null;
    for (const id of ids.slice(0, 6)) {
        const item = await getJson<{ title?: string; kids?: number[] }>(`${HN}/item/${id}.json`);
        if (item?.title?.toLowerCase().includes('who is hiring') &&
            item?.title?.toLowerCase().includes('hiring?')) {
            storyId = id;
            break;
        }
    }
    if (!storyId) return [];

    // 3. Fetch story to get kid comment IDs
    const story = await getJson<{ kids?: number[] }>(`${HN}/item/${storyId}.json`);
    const kids = (story.kids ?? []).slice(0, 40);
    if (kids.length === 0) return [];

    // 4. Fetch all comments in parallel
    const settled = await Promise.allSettled(
        kids.map(kid => getJson<any>(`${HN}/item/${kid}.json`))
    );

    const jobs: UnifiedJob[] = [];
    for (const res of settled) {
        if (res.status === 'fulfilled') {
            const job = parseHNComment(res.value);
            if (job) jobs.push(job);
        }
    }
    return jobs;
}

// ─── Main fetch: try job boards → fall back to HN ────────────────────────────

type FetchResult = { jobs: UnifiedJob[]; sourcesLoaded: number; usedHN: boolean };

async function fetchAllJobs(skills: string[] = []): Promise<FetchResult> {
    // Build skill search params from user profile
    const skillQuery = skills.slice(0, 3).join(' ').trim();
    const remotiveSearch = skillQuery
        ? `https://remotive.com/api/remote-jobs?category=software-dev&search=${encodeURIComponent(skillQuery)}&limit=50`
        : 'https://remotive.com/api/remote-jobs?category=software-dev&limit=50';
    const jobicyTag = skills.length
        ? skills[0].toLowerCase().replace(/\s+/g, '-')
        : 'javascript';

    // Try all 4 job board APIs in parallel
    const [r1, r2, r3, r4] = await Promise.allSettled([
        getJson<any>(remotiveSearch)
            .then(d => normRemotive(d.jobs ?? [])),
        getJson<any>('https://www.arbeitnow.com/api/job-board-api')
            .then(d => normArbeitnow(d.data ?? [])),
        getJson<any>('https://remoteok.com/api', { headers: { 'User-Agent': 'Mozilla/5.0' } })
            .then(d => normRemoteOK(Array.isArray(d) ? d : [])),
        getJson<any>(`https://jobicy.com/api/v2/remote-jobs?count=30&tag=${encodeURIComponent(jobicyTag)}`)
            .then(d => normJobicy(d.jobs ?? [])),
    ]);

    let combined: UnifiedJob[] = [];
    let sourcesLoaded = 0;

    for (const res of [r1, r2, r3, r4]) {
        if (res.status === 'fulfilled' && res.value.length > 0) {
            combined = combined.concat(res.value);
            sourcesLoaded++;
        }
    }

    // If no job boards responded, fall back to HN "Who is Hiring?" (Firebase always works)
    let usedHN = false;
    if (combined.length < 5) {
        try {
            const hnJobs = await fetchHNHiringJobs();
            combined = combined.concat(hnJobs);
            if (hnJobs.length > 0) usedHN = true;
        } catch {}
    }

    // If we have skills but still no results, fetch broad category results as fallback
    if (combined.length < 5 && skills.length > 0) {
        try {
            const broad = await getJson<any>('https://remotive.com/api/remote-jobs?category=software-dev&limit=30');
            combined = combined.concat(normRemotive(broad.jobs ?? []));
        } catch {}
    }

    // Deduplicate by title+company
    const seen = new Set<string>();
    const deduped = combined.filter(j => {
        const key = `${j.title.toLowerCase().trim()}|${j.company.toLowerCase().trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Sort newest first
    deduped.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

    if (deduped.length === 0) throw new Error('Could not load jobs — check your internet connection and tap Retry.');

    return { jobs: deduped, sourcesLoaded, usedHN };
}

// ─── Filter ───────────────────────────────────────────────────────────────────

// Score how relevant a job is for a given city (e.g. "Chennai")
// 4 = exact city match, 3 = same country/region, 2 = remote (accessible), 1 = worldwide, 0 = elsewhere
function locationScore(job: UnifiedJob, city: string): number {
    if (!city) return 1;
    const loc = job.location.toLowerCase();
    const c = city.toLowerCase();

    // Extract city keyword (e.g. "chennai" from "Chennai, Tamil Nadu")
    const cityWord = c.split(/[,\s]/)[0];

    if (loc.includes(cityWord)) return 4;
    if (loc.includes('india') || loc.includes('bengaluru') || loc.includes('bangalore') ||
        loc.includes('hyderabad') || loc.includes('mumbai') || loc.includes('pune') ||
        loc.includes('tamil') || loc.includes('noida') || loc.includes('gurgaon') ||
        loc.includes('kochi') || loc.includes('coimbatore') || loc.includes('delhi') ||
        loc.includes('kolkata') || loc.includes('ahmedabad') || loc.includes('in,') ||
        loc === 'in' || loc.endsWith(', in')) return 3;
    if (loc.includes('remote') || loc.includes('worldwide') || loc.includes('anywhere') ||
        loc === '' || job.jobType.toLowerCase().includes('remote')) return 2;
    if (loc.includes('asia') || loc.includes('apac')) return 2;
    return 1;
}

function matchesFilter(job: UnifiedJob, filter: FilterType): boolean {
    if (filter === 'all') return true;
    const t = (job.jobType ?? '').toLowerCase();
    if (filter === 'remote')    return t.includes('remote') || job.location.toLowerCase().includes('remote');
    if (filter === 'full_time') return t.includes('full');
    if (filter === 'contract')  return t.includes('contract');
    return true;
}

function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const h = ms / 3600000;
    if (h < 1) return `${Math.floor(ms / 60000)}m ago`;
    if (h < 24) return `${Math.floor(h)}h ago`;
    if (h < 168) return `${Math.floor(h / 24)}d ago`;
    return `${Math.floor(h / 168)}w ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobsScreen() {
    const [allJobs, setAllJobs]         = useState<UnifiedJob[]>([]);
    const [usedHN, setUsedHN]           = useState(false);
    const [sourcesLoaded, setSourcesLoaded] = useState(0);
    const [userSkills, setUserSkills]   = useState<string[]>([]);
    const [userLocation, setUserLocation] = useState('');
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [search, setSearch]           = useState('');
    const [filter, setFilter]           = useState<FilterType>('all');
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const loadJobs = useCallback(async (skills?: string[]) => {
        if (!isMounted.current) return;
        setLoading(true);
        setError(null);
        try {
            const result = await fetchAllJobs(skills ?? userSkills);
            if (!isMounted.current) return;
            setAllJobs(result.jobs);
            setUsedHN(result.usedHN);
            setSourcesLoaded(result.sourcesLoaded);
        } catch (e: any) {
            if (!isMounted.current) return;
            setError(e?.message ?? 'Failed to load jobs.');
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [userSkills]);

    useEffect(() => {
        storageGet<UserProfile>('user_profile_v1').then(p => {
            if (!isMounted.current) return;
            const skills = p?.skills ?? [];
            const location = p?.location ?? '';
            setUserSkills(skills);
            setUserLocation(location);
            loadJobs(skills);
        });
    }, []);

    // city extracted from profile location ("Chennai, Tamil Nadu" → "Chennai")
    const profileCity = userLocation.split(',')[0].trim();

    // Jobs that match at least one profile skill (title or tags)
    const skillsLower = userSkills.map(s => s.toLowerCase());

    function skillScore(job: UnifiedJob): number {
        if (skillsLower.length === 0) return 0;
        const titleLower = job.title.toLowerCase();
        const tagScore = job.tags.filter(t => skillsLower.some(s => t.toLowerCase().includes(s))).length;
        const titleScore = skillsLower.filter(s => titleLower.includes(s)).length;
        return tagScore * 2 + titleScore;
    }

    const skillMatched = search.trim()
        ? allJobs  // when searching, don't skill-filter
        : allJobs.filter(j => skillsLower.length === 0 || skillScore(j) > 0);

    const usingSkillFallback = skillsLower.length > 0 && skillMatched.length === 0;
    const baseJobs = usingSkillFallback ? allJobs : skillMatched;

    const visibleJobs = baseJobs
        .filter(job => {
            if (!matchesFilter(job, filter)) return false;
            if (search.trim()) {
                const q = search.trim().toLowerCase();
                return (
                    job.title.toLowerCase().includes(q) ||
                    job.company.toLowerCase().includes(q) ||
                    job.tags.some(t => t.toLowerCase().includes(q)) ||
                    job.location.toLowerCase().includes(q)
                );
            }
            return true;
        })
        .sort((a, b) => {
            // 1. Location relevance for profile city
            const locDiff = locationScore(b, profileCity) - locationScore(a, profileCity);
            if (locDiff !== 0) return locDiff;
            // 2. Skill match score
            const sDiff = skillScore(b) - skillScore(a);
            if (sDiff !== 0) return sDiff;
            // 3. Newest first
            return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
        });

    const renderHeader = () => (
        <View>
            <View style={styles.titleRow}>
                <View style={styles.titleBlock}>
                    <Text style={styles.screenTitle}>💼 Jobs</Text>
                    {!loading && !error && (
                        <Text style={styles.subtitle}>
                            {visibleJobs.length} jobs
                            {sourcesLoaded > 0 ? ` · ${sourcesLoaded} board${sourcesLoaded !== 1 ? 's' : ''}` : ''}
                            {usedHN ? ' · HN Hiring' : ''}
                        </Text>
                    )}
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={loadJobs} activeOpacity={0.7}>
                    <Text style={styles.refreshBtnText}>↻</Text>
                </TouchableOpacity>
            </View>

            {profileCity ? (
                <View style={styles.locationBanner}>
                    <Text style={styles.locationBannerText}>
                        📍 Sorted for <Text style={{ fontWeight: '700' }}>{profileCity}</Text> — Remote & India jobs shown first · tap a skill chip to filter
                    </Text>
                </View>
            ) : null}

            {skillsLower.length === 0 && !search.trim() && (
                <View style={[styles.skillFallbackBanner, { borderColor: '#F59E0B44', backgroundColor: 'rgba(245,158,11,0.08)' }]}>
                    <Text style={[styles.skillFallbackText, { color: '#F59E0B' }]}>
                        💡 Set your skills in the Profile tab to get personalised job matches.
                    </Text>
                </View>
            )}
            {usingSkillFallback && skillsLower.length > 0 && (
                <View style={styles.skillFallbackBanner}>
                    <Text style={styles.skillFallbackText}>
                        No exact skill matches — showing all jobs. Try updating skills in Profile.
                    </Text>
                </View>
            )}

            {usedHN && sourcesLoaded === 0 && (
                <View style={styles.hnBanner}>
                    <Text style={styles.hnBannerText}>
                        📡 Job boards unreachable — showing real jobs from HN "Ask HN: Who is Hiring?"
                    </Text>
                </View>
            )}

            <View style={styles.searchRow}>
                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by title, company, skill…"
                    placeholderTextColor={Colors.text.muted}
                    returnKeyType="search"
                />
                {search.length > 0 && (
                    <TouchableOpacity style={styles.clearBtn} onPress={() => setSearch('')}>
                        <Text style={styles.clearBtnText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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
            </ScrollView>

            {userSkills.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skillsRow}>
                    {userSkills.slice(0, 8).map(s => (
                        <TouchableOpacity key={s} style={styles.skillChip} onPress={() => setSearch(s)} activeOpacity={0.7}>
                            <Text style={styles.skillChipText}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.root}>
                <View style={styles.loadingPadding}>{renderHeader()}</View>
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={styles.loadingText}>Finding jobs…</Text>
                    <Text style={styles.loadingSubText}>Trying multiple sources…</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.root}>
                <View style={styles.loadingPadding}>{renderHeader()}</View>
                <View style={styles.centerBox}>
                    <Text style={styles.errorIcon}>📡</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadJobs} activeOpacity={0.8}>
                        <Text style={styles.retryBtnText}>↻  Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <FlatList
                data={visibleJobs}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyText}>No results</Text>
                        <Text style={styles.emptySubText}>Try a different search term or filter</Text>
                        <TouchableOpacity style={styles.clearSearchBtn} onPress={() => { setSearch(''); setFilter('all'); }}>
                            <Text style={styles.clearSearchBtnText}>Clear filters</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={({ item }) => <JobCard job={item} />}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function isIndiaOrRemote(location: string): boolean {
    const l = location.toLowerCase();
    return l.includes('remote') || l.includes('india') || l.includes('chennai') ||
        l.includes('bangalore') || l.includes('bengaluru') || l.includes('hyderabad') ||
        l.includes('mumbai') || l.includes('pune') || l.includes('worldwide') || l === '';
}

function JobCard({ job }: { job: UnifiedJob }) {
    const borderColor = SOURCE_COLOR[job.source] ?? Colors.accent;

    const handleApply = () => {
        if (job.applyUrl) Linking.openURL(job.applyUrl).catch(() => {});
    };

    return (
        <View style={[styles.card, { borderLeftColor: borderColor }]}>
            <View style={styles.cardTopRow}>
                <Text style={styles.companyName} numberOfLines={1}>{job.company}</Text>
                <View style={[styles.sourceBadge, { backgroundColor: borderColor + '22' }]}>
                    <Text style={[styles.sourceBadgeText, { color: borderColor }]}>{job.source}</Text>
                </View>
            </View>

            <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>

            {job.tags.length > 0 && (
                <View style={styles.tagsRow}>
                    {job.tags.map((tag, i) => (
                        <View key={i} style={styles.tagChip}>
                            <Text style={styles.tagChipText}>{tag}</Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.metaRow}>
                {!!job.location && (
                    <Text style={[
                        styles.metaText,
                        isIndiaOrRemote(job.location) && styles.metaTextHighlight,
                    ]}>
                        📍 {job.location}
                    </Text>
                )}
                {!!job.salary && <Text style={styles.metaText}>  💰 {job.salary}</Text>}
                <Text style={styles.metaText}>  🕐 {timeAgo(job.postedAt)}</Text>
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.8}>
                <Text style={styles.applyBtnText}>Apply →</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    loadingPadding: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl },
    listContent: { padding: Spacing.xl, paddingTop: Spacing.xxl, paddingBottom: 32 },

    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
    titleBlock: { flex: 1 },
    screenTitle: { color: Colors.text.primary, fontSize: FontSize.xl, fontWeight: '700' },
    subtitle: { color: Colors.accent, fontSize: FontSize.sm, marginTop: 2 },
    refreshBtn: { backgroundColor: Colors.accentSoft, borderRadius: Radii.lg, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    refreshBtnText: { color: Colors.accent, fontSize: FontSize.lg, fontWeight: '700' },

    locationBanner: {
        backgroundColor: 'rgba(59,130,246,0.10)',
        borderRadius: Radii.md,
        borderLeftWidth: 3,
        borderLeftColor: Colors.accent,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    locationBannerText: { color: Colors.accent, fontSize: FontSize.xs, lineHeight: 18 },
    metaTextHighlight: { color: '#10B981', fontWeight: '600' },

    hnBanner: {
        backgroundColor: 'rgba(255,102,0,0.12)',
        borderRadius: Radii.md,
        borderLeftWidth: 3,
        borderLeftColor: '#FF6600',
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    hnBannerText: { color: '#FF6600', fontSize: FontSize.xs, lineHeight: 18 },

    skillFallbackBanner: {
        backgroundColor: 'rgba(245,158,11,0.12)',
        borderRadius: Radii.md,
        borderLeftWidth: 3,
        borderLeftColor: '#F59E0B',
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    skillFallbackText: { color: '#F59E0B', fontSize: FontSize.xs, lineHeight: 18 },

    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.input, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: Radii.md, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
    searchInput: { flex: 1, paddingVertical: Spacing.md, color: Colors.text.primary, fontSize: FontSize.body },
    clearBtn: { padding: Spacing.sm },
    clearBtnText: { color: Colors.text.muted, fontSize: FontSize.body },

    filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingBottom: Spacing.md, paddingRight: Spacing.xl },
    filterChip: { borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: Radii.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs + 2 },
    filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
    filterChipText: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600' },
    filterChipTextActive: { color: '#fff' },

    skillsRow: { flexDirection: 'row', gap: 6, paddingBottom: Spacing.lg, paddingRight: Spacing.xl },
    skillChip: { backgroundColor: Colors.accentSoft, borderRadius: Radii.xl, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
    skillChipText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '600' },

    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    loadingText: { color: Colors.text.secondary, fontSize: FontSize.body, marginTop: Spacing.lg },
    loadingSubText: { color: Colors.text.muted, fontSize: FontSize.sm, marginTop: 4 },

    errorIcon: { fontSize: 40, marginBottom: Spacing.lg },
    errorText: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 20 },
    retryBtn: { backgroundColor: Colors.accent, borderRadius: Radii.lg, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg },
    retryBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },

    emptyBox: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 40, marginBottom: Spacing.lg },
    emptyText: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '600', marginBottom: Spacing.sm },
    emptySubText: { color: Colors.text.muted, fontSize: FontSize.sm, marginBottom: Spacing.xl },
    clearSearchBtn: { backgroundColor: Colors.accent, borderRadius: Radii.lg, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg },
    clearSearchBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },

    card: { backgroundColor: Colors.card, borderRadius: Radii.xl, borderWidth: 1, borderColor: Colors.cardBorder, borderLeftWidth: 3, padding: Spacing.xl, marginBottom: Spacing.lg },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    companyName: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600', flex: 1, marginRight: Spacing.sm },
    sourceBadge: { borderRadius: Radii.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
    sourceBadgeText: { fontSize: FontSize.xs, fontWeight: '700' },
    jobTitle: { color: Colors.text.primary, fontSize: FontSize.body, fontWeight: '700', marginBottom: Spacing.sm, lineHeight: FontSize.body * 1.4 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: Spacing.sm },
    tagChip: { backgroundColor: Colors.surface, borderRadius: Radii.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
    tagChipText: { color: Colors.text.muted, fontSize: FontSize.xs },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: Spacing.md },
    metaText: { color: Colors.text.secondary, fontSize: FontSize.xs },
    applyBtn: { backgroundColor: Colors.accent, borderRadius: Radii.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, alignSelf: 'flex-end' },
    applyBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
});
