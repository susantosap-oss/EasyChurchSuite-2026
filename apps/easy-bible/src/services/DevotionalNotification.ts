import { LocalNotifications } from '@capacitor/local-notifications'

export interface DevotionalNotificationConfig {
  enabled: boolean
  time: string // HH:MM format e.g. "06:00"
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { display } = await LocalNotifications.requestPermissions()
  return display === 'granted'
}

export async function scheduleDevotionalNotification(config: DevotionalNotificationConfig): Promise<void> {
  if (!config.enabled) {
    await cancelDevotionalNotifications()
    return
  }

  const hasPermission = await requestNotificationPermission()
  if (!hasPermission) {
    console.warn('[Notifications] Permission denied — cannot schedule devotional alerts')
    return
  }

  const [hour, minute] = config.time.split(':').map(Number)

  // Cancel existing before rescheduling
  await cancelDevotionalNotifications()

  await LocalNotifications.schedule({
    notifications: [
      {
        id: 1001,
        title: 'Renungan Pagi',
        body: 'Waktunya merenungkan Firman Tuhan hari ini',
        schedule: {
          on: { hour, minute, second: 0 },
          allowWhileIdle: true,
          repeats: true,
        },
        sound: 'gentle_chime.wav',
        smallIcon: 'ic_stat_bible',
        iconColor: '#3B82F6',
        channelId: 'devotional',
      },
    ],
  })

  console.log(`[Notifications] Devotional alert scheduled at ${config.time} daily`)
}

export async function cancelDevotionalNotifications(): Promise<void> {
  await LocalNotifications.cancel({ notifications: [{ id: 1001 }] })
}

export async function setupNotificationChannel(): Promise<void> {
  await LocalNotifications.createChannel({
    id: 'devotional',
    name: 'Renungan Harian',
    description: 'Pengingat renungan dan doa pagi',
    importance: 3, // DEFAULT
    visibility: 1,  // PUBLIC
    vibration: false,
    lights: true,
    lightColor: '#3B82F6',
  })
}
