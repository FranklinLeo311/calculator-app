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

// fawazahmed0/currency-api via jsDelivr CDN:
//   - Always CORS-enabled (CDN serves Access-Control-Allow-Origin: *)
//   - Works on web AND native — no separate CORS handling needed
//   - XAU / XAG are troy-ounce spot prices in INR, updated daily
//   - Fallback mirror on pages.dev if jsDelivr is down
const CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies';
const MIRROR = 'https://latest.currency-api.pages.dev/v1/currencies';

type MetalJson = { xau?: { inr: number }; xag?: { inr: number } };

async function fetchFromCdn<T>(path: string): Promise<T> {
    try {
        return await fetchJson<T>(`${CDN}/${path}`);
    } catch {
        return await fetchJson<T>(`${MIRROR}/${path}`);
    }
}

const TROY_GRAMS = 31.1035;

async function fetchRates(): Promise<MetalRates> {
    const [xauData, xagData, exData] = await Promise.all([
        fetchFromCdn<MetalJson>('xau/inr.json'),
        fetchFromCdn<MetalJson>('xag/inr.json'),
        fetchJson<{ rates: { INR: number } }>('https://api.frankfurter.app/latest?from=USD&to=INR'),
    ]);

    // xauData.xau.inr = price of 1 troy ounce of gold in INR
    const xauInr = xauData?.xau?.inr ?? 0;
    const xagInr = xagData?.xag?.inr ?? 0;

    if (!xauInr) throw new Error('Gold rate unavailable');

    const gold24kPerGram = xauInr / TROY_GRAMS;
    const gold22kPerGram = gold24kPerGram * (22 / 24);
    const silverPerGram  = xagInr / TROY_GRAMS;
    const usdInr         = exData.rates.INR;

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
