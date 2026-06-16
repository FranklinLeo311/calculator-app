import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { Event } from '../screens/EventsScreen';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) return false;
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

// Returns days until next occurrence of a month/day event
export function daysUntilNext(month: number, day: number): number {
    const now = new Date();
    const thisYear = now.getFullYear();
    let next = new Date(thisYear, month - 1, day);
    if (next < now) next = new Date(thisYear + 1, month - 1, day);
    const diff = next.getTime() - now.setHours(0, 0, 0, 0);
    return Math.ceil(diff / 86400000);
}

export function nextOccurrence(month: number, day: number): Date {
    const now = new Date();
    const thisYear = now.getFullYear();
    let next = new Date(thisYear, month - 1, day);
    if (next < now) next = new Date(thisYear + 1, month - 1, day);
    return next;
}

// Schedule a daily morning notification for events
export async function scheduleEventNotifications(
    events: Event[],
    hourUtcOffset: number, // local hour 0-23
    minuteOffset: number,
    daysAhead: number,     // notify X days before
): Promise<void> {
    // Cancel all existing event notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
        if ((n.content.data as any)?.type === 'event_reminder') {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
    }

    if (!events.length) return;
    const permitted = await requestPermissions();
    if (!permitted) return;

    const active = events.filter(e => e.active);
    if (!active.length) return;

    // Build today's summary notification
    const today = new Date();
    const todayEvents = active.filter(e => {
        const d = daysUntilNext(e.month, e.day);
        return d === 0 || d <= daysAhead;
    });

    if (!todayEvents.length) return;

    const lines = todayEvents.map(e => {
        const d = daysUntilNext(e.month, e.day);
        if (d === 0) return `${e.emoji} ${e.name} – Today! 🎉`;
        if (d === 1) return `${e.emoji} ${e.name} – Tomorrow`;
        return `${e.emoji} ${e.name} – in ${d} days`;
    });

    // Schedule for tomorrow at configured time (daily repeat)
    const trigger: Notifications.DailyTriggerInput = {
        hour: hourUtcOffset,
        minute: minuteOffset,
        repeats: true,
    };

    await Notifications.scheduleNotificationAsync({
        content: {
            title: '📅 Upcoming Events',
            body: lines.join('\n'),
            data: { type: 'event_reminder' },
            sound: true,
        },
        trigger,
    });
}
