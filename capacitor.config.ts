import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myanaid.app',
  appName: 'MyanAid',
  webDir: 'out',
  // Keep this native Firebase package linked from the installed npm package.
  // It supplies the iOS Firebase Auth SDK for the Capacitor app.
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          '@capacitor-firebase/authentication': { symlink: true },
          '@capacitor-firebase/firestore': { symlink: true },
        },
      },
    },
  },
};

export default config;
