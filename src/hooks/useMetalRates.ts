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

// Frankfurter gives free USD/INR conversion.
// metals.live gives USD spot prices for XAU and XAG.
const EXCHANGE_URL = 'https://api.frankfurter.app/latest?from=USD&to=INR';
const METALS_URL   = 'https://metals.live/api/spot';

async function fetchRates(): Promise<MetalRates> {
    const [exRes, metRes] = await Promise.all([
        fetchJson<{ rates: { INR: number } }>(EXCHANGE_URL),
        fetchJson<Array<Record<string, number>>>(METALS_URL),
    ]);

    const usdInr = exRes.rates.INR;
    const spot   = metRes[0] ?? {};
    const xauUsd = spot['XAU'] ?? spot['xau'] ?? 2350; // troy ounce
    const xagUsd = spot['XAG'] ?? spot['xag'] ?? 28;

    const TROY_GRAMS = 31.1035;
    const gold24kPerGram = (xauUsd / TROY_GRAMS) * usdInr;
    const gold22kPerGram = gold24kPerGram * (22 / 24);
    const silverPerGram  = (xagUsd / TROY_GRAMS) * usdInr;

    return {
        gold24k: Math.round(gold24kPerGram),
        gold22k: Math.round(gold22kPerGram),
        silver:  Math.round(silverPerGram * 100) / 100,
        usdInr:  Math.round(usdInr * 100) / 100,
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
