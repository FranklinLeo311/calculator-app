import { storageGet, storageSet } from './storage';

// ── Simple base64 obfuscation (not true encryption, keeps plain text out of storage) ──
export function encodePassword(raw: string): string {
    try { return btoa(unescape(encodeURIComponent(raw))); } catch { return raw; }
}
export function decodePassword(encoded: string): string {
    try { return decodeURIComponent(escape(atob(encoded))); } catch { return encoded; }
}

// ── Credential types ──────────────────────────────────────────────────────────
export const CATEGORIES = ['Social', 'Banking', 'Email', 'Shopping', 'Work', 'Other'] as const;
export type Category = typeof CATEGORIES[number];

export const CATEGORY_ICONS: Record<Category, string> = {
    Social: '🌐', Banking: '🏦', Email: '📧', Shopping: '🛍️', Work: '💼', Other: '🔑',
};

export const CATEGORY_COLORS: Record<Category, string> = {
    Social:   '#3B82F6',
    Banking:  '#10b981',
    Email:    '#F59E0B',
    Shopping: '#EC4899',
    Work:     '#8B5CF6',
    Other:    '#64748B',
};

export type Credential = {
    id: string;
    category: Category;
    siteName: string;
    siteUrl: string;
    username: string;
    password: string; // stored obfuscated
    notes: string;
    createdAt: number;
    updatedAt: number;
};

const CRED_KEY = 'vault_credentials_v1';
const PIN_KEY  = 'vault_pin_v1';

export async function loadCredentials(): Promise<Credential[]> {
    return (await storageGet<Credential[]>(CRED_KEY)) ?? [];
}
export async function saveCredentials(list: Credential[]): Promise<void> {
    await storageSet(CRED_KEY, list);
}
export async function loadPin(): Promise<string | null> {
    return storageGet<string>(PIN_KEY);
}
export async function savePin(pin: string): Promise<void> {
    await storageSet(PIN_KEY, pin);
}

// ── Document types ────────────────────────────────────────────────────────────
export const DOC_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Licence', 'Voter ID', 'Insurance', 'Certificate', 'Other'] as const;
export type DocType = typeof DOC_TYPES[number];

export const DOC_ICONS: Record<DocType, string> = {
    Aadhaar: '🪪', PAN: '💳', Passport: '📔', Licence: '🚗',
    'Voter ID': '🗳️', Insurance: '🛡️', Certificate: '📜', Other: '📄',
};

export const DOC_COLORS: Record<DocType, string> = {
    Aadhaar: '#F59E0B', PAN: '#3B82F6', Passport: '#10b981', Licence: '#8B5CF6',
    'Voter ID': '#EC4899', Insurance: '#06B6D4', Certificate: '#F97316', Other: '#64748B',
};

export type VaultDocument = {
    id: string;
    name: string;
    docType: DocType;
    base64: string;    // data URI: "data:image/jpeg;base64,..."
    mimeType: string;
    sizeKb: number;
    createdAt: number;
};

const DOC_KEY = 'vault_documents_v1';

export async function loadDocuments(): Promise<VaultDocument[]> {
    return (await storageGet<VaultDocument[]>(DOC_KEY)) ?? [];
}
export async function saveDocuments(list: VaultDocument[]): Promise<void> {
    await storageSet(DOC_KEY, list);
}

export function genId(): string {
    return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
