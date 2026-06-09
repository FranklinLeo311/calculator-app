import { useState, useEffect, useCallback } from 'react';
import { fetchJson } from '../utils/fetchWithTimeout';
import { storageGet, storageSet } from '../utils/storage';

const CACHE_KEY = 'metal_rates_cache_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export type MetalRates = {
    gold24k: number;   // INR per gram
    gold22k: number;
    silver: number;
    usdInr: number;
    updatedAt: number; // epoch ms
};

type Cache = MetalRates & { fetchedAt: number };

// fawazahmed0/exchange-api — the UPDATED repo (currency-api was archived 2023).
// jsDelivr CDN serves any GitHub file with Access-Control-Allow-Origin: *
// so this works in both browser (web) and native (Android/iOS) with no CORS issue.
// A Cloudflare Pages mirror is used as fallback if jsDelivr is slow.
//
// Response: { "date": "2024-06-10", "xau": { "inr": 196234.67 } }
// where xau.inr = price of 1 troy ounce of gold in INR (updated daily).
const CDN_BASE    = 'https://cdn.jsdelivr.net/gh/fawazahmed0/exchange-api@1/latest/v1/currencies';
const MIRROR_BASE = 'https://latest.currency-api.pages.dev/v1/currencies';

type MetalJson = { xau?: { inr: number }; xag?: { inr: number } };

async function fetchMetal<T>(slug: string): Promise<T> {
    try {
        return await fetchJson<T>(`${CDN_BASE}/${slug}`);
    } catch {
        return await fetchJson<T>(`${MIRROR_BASE}/${slug}`);
    }
}

const TROY_GRAMS = 31.1035;

async function fetchRates(): Promise<MetalRates> {
    const [xauData, xagData, exData] = await Promise.all([
        fetchMetal<MetalJson>('xau/inr.min.json'),
        fetchMetal<MetalJson>('xag/inr.min.json'),
        fetchJson<{ rates: { INR: number } }>('https://api.frankfurter.app/latest?from=USD&to=INR'),
    ]);

    const xauInr = xauData?.xau?.inr ?? 0;
    const xagInr = xagData?.xag?.inr ?? 0;

    if (!xauInr) throw new Error('Gold rate unavailable from API');

    const gold24kPerGram = xauInr / TROY_GRAMS;
    const gold22kPerGram = gold24kPerGram * (22 / 24);
    const silverPerGram  = xagInr > 0 ? xagInr / TROY_GRAMS : 0;
    const usdInr         = exData?.rates?.INR ?? 0;

    return {
        gold24k:   Math.round(gold24kPerGram),
        gold22k:   Math.round(gold22kPerGram),
        silver:    Math.round(silverPerGram * 100) / 100,
        usdInr:    Math.round(usdInr * 100) / 100,
        updatedAt: Date.now(),
    };
}

export type MetalHistory = { date: string; gold24k: number }[];

export default function useMetalRates() {
    const [rates, setRates]     = useState<MetalRates | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const load = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setError(null);
        try {
            // Check cache first
            if (!forceRefresh) {
                const cached = await storageGet<Cache>(CACHE_KEY);
                if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
                    setRates(cached);
                    setLoading(false);
                    return;
                }
            }

            const fresh = await fetchRates();
            const toCache: Cache = { ...fresh, fetchedAt: Date.now() };
            await storageSet(CACHE_KEY, toCache);
            setRates(fresh);
        } catch (err) {
            // Try stale cache on failure
            try {
                const stale = await storageGet<Cache>(CACHE_KEY);
                if (stale) {
                    setRates(stale);
                    setError('Showing cached rates — refresh failed');
                    return;
                }
            } catch {
                // ignore nested error
            }
            setError('Unable to fetch rates. Check your connection.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return { rates, loading, error, refresh: () => load(true) };
}
