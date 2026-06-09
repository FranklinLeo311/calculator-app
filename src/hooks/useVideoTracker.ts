import { useState, useCallback, useEffect } from 'react';
import { storageGet, storageSet } from '../utils/storage';

const STORAGE_KEY = 'reel_tracker_v1';
const MAX_ENTRIES = 365;

export type TrackerEntry = {
    id: string;
    date: string;      // YYYY-MM-DD
    count: number;     // videos / reels watched
    minutes: number;   // time spent in minutes
};

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDateLabel(dateStr: string): string {
    const [, m, d] = dateStr.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
}

export default function useVideoTracker() {
    const [entries, setEntries] = useState<TrackerEntry[]>([]);

    useEffect(() => {
        storageGet<TrackerEntry[]>(STORAGE_KEY).then(saved => {
            if (Array.isArray(saved)) setEntries(saved);
        });
    }, []);

    const persist = useCallback(async (items: TrackerEntry[]) => {
        setEntries(items);
        await storageSet(STORAGE_KEY, items);
    }, []);

    const addEntry = useCallback(async (date: string, count: number, minutes: number) => {
        try {
            if (!date) return;
            setEntries(prev => {
                const filtered = prev.filter(e => e.date !== date);
                const newEntry: TrackerEntry = {
                    id: `${date}-${count}-${minutes}`,
                    date,
                    count,
                    minutes,
                };
                const updated = [newEntry, ...filtered]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, MAX_ENTRIES);
                storageSet(STORAGE_KEY, updated).catch(() => {});
                return updated;
            });
        } catch {
            // ignore
        }
    }, []);

    const deleteEntry = useCallback(async (id: string) => {
        try {
            setEntries(prev => {
                const updated = prev.filter(e => e.id !== id);
                storageSet(STORAGE_KEY, updated).catch(() => {});
                return updated;
            });
        } catch {
            // ignore
        }
    }, []);

    const clearAll = useCallback(async () => {
        try {
            await persist([]);
        } catch {
            setEntries([]);
        }
    }, [persist]);

    // Last 30 days sorted oldest-first for chart — caller picks metric
    const chartDataCount = entries
        .slice(0, 30)
        .reverse()
        .map(e => ({ label: formatDateLabel(e.date), value: e.count }));

    const chartDataMinutes = entries
        .slice(0, 30)
        .reverse()
        .map(e => ({ label: formatDateLabel(e.date), value: e.minutes }));

    return {
        entries,
        chartDataCount,
        chartDataMinutes,
        todayStr,
        addEntry,
        deleteEntry,
        clearAll,
    };
}
