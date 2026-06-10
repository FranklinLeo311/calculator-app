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

// Metal price source chain (no API key required, React Native — no CORS):
//   Tier 1 — metals.live     — purpose-built spot price API (USD/troy oz)
//   Tier 2 — goldprice.org   — live spot prices (USD/troy oz)
//   Tier 3 — open.er-api.com — daily XAU/XAG (last resort, may lag)
//
// USD/INR: frankfurter.app → open.er-api.com fallback
//
// India price formula:
//   (USD_per_oz / 31.1035g) × USD_INR × 1.1495
//   where 1.1495 = (1 + 6% BCD + 5% AIDC + 0.6% SWS) × (1 + 3% GST)

const TROY_GRAMS        = 31.1035;
const INDIA_DUTY_FACTOR = 1.116 * 1.03; // ≈ 1.1495

const METALS_LIVE_URL = 'https://api.metals.live/v1/spot';
const GOLDPRICE_URL   = 'https://data-asg.goldprice.org/dbXRates/USD';
const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=USD&to=INR';
const OPEN_ER_URL     = 'https://open.er-api.com/v6/latest/USD';

const JSON_HEADERS = { 'Accept': 'application/json', 'Content-Type': 'application/json' };

// metals.live: [{ gold: 4780.5, silver: 78.2, platinum: 1200, ... }]
type MetalsLiveResp = [{ gold: number; silver: number }];
// goldprice.org: { items: [{ xauPrice: number, xagPrice: number }] }
type GoldPriceResp  = { items: [{ xauPrice: number; xagPrice: number }] };
type OpenErResp     = { result: string; rates: Record<string, number> };

function buildRates(goldUsdOz: number, silverUsdOz: number, usdInr: number): MetalRates {
    const goldPerGram   = (goldUsdOz   / TROY_GRAMS) * usdInr * INDIA_DUTY_FACTOR;
    const silverPerGram = (silverUsdOz / TROY_GRAMS) * usdInr * INDIA_DUTY_FACTOR;
    return {
        gold24k:   Math.round(goldPerGram),
        gold22k:   Math.round(goldPerGram * (22 / 24)),
        silver:    Math.round(silverPerGram * 100) / 100,
        usdInr:    Math.round(usdInr * 100) / 100,
        updatedAt: Date.now(),
    };
}

async function fetchUsdInr(): Promise<number> {
    try {
        const d = await fetchJson<{ rates: { INR: number } }>(FRANKFURTER_URL, 8000, JSON_HEADERS);
        if (d?.rates?.INR) return d.rates.INR;
    } catch { /* fall through */ }
    try {
        const d2 = await fetchJson<OpenErResp>(OPEN_ER_URL, 8000, JSON_HEADERS);
        if (d2?.rates?.INR) return d2.rates.INR;
    } catch { /* fall through */ }
    return 84;
}

async function fetchRates(): Promise<MetalRates> {
    // Tier 1: metals.live — purpose-built, always free, no auth needed
    try {
        const [data, usdInr] = await Promise.all([
            fetchJson<MetalsLiveResp>(METALS_LIVE_URL, 8000, JSON_HEADERS),
            fetchUsdInr(),
        ]);
        const spot = Array.isArray(data) ? data[0] : (data as unknown as { gold: number; silver: number });
        if (spot?.gold && spot?.silver) {
            return buildRates(spot.gold, spot.silver, usdInr);
        }
    } catch { /* fall through */ }

    // Tier 2: goldprice.org
    try {
        const [gp, usdInr] = await Promise.all([
            fetchJson<GoldPriceResp>(GOLDPRICE_URL, 8000, JSON_HEADERS),
            fetchUsdInr(),
        ]);
        const item = gp?.items?.[0];
        if (item?.xauPrice && item?.xagPrice) {
            return buildRates(item.xauPrice, item.xagPrice, usdInr);
        }
    } catch { /* fall through */ }

    // Tier 3: open.er-api.com (daily, may lag for XAU/XAG)
    const data = await fetchJson<OpenErResp>(OPEN_ER_URL, 10000, JSON_HEADERS);
    if (data?.result !== 'success' || !data.rates?.XAU) throw new Error('All metal APIs failed');
    return buildRates(1 / data.rates.XAU, data.rates.XAG ? 1 / data.rates.XAG : 0, data.rates.INR ?? 84);
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
