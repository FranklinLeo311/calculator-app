import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    FlatList,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import StepperInput from '../components/StepperInput';
import { Colors, FontSize, Radii, Spacing } from '../config/theme';
import { storageGet, storageSet } from '../utils/storage';
import { cloudRead, cloudWrite, getDeviceId } from '../utils/cloudSync';
import {
    daysUntilNext,
    scheduleEventNotifications,
    triggerTestNotification,
    scheduleMessageReminders,
} from '../utils/eventNotifications';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType = 'birthday' | 'wedding' | 'work' | 'custom';

export type Event = {
    id: string;
    name: string;
    type: EventType;
    day: number;
    month: number;
    year?: number;
    notes: string;
    active: boolean;
    notifyDaysBefore: number;
    emoji: string;
    createdAt: number;
    // Message feature
    contactNumber?: string;
    sendMessage?: boolean;
    messageScheduledAt?: string; // ISO datetime
};

type FilterTab = 'all' | 'upcoming' | 'birthdays' | 'anniversaries';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY  = 'events_v1';
const SETTINGS_KEY = 'app_settings_v1';

const TYPE_META: Record<EventType, { label: string; emoji: string; color: string }> = {
    birthday: { label: 'Birthday',           emoji: '🎂', color: '#EC4899' },
    wedding:  { label: 'Wedding Anniversary', emoji: '💍', color: '#F59E0B' },
    work:     { label: 'Work Anniversary',   emoji: '💼', color: '#3B82F6' },
    custom:   { label: 'Custom Event',       emoji: '⭐', color: '#10b981' },
};

const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_DAYS = [31,29,31,30,31,30,31,31,30,31,30,31];
const HOURS      = Array.from({ length: 24 }, (_, i) => i);
const MINUTES    = [0, 15, 30, 45];

