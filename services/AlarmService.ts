/**
 * Alarm Service - Schedules and manages alarm notifications
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alarm } from '@/store/alarmStore';
import { router } from 'expo-router';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Notification permissions not granted');
            return false;
        }

        // Android specific channel setup
        if (Platform.OS === 'android') {
            try {
                await Notifications.setNotificationChannelAsync('alarms', {
                    name: 'Alarms',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 500, 200, 500, 200, 500],
                    lightColor: '#F97316',
                    sound: 'default',
                    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                    bypassDnd: true,
                });
            } catch (channelError) {
                console.warn('Failed to set notification channel:', channelError);
                // Continue even if channel setup fails (might be existing)
            }
        }

        return true;
    } catch (error) {
        console.error('Error requesting notification permissions:', error);
        return false;
    }
}

// Calculate next trigger date for an alarm
export function getNextTriggerDate(alarm: Alarm): Date {
    const now = new Date();
    const triggerDate = new Date();
    triggerDate.setHours(alarm.time.hour, alarm.time.minute, 0, 0);

    // If alarm time has passed today, move to tomorrow
    if (triggerDate <= now) {
        triggerDate.setDate(triggerDate.getDate() + 1);
    }

    // If alarm has repeat days, find the next valid day
    if (alarm.repeatDays.length > 0) {
        let daysChecked = 0;
        while (!alarm.repeatDays.includes(triggerDate.getDay()) && daysChecked < 7) {
            triggerDate.setDate(triggerDate.getDate() + 1);
            daysChecked++;
        }
    }

    return triggerDate;
}

// Schedule an alarm notification
export async function scheduleAlarmNotification(alarm: Alarm): Promise<string | null> {
    if (!alarm.enabled) return null;

    try {
        // Cancel any existing notification for this alarm
        await cancelAlarmNotification(alarm.id);

        const triggerDate = getNextTriggerDate(alarm);
        const secondsUntilTrigger = Math.floor((triggerDate.getTime() - Date.now()) / 1000);

        if (secondsUntilTrigger <= 0) {
            console.log('Alarm time already passed, skipping schedule');
            return null;
        }

        // Format time for display
        const period = alarm.time.hour >= 12 ? 'PM' : 'AM';
        const displayHour = alarm.time.hour % 12 || 12;
        const timeString = `${displayHour}:${alarm.time.minute.toString().padStart(2, '0')} ${period}`;

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ ' + (alarm.label || 'Alarm'),
                body: `It's ${timeString} - Time to wake up!`,
                data: {
                    alarmId: alarm.id,
                    type: 'alarm',
                },
                sound: true,
                priority: 'max',
                categoryIdentifier: 'alarm',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
            },
        });

        console.log(`Scheduled alarm ${alarm.id} for ${triggerDate.toLocaleString()}, notification ID: ${notificationId}`);
        return notificationId;
    } catch (error) {
        console.error('Error scheduling alarm notification:', error);
        return null;
    }
}

// Cancel an alarm notification
export async function cancelAlarmNotification(alarmId: string): Promise<void> {
    try {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

        for (const notification of scheduledNotifications) {
            if (notification.content.data?.alarmId === alarmId) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            }
        }
    } catch (error) {
        console.error('Error cancelling alarm notification:', error);
    }
}

// Cancel all alarm notifications
export async function cancelAllAlarmNotifications(): Promise<void> {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
        console.error('Error cancelling all notifications:', error);
    }
}

// Schedule notifications for all enabled alarms
export async function scheduleAllAlarms(alarms: Alarm[]): Promise<void> {
    const enabledAlarms = alarms.filter(a => a.enabled);

    for (const alarm of enabledAlarms) {
        await scheduleAlarmNotification(alarm);
    }

    // Silent scheduling - no console output
}

// Set up notification response listener (when user taps notification)
export function setupNotificationListener(): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;

        if (data?.type === 'alarm' && data?.alarmId) {
            // Navigate to alarm ringing screen
            router.push(`/alarm/ringing?id=${data.alarmId}`);
        }
    });

    return () => subscription.remove();
}

// Set up foreground notification listener (when notification arrives while app is open)
export function setupForegroundNotificationListener(): () => void {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data;

        if (data?.type === 'alarm' && data?.alarmId) {
            // Navigate to alarm ringing screen immediately
            router.push(`/alarm/ringing?id=${data.alarmId}`);
        }
    });

    return () => subscription.remove();
}

// Get all scheduled notifications (for debugging)
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
}

export default {
    requestNotificationPermissions,
    scheduleAlarmNotification,
    cancelAlarmNotification,
    cancelAllAlarmNotifications,
    scheduleAllAlarms,
    setupNotificationListener,
    setupForegroundNotificationListener,
    getNextTriggerDate,
    getScheduledNotifications,
};
