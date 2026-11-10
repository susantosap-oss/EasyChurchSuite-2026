import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.easychurch.easybible',
  appName: 'EasyBible',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_bible',
      iconColor: '#3B82F6',
      sound: 'gentle_chime.wav',
    },
  },
}

export default config