const NOTIFY_OPTIONS = [
    { label: 'Same day',      value: 0 },
    { label: '1 day before',  value: 1 },
    { label: '3 days before', value: 3 },
    { label: '1 week before', value: 7 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(days: number): { label: string; urgent: boolean; today: boolean } {
    if (days === 0) return { label: 'Today! 🎉', urgent: true,  today: true  };
    if (days === 1) return { label: 'Tomorrow',  urgent: true,  today: false };
    if (days <= 7)  return { label: `In ${days} days`, urgent: true,  today: false };
    if (days <= 30) return { label: `In ${days} days`, urgent: false, today: false };
    const months = Math.round(days / 30.5);
    return { label: `In ~${months} month${months > 1 ? 's' : ''}`, urgent: false, today: false };
}

function ageText(year: number | undefined, month: number, type: EventType): string {
    if (!year) return '';
    const now = new Date();
    const nextOcc = new Date(now.getFullYear(), month - 1, 1);
    if (nextOcc < now) nextOcc.setFullYear(now.getFullYear() + 1);
    const turning = nextOcc.getFullYear() - year;
    if (type === 'birthday') return `Turning ${turning}`;
    return `${turning} year${turning !== 1 ? 's' : ''}`;
}

function makeid(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function openWhatsApp(phone: string, message: string) {
    const cleaned = phone.replace(/\D/g, '');
    const fullPhone = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
    const text = encodeURIComponent(message);
    Linking.openURL(`whatsapp://send?phone=${fullPhone}&text=${text}`).catch(() => {
        // Fallback to web WhatsApp
        Linking.openURL(`https://wa.me/${fullPhone}?text=${text}`).catch(() => {
            Alert.alert('WhatsApp not found', 'Could not open WhatsApp. Try SMS instead.');
        });
    });
}

function openSMS(phone: string, message: string) {
    const cleaned = phone.replace(/\D/g, '');
    const text    = encodeURIComponent(message);
    Linking.openURL(`sms:+91${cleaned}${Platform.OS === 'ios' ? '&' : '?'}body=${text}`).catch(() => {
        Alert.alert('SMS failed', 'Could not open SMS app.');
    });
}

// ─── EventCard ────────────────────────────────────────────────────────────────

const EventCard = React.memo(function EventCard({
    event, onEdit, onDelete,
}: { event: Event; onEdit: (e: Event) => void; onDelete: (id: string) => void }) {
    const meta    = TYPE_META[event.type];
    const days    = daysUntilNext(event.month, event.day);
    const cd      = formatCountdown(days);
    const age     = ageText(event.year, event.month, event.type);
    const dateStr = `${String(event.day).padStart(2,'0')} ${MONTHS[event.month-1]}${event.year ? ` ${event.year}` : ''}`;
    const msgText = event.notes?.trim() || `${event.emoji} ${event.name}`;

    return (
        <TouchableOpacity
            style={[styles.card, cd.today && styles.cardToday, !event.active && styles.cardInactive]}
            onPress={() => onEdit(event)}
            onLongPress={() =>
                Alert.alert('Delete Event', `Remove "${event.name}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => onDelete(event.id) },
                ])
            }
            activeOpacity={0.8}
        >
            <View style={[styles.cardAccent, { backgroundColor: meta.color }]} />
            <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                    <Text style={styles.cardEmoji}>{event.emoji || meta.emoji}</Text>
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardName} numberOfLines={1}>{event.name}</Text>
                        <Text style={styles.cardMeta}>{meta.label} · {dateStr}</Text>
                        {age ? <Text style={[styles.cardAge, { color: meta.color }]}>{age}</Text> : null}
                    </View>
                    <View style={[styles.badge, cd.today && styles.badgeToday, cd.urgent && !cd.today && styles.badgeUrgent]}>
                        <Text style={[styles.badgeText, (cd.today || cd.urgent) && styles.badgeTextLight]}>
                            {cd.label}
                        </Text>
                    </View>
                </View>
                {event.notes ? <Text style={styles.cardNotes} numberOfLines={2}>{event.notes}</Text> : null}

                {/* Quick message actions */}
                {event.contactNumber ? (
                    <View style={styles.msgActions}>
                        <TouchableOpacity
                            style={styles.msgBtn}
                            onPress={() => openWhatsApp(event.contactNumber!, msgText)}
                        >
                            <Text style={styles.msgBtnText}>📲 WhatsApp</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.msgBtn, styles.msgBtnSms]}
                            onPress={() => openSMS(event.contactNumber!, msgText)}
                        >
                            <Text style={[styles.msgBtnText, styles.msgBtnSmsText]}>💬 SMS</Text>
                        </TouchableOpacity>
                        <Text style={styles.msgPhone}>+91 {event.contactNumber}</Text>
                    </View>
                ) : null}
            </View>
        </TouchableOpacity>
    );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EventsScreen() {
    const [events, setEvents]           = useState<Event[]>([]);
    const [filter, setFilter]           = useState<FilterTab>('all');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [syncStatus, setSyncStatus]   = useState<'idle'|'syncing'|'ok'|'error'>('idle');
    const [cloudUrl, setCloudUrl]       = useState('');
    const [testNotifMsg, setTestNotifMsg] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // ── Load ──────────────────────────────────────────────────────────────────

    const load = useCallback(async () => {
        const saved = await storageGet<Event[]>(STORAGE_KEY);
        if (Array.isArray(saved)) setEvents(saved);
        const settings = await storageGet<any>(SETTINGS_KEY);
        const url: string = settings?.cloudSyncUrl ?? '';
        setCloudUrl(url);
        if (url) {
            setSyncStatus('syncing');
            try {
                const deviceId = await getDeviceId();
                const remote = await cloudRead<Event[]>(url, `events/${deviceId}`);
                if (Array.isArray(remote) && remote.length > 0) {
                    setEvents(remote);
                    await storageSet(STORAGE_KEY, remote);
                    setSyncStatus('ok');
                } else { setSyncStatus('idle'); }
            } catch { setSyncStatus('error'); }
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Save ──────────────────────────────────────────────────────────────────

    const save = useCallback(async (updated: Event[]) => {
        setEvents(updated);
        storageSet(STORAGE_KEY, updated).catch(() => {});
        const settings = await storageGet<any>(SETTINGS_KEY);
        const url: string = settings?.cloudSyncUrl ?? '';
        if (url) {
            setSyncStatus('syncing');
            const deviceId = await getDeviceId();
            const ok = await cloudWrite(url, `events/${deviceId}`, updated);
            setSyncStatus(ok ? 'ok' : 'error');
        }
        const hour: number   = settings?.eventNotifyHour ?? 8;
        const minute: number = settings?.eventNotifyMinute ?? 0;
        const daysBefore: number = settings?.eventNotifyDaysBefore ?? 3;
        scheduleEventNotifications(updated, hour, minute, daysBefore).catch(() => {});
        scheduleMessageReminders(updated).catch(() => {});
    }, []);

    // ── Filter ────────────────────────────────────────────────────────────────

    const filtered = React.useMemo(() => {
        let list = [...events].sort((a, b) => daysUntilNext(a.month, a.day) - daysUntilNext(b.month, b.day));
        if (filter === 'upcoming')     list = list.filter(e => daysUntilNext(e.month, e.day) <= 30);
        if (filter === 'birthdays')    list = list.filter(e => e.type === 'birthday');
        if (filter === 'anniversaries') list = list.filter(e => e.type === 'wedding' || e.type === 'work');
        return list;
    }, [events, filter]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const openAdd  = () => { setEditingEvent(null); setModalVisible(true); };
    const openEdit = (e: Event) => { setEditingEvent(e); setModalVisible(true); };

    const handleSaveEvent = (event: Event) => {
        const existing = events.find(e => e.id === event.id);
        const updated  = existing
            ? events.map(e => e.id === event.id ? event : e)
            : [...events, event];
        save(updated);
        setModalVisible(false);
    };

    const handleDelete = (id: string) => {
        save(events.filter(e => e.id !== id));
    };

    const handleTestNotification = async () => {
        const ok = await triggerTestNotification();
        if (ok) {
            setTestNotifMsg('✓ Test notification sent! Check in ~2 seconds.');
        } else {
            setTestNotifMsg(
                Platform.OS === 'web'
                    ? 'Notifications only work on Android/iOS device.'
                    : 'Notification permission denied. Enable in phone Settings.',
            );
        }
        setTimeout(() => setTestNotifMsg(''), 4000);
    };

    // ── Sync flash ────────────────────────────────────────────────────────────

    useEffect(() => {
        if (syncStatus === 'ok' || syncStatus === 'error') {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.delay(1500),
                Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start();
        }
    }, [syncStatus, fadeAnim]);

    // ── Render ────────────────────────────────────────────────────────────────

    const upcomingCount = events.filter(e => daysUntilNext(e.month, e.day) <= 7).length;

    return (
        <GradientBackground>
            <View style={styles.root}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Events & Reminders</Text>
                        <Text style={styles.headerSub}>
                            {events.length} saved{upcomingCount > 0 ? ` · ${upcomingCount} upcoming` : ''}
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        {cloudUrl ? (
                            <Animated.View style={{ opacity: fadeAnim }}>
                                <Text style={[styles.syncDot, syncStatus === 'error' && { color: Colors.error }]}>
                                    {syncStatus === 'error' ? '✗ sync' : '✓ synced'}
                                </Text>
                            </Animated.View>
                        ) : null}
                        <TouchableOpacity style={styles.testBtn} onPress={handleTestNotification}>
                            <Text style={styles.testBtnText}>🔔 Test</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                            <Text style={styles.addBtnText}>+ Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Test notification result */}
                {testNotifMsg ? (
                    <View style={styles.testMsgBanner}>
                        <Text style={styles.testMsgText}>{testNotifMsg}</Text>
                    </View>
                ) : null}

                {/* Filter chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
                    {(['all', 'upcoming', 'birthdays', 'anniversaries'] as FilterTab[]).map(f => (
                        <TouchableOpacity key={f} style={[styles.chip, filter === f && styles.chipActive]} onPress={() => setFilter(f)}>
                            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                                {f === 'all' ? '🗂 All' : f === 'upcoming' ? '⏰ Upcoming' : f === 'birthdays' ? '🎂 Birthdays' : '💍 Anniversaries'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* List */}
                {filtered.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyEmoji}>📅</Text>
                        <Text style={styles.emptyTitle}>No events yet</Text>
                        <Text style={styles.emptyBody}>Add birthdays, anniversaries and more.{'\n'}Get notified so you never miss one.</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
                            <Text style={styles.emptyBtnText}>Add your first event</Text>
                        </TouchableOpacity>
                        {!cloudUrl && (
                            <Text style={styles.cloudHint}>
                                💡 Set a Firebase URL in Settings → Cloud Sync to back up your events.
                            </Text>
                        )}
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={e => e.id}
                        renderItem={({ item }) => <EventCard event={item} onEdit={openEdit} onDelete={handleDelete} />}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            <EventModal
                visible={modalVisible}
                event={editingEvent}
                onSave={handleSaveEvent}
                onClose={() => setModalVisible(false)}
            />
        </GradientBackground>
    );
}

// ─── EventModal ───────────────────────────────────────────────────────────────

type ModalProps = {
    visible: boolean;
    event: Event | null;
    onSave: (e: Event) => void;
    onClose: () => void;
};

function EventModal({ visible, event, onSave, onClose }: ModalProps) {
    const isEdit = !!event;

    const [name, setName]               = useState('');
    const [type, setType]               = useState<EventType>('birthday');
    const [day, setDay]                 = useState(1);
    const [month, setMonth]             = useState(1);
    const [year, setYear]               = useState('');
    const [notes, setNotes]             = useState('');
    const [active, setActive]           = useState(true);
    const [notifyDays, setNotifyDays]   = useState(3);
    const [customEmoji, setCustomEmoji] = useState('');

    // Message scheduling fields
    const [contactNumber, setContactNumber]   = useState('');
    const [sendMessage, setSendMessage]       = useState(true);
    const [msgDay, setMsgDay]                 = useState(new Date().getDate());
    const [msgMonth, setMsgMonth]             = useState(new Date().getMonth() + 1);
    const [msgYear, setMsgYear]               = useState(new Date().getFullYear());
    const [msgHour, setMsgHour]               = useState(9);
    const [msgMinute, setMsgMinute]           = useState(0);
    const hasContact = contactNumber.replace(/\D/g,'').length === 10;

    useEffect(() => {
        if (visible) {
            setName(event?.name ?? '');
            setType(event?.type ?? 'birthday');
            setDay(event?.day ?? 1);
            setMonth(event?.month ?? 1);
            setYear(event?.year?.toString() ?? '');
            setNotes(event?.notes ?? '');
            setActive(event?.active ?? true);
            setNotifyDays(event?.notifyDaysBefore ?? 3);
            setCustomEmoji(event?.emoji ?? '');
            setContactNumber(event?.contactNumber ?? '');
            setSendMessage(event?.sendMessage ?? false);
            if (event?.messageScheduledAt) {
                const d = new Date(event.messageScheduledAt);
                setMsgDay(d.getDate());
                setMsgMonth(d.getMonth() + 1);
                setMsgYear(d.getFullYear());
                setMsgHour(d.getHours());
                setMsgMinute(d.getMinutes());
            } else {
                const now = new Date();
                setMsgDay(now.getDate());
                setMsgMonth(now.getMonth() + 1);
                setMsgYear(now.getFullYear());
                setMsgHour(9);
                setMsgMinute(0);
            }
        }
    }, [visible, event]);

    const buildMessageScheduledAt = (): string => {
        return new Date(msgYear, msgMonth - 1, msgDay, msgHour, msgMinute, 0).toISOString();
    };

    const handleSave = () => {
        if (!name.trim()) { Alert.alert('Name required', 'Please enter a name for this event.'); return; }
        const maxDay = MONTH_DAYS[month - 1];
        if (day < 1 || day > maxDay) { Alert.alert('Invalid date', `Day must be 1–${maxDay} for ${MONTHS[month-1]}.`); return; }
        const yearNum = year ? parseInt(year) : undefined;
        if (year && (isNaN(yearNum!) || yearNum! < 1900 || yearNum! > new Date().getFullYear())) {
            Alert.alert('Invalid year', 'Enter a valid year between 1900 and now.'); return;
        }
        if (sendMessage && contactNumber && contactNumber.replace(/\D/g,'').length !== 10) {
            Alert.alert('Invalid number', 'Enter a valid 10-digit mobile number.'); return;
        }
        onSave({
            id: event?.id ?? makeid(),
            name: name.trim(),
            type,
            day,
            month,
            year: yearNum,
            notes: notes.trim(),
            active,
            notifyDaysBefore: notifyDays,
            emoji: customEmoji.trim() || TYPE_META[type].emoji,
            createdAt: event?.createdAt ?? Date.now(),
            contactNumber: contactNumber.replace(/\D/g,'') || undefined,
            sendMessage: sendMessage && !!contactNumber,
            messageScheduledAt: (sendMessage && contactNumber) ? buildMessageScheduledAt() : undefined,
        });
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={modal.overlay}>
                <View style={modal.sheet}>
                    <View style={modal.handle} />
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={modal.title}>{isEdit ? 'Edit Event' : 'New Event'}</Text>

                        {/* Event type */}
                        <Text style={modal.label}>Type</Text>
                        <View style={modal.typeRow}>
                            {(Object.entries(TYPE_META) as [EventType, typeof TYPE_META[EventType]][]).map(([t, m]) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[modal.typeChip, type === t && { backgroundColor: m.color + '33', borderColor: m.color }]}
                                    onPress={() => setType(t)}
                                >
                                    <Text style={modal.typeEmoji}>{m.emoji}</Text>
                                    <Text style={[modal.typeLabel, type === t && { color: m.color }]}>{m.label.split(' ')[0]}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Name */}
                        <Text style={modal.label}>Name</Text>
                        <TextInput
                            style={modal.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Mom's Birthday"
                            placeholderTextColor={Colors.text.muted}
                        />

                        {/* Date */}
                        <Text style={modal.label}>Date</Text>
                        <View style={modal.dateRow}>
                            <StepperInput value={day} onChange={v => setDay(Math.max(1, Math.min(MONTH_DAYS[month-1], v)))} min={1} max={31} padZero={2} />
                            <Text style={modal.dateSep}>·</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                                {MONTHS.map((m, i) => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[modal.monthChip, month === i + 1 && modal.monthChipActive]}
                                        onPress={() => setMonth(i + 1)}
                                    >
                                        <Text style={[modal.monthChipText, month === i + 1 && modal.monthChipTextActive]}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Year */}
                        <Text style={modal.label}>Year <Text style={modal.labelHint}>(optional — shows age/years)</Text></Text>
                        <TextInput
                            style={modal.input}
                            value={year}
                            onChangeText={setYear}
                            placeholder="e.g. 1990"
                            placeholderTextColor={Colors.text.muted}
                            keyboardType="numeric"
                            maxLength={4}
                        />

                        {/* Custom emoji */}
                        <Text style={modal.label}>Custom Emoji <Text style={modal.labelHint}>(optional)</Text></Text>
                        <TextInput
                            style={[modal.input, { fontSize: 22 }]}
                            value={customEmoji}
                            onChangeText={setCustomEmoji}
                            placeholder={TYPE_META[type].emoji}
                            placeholderTextColor={Colors.text.muted}
                            maxLength={2}
                        />

                        {/* Notify days before */}
                        <Text style={modal.label}>Remind me</Text>
                        <View style={modal.notifyRow}>
                            {NOTIFY_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[modal.notifyChip, notifyDays === opt.value && modal.notifyChipActive]}
                                    onPress={() => setNotifyDays(opt.value)}
                                >
                                    <Text style={[modal.notifyText, notifyDays === opt.value && modal.notifyTextActive]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Notes */}
                        <Text style={modal.label}>Notes / Message</Text>
                        <TextInput
                            style={[modal.input, { height: 72, textAlignVertical: 'top' }]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Any special notes or the message to send..."
                            placeholderTextColor={Colors.text.muted}
                            multiline
                        />

                        {/* ── Contact & Message ── */}
                        <View style={modal.sectionDivider} />
                        <Text style={modal.sectionHead}>📱 Send Message</Text>

                        {/* Mobile number */}
                        <Text style={modal.label}>Mobile Number <Text style={modal.labelHint}>(optional — WhatsApp / SMS)</Text></Text>
                        <View style={modal.phoneRow}>
                            <View style={modal.countryCode}><Text style={modal.countryText}>🇮🇳 +91</Text></View>
                            <TextInput
                                style={[modal.input, { flex: 1, marginBottom: 0 }]}
                                value={contactNumber}
                                onChangeText={v => setContactNumber(v.replace(/\D/g,''))}
                                placeholder="9876543210"
                                placeholderTextColor={Colors.text.muted}
                                keyboardType="phone-pad"
                                maxLength={10}
                            />
                        </View>

                        {/* Always-visible schedule box */}
                        <View style={modal.scheduleBox}>
                            <View style={modal.scheduleTitleRow}>
                                <Text style={modal.scheduleTitle}>📅 Schedule Message Date & Time</Text>
                                <View style={modal.scheduleToggleRow}>
                                    <Text style={modal.scheduleToggleLabel}>
                                        {sendMessage ? 'On' : 'Off'}
                                    </Text>
                                    <Switch
                                        value={sendMessage}
                                        onValueChange={setSendMessage}
                                        trackColor={{ true: Colors.accent, false: Colors.surfaceBorder }}
                                        thumbColor={sendMessage ? '#fff' : '#aaa'}
                                    />
                                </View>
                            </View>
                            <Text style={modal.scheduleHint}>
                                When enabled, a reminder notification fires at the chosen time and opens WhatsApp/SMS with your notes pre-filled.
                            </Text>

                            {/* Date row */}
                            <Text style={modal.label}>Date</Text>
                            <View style={modal.dateRow}>
                                <StepperInput value={msgDay} onChange={v => setMsgDay(Math.max(1, Math.min(31, v)))} min={1} max={31} padZero={2} />
                                <Text style={modal.dateSep}>·</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                                    {MONTHS.map((m, i) => (
                                        <TouchableOpacity
                                            key={m}
                                            style={[modal.monthChip, msgMonth === i + 1 && modal.monthChipActive]}
                                            onPress={() => setMsgMonth(i + 1)}
                                        >
                                            <Text style={[modal.monthChipText, msgMonth === i + 1 && modal.monthChipTextActive]}>{m}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Year */}
                            <Text style={modal.label}>Year</Text>
                            <StepperInput value={msgYear} onChange={setMsgYear} min={2024} max={2099} width={64} />

                            {/* Time */}
                            <Text style={[modal.label, { marginTop: 12 }]}>Time</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                {/* Hour */}
                                <StepperInput value={msgHour} onChange={v => setMsgHour(((v % 24) + 24) % 24)} min={0} max={23} padZero={2} />
                                <Text style={[modal.dateSep, { fontSize: 22, fontWeight: '700' }]}>:</Text>
                                {/* Minute */}
                                <StepperInput value={msgMinute} onChange={v => setMsgMinute(Math.round(Math.max(0, Math.min(59, v)) / 15) * 15 % 60)} min={0} max={59} step={15} padZero={2} />
                                {/* AM/PM + formatted time */}
                                <View style={modal.ampmBadge}>
                                    <Text style={modal.ampmText}>
                                        {msgHour < 12 ? 'AM' : 'PM'}
                                    </Text>
                                </View>
                                <Text style={modal.timeFormatted}>
                                    {msgHour >= 12 ? msgHour - 12 || 12 : msgHour || 12}:{String(msgMinute).padStart(2,'0')} {msgHour < 12 ? 'AM' : 'PM'}
                                    {'\n'}{String(msgDay).padStart(2,'0')} {MONTHS[msgMonth-1]} {msgYear}
                                </Text>
                            </View>

                                <Text style={modal.scheduleNote}>
                                    🔔 You'll get a notification at this time — tap it to open WhatsApp/SMS and send the wish to +91 {contactNumber || '—'}.
                                </Text>
                            </View>

                        {/* Active toggle */}
                        <View style={[modal.toggleRow, { marginTop: 16 }]}>
                            <Text style={modal.label}>Active</Text>
                            <Switch
                                value={active}
                                onValueChange={setActive}
                                trackColor={{ true: Colors.accent, false: Colors.surfaceBorder }}
                                thumbColor={active ? '#fff' : '#aaa'}
                            />
                        </View>

                        {/* Actions */}
                        <View style={modal.actions}>
                            <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
                                <Text style={modal.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={modal.saveBtn} onPress={handleSave}>
                                <Text style={modal.saveText}>{isEdit ? 'Update' : 'Save Event'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md,
    },
    headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
    headerSub: { fontSize: FontSize.xs, color: Colors.text.muted, marginTop: 2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    syncDot: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: '600' },
    testBtn: {
        backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: Radii.md,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
    },
    testBtnText: { color: '#F59E0B', fontSize: FontSize.xs, fontWeight: '700' },
    addBtn: {
        backgroundColor: Colors.accent, borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    },
    addBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
    testMsgBanner: {
        marginHorizontal: Spacing.xl, marginBottom: Spacing.sm,
        backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: Radii.md,
        padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    },
    testMsgText: { color: '#F59E0B', fontSize: FontSize.xs, fontWeight: '600' },
    filterRow: { flexGrow: 0, marginBottom: Spacing.sm },
    filterContent: { paddingHorizontal: Spacing.xl, gap: 8 },
    chip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
    },
    chipActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
    chipText: { fontSize: FontSize.xs, color: Colors.text.secondary },
    chipTextActive: { color: Colors.accent, fontWeight: '600' },
    list: { paddingHorizontal: Spacing.xl, paddingBottom: 20 },
    card: {
        flexDirection: 'row', backgroundColor: Colors.card,
        borderRadius: Radii.lg, marginBottom: 10,
        borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden',
    },
    cardToday: { borderColor: '#EC4899' },
    cardInactive: { opacity: 0.5 },
    cardAccent: { width: 4 },
    cardBody: { flex: 1, padding: Spacing.md },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardEmoji: { fontSize: 28 },
    cardInfo: { flex: 1 },
    cardName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.text.primary },
    cardMeta: { fontSize: FontSize.xs, color: Colors.text.muted, marginTop: 1 },
    cardAge: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
    cardNotes: { fontSize: FontSize.xs, color: Colors.text.secondary, marginTop: 6 },
    badge: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
    },
    badgeUrgent: { backgroundColor: 'rgba(245,158,11,0.2)', borderColor: '#F59E0B' },
    badgeToday: { backgroundColor: 'rgba(236,72,153,0.2)', borderColor: '#EC4899' },
    badgeText: { fontSize: 10, color: Colors.text.secondary, fontWeight: '600' },
    badgeTextLight: { color: Colors.text.primary },
    msgActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
    msgBtn: {
        backgroundColor: 'rgba(37,211,102,0.15)', borderRadius: Radii.sm,
        paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(37,211,102,0.4)',
    },
    msgBtnText: { color: '#25D366', fontSize: 11, fontWeight: '700' },
    msgBtnSms: { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.4)' },
    msgBtnSmsText: { color: '#3B82F6' },
    msgPhone: { fontSize: 10, color: Colors.text.muted },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
    emptyEmoji: { fontSize: 56 },
    emptyTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text.primary },
    emptyBody: { fontSize: FontSize.sm, color: Colors.text.muted, textAlign: 'center', lineHeight: 20 },
    emptyBtn: {
        backgroundColor: Colors.accent, borderRadius: Radii.md,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, marginTop: 4,
    },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
    cloudHint: {
        fontSize: FontSize.xs, color: Colors.text.muted, textAlign: 'center',
        marginTop: 16, lineHeight: 18, paddingHorizontal: 10,
    },
});

const modal = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
        backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: Spacing.xl, paddingBottom: 32, maxHeight: '95%',
    },
    handle: {
        width: 40, height: 4, backgroundColor: Colors.surfaceBorder,
        borderRadius: 2, alignSelf: 'center', marginVertical: 12,
    },
    title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text.primary, marginBottom: Spacing.lg },
    label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary, marginBottom: 6, marginTop: 12 },
    labelHint: { fontSize: FontSize.xs, color: Colors.text.muted, fontWeight: '400' },
    sectionDivider: { height: 1, backgroundColor: Colors.surfaceBorder, marginVertical: 16 },
    sectionHead: { fontSize: FontSize.body, fontWeight: '700', color: Colors.accent, marginBottom: 4 },
    input: {
        backgroundColor: Colors.input, borderRadius: Radii.md, borderWidth: 1,
        borderColor: Colors.inputBorder, color: Colors.text.primary, padding: Spacing.md,
        fontSize: FontSize.body,
    },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 },
    countryCode: {
        backgroundColor: Colors.surface, borderRadius: Radii.md, borderWidth: 1,
        borderColor: Colors.inputBorder, padding: Spacing.md,
    },
    countryText: { color: Colors.text.primary, fontWeight: '600' },
    typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    typeChip: {
        flex: 1, minWidth: 72, alignItems: 'center', paddingVertical: 8,
        backgroundColor: Colors.surface, borderRadius: Radii.md, borderWidth: 1,
        borderColor: Colors.surfaceBorder, gap: 3,
    },
    typeEmoji: { fontSize: 20 },
    typeLabel: { fontSize: 10, color: Colors.text.secondary, fontWeight: '600' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    datePicker: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Colors.surface, borderRadius: Radii.md,
        borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: 8, paddingVertical: 6,
    },
    stepper: { paddingHorizontal: 6 },
    stepperText: { color: Colors.accent, fontSize: 20, fontWeight: '700' },
    dateValue: { color: Colors.text.primary, fontSize: FontSize.lg, fontWeight: '700', minWidth: 28, textAlign: 'center' },
    dateSep: { color: Colors.text.muted, fontSize: FontSize.lg },
    monthChip: {
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, marginRight: 6,
    },
    monthChipActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
    monthChipText: { fontSize: FontSize.xs, color: Colors.text.secondary },
    monthChipTextActive: { color: Colors.accent, fontWeight: '700' },
    notifyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    notifyChip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
    },
    notifyChipActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
    notifyText: { fontSize: FontSize.xs, color: Colors.text.secondary },
    notifyTextActive: { color: Colors.accent, fontWeight: '600' },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    sectionSub: { fontSize: FontSize.xs, color: Colors.text.muted, lineHeight: 16, marginBottom: 8 },
    scheduleBox: {
        backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg,
        borderWidth: 1, borderColor: Colors.accent + '40', marginTop: 12,
    },
    scheduleTitleRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
    },
    scheduleToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    scheduleToggleLabel: { fontSize: FontSize.xs, color: Colors.text.muted },
    scheduleTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.accent },
    scheduleHint: { fontSize: FontSize.xs, color: Colors.text.muted, lineHeight: 16, marginBottom: 4 },
    scheduleNote: {
        fontSize: FontSize.xs, color: Colors.accent, lineHeight: 16, marginTop: 12,
        borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, paddingTop: 8,
    },
    ampmBadge: {
        backgroundColor: Colors.accentSoft, borderRadius: Radii.sm,
        paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.accent + '40',
    },
    ampmText: { color: Colors.accent, fontWeight: '700', fontSize: FontSize.sm },
    timeFormatted: { color: Colors.text.secondary, fontSize: FontSize.xs, lineHeight: 16 },
    actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    cancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: Radii.md, alignItems: 'center',
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
    },
    cancelText: { color: Colors.text.secondary, fontWeight: '600' },
    saveBtn: { flex: 2, paddingVertical: 14, borderRadius: Radii.md, alignItems: 'center', backgroundColor: Colors.accent },
    saveText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
});
