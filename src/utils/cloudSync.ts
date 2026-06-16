/**
 * Cloud sync via Firebase Realtime Database REST API.
 * No SDK needed — pure fetch. Free tier: 1GB storage, 10GB/month downloads.
 *
 * Setup (2 min):
 *  1. console.firebase.google.com → New project → Realtime Database → Create (test mode)
 *  2. Copy the DB URL (e.g. https://my-app-xyz.firebaseio.com)
 *  3. Paste it in Settings → Cloud Sync URL
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'cloud_device_id_v1';

// Generate or retrieve a stable device-unique ID
export async function getDeviceId(): Promise<string> {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}

function dbUrl(firebaseUrl: string, path: string): string {
    const base = firebaseUrl.replace(/\/$/, '');
    return `${base}/${path}.json`;
}

export async function cloudRead<T>(firebaseUrl: string, path: string): Promise<T | null> {
    try {
        const res = await fetch(dbUrl(firebaseUrl, path), { method: 'GET' });
        if (!res.ok) return null;
        return await res.json() as T;
    } catch {
        return null;
    }
}

export async function cloudWrite(firebaseUrl: string, path: string, data: unknown): Promise<boolean> {
    try {
        const res = await fetch(dbUrl(firebaseUrl, path), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.ok;
    } catch {
        return false;
    }
}
