import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { SmsSender } = NativeModules;

export async function requestSmsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.SEND_SMS,
            {
                title: 'SMS Permission',
                message: 'My Maths needs permission to send wish messages automatically.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
            },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
        return false;
    }
}

/**
 * Send SMS directly from device SIM — completely free, no API key needed.
 * phone: 10-digit Indian number or international format
 */
export async function sendNativeSMS(phone: string, message: string): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!SmsSender) return false;

    // Strip country code if present, keep 10 digits
    const digits = phone.replace(/\D/g, '').replace(/^91/, '');
    if (digits.length < 10) return false;

    const permitted = await requestSmsPermission();
    if (!permitted) return false;

    try {
        await SmsSender.sendSMS(digits, message);
        return true;
    } catch {
        return false;
    }
}
