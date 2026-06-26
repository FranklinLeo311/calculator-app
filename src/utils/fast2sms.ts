import { secureStorage } from './secureStorage';

export const FAST2SMS_KEY_STORAGE = 'fast2sms_api_key_v1';

export async function getFast2SmsKey(): Promise<string | null> {
    return (await secureStorage.getItem(FAST2SMS_KEY_STORAGE))?.trim() || null;
}

export async function setFast2SmsKey(key: string): Promise<void> {
    await secureStorage.setItem(FAST2SMS_KEY_STORAGE, key.trim());
}

/**
 * Send SMS via Fast2SMS Quick SMS route.
 * phone: 10-digit Indian mobile number (no country code)
 * Returns true on success.
 */
export async function sendSMS(phone: string, message: string): Promise<boolean> {
    const apiKey = await getFast2SmsKey();
    if (!apiKey) return false;

    // Strip country code if present
    const digits = phone.replace(/\D/g, '').replace(/^91/, '');
    if (digits.length !== 10) return false;

    try {
        const params = new URLSearchParams({
            authorization: apiKey,
            route: 'q',
            message,
            flash: '0',
            numbers: digits,
        });
        const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);
        const data = await res.json();
        return data?.return === true;
    } catch {
        return false;
    }
}
