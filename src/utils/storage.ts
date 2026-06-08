import AsyncStorage from '@react-native-async-storage/async-storage';

export async function storageGet<T>(key: string): Promise<T | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        if (raw === null || raw === undefined) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export async function storageSet<T>(key: string, value: T): Promise<boolean> {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

export async function storageRemove(key: string): Promise<boolean> {
    try {
        await AsyncStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}
