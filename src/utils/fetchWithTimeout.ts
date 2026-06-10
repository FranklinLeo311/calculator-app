const DEFAULT_TIMEOUT_MS = 10_000;

export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

export async function fetchJson<T>(
    url: string,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers?: Record<string, string>,
): Promise<T> {
    const res = await fetchWithTimeout(url, { headers }, timeoutMs);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
}
