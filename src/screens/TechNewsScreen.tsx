import React from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Linking,
    RefreshControl,
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HNStory {
    id: number;
    title: string;
    url?: string;
    score: number;
    by: string;
    time: number;
    type: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(unix: number): string {
    const diffSec = Math.floor(Date.now() / 1000) - unix;
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDay}d ago`;
}

function extractDomain(url?: string): string | null {
    if (!url) return null;
    try {
        const match = url.match(/^https?:\/\/(?:www\.)?([^/]+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

function storyBadge(title: string, type: string): { label: string; color: string } | null {
    if (title.startsWith('Ask HN')) return { label: 'Ask HN', color: Colors.chart.amber };
    if (title.startsWith('Show HN')) return { label: 'Show HN', color: Colors.chart.purple };
    if (type === 'job') return { label: 'Job', color: Colors.chart.cyan };
    return null;
}

// ─── Story Card ──────────────────────────────────────────────────────────────

interface StoryCardProps {
    story: HNStory;
    index: number;
}

const StoryCard = React.memo(({ story, index }: StoryCardProps) => {
    const domain = extractDomain(story.url);
    const badge = storyBadge(story.title, story.type);

    const handlePress = () => {
        const target = story.url ?? `https://news.ycombinator.com/item?id=${story.id}`;
        Linking.openURL(target).catch(() => {});
    };

    return (
        <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.75}>
            <View style={styles.cardLeft}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{index + 1}</Text>
                </View>
            </View>
            <View style={styles.cardRight}>
                <View style={styles.titleRow}>
                    {badge && (
                        <View style={[styles.typeBadge, { backgroundColor: badge.color + '33', borderColor: badge.color + '88' }]}>
                            <Text style={[styles.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                    )}
                    <Text style={styles.title} numberOfLines={3}>{story.title}</Text>
                </View>
                <View style={styles.meta}>
                    <Text style={styles.score}>▲ {story.score}</Text>
                    <Text style={styles.metaSep}>·</Text>
                    <Text style={styles.metaText}>{story.by}</Text>
                    <Text style={styles.metaSep}>·</Text>
                    <Text style={styles.metaText}>{timeAgo(story.time)}</Text>
                    {domain && (
                        <>
                            <Text style={styles.metaSep}>·</Text>
                            <Text style={styles.domain} numberOfLines={1}>{domain}</Text>
                        </>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

const TOP_STORIES_URL = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const ITEM_URL = (id: number) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
const STORY_COUNT = 20;

export default function TechNewsScreen() {
    const [stories, setStories] = React.useState<HNStory[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [refreshing, setRefreshing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const fetchStories = React.useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const idsRes = await fetch(TOP_STORIES_URL);
            if (!idsRes.ok) throw new Error('Failed to fetch story list');
            const ids: number[] = await idsRes.json();
            const topIds = ids.slice(0, STORY_COUNT);

            const storyResults = await Promise.allSettled(
                topIds.map(id => fetch(ITEM_URL(id)).then(r => r.json() as Promise<HNStory>))
            );

            const fetched: HNStory[] = storyResults
                .filter((r): r is PromiseFulfilledResult<HNStory> => r.status === 'fulfilled' && r.value != null)
                .map(r => r.value);

            setStories(fetched);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Network error';
            setError(msg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    React.useEffect(() => {
        fetchStories();
    }, [fetchStories]);

    const renderItem = React.useCallback(({ item, index }: { item: HNStory; index: number }) => (
        <StoryCard story={item} index={index} />
    ), []);

    const keyExtractor = React.useCallback((item: HNStory) => String(item.id), []);

    return (
        <GradientBackground>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.liveDot} />
                    <Text style={styles.headerTitle}>HN Live</Text>
                </View>
                <TouchableOpacity
                    style={styles.refreshBtn}
                    onPress={() => fetchStories(true)}
                    activeOpacity={0.7}
                    disabled={loading || refreshing}
                >
                    <Text style={styles.refreshBtnText}>Refresh</Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing && (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={styles.loadingText}>Fetching top stories…</Text>
                </View>
            )}

            {error && !loading && (
                <View style={styles.centered}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => fetchStories()} activeOpacity={0.8}>
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!loading && !error && (
                <FlatList
                    data={stories}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchStories(true)}
                            tintColor={Colors.accent}
                            colors={[Colors.accent]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={styles.emptyText}>No stories loaded yet.</Text>
                        </View>
                    }
                />
            )}
        </GradientBackground>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.tabBarBorder,
        backgroundColor: Colors.tabBar,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.error,
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    refreshBtn: {
        backgroundColor: Colors.accentSoft,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.accent + '66',
    },
    refreshBtnText: {
        fontSize: FontSize.sm,
        color: Colors.accent,
        fontWeight: '600',
    },

    listContent: {
        padding: Spacing.xl,
        paddingBottom: 40,
    },

    card: {
        flexDirection: 'row',
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        marginBottom: Spacing.lg,
        padding: Spacing.lg,
        gap: Spacing.lg,
    },
    cardLeft: {
        paddingTop: 2,
    },
    badge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: FontSize.xs,
        fontWeight: '700',
        color: Colors.accent,
    },
    cardRight: {
        flex: 1,
    },
    titleRow: {
        marginBottom: Spacing.sm,
        gap: Spacing.xs,
    },
    typeBadge: {
        alignSelf: 'flex-start',
        borderRadius: Radii.sm,
        borderWidth: 1,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        marginBottom: Spacing.xs,
    },
    typeBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    title: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.text.primary,
        lineHeight: 20,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 3,
    },
    score: {
        fontSize: FontSize.xs,
        color: Colors.chart.amber,
        fontWeight: '600',
    },
    metaSep: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
    },
    metaText: {
        fontSize: FontSize.xs,
        color: Colors.text.muted,
    },
    domain: {
        fontSize: FontSize.xs,
        color: Colors.chart.cyan,
        flexShrink: 1,
    },

    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xxxl,
        gap: Spacing.xl,
    },
    loadingText: {
        color: Colors.text.secondary,
        fontSize: FontSize.md,
        marginTop: Spacing.lg,
    },
    errorText: {
        color: Colors.error,
        fontSize: FontSize.md,
        textAlign: 'center',
    },
    retryBtn: {
        backgroundColor: Colors.accentSoft,
        borderRadius: Radii.md,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.accent + '88',
    },
    retryBtnText: {
        color: Colors.accent,
        fontWeight: '700',
        fontSize: FontSize.md,
    },
    emptyText: {
        color: Colors.text.muted,
        fontSize: FontSize.md,
    },
});
