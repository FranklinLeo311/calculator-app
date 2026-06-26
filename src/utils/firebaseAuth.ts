/**
 * Firebase Auth REST API — no SDK needed.
 * Supports: Email Magic Link, Google OAuth, Phone/Email OTP registration.
 * Default admins (ADMIN_EMAIL, ADMIN_PHONE) always bypass Firebase requirements.
 */

import { secureStorage } from './secureStorage';
import {
    FIREBASE_DB_URL,
    FIREBASE_API_KEY_STORAGE,
    FIREBASE_WEB_API_KEY,
    ADMIN_EMAIL,
    ADMIN_PHONE,
} from '../config/firebase';

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

// In-memory OTP cache for ALL users.
// OTP is displayed on-screen (no SMS yet), so memory is safe and avoids
// Firebase DB permission errors (unauthenticated writes blocked by default rules).
const otpCache: Record<string, { code: string; expiry: number }> = {};

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function getApiKey(): Promise<string> {
    // Admin can override via Admin Panel; falls back to the bundled key
    const stored = await secureStorage.getItem(FIREBASE_API_KEY_STORAGE);
    return stored?.trim() || FIREBASE_WEB_API_KEY;
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

function randomCode(): string {
    return String(Math.floor(100000 + Math.random() * 899999));
}

function sanitizeKey(s: string): string {
    return s.replace(/[.#$/\[\]@:]/g, '_');
}

export function determineRole(email?: string, phone?: string): 'admin' | 'user' {
    if (email === ADMIN_EMAIL || phone === ADMIN_PHONE) return 'admin';
    return 'user';
}

function isDefaultAdmin(key: string): boolean {
    const phone = key.startsWith('phone:') ? key.slice(6) : undefined;
    const email = key.startsWith('email:') ? key.slice(6) : undefined;
    return phone === ADMIN_PHONE || email === ADMIN_EMAIL;
}

// ── OTP: Generate & Store ─────────────────────────────────────────────────────

/**
 * Generate a 6-digit OTP and store it (Firebase for users, memory for default admin).
 * Returns the generated code to display in the UI (SMS not yet wired up).
 *
 * @param key  e.g. "phone:9876543210" or "email:user@example.com"
 */
export async function generateAndStoreOtp(key: string): Promise<string> {
    const code = randomCode();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpCache[key] = { code, expiry };

    // For regular phone users (not default admin), also attempt to SMS the OTP
    // from the device SIM (admin's Jio number) — fire-and-forget, won't block.
    if (key.startsWith('phone:') && !isDefaultAdmin(key)) {
        const phone = key.slice(6);
        import('./smsSender').then(({ sendNativeSMS }) => {
            sendNativeSMS(phone, `Your My Maths OTP is: ${code}. Valid for 10 minutes. Do not share.`).catch(() => {});
        });
    }

    return code;
}

// ── OTP: Verify ───────────────────────────────────────────────────────────────

/**
 * Verify OTP. If valid, create/return a Firebase user.
 * Throws 'OTP_INVALID' or 'OTP_EXPIRED' on failure.
 */
export async function verifyOtp(
    key: string,
    enteredCode: string,
    email?: string,
    phone?: string,
): Promise<FirebaseUser> {
    // Verify from in-memory cache (works for all users including default admins)
    const cached = otpCache[key];
    if (!cached) throw new Error('OTP_INVALID');
    if (Date.now() > cached.expiry) { delete otpCache[key]; throw new Error('OTP_EXPIRED'); }
    if (cached.code !== enteredCode.trim()) throw new Error('OTP_INVALID');
    delete otpCache[key]; // one-time use

    // Default admin — build stable user without Firebase
    if (isDefaultAdmin(key)) {
        const uid = phone ? `admin_phone_${phone}` : `admin_email_${sanitizeKey(email ?? '')}`;
        const user: FirebaseUser = {
            uid,
            email: email,
            phone: phone,
            idToken: '',
            refreshToken: '',
            role: 'admin',
        };
        trySaveAdminToDb(user);
        return user;
    }

    // Regular user — get or create Firebase identity
    return getOrCreateIdentityUser(email, phone);
}

// ── Get or Create User ────────────────────────────────────────────────────────

async function getOrCreateIdentityUser(email?: string, phone?: string): Promise<FirebaseUser> {
    const indexKey = phone
        ? `${FIREBASE_DB_URL}/phoneIndex/${sanitizeKey(phone!)}.json`
        : `${FIREBASE_DB_URL}/emailIndex/${sanitizeKey(email!)}.json`;

    // Look up existing UID
    const uidRes = await fetch(indexKey);
    const existingUid: string | null = uidRes.ok ? await uidRes.json() : null;

    if (existingUid) {
        // Known user — fetch their stored role
        const metaRes = await fetch(`${FIREBASE_DB_URL}/users/${existingUid}/meta.json`);
        const meta: any = metaRes.ok ? await metaRes.json() : null;
        return {
            uid: existingUid,
            email,
            phone,
            displayName: meta?.displayName ?? undefined,
            idToken: '',
            refreshToken: '',
            role: meta?.role ?? determineRole(email, phone),
        };
    }

    // New user — create anonymous Firebase account
    const data = await authPost('signUp', { returnSecureToken: true });
    const uid: string = data.localId;

    // Save index
    await fetch(indexKey, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uid),
    });

    const user: FirebaseUser = {
        uid,
        email,
        phone,
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        role: determineRole(email, phone),
    };

    // Save profile
    saveUserToDb(user).catch(() => {});
    return user;
}

export async function getOrCreatePhoneUser(phone: string): Promise<FirebaseUser> {
    return getOrCreateIdentityUser(undefined, phone);
}

// ── Google OAuth ───────────────────────────────────────────────────────────────

export async function signInWithGoogle(idToken: string): Promise<FirebaseUser> {
    const data = await authPost('signInWithIdp', {
        postBody: `id_token=${idToken}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnIdpCredential: true,
        returnSecureToken: true,
    });
    const user = buildUser(data);
    saveUserToDb(user).catch(() => {});
    return user;
}

// ── Email Magic Link (fallback, if user clicks link) ─────────────────────────

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

// ── Token refresh ─────────────────────────────────────────────────────────────

export async function refreshIdToken(refreshToken: string): Promise<{ idToken: string; refreshToken: string }> {
    if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('FIREBASE_NOT_CONFIGURED');
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

async function trySaveAdminToDb(user: FirebaseUser): Promise<void> {
    try { await saveUserToDb(user); } catch {}
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

// ── User management (admin) ───────────────────────────────────────────────────

export async function listUsers(): Promise<Array<{ uid: string } & Partial<FirebaseUser>>> {
    try {
        const res = await fetch(`${FIREBASE_DB_URL}/users.json`);
        if (!res.ok) return [];
        const users: Record<string, any> | null = await res.json();
        if (!users) return [];
        return Object.entries(users).map(([uid, meta]) => ({ uid, ...meta?.meta }));
    } catch { return []; }
}

export async function promoteToAdmin(uid: string): Promise<void> {
    await fetch(`${FIREBASE_DB_URL}/users/${uid}/meta/role.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('admin'),
    });
}

export async function revokeAdmin(uid: string): Promise<void> {
    await fetch(`${FIREBASE_DB_URL}/users/${uid}/meta/role.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('user'),
    });
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });
}

// ── Private builders ──────────────────────────────────────────────────────────

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
