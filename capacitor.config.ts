import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.helpinghands.nemt',
  appName: 'Helping Hands Transportation',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
