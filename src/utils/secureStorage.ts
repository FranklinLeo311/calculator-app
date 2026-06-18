/**
 * Secure storage wrapper — uses expo-secure-store on native, localStorage on web.
 */
import { Platform } from 'react-native';

async function getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
        try { return localStorage.getItem(key); } catch { return null; }
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
        try { localStorage.setItem(key, value); } catch {}
        return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
        try { localStorage.removeItem(key); } catch {}
        return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
}

export const secureStorage = { getItem, setItem, deleteItem };
