/**
 * Firebase Auth REST API — no SDK needed.
 * Supports: Email Magic Link (passwordless), Google OAuth, Phone whitelist.
 */

import { secureStorage } from './secureStorage';
import { FIREBASE_DB_URL, FIREBASE_API_KEY_STORAGE } from '../config/firebase';

export type FirebaseUser = {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    phone?: string;
    idToken: string;
    refreshToken: string;
    role: 'admin' | 'user';
};

const AUTH_BASE = 'https://identitytoolkit.googleapis.com/v1/accounts';
const TOKEN_BASE = 'https://securetoken.googleapis.com/v1/token';

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function getApiKey(): Promise<string> {
    const key = await secureStorage.getItem(FIREBASE_API_KEY_STORAGE);
    return key ?? '';
}

export async function setApiKey(key: string): Promise<void> {
    await secureStorage.setItem(FIREBASE_API_KEY_STORAGE, key.trim());
}

async function authPost(endpoint: string, body: object): Promise<any> {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('FIREBASE_NOT_CONFIGURED');
    const res = await fetch(`${AUTH_BASE}:${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? 'AUTH_ERROR');
    return data;
}

// ── Email Magic Link (passwordless) ───────────────────────────────────────────

export async function sendMagicLink(email: string, continueUrl: string): Promise<void> {
    await authPost('sendOobCode', {
        requestType: 'EMAIL_SIGNIN',
        email,
        continueUrl,
        canHandleCodeInApp: true,
    });
}

export async function signInWithEmailLink(email: string, oobCode: string): Promise<FirebaseUser> {
    const data = await authPost('signInWithEmailLink', { email, oobCode });
    return buildUser(data);
}

// ── Google OAuth ───────────────────────────────────────────────────────────────

export async function signInWithGoogle(idToken: string): Promise<FirebaseUser> {
    const data = await authPost('signInWithIdp', {
        postBody: `id_token=${idToken}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnIdpCredential: true,
        returnSecureToken: true,
    });
    return buildUser(data);
}

// ── Phone whitelist login ─────────────────────────────────────────────────────

export async function signInWithPhone(phone: string): Promise<FirebaseUser | null> {
    // Check admin whitelist in Firebase DB
    const res = await fetch(`${FIREBASE_DB_URL}/adminConfig/allowedPhones.json`);
    if (!res.ok) return null;
    const phones: string[] | null = await res.json();
    if (!Array.isArray(phones) || !phones.includes(phone)) return null;

    // Look up existing UID for this phone
    const uidRes = await fetch(`${FIREBASE_DB_URL}/phoneIndex/${sanitizeKey(phone)}.json`);
    let uid: string | null = uidRes.ok ? await uidRes.json() : null;

    if (!uid) {
        // First time — create anonymous account and tag with phone
        const apiKey = await getApiKey();
        if (!apiKey) throw new Error('FIREBASE_NOT_CONFIGURED');
        const anonRes = await fetch(`${AUTH_BASE}:signUp?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ returnSecureToken: true }),
        });
        const anonData = await anonRes.json();
        if (!anonRes.ok) throw new Error(anonData?.error?.message);
        uid = anonData.localId;
        // Save phone → uid mapping
        await fetch(`${FIREBASE_DB_URL}/phoneIndex/${sanitizeKey(phone)}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(uid),
        });
        return buildPhoneUser(anonData, phone);
    }

    // Return a lightweight session object for known phone user
    return {
        uid,
        phone,
        idToken: '',
        refreshToken: '',
        role: determineRole(undefined, phone),
    };
}

// ── Token refresh ─────────────────────────────────────────────────────────────

export async function refreshIdToken(refreshToken: string): Promise<{ idToken: string; refreshToken: string }> {
    const apiKey = await getApiKey();
    const res = await fetch(`${TOKEN_BASE}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message);
    return { idToken: data.id_token, refreshToken: data.refresh_token };
}

// ── DB helpers ────────────────────────────────────────────────────────────────

export async function saveUserToDb(user: FirebaseUser): Promise<void> {
    await fetch(`${FIREBASE_DB_URL}/users/${user.uid}/meta.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: user.email ?? null,
            phone: user.phone ?? null,
            displayName: user.displayName ?? null,
            photoURL: user.photoURL ?? null,
            role: user.role,
            lastSeen: Date.now(),
        }),
    });
}

export async function getUserFromDb(uid: string): Promise<Partial<FirebaseUser> | null> {
    const res = await fetch(`${FIREBASE_DB_URL}/users/${uid}/meta.json`);
    if (!res.ok) return null;
    return await res.json();
}

export async function readUserData<T>(uid: string, path: string): Promise<T | null> {
    const res = await fetch(`${FIREBASE_DB_URL}/users/${uid}/${path}.json`);
    if (!res.ok) return null;
    return await res.json() as T;
}

export async function writeUserData(uid: string, path: string, data: unknown): Promise<boolean> {
    const res = await fetch(`${FIREBASE_DB_URL}/users/${uid}/${path}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return res.ok;
}

// ── Admin config ──────────────────────────────────────────────────────────────

export async function getAdminConfig(): Promise<Record<string, any>> {
    try {
        const res = await fetch(`${FIREBASE_DB_URL}/adminConfig.json`);
        if (!res.ok) return {};
        return (await res.json()) ?? {};
    } catch { return {}; }
}

export async function saveAdminConfig(config: Record<string, any>): Promise<void> {
    await fetch(`${FIREBASE_DB_URL}/adminConfig.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });
}

// ── Internals ─────────────────────────────────────────────────────────────────

function sanitizeKey(s: string): string {
    return s.replace(/[.#$/\[\]]/g, '_');
}

export function determineRole(email?: string, phone?: string): 'admin' | 'user' {
    const { ADMIN_EMAIL, ADMIN_PHONE } = require('../config/firebase');
    if (email === ADMIN_EMAIL || phone === ADMIN_PHONE) return 'admin';
    return 'user';
}

function buildUser(data: any): FirebaseUser {
    return {
        uid: data.localId,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoUrl,
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        role: determineRole(data.email),
    };
}

function buildPhoneUser(data: any, phone: string): FirebaseUser {
    return {
        uid: data.localId,
        phone,
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        role: determineRole(undefined, phone),
    };
}
