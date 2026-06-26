import { Platform } from 'react-native';
import type { Event } from '../screens/EventsScreen';
import { sendNativeSMS } from './smsSender';

// expo-notifications is native-only — guard every call
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

if (isNative) {
    try {
        const Notifications = require('expo-notifications');
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });
    } catch {}
}

export async function requestPermissions(): Promise<boolean> {
    if (!isNative) return false;
    try {
        const Device = require('expo-device');
        if (!Device.isDevice) return false;
        const Notifications = require('expo-notifications');
        const { status: existing } = await Notifications.getPermissionsAsync();
        if (existing === 'granted') return true;
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
    } catch { return false; }
}

export function daysUntilNext(month: number, day: number): number {
    const now = new Date();
    const thisYear = now.getFullYear();
    let next = new Date(thisYear, month - 1, day);
    if (next.setHours(0,0,0,0) <= now.setHours(0,0,0,0)) {
        next = new Date(thisYear + 1, month - 1, day);
    }
    const today = new Date(); today.setHours(0,0,0,0);
    return Math.ceil((next.getTime() - today.getTime()) / 86400000);
}

export async function scheduleEventNotifications(
    events: Event[],
    hour: number,
    minute: number,
    daysAhead: number,
): Promise<void> {
    if (!isNative) return;
    try {
        const Notifications = require('expo-notifications');
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
            if ((n.content.data as any)?.type === 'event_reminder') {
                await Notifications.cancelScheduledNotificationAsync(n.identifier);
            }
        }
        const permitted = await requestPermissions();
        if (!permitted) return;

        const active = events.filter(e => e.active);
        const upcoming = active.filter(e => daysUntilNext(e.month, e.day) <= daysAhead);
        if (!upcoming.length) return;

        const lines = upcoming.map(e => {
            const d = daysUntilNext(e.month, e.day);
            if (d === 0) return `${e.emoji} ${e.name} – Today! 🎉`;
            if (d === 1) return `${e.emoji} ${e.name} – Tomorrow`;
            return `${e.emoji} ${e.name} – in ${d} days`;
        });

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '📅 Upcoming Events',
                body: lines.join('\n'),
                data: { type: 'event_reminder' },
                sound: true,
            },
            trigger: { hour, minute, repeats: true },
        });
    } catch {}
}

// ── Test notification ─────────────────────────────────────────────────────────

export async function triggerTestNotification(): Promise<boolean> {
    if (!isNative) return false;
    try {
        const permitted = await requestPermissions();
        if (!permitted) return false;
        const Notifications = require('expo-notifications');
        await Notifications.scheduleNotificationAsync({
            content: {
                title: '📅 Test Notification',
                body: 'Notifications are working! Your event reminders will appear like this.',
                data: { type: 'test' },
                sound: true,
            },
            trigger: { seconds: 2 },
        });
        return true;
    } catch { return false; }
}

// ── Schedule auto-SMS message reminders ──────────────────────────────────────

export async function scheduleMessageReminders(events: Event[]): Promise<void> {
    if (!isNative) return;
    try {
        const Notifications = require('expo-notifications');
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
            if ((n.content.data as any)?.type === 'auto_sms') {
                await Notifications.cancelScheduledNotificationAsync(n.identifier);
            }
        }
        const permitted = await requestPermissions();
        if (!permitted) return;

        for (const event of events) {
            if (!event.sendMessage || !event.contactNumber || !event.messageScheduledAt) continue;
            const triggerDate = new Date(event.messageScheduledAt);
            if (triggerDate <= new Date()) continue;

            const message = event.notes?.trim() || `${event.emoji} ${event.name}`;

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `💌 Wish sent: ${event.name}`,
                    body: `SMS sent to +91 ${event.contactNumber} via your SIM`,
                    data: {
                        type: 'auto_sms',
                        phone: event.contactNumber,
                        message,
                        eventName: event.name,
                    },
                    sound: true,
                },
                trigger: { date: triggerDate },
            });
        }
    } catch {}
}

// ── Auto-SMS listener — call once at app startup ──────────────────────────────

let _listenerActive = false;

export const NAVIGATE_TO_EVENTS_EVENT = 'navigate_to_events';

export function setupAutoSmsListener(): () => void {
    if (!isNative || _listenerActive) return () => {};
    _listenerActive = true;
    let receivedSub: any;
    let responseSub: any;
    try {
        const Notifications = require('expo-notifications');
        const { DeviceEventEmitter } = require('react-native');

        receivedSub = Notifications.addNotificationReceivedListener(async (notification: any) => {
            const data = notification?.request?.content?.data;
            if (data?.type !== 'auto_sms') return;
            const { phone, message } = data;
            if (!phone || !message) return;
            await sendNativeSMS(phone, message);
        });

        // When user taps a notification (app was backgrounded/killed):
        // auto_sms type → send SMS automatically then navigate to Events
        // event_reminder type → just navigate to Events
        responseSub = Notifications.addNotificationResponseReceivedListener(async (response: any) => {
            const data = response?.notification?.request?.content?.data;
            if (data?.type === 'auto_sms') {
                const { phone, message } = data;
                // Auto-send via SIM — one tap on notification sends the wish
                if (phone && message) await sendNativeSMS(phone, message);
            }
            if (data?.type === 'event_reminder' || data?.type === 'auto_sms') {
                DeviceEventEmitter.emit(NAVIGATE_TO_EVENTS_EVENT);
            }
        });
    } catch {}
    return () => {
        _listenerActive = false;
        try { receivedSub?.remove?.(); } catch {}
        try { responseSub?.remove?.(); } catch {}
    };
}
