/**
 * SMS sending — two strategies:
 * 1. Device SIM (SmsSender native module) — sends directly from the admin's Jio SIM, free.
 * 2. Fast2SMS cloud API — fallback when native module unavailable (e.g. web / emulator).
 *
 * Strategy 1 is tried first automatically — no API key needed.
 */

import { Linking, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FAST2SMS_KEY_STORAGE = 'fast2sms_api_key_v1';

const { SmsSender } = NativeModules;

// ── Device SIM (native, free) ─────────────────────────────────────────────────

async function requestSmsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.SEND_SMS,
            {
                title: 'SMS Permission',
                message: 'Allow My Maths to send OTP and wish messages from your SIM.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
            },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch { return false; }
}

async function sendViaSim(phone: string, message: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !SmsSender) return false;
    const digits = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
    if (digits.length !== 10) return false;
    const permitted = await requestSmsPermission();
    if (!permitted) return false;
    try {
        await SmsSender.sendSMS(digits, message);
        return true;
    } catch { return false; }
}

// ── Fast2SMS cloud (optional, India) ─────────────────────────────────────────

async function getFast2SmsKey(): Promise<string | null> {
    try {
        const key = await AsyncStorage.getItem(FAST2SMS_KEY_STORAGE);
        return key?.trim() || null;
    } catch { return null; }
}

export async function sendCloudSMS(phone: string, message: string): Promise<boolean> {
    const apiKey = await getFast2SmsKey();
    if (!apiKey) return false;
    const digits = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
    if (digits.length !== 10) return false;
    try {
        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: { authorization: apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ variables_values: message, route: 'q', numbers: digits }),
        });
        const data = await res.json();
        return data?.return === true;
    } catch { return false; }
}

// ── Open SMS app (last resort, requires user tap) ─────────────────────────────

export async function openSmsApp(phone: string, message: string): Promise<void> {
    const digits = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
    const encoded = encodeURIComponent(message);
    const url = Platform.OS === 'ios'
        ? `sms:+91${digits}&body=${encoded}`
        : `sms:+91${digits}?body=${encoded}`;
    try { await Linking.openURL(url); } catch {}
}

// ── Primary export — try SIM → cloud → open app ───────────────────────────────

export async function sendNativeSMS(phone: string, message: string): Promise<boolean> {
    // 1. Device SIM (admin's Jio number — free, automatic)
    const simOk = await sendViaSim(phone, message);
    if (simOk) return true;

    // 2. Fast2SMS cloud (if configured in Admin Panel)
    const cloudOk = await sendCloudSMS(phone, message);
    if (cloudOk) return true;

    // 3. Open SMS app so user can send manually
    await openSmsApp(phone, message);
    return false;
}
