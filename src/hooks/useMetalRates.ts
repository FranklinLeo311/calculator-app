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

// Two free APIs with fallback — both require no API key and allow CORS.
//
// Primary: open.er-api.com
//   GET https://open.er-api.com/v6/latest/USD
//   Response: { "result": "success", "rates": { "XAU": 0.000295, "XAG": 0.030, "INR": 83.5, ... } }
//   XAU / XAG values = troy oz per 1 USD (invert to get USD per troy oz)
//
// Fallback: fxratesapi.com
//   GET https://api.fxratesapi.com/latest?base=USD&currencies=XAU,XAG,INR
//   Response: { "success": true, "rates": { "XAU": 0.000235, "XAG": 0.01536, "INR": 95.39 } }

const OPEN_ER_URL  = 'https://open.er-api.com/v6/latest/USD';
const FXRATES_URL  = 'https://api.fxratesapi.com/latest?base=USD&currencies=XAU,XAG,INR';
const TROY_GRAMS   = 31.1035;

type OpenErResponse  = { result: string; rates: Record<string, number> };
type FxRatesResponse = { success: boolean; rates: { INR: number; XAU: number; XAG: number } };

function calcRates(xauPerUsd: number, xagPerUsd: number, usdInr: number): MetalRates {
    const xauUsd = 1 / xauPerUsd;
    const xagUsd = xagPerUsd > 0 ? 1 / xagPerUsd : 0;
    const gold24kPerGram = (xauUsd * usdInr) / TROY_GRAMS;
    return {
        gold24k:   Math.round(gold24kPerGram),
        gold22k:   Math.round(gold24kPerGram * (22 / 24)),
        silver:    Math.round((xagUsd * usdInr) / TROY_GRAMS * 100) / 100,
        usdInr:    Math.round(usdInr * 100) / 100,
        updatedAt: Date.now(),
    };
}

async function fetchFromOpenEr(): Promise<MetalRates> {
    const data = await fetchJson<OpenErResponse>(OPEN_ER_URL);
    if (data?.result !== 'success' || !data.rates?.XAU) throw new Error('open.er-api: no XAU');
    return calcRates(data.rates.XAU, data.rates.XAG ?? 0, data.rates.INR ?? 83);
}

async function fetchFromFxRates(): Promise<MetalRates> {
    const data = await fetchJson<FxRatesResponse>(FXRATES_URL);
    if (!data?.success || !data.rates?.XAU) throw new Error('fxratesapi: no XAU');
    return calcRates(data.rates.XAU, data.rates.XAG ?? 0, data.rates.INR ?? 83);
}

async function fetchRates(): Promise<MetalRates> {
    try {
        return await fetchFromOpenEr();
    } catch {
        return await fetchFromFxRates();
    }
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
