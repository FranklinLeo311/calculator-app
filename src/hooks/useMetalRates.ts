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

// Metal price chain (no API key required):
//   Tier 1 — goldprice.org  — live spot prices (USD/oz), updated in near-real-time
//   Tier 2 — Yahoo Finance  — COMEX gold/silver futures (GC=F / SI=F)
//   Tier 3 — open.er-api.com — daily XAU/XAG rates (may lag by hours)
//
// USD/INR: frankfurter.app (ECB-sourced, daily) → open.er-api.com fallback
//
// India price = international_spot_per_gram × usdInr × INDIA_DUTY_FACTOR
//   BCD 6% + AIDC 5% + SWS ~0.6% = 11.6% duty, then 3% GST → 1.116 × 1.03 = 1.1495

const TROY_GRAMS        = 31.1035;
const INDIA_DUTY_FACTOR = 1.116 * 1.03; // ≈ 1.1495

// Tier 1: goldprice.org — returns live gold & silver directly in USD/troy oz
const GOLDPRICE_URL = 'https://data-asg.goldprice.org/dbXRates/USD';
// Tier 2: Yahoo Finance futures
const YAHOO_GOLD_URL   = 'https://query2.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&range=1d';
const YAHOO_SILVER_URL = 'https://query2.finance.yahoo.com/v8/finance/chart/SI%3DF?interval=1d&range=1d';
// Tier 3 / USD/INR
const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=USD&to=INR';
const OPEN_ER_URL     = 'https://open.er-api.com/v6/latest/USD';

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Android 13; Mobile) AppleWebKit/537.36',
    'Accept': 'application/json',
};

type GoldPriceResp = { items: [{ curr: string; xauPrice: number; xagPrice: number }] };
type YahooChart    = { chart: { result: [{ meta: { regularMarketPrice: number } }] } };
type OpenErResp    = { result: string; rates: Record<string, number> };

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
        const d = await fetchJson<{ rates: { INR: number } }>(FRANKFURTER_URL, 8000);
        if (d?.rates?.INR) return d.rates.INR;
    } catch { /* fall through */ }
    const d2 = await fetchJson<OpenErResp>(OPEN_ER_URL, 8000);
    if (d2?.rates?.INR) return d2.rates.INR;
    return 84;
}

async function fetchRates(): Promise<MetalRates> {
    // Tier 1: goldprice.org — most accurate live prices
    try {
        const [gp, usdInr] = await Promise.all([
            fetchJson<GoldPriceResp>(GOLDPRICE_URL, 8000, BROWSER_HEADERS),
            fetchUsdInr(),
        ]);
        const item = gp?.items?.[0];
        if (item?.xauPrice && item?.xagPrice) {
            return buildRates(item.xauPrice, item.xagPrice, usdInr);
        }
    } catch { /* fall through */ }

    // Tier 2: Yahoo Finance futures
    try {
        const [gYahoo, sYahoo, usdInr] = await Promise.all([
            fetchJson<YahooChart>(YAHOO_GOLD_URL, 10000, BROWSER_HEADERS),
            fetchJson<YahooChart>(YAHOO_SILVER_URL, 10000, BROWSER_HEADERS),
            fetchUsdInr(),
        ]);
        const goldUsd   = gYahoo?.chart?.result?.[0]?.meta?.regularMarketPrice;
        const silverUsd = sYahoo?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (goldUsd && silverUsd) {
            return buildRates(goldUsd, silverUsd, usdInr);
        }
    } catch { /* fall through */ }

    // Tier 3: open.er-api.com (daily XAU/XAG, may lag)
    const data = await fetchJson<OpenErResp>(OPEN_ER_URL);
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
