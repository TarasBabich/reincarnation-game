import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aeloria.game',
  appName: 'AELORIA',
  webDir: 'out',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false, backgroundColor: '#050807' }
};

export default config;
