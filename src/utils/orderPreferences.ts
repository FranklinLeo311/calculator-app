import AsyncStorage from '@react-native-async-storage/async-storage';

const TAB_ORDER_KEY   = 'tab_order_v1';
const TOOLS_ORDER_KEY = 'tools_order_v1';

export const TAB_ORDER_CHANGED = 'tab_order_changed';

export async function loadTabOrder(): Promise<string[] | null> {
    try {
        const v = await AsyncStorage.getItem(TAB_ORDER_KEY);
        return v ? JSON.parse(v) : null;
    } catch { return null; }
}

export async function saveTabOrder(order: string[]): Promise<void> {
    try { await AsyncStorage.setItem(TAB_ORDER_KEY, JSON.stringify(order)); } catch {}
}

export async function loadToolsOrder(): Promise<string[] | null> {
    try {
        const v = await AsyncStorage.getItem(TOOLS_ORDER_KEY);
        return v ? JSON.parse(v) : null;
    } catch { return null; }
}

export async function saveToolsOrder(order: string[]): Promise<void> {
    try { await AsyncStorage.setItem(TOOLS_ORDER_KEY, JSON.stringify(order)); } catch {}
}
