"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";

export type DeviceAlertPreferences = {
  notifications: boolean;
  audio: boolean;
  companion: boolean;
  widget: boolean;
};

export type DeviceOutlookReminder = {
  version: 1;
  generatedAt: string;
  location: string;
  level: "routine" | "watch" | "elevated";
  score: number;
  companionId: string;
  companionName: string;
  currentCondition: string;
  forecastSummary: string;
  forecastRainChance: number;
  forecastRainMm: number;
  forecastWindKph: number;
  recommendedActions: string[];
  text: string;
  safetyNotice: string;
};

type DeviceAlertPlugin = {
  saveAdvanceOutlook(options: DeviceOutlookReminder): Promise<{ saved: boolean }>;
  setPreferences(options: DeviceAlertPreferences): Promise<{ overlayPermission?: "granted" | "denied" | "not-required"; notificationPermission?: boolean }>;
  getCapabilities(): Promise<{ platform: "ios" | "android"; widget: boolean; floatingMascot: boolean; overlayPermission?: boolean; notificationPermission?: boolean }>;
};

const MyanAidDevice = registerPlugin<DeviceAlertPlugin>("MyanAidDevice");

export const isNativeMyanAidApp = () => Capacitor.isNativePlatform();

export async function saveDeviceOutlook(reminder: DeviceOutlookReminder) {
  if (!isNativeMyanAidApp()) return { saved: false };
  return MyanAidDevice.saveAdvanceOutlook(reminder);
}

export async function syncDeviceAlertPreferences(preferences: DeviceAlertPreferences) {
  if (!isNativeMyanAidApp()) return { overlayPermission: "not-required" as const, notificationPermission: false };
  return MyanAidDevice.setPreferences(preferences);
}

export async function getDeviceAlertCapabilities() {
  if (!isNativeMyanAidApp()) return null;
  return MyanAidDevice.getCapabilities();
}

/**
 * Handles a WidgetKit/App URL without making browser builds depend on a
 * custom URL scheme. The returned cleanup function is safe to call before
 * Capacitor has finished registering its listener.
 */
export function listenForDeviceUrl(onUrl: (url: string) => void) {
  if (!isNativeMyanAidApp()) return () => undefined;

  let disposed = false;
  let remove: (() => void) | undefined;
  void App.getLaunchUrl().then((launch) => {
    if (!disposed && launch?.url) onUrl(launch.url);
  }).catch((error) => console.error("MyanAid launch URL lookup failed", error));
  void App.addListener("appUrlOpen", ({ url }) => onUrl(url)).then((handle) => {
    if (disposed) void handle.remove();
    else remove = () => { void handle.remove(); };
  }).catch((error) => console.error("MyanAid app URL listener failed", error));

  return () => {
    disposed = true;
    remove?.();
  };
}
