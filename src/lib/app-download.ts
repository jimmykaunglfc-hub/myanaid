export type AppDownloadPlatform = "android" | "ios" | "other";
export type DownloadableAppPlatform = Exclude<AppDownloadPlatform, "other">;

const configuredUrl = (value: string | undefined): string => {
  const candidate = value?.trim() ?? "";
  if (!candidate) return "";
  if (candidate.startsWith("/")) return candidate;

  try {
    const protocol = new URL(candidate).protocol.toLowerCase();
    return ["https:", "itms-services:", "market:"].includes(protocol) ? candidate : "";
  } catch {
    return "";
  }
};

const packageUrls: Record<DownloadableAppPlatform, string> = {
  android: configuredUrl(process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL),
  ios: configuredUrl(process.env.NEXT_PUBLIC_IOS_DOWNLOAD_URL),
};

/** Detects the browser's device family without collecting or storing device data. */
export const detectAppDownloadPlatform = (): AppDownloadPlatform => {
  if (typeof navigator === "undefined") return "other";

  const userAgent = navigator.userAgent || "";
  if (/android/i.test(userAgent)) return "android";

  // iPadOS identifies as macOS in some browsers, but continues to report
  // touch points. Keep that edge case in the iOS distribution path.
  const iPadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (iPadDesktopMode || /iPad|iPhone|iPod/i.test(userAgent)) return "ios";

  return "other";
};

export const appPackageUrl = (platform: DownloadableAppPlatform): string => packageUrls[platform];

export const hasAppPackage = (platform: DownloadableAppPlatform): boolean => Boolean(appPackageUrl(platform));

/** Starts an explicitly user-initiated platform distribution flow. */
export const downloadAppPackage = (platform: DownloadableAppPlatform): boolean => {
  const url = appPackageUrl(platform);
  if (!url || typeof window === "undefined") return false;
  window.location.assign(url);
  return true;
};
