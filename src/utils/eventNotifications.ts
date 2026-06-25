import { Platform } from 'react-native';
import type { Event } from '../screens/EventsScreen';

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

// ── Schedule WhatsApp/SMS message reminders ───────────────────────────────────

export async function scheduleMessageReminders(events: Event[]): Promise<void> {
    if (!isNative) return;
    try {
        const Notifications = require('expo-notifications');
        // Cancel existing message reminders
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
            if ((n.content.data as any)?.type === 'whatsapp_reminder') {
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
                    title: `📱 Send message: ${event.name}`,
                    body: `Tap to send WhatsApp/SMS to +91 ${event.contactNumber}`,
                    data: {
                        type: 'whatsapp_reminder',
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
