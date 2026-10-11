"use client";

import { useEffect, useRef, useState } from "react";

type IconName =
  | "air"
  | "alert"
  | "arrow"
  | "bell"
  | "check"
  | "chevron"
  | "earthquake"
  | "fire"
  | "firstAid"
  | "flood"
  | "globe"
  | "health"
  | "heart"
  | "home"
  | "humanitarian"
  | "language"
  | "location"
  | "map"
  | "plan"
  | "profile"
  | "rain"
  | "search"
  | "shelter"
  | "shield"
  | "sparkle"
  | "storm"
  | "temperature"
  | "wind";

const paths: Record<IconName, React.ReactNode> = {
  air: <><path d="M4 9h10a3 3 0 1 0-3-3" /><path d="M4 14h14a3 3 0 1 1-3 3" /><path d="M4 19h7" /></>,
  alert: <><path d="M12 4 3 20h18L12 4Z" /><path d="M12 9v5" /><path d="M12 17h.01" /></>,
  arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  earthquake: <><path d="m3 13 4-4 3 6 4-11 3 8h4" /><path d="M3 20h18" /></>,
  fire: <path d="M12 22c4 0 7-3 7-7 0-5-4-7-3-12-5 3-3 7-6 9-1-2-1-4-1-5-3 2-4 5-4 8 0 4 3 7 7 7Z" />,
  firstAid: <><path d="M4 7h16v13H4z" /><path d="M9 7V4h6v3" /><path d="M12 10v7M8.5 13.5h7" /></>,
  flood: <><path d="M12 3s5 5 5 9a5 5 0 0 1-10 0c0-4 5-9 5-9Z" /><path d="M3 20c2-2 4 2 6 0s4 2 6 0 4 2 6 0" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  health: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="M12 7v8M8 11h8" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  humanitarian: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><path d="M12 13s-4-2.2-4-4.5A2.5 2.5 0 0 1 12 6a2.5 2.5 0 0 1 4 2.5C16 10.8 12 13 12 13Z" /></>,
  language: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
  plan: <><path d="M7 3h10v4H7z" /><path d="M5 5H3v16h18V5h-2" /><path d="m8 12 2 2 5-5M8 18h8" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  rain: <><path d="M6 15a4 4 0 0 1 1-7.9A6 6 0 0 1 18.4 9 3 3 0 0 1 18 15H6Z" /><path d="m8 18-1 2M13 18l-1 2M18 18l-1 2" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  shelter: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-5" /></>,
  sparkle: <><path d="m12 3 1.4 4.1L18 9l-4.6 1.9L12 15l-1.4-4.1L6 9l4.6-1.9L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
  storm: <><path d="M6 16a4 4 0 0 1 1-7.9A6 6 0 0 1 18.4 10 3 3 0 0 1 18 16H6Z" /><path d="m13 15-3 5h4l-2 3" /></>,
  temperature: <><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" /><path d="M12 9v8" /></>,
  wind: <><path d="M3 8h12a3 3 0 1 0-3-3" /><path d="M3 13h16a3 3 0 1 1-3 3" /><path d="M3 18h8" /></>,
};

function Icon({ name, size = "md" }: { name: IconName; size?: "sm" | "md" | "lg" }) {
  return <svg className={`icon icon-${size}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

type EmergencyIconName = "flood" | "storm" | "earthquake" | "fire" | "health" | "humanitarian";

function Emergency3DIcon({ name }: { name: EmergencyIconName }) {
  const gradientId = `emergency-gradient-${name}`;
  const accentId = `emergency-accent-${name}`;
  const palettes: Record<EmergencyIconName, { primaryStart: string; primaryEnd: string; accentStart: string; accentEnd: string }> = {
    flood: { primaryStart: "#65D9F3", primaryEnd: "#1479BD", accentStart: "#F4FDFF", accentEnd: "#A9E9F7" },
    storm: { primaryStart: "#718096", primaryEnd: "#283747", accentStart: "#FFE58A", accentEnd: "#F4B942" },
    earthquake: { primaryStart: "#C98C54", primaryEnd: "#704225", accentStart: "#FFF1DA", accentEnd: "#D9B38C" },
    fire: { primaryStart: "#FF6B4A", primaryEnd: "#D62828", accentStart: "#FFE078", accentEnd: "#FF9F1C" },
    health: { primaryStart: "#F7FBFF", primaryEnd: "#B9D4E6", accentStart: "#FF6670", accentEnd: "#D92035" },
    humanitarian: { primaryStart: "#E8A95B", primaryEnd: "#9C632F", accentStart: "#FF6B6B", accentEnd: "#D92D3A" },
  };
  const palette = palettes[name];
  return <svg className="emergency-3d-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={gradientId} x1="15" y1="10" x2="49" y2="55" gradientUnits="userSpaceOnUse">
        <stop stopColor={palette.primaryStart} />
        <stop offset="1" stopColor={palette.primaryEnd} />
      </linearGradient>
      <linearGradient id={accentId} x1="20" y1="15" x2="42" y2="49" gradientUnits="userSpaceOnUse">
        <stop stopColor={palette.accentStart} />
        <stop offset="1" stopColor={palette.accentEnd} />
      </linearGradient>
    </defs>
    <ellipse className="icon-ground-shadow" cx="32" cy="53" rx="20" ry="5" />
    {name === "flood" && <>
      <path d="M32 7C25 16 19 23 19 32a13 13 0 0 0 26 0C45 23 39 16 32 7Z" fill={`url(#${gradientId})`} />
      <path d="M24 34c3-3 6 3 9 0s6 3 9 0v7c-3 3-6-3-9 0s-6-3-9 0v-7Z" fill={`url(#${accentId})`} />
      <path className="icon-highlight" d="M27 18c-3 4-5 8-5 11" />
    </>}
    {name === "storm" && <>
      <circle cx="25" cy="29" r="12" fill={`url(#${gradientId})`} />
      <circle cx="39" cy="28" r="10" fill={`url(#${gradientId})`} />
      <rect x="15" y="28" width="37" height="16" rx="8" fill={`url(#${gradientId})`} />
      <path d="m33 33-7 12h7l-3 11 12-16h-8l5-7h-6Z" fill={`url(#${accentId})`} />
      <path className="icon-highlight" d="M20 27c2-5 6-7 10-7" />
    </>}
    {name === "earthquake" && <>
      <path d="m10 27 19-13 25 13-7 24H17L10 27Z" fill={`url(#${gradientId})`} />
      <path d="m30 16 5 10-6 7 7 4-8 13" stroke={`url(#${accentId})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path className="icon-highlight" d="m16 27 13-9" />
    </>}
    {name === "fire" && <>
      <path d="M34 7c2 12-8 15-4 25-4-2-6-6-6-10-7 6-11 13-8 22 2 8 9 13 17 13 10 0 18-7 18-18 0-12-9-18-17-32Z" fill={`url(#${gradientId})`} />
      <path d="M33 29c1 7-6 9-4 16-2-1-3-3-3-5-3 3-4 8-1 12 2 3 5 4 8 4 6 0 10-4 10-10 0-7-5-11-10-17Z" fill={`url(#${accentId})`} />
      <path className="icon-highlight" d="M39 18c4 5 7 10 7 16" />
    </>}
    {name === "health" && <>
      <path d="M32 7 51 14v15c0 13-8 22-19 28-11-6-19-15-19-28V14L32 7Z" fill={`url(#${gradientId})`} />
      <rect x="28" y="19" width="8" height="26" rx="3" fill={`url(#${accentId})`} />
      <rect x="19" y="28" width="26" height="8" rx="3" fill={`url(#${accentId})`} />
      <path className="icon-highlight" d="m19 17 13-5" />
    </>}
    {name === "humanitarian" && <>
      <path d="m8 31 24-20 24 20-6 7v16H14V38l-6-7Z" fill={`url(#${gradientId})`} />
      <path d="M32 45s-11-6-11-13c0-6 8-8 11-3 3-5 11-3 11 3 0 7-11 13-11 13Z" fill={`url(#${accentId})`} />
      <path className="icon-highlight" d="m15 30 17-14" />
    </>}
  </svg>;
}

type PreparednessIconName = "plan" | "heart" | "shelter" | "firstAid";

function Preparedness3DIcon({ name }: { name: PreparednessIconName }) {
  const baseId = `preparedness-base-${name}`;
  const accentId = `preparedness-accent-${name}`;
  return <svg className="preparedness-3d-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={baseId} x1="15" y1="10" x2="50" y2="55" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5ED5EC" />
        <stop offset=".52" stopColor="#368FCB" />
        <stop offset="1" stopColor="#2766A9" />
      </linearGradient>
      <linearGradient id={accentId} x1="20" y1="15" x2="43" y2="49" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#C6EDF7" />
      </linearGradient>
    </defs>
    <ellipse className="preparedness-icon-shadow" cx="32" cy="54" rx="19" ry="4.5" />
    {name === "plan" && <>
      <rect x="15" y="12" width="34" height="43" rx="7" fill={`url(#${baseId})`} />
      <rect x="21" y="19" width="22" height="28" rx="4" fill={`url(#${accentId})`} />
      <rect x="25" y="8" width="14" height="9" rx="4" fill="#2766A9" />
      <path d="m25 30 4 4 9-10M25 41h13" stroke="#2766A9" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path className="preparedness-highlight" d="M19 18v24" />
    </>}
    {name === "heart" && <>
      <path d="M32 55S11 43 11 26c0-14 18-18 21-5 3-13 21-9 21 5 0 17-21 29-21 29Z" fill={`url(#${baseId})`} />
      <path d="M32 46S19 38 19 28c0-8 10-10 13-3 3-7 13-5 13 3 0 10-13 18-13 18Z" fill={`url(#${accentId})`} />
      <path className="preparedness-highlight" d="M17 25c1-5 5-8 9-8" />
    </>}
    {name === "shelter" && <>
      <path d="m7 31 25-22 25 22-6 7v17H13V38l-6-7Z" fill={`url(#${baseId})`} />
      <path d="M21 34h22v21H21V34Z" fill={`url(#${accentId})`} />
      <path d="M28 42h8v13h-8V42Z" fill="#2766A9" />
      <path className="preparedness-highlight" d="m14 30 18-16" />
    </>}
    {name === "firstAid" && <>
      <rect x="9" y="20" width="46" height="35" rx="9" fill={`url(#${baseId})`} />
      <path d="M23 20v-5c0-4 3-7 7-7h4c4 0 7 3 7 7v5" stroke="#2766A9" strokeWidth="5" />
      <rect x="18" y="27" width="28" height="21" rx="5" fill={`url(#${accentId})`} />
      <path d="M32 31v13M25.5 37.5h13" stroke="#2766A9" strokeWidth="4" strokeLinecap="round" />
      <path className="preparedness-highlight" d="M14 28v16" />
    </>}
  </svg>;
}

function Action({ children, className = "", onClick, ariaLabel }: { children: React.ReactNode; className?: string; onClick?: () => void; ariaLabel?: string }) {
  const activate = (label: string) => onClick ? onClick() : window.dispatchEvent(new CustomEvent("mynaid-action", { detail: ariaLabel || label.trim() || "MyanAid" }));
  return <div className={`action ${className}`} role="button" tabIndex={0} aria-label={ariaLabel} onClick={(e) => activate(e.currentTarget.textContent || "")} onKeyDown={(e) => e.key === "Enter" && activate(e.currentTarget.textContent || "")}>{children}</div>;
}

const categories = [
  { icon: "flood" as IconName, title: "Flood & Water", description: "River, urban and coastal flood risks", status: "Low risk", tone: "safe" },
  { icon: "storm" as IconName, title: "Storm & Weather", description: "Storms, heavy rain, wind and heat", status: "Rain watch", tone: "caution" },
  { icon: "earthquake" as IconName, title: "Earthquake & Tsunami", description: "Recent events and official guidance", status: "No alert", tone: "safe" },
  { icon: "fire" as IconName, title: "Fire, Haze & Air Quality", description: "Wildfire, smoke and particle levels", status: "AQI 58 · Moderate", tone: "caution" },
  { icon: "health" as IconName, title: "Public Health Alerts", description: "Verified notices and prevention", status: "No alert", tone: "safe" },
  { icon: "humanitarian" as IconName, title: "Humanitarian Situation", description: "Shelters, services and access", status: "Services normal", tone: "info" },
];

type Severity = "Normal" | "Watch" | "Warning" | "Critical";
type AlertData = { id: string; tone: "amber" | "blue" | "green" | "red"; icon: IconName; severity: Severity; authorityClassification: string; sourceType: "Official" | "Partner-verified" | "Satellite / Modelled"; title: string; location: string; source: string; issuedTime: string; updatedTime: string; expiryTime: string; confidence: string; summary: string; affectedArea: string; timeWindow: string; relevance: string; guidance: string[] };

const localAlert: AlertData = { id: "bangkok-rain", tone: "amber", icon: "rain", severity: "Warning", authorityClassification: "TMD Weather Watch", sourceType: "Official", title: "Heavy rain and localized flooding possible", location: "Bangkok, Thailand", source: "Thai Meteorological Department", issuedTime: "Today, 18:10 ICT", updatedTime: "10 min ago", expiryTime: "Expected through 23:00 ICT", confidence: "High confidence", summary: "Heavy rainfall may cause temporary flooding on low-lying roads and near canals this evening.", affectedArea: "Bangkok Metropolitan Area, especially low-lying districts and roads near canals", timeWindow: "Today, 18:10–23:00 ICT", relevance: "This alert directly affects your current location.", guidance: ["Avoid low-lying roads and underpasses", "Do not walk or drive through floodwater", "Keep your phone charged and official alerts enabled"] };

const alerts: AlertData[] = [
  { id: "manila-rain", tone: "amber", icon: "storm", severity: "Warning", authorityClassification: "PAGASA Heavy Rain Advisory", sourceType: "Official", title: "Heavy Rain Advisory", location: "Manila, Philippines", source: "PAGASA", issuedTime: "Today, 17:00 PHT", updatedTime: "18 min ago", expiryTime: "Expected through 23:00 PHT", confidence: "High confidence", summary: "Periods of heavy rain may cause localized street flooding this evening.", affectedArea: "Metro Manila and nearby provinces", timeWindow: "Today, 17:00–23:00 PHT", relevance: "Global monitoring · Not near your saved locations", guidance: ["Monitor local drainage conditions", "Avoid flooded streets", "Follow PAGASA updates"] },
  { id: "chiangmai-river", tone: "blue", icon: "flood", severity: "Watch", authorityClassification: "Elevated River Level Notice", sourceType: "Official", title: "Elevated River Level", location: "Chiang Mai, Thailand", source: "ThaiWater", issuedTime: "Today, 16:45 ICT", updatedTime: "34 min ago", expiryTime: "Monitoring through tomorrow morning", confidence: "High confidence", summary: "Water levels are elevated but remain below the critical threshold.", affectedArea: "Communities near the Ping River", timeWindow: "Monitoring through tomorrow morning", relevance: "420 km from your current location", guidance: ["Stay away from fast-moving water", "Move valuables above floor level", "Check local river updates"] },
  { id: "singapore-air", tone: "green", icon: "air", severity: "Normal", authorityClassification: "NEA PSI: Moderate", sourceType: "Official", title: "Air Quality: Moderate", location: "Singapore", source: "NEA Singapore", issuedTime: "Today, 16:00 SGT", updatedTime: "1 hr ago", expiryTime: "Next update at 19:00 SGT", confidence: "High confidence", summary: "Most people can continue normal outdoor activities.", affectedArea: "Islandwide", timeWindow: "Current 24-hour PSI period", relevance: "Global monitoring · Not near your saved locations", guidance: ["Continue normal activity if comfortable", "Sensitive groups should monitor symptoms", "Check NEA updates before prolonged activity"] },
  { id: "turkiye-earthquake", tone: "red", icon: "earthquake", severity: "Critical", authorityClassification: "AFAD Earthquake Notification", sourceType: "Official", title: "Earthquake Alert — Check official guidance", location: "Türkiye", source: "AFAD", issuedTime: "Today, 18:22 TRT", updatedTime: "6 min ago", expiryTime: "Aftershocks possible for several hours", confidence: "Confirmed event", summary: "A moderate earthquake was recorded. Check local guidance and inspect for hazards.", affectedArea: "Epicentral region and surrounding provinces", timeWindow: "Issued today · Aftershocks possible", relevance: "Global monitoring · Not near your saved locations", guidance: ["Drop, Cover, and Hold On during shaking", "Move away from damaged structures", "Follow AFAD instructions"] },
];

const shortcuts = [
  { icon: "plan" as IconName, title: "Emergency checklist", meta: "Build your essential kit" },
  { icon: "heart" as IconName, title: "Family safety plan", meta: "Keep everyone connected" },
  { icon: "shelter" as IconName, title: "Find public shelters", meta: "Verified nearby locations" },
  { icon: "firstAid" as IconName, title: "First-aid guidance", meta: "Clear steps for common needs" },
];

function Brand() {
  return <div className="brand"><div className="brand-mark"><Icon name="shield" /></div><div><div className="brand-name">MyanAid</div><div className="brand-tagline">Prepared. Informed. Safer together.</div></div></div>;
}

function Header({ onLocation, onNotifications }: { onLocation: () => void; onNotifications: () => void }) {
  const [languageOpen, setLanguageOpen] = useState(false);
  const [language, setLanguage] = useState("English");
  return <header className="header">
    <div className="header-inner">
      <Brand />
      <div className="header-actions">
        <Action className="location-pill" onClick={onLocation}><Icon name="location" size="sm" /><span>Bangkok, Thailand</span><Icon name="chevron" size="sm" /></Action>
        <div className="language-wrap">
          <Action className="icon-pill" onClick={() => setLanguageOpen(!languageOpen)}><Icon name="language" size="sm" /><span>{language}</span><Icon name="chevron" size="sm" /></Action>
          {languageOpen && <div className="language-menu"><div className="menu-label">Language</div>{["English", "မြန်မာ", "ไทย", "Bahasa Indonesia"].map((x) => <Action key={x} className={`menu-item ${language === x ? "selected" : ""}`} onClick={() => { setLanguage(x); setLanguageOpen(false); }}>{x}{language === x && <Icon name="check" size="sm" />}</Action>)}</div>}
        </div>
        <Action className="square-action" ariaLabel="Notifications" onClick={onNotifications}><Icon name="bell" /><span className="notification-dot" /></Action>
      </div>
    </div>
  </header>;
}

function MascotIcon() {
  return <svg className="mascot-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path className="mascot-body" d="M24 4.5c8.7 0 15.8 5.8 15.8 13v9.8c0 7.2-7.1 13-15.8 13h-2.7l-5.8 3.2.9-4.9C11.5 36.6 8.2 32.4 8.2 27.3v-9.8c0-7.2 7.1-13 15.8-13Z" />
    <path className="mascot-face" d="M15.2 18.1c2.7-3 5.6-4.5 8.8-4.5s6.1 1.5 8.8 4.5v8.4c0 4.5-3.9 8.1-8.8 8.1s-8.8-3.6-8.8-8.1v-8.4Z" />
    <circle cx="20.4" cy="24" r="1.5" fill="currentColor" />
    <circle cx="27.6" cy="24" r="1.5" fill="currentColor" />
    <path d="M20.2 29c1.1 1 2.4 1.5 3.8 1.5s2.7-.5 3.8-1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M24 8v4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="24" cy="7" r="1.7" fill="currentColor" />
  </svg>;
}

function FloatingAI({ onClick }: { onClick: () => void }) {
  return <Action className="floating-ai" onClick={onClick} ariaLabel="Ask MyanAid AI">
    <MascotIcon />
    <span className="floating-ai-label">Ask MyanAid AI</span>
    <span className="floating-ai-status" />
  </Action>;
}

function StatusCard({ onMap, onGuidance, severity = "warning" }: { onMap: () => void; onGuidance: () => void; severity?: "normal" | "watch" | "warning" | "critical" }) {
  if (severity === "critical") return <section className="critical-emergency-banner">
    <div className="critical-heading"><div className="critical-icon"><Icon name="alert" size="lg" /></div><div><div className="critical-label">Critical emergency · Official</div><h1>Flash Flood Warning</h1><p><Icon name="location" size="sm" />Bangkok, Thailand · Issued 18:10 ICT</p></div></div>
    <div className="critical-source"><Icon name="shield" size="sm" />Thai Meteorological Department</div>
    <div className="critical-actions"><span><strong>1</strong>Move away from low-lying roads</span><span><strong>2</strong>Do not walk or drive through floodwater</span><span><strong>3</strong>Keep your phone charged and alerts on</span></div>
    <Action className="critical-cta">Read official guidance<Icon name="arrow" size="sm" /></Action>
  </section>;
  const severityCopy = { normal: "Normal", watch: "Watch", warning: "Warning", critical: "Critical Emergency" }[severity];
  return <section className={`status-card severity-${severity}`}>
    <div className="status-main">
      <div className="hero-severity"><Icon name="alert" size="sm" /> {severityCopy}</div>
      <h1>Heavy rain is possible this evening</h1>
      <div className="status-location"><Icon name="location" size="sm" /> Bangkok, Thailand</div>
      <div className="status-badge"><Icon name="shield" size="sm" /> Official weather watch · TMD</div>
      <div className="updated">Updated 10 minutes ago</div>
    </div>
    <div className="weather-panel">
      <div className="conditions-heading"><strong>General local conditions</strong><span>Supporting context · Not a replacement for the official warning</span></div>
      <div className="weather-grid">
        <div className="weather-item"><Icon name="rain" /><strong>Heavy</strong><span>Expected rainfall</span></div>
        <div className="weather-item"><Icon name="alert" /><strong>20:00–23:00</strong><span>Highest-risk window</span></div>
        <div className="weather-item"><Icon name="flood" /><strong>Elevated</strong><span>Local flood risk</span></div>
        <div className="weather-item"><Icon name="wind" /><strong>Low</strong><span>Wind risk · 12 km/h</span></div>
        <div className="weather-item"><Icon name="air" /><strong>58</strong><span>Air quality · Moderate</span></div>
      </div>
      <div className="hero-actions"><Action className="guidance-button" onClick={onGuidance}><Icon name="shield" size="sm" /><span>What should I do now?</span><Icon name="arrow" size="sm" /></Action><Action className="map-button secondary" onClick={onMap}><Icon name="map" size="sm" /><span>View live map</span><Icon name="arrow" size="sm" /></Action></div>
    </div>
  </section>;
}

function NearYou({ onAlert }: { onAlert: (alert: AlertData) => void }) {
  return <section className="near-section">
    <SectionTitle title="Near you" subtitle="Bangkok and your saved locations appear before global updates" />
    <div className="near-grid">
      <div className="local-alert-card">
        <div className="local-alert-icon"><Icon name="rain" /></div>
        <div className="local-alert-copy">
          <div className="local-alert-top"><span className="watch-label">Watch</span><span>Issued 18:10 ICT</span></div>
          <h3>Heavy rain and localized flooding possible</h3>
          <p>Bangkok Metropolitan Area · Through 23:00</p>
          <div className="verification-row"><Icon name="shield" size="sm" /><strong>Official</strong><span>Thai Meteorological Department</span></div>
        </div>
        <Action className="local-guidance-button" onClick={() => onAlert(localAlert)}>Read local guidance<Icon name="arrow" size="sm" /></Action>
      </div>
      <div className="saved-location-card"><div><span className="saved-label">Saved location</span><h3>Yangon, Myanmar</h3><p>No verified active alerts</p></div><div className="normal-badge"><Icon name="check" size="sm" />Normal</div></div>
    </div>
  </section>;
}

function SectionTitle({ title, subtitle, action, onAction }: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return <div className="section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <Action className="text-action" onClick={onAction}>{action}<Icon name="arrow" size="sm" /></Action>}</div>;
}

function Home({ onMap, onAI, onCategory, onAlert, onAlerts, onPreparedness }: { onMap: () => void; onAI: () => void; onCategory: (title: string) => void; onAlert: (alert: AlertData) => void; onAlerts: () => void; onPreparedness: () => void }) {
  const alertTrack = useRef<HTMLDivElement>(null);
  const [alertPage, setAlertPage] = useState(0);
  const goToAlert = (index: number) => {
    setAlertPage(index);
    const track = alertTrack.current;
    const card = track?.children[index] as HTMLElement | undefined;
    if (track && card) track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
  };
  return <main>
    <div className="hero-wash" />
    <div className="content">
      <StatusCard onMap={onMap} onGuidance={() => onAlert(localAlert)} />
      <NearYou onAlert={onAlert} />
      <section className="section">
        <div className="global-kicker"><Icon name="globe" size="sm" />Global monitoring</div>
        <SectionTitle title="Emergency categories" subtitle="Explore verified information worldwide" />
        <div className="category-grid">{categories.map((item) => <Action key={item.title} className={`category-card ${item.title === "Storm & Weather" ? "watched" : "inactive"}`} onClick={() => onCategory(item.title)}>
          <div className="category-icon category-icon-3d"><Emergency3DIcon name={item.icon as EmergencyIconName} /></div>
          <div className="category-copy"><h3>{item.title}</h3><p>{item.description}</p><div className={`category-status ${item.tone}`}><span />{item.status}</div></div>
          <Icon name="chevron" />
        </Action>)}</div>
      </section>
      <section className="section">
        <SectionTitle title="Active verified alerts" subtitle="Current updates from trusted official and partner sources" action="View all alerts" onAction={onAlerts} />
        <div className="alert-scroll" ref={alertTrack} onScroll={(event) => {
          const track = event.currentTarget;
          const cards = Array.from(track.children) as HTMLElement[];
          const nearest = cards.reduce((best, card, index) => Math.abs(card.offsetLeft - track.scrollLeft) < Math.abs(cards[best].offsetLeft - track.scrollLeft) ? index : best, 0);
          if (nearest !== alertPage) setAlertPage(nearest);
        }}>{alerts.map((alert, i) => <div className={`alert-card tone-${alert.tone}`} key={alert.title}>
          <div className="alert-top"><div className="alert-symbol"><Icon name={alert.icon} /></div><div className="severity-label">{alert.severity}</div></div>
          <div className="alert-content"><h3>{alert.title}</h3><div className="authority-classification">{alert.authorityClassification}</div><div className="alert-location"><Icon name="location" size="sm" />{alert.location}</div><p>{alert.summary}</p></div>
          <div className="alert-meta"><div><span>{alert.sourceType} · {alert.source}</span><span> · Updated {alert.updatedTime}</span></div><div className="verified"><Icon name="shield" size="sm" />{alert.expiryTime}</div></div>
          <Action className="details-button" onClick={() => onAlert(alert)}>View details<Icon name="arrow" size="sm" /></Action>
        </div>)}</div>
        <div className="alert-pagination" aria-label="Alert pages">{alerts.map((alert, index) => <Action key={alert.title} className={`pagination-dot ${alertPage === index ? "active" : ""}`} onClick={() => goToAlert(index)} ariaLabel={`Show alert ${index + 1}`}><span /></Action>)}</div>
      </section>
      <section className="split-section">
        <div className="shortcut-side">
          <SectionTitle title="Preparedness shortcuts" subtitle="Small steps that help you prepare" />
          <div className="shortcut-grid">{shortcuts.map((item) => <Action key={item.title} className="shortcut-card" onClick={onPreparedness}>
            <div className="shortcut-icon shortcut-icon-3d"><Preparedness3DIcon name={item.icon as PreparednessIconName} /></div><div><h3>{item.title}</h3><p>{item.meta}</p></div><Icon name="chevron" size="sm" />
          </Action>)}</div>
        </div>
        <div className="ai-card">
          <div className="ai-orb"><Icon name="sparkle" size="lg" /></div>
          <div className="ai-kicker">AI safety guidance</div><h2>Not sure what to do?</h2>
          <p>Ask MyanAid AI for simple, location-aware preparedness guidance in your preferred language.</p>
          <div className="prompt-list">{["What should I prepare before a cyclone?", "How do I stay safe during an earthquake?", "Is it safe to go outside with this air quality?", "How can I prevent dengue after flooding?"].map(x => <Action className="prompt-chip" key={x} onClick={onAI}>{x}<Icon name="arrow" size="sm" /></Action>)}</div>
          <Action className="ai-primary" onClick={onAI}><Icon name="sparkle" size="sm" />Ask MyanAid AI</Action>
        </div>
      </section>
      <div className="disclaimer"><Icon name="shield" size="sm" /><span>Information may change. Follow official local authorities for emergency instructions.</span></div>
    </div>
  </main>;
}

function MapView({ onAlert }: { onAlert: (alert: AlertData) => void }) {
  const [filter, setFilter] = useState("All alerts");
  const [scope, setScope] = useState("Global");
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const filters = ["All alerts", "Flood", "Storm", "Earthquake", "Fire & Air Quality", "Health", "Humanitarian"];
  return <main className="map-page">
    <div className="map-toolbar">
      <div className="map-heading"><div><h1>Live alert map</h1><p>Verified events · Refreshed 2 minutes ago</p></div></div>
      <div className="map-search-group">
        <div className="map-search"><Icon name="search" /><span>Search country, city or region</span><span className="search-hint">Search</span></div>
        <Action className="locate-button" ariaLabel="Use my location"><Icon name="location" /></Action>
      </div>
    </div>
    <div className="map-scope"><Action className={scope === "Near you" ? "active" : ""} onClick={() => setScope("Near you")}><Icon name="location" size="sm" />Near you</Action><Action className={scope === "Saved locations" ? "active" : ""} onClick={() => setScope("Saved locations")}><Icon name="heart" size="sm" />Saved locations</Action><Action className={scope === "Global" ? "active" : ""} onClick={() => setScope("Global")}><Icon name="globe" size="sm" />Global</Action></div>
    <div className="filter-row">{filters.map(x => <Action key={x} className={`filter-chip ${filter === x ? "active" : ""}`} onClick={() => setFilter(x)}>{x}</Action>)}</div>
    <div className="world-map">
      <svg viewBox="0 0 1000 520" aria-label="Geographic world alert map">
        <g className="map-grid-lines">
          <path d="M0 130h1000M0 260h1000M0 390h1000M200 0v520M400 0v520M600 0v520M800 0v520" />
        </g>
        <g className="geo-land">
          <path d="M42 110 74 81l56-13 40-26 66 10 37 34 44 15 22 34-18 27-42 5-24 33-32 8-18 35-27 14-24-31-40-11-21-35-35-19-18-32Z" />
          <path d="m229 239 35 18 31 44 18 65-20 77-28 45-22-56-20-53 5-58-22-42Z" />
          <path d="m381 104 30-31 47-4 20 22 43-10 35 21 31-11 37 20 51-4 46-25 65 14 65 4 75 27 50 45-24 33-52 7-36 25-55-7-30 25-42-10-27 32-21 3-9 45-39 63-31-17-13-57-29-37-14-50-45-15-20-37-50-10-24-41Z" />
          <path d="m475 218 52 6 44 37 26 62-20 80-39 49-37-48-22-69-18-54Z" />
          <path d="m791 371 45-29 45 9 30 27 46 11-5 43-38 29-64-3-54-36Z" />
          <path d="m162 24 43-18 40 12 14 28-31 24-49-7-27-18Z" />
          <path d="m916 280 18-11 13 20-13 30-18-12Z" />
        </g>
        <g className="geo-terrain">
          <path d="m97 94 44 23 34 38 40 8 35 28M235 274l34 47 2 67M446 130l45 31 63-8 55 31 69-25 61 23 73-13M506 243l39 45 17 70M816 387l48 20 46-12" />
        </g>
        <g className="geo-borders">
          <path d="m130 68 12 58-28 54M206 79l-15 75 32 54M411 106l32 47 39 18M485 102l18 59 43 20M563 118l17 67 55 27M652 112l-6 64 48 49M727 111l4 65 46 47M495 229l37 42-24 66M551 276l35 40-17 62" />
        </g>
        <g className="geo-rivers">
          <path d="M179 101c-6 32 20 49 5 80s18 46 7 70M535 247c16 29-4 55 13 81s-4 55 4 81M721 154c-19 19-5 44-27 57s-8 32-24 48" />
        </g>
        <g className="geo-labels">
          <text x="122" y="142">NORTH AMERICA</text><text x="238" y="350">SOUTH AMERICA</text>
          <text x="445" y="145">EUROPE</text><text x="515" y="330">AFRICA</text>
          <text x="697" y="168">ASIA</text><text x="822" y="411">AUSTRALIA</text>
          <circle cx="714" cy="225" r="3" /><text x="723" y="229" className="city-label">Bangkok</text>
          <circle cx="772" cy="239" r="3" /><text x="781" y="243" className="city-label">Manila</text>
        </g>
      </svg>
      <Action className="map-marker marker-1 tone-amber" onClick={() => setSelectedMarker(0)}><Icon name="storm" size="sm" /><span className="marker-label">Manila · Rain advisory</span></Action>
      <Action className="map-marker marker-2 tone-blue" onClick={() => setSelectedMarker(1)}><Icon name="flood" size="sm" /><span className="marker-label">Chiang Mai · River watch</span></Action>
      <Action className="map-marker marker-3 tone-green" onClick={() => setSelectedMarker(2)}><Icon name="air" size="sm" /></Action>
      <Action className="map-marker marker-4 tone-red" onClick={() => setSelectedMarker(3)}><Icon name="earthquake" size="sm" /><span className="marker-label">Türkiye · Earthquake</span></Action>
      <div className="current-location-marker"><span /><div>Current location</div></div>
      <Action className="map-cluster">12</Action>
      <div className="map-legend"><strong>MyanAid severity</strong><span><i className="legend-dot red" />Critical</span><span><i className="legend-dot amber" />Warning</span><span><i className="legend-dot blue" />Watch</span><span><i className="legend-dot green" />Normal</span></div>
      <div className="model-note"><Icon name="alert" size="sm" /><span>Satellite detections and forecast models are not official evacuation instructions.</span></div>
      <div className="map-controls"><Action ariaLabel="Zoom in">+</Action><span /><Action ariaLabel="Zoom out">−</Action></div>
      <div className="map-scale"><span />1,000 km</div>
      <div className="map-attribution">Natural Earth · MyanAid data</div>
      {selectedMarker !== null && <div className="selected-marker-card"><div className="selected-marker-head"><span className={`severity-label tone-${alerts[selectedMarker].tone}`}>{alerts[selectedMarker].severity}</span><Action onClick={() => setSelectedMarker(null)}>Close</Action></div><h3>{alerts[selectedMarker].title}</h3><div className="authority-classification">{alerts[selectedMarker].authorityClassification}</div><p><Icon name="location" size="sm" />{alerts[selectedMarker].location}</p><p className="marker-summary">{alerts[selectedMarker].summary}</p><div className="verification-row"><Icon name="shield" size="sm" /><strong>{alerts[selectedMarker].sourceType}</strong><span>{alerts[selectedMarker].source} · {alerts[selectedMarker].updatedTime}</span></div><Action className="official-map-action" onClick={() => onAlert(alerts[selectedMarker])}>View safety guidance</Action></div>}
    </div>
  </main>;
}

function AlertsView({ onAlert }: { onAlert: (alert: AlertData) => void }) {
  return <main className="inner-page content"><div className="page-heading"><div className="eyebrow">Verified information</div><h1>Alerts</h1><p>Trusted updates for Bangkok and your saved locations.</p></div><div className="stacked-alerts">{[localAlert, ...alerts].map((a) => <Action className={`list-alert tone-${a.tone}`} key={a.id} onClick={() => onAlert(a)}><div className="alert-symbol"><Icon name={a.icon} /></div><div className="list-alert-copy"><div className="list-topline"><span className="severity-label">{a.severity}</span><span>Updated {a.updatedTime}</span></div><h3>{a.title}</h3><div className="authority-classification">{a.authorityClassification}</div><p><Icon name="location" size="sm" />{a.location}</p><div className="source-line">{a.sourceType} · {a.source}</div></div><Icon name="chevron" /></Action>)}</div></main>;
}

function PreparednessView() {
  return <main className="inner-page content"><div className="page-heading"><div className="eyebrow">Prepare with confidence</div><h1>Preparedness</h1><p>Practical plans and checklists you can save for offline use.</p></div><div className="resource-grid">{shortcuts.concat([{ icon: "storm" as IconName, title: "Cyclone readiness", meta: "Before, during and after" }, { icon: "flood" as IconName, title: "Clean water safety", meta: "Guidance after flooding" }]).map(x => <Action className="resource-card" key={x.title}><div className="shortcut-icon"><Icon name={x.icon} /></div><h2>{x.title}</h2><p>{x.meta}</p><div className="resource-link">Open guide <Icon name="arrow" size="sm" /></div></Action>)}</div></main>;
}

function ProfileView({ onPro, onLocations }: { onPro: () => void; onLocations: () => void }) {
  const settings = ["Saved locations", "Alert preferences", "Preferred language", "Accessibility settings", "High-contrast mode", "Large-text mode", "Data sources & disclaimer", "Privacy settings"];
  return <main className="inner-page content"><div className="page-heading"><div className="eyebrow">Your MyanAid</div><h1>Profile & settings</h1><p>Choose how and where you receive trusted safety information.</p></div><div className="profile-layout"><div><div className="profile-card"><div className="avatar">AK</div><div><h2>Welcome</h2><p>2 saved locations · English</p></div></div><Action className="pro-entry" onClick={onPro}><Icon name="shield" /><div><strong>MyanAid Pro</strong><span>Organization workspace</span></div><Icon name="arrow" /></Action></div><div className="settings-list">{settings.map((x, i) => <Action className="setting-row" key={x} onClick={i === 0 ? onLocations : undefined}><div className="setting-icon"><Icon name={i < 2 ? "location" : i < 6 ? "language" : "shield"} /></div><span>{x}</span>{(i === 4 || i === 5) ? <span className="toggle"><i /></span> : <Icon name="chevron" />}</Action>)}</div></div></main>;
}

function LocationSetup({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const steps = ["Location", "Language", "Saved places", "Risks", "Notifications", "Offline"];
  return <div className="overlay" onClick={onClose}><div className="setup-panel" onClick={e => e.stopPropagation()}>
    <div className="setup-top"><div><div className="eyebrow">Personalize MyanAid</div><h1>Set up your locations</h1></div><Action className="close-action" onClick={onClose}>Close</Action></div>
    <div className="setup-progress">{steps.map((name, index) => <div className={index <= step ? "active" : ""} key={name}><span>{index + 1}</span><small>{name}</small></div>)}</div>
    <div className="setup-content">
      {step === 0 && <><h2>Where should we monitor?</h2><div className="setup-search"><Icon name="search" /><span>Search city or region</span></div><Action className="detect-location"><Icon name="location" />Detect my current city</Action><div className="confirmed-place"><Icon name="check" /><div><strong>Bangkok, Thailand</strong><span>Current location · Confirmed</span></div></div></>}
      {step === 1 && <><h2>Choose your preferred language</h2><div className="choice-grid">{["English", "မြန်မာ", "ไทย", "Bahasa Indonesia"].map((x,i)=><Action className={i===0?"selected":""} key={x}>{x}{i===0&&<Icon name="check" />}</Action>)}</div></>}
      {step === 2 && <><h2>Add and manage saved places</h2><p className="setup-help">Reorder, remove, or set preferences for each global location.</p><div className="saved-places">{[["Home","Bangkok, Thailand · ICT · English"],["Family","Yangon, Myanmar · MMT · မြန်မာ"],["Work","Add a location"],["Travel","Add a destination"],["Other","Add a location"]].map(x=><Action key={x[0]}><div className="setting-icon"><Icon name="location"/></div><div><strong>{x[0]}</strong><span>{x[1]}</span></div><Icon name="chevron"/></Action>)}</div></>}
      {step === 3 && <><h2>Choose risk categories</h2><p className="setup-help">Set alert preferences for each saved location.</p><div className="risk-choice-grid">{categories.map(x=><Action className="selected" key={x.title}><Icon name={x.icon}/><span>{x.title}</span><Icon name="check" size="sm"/></Action>)}</div></>}
      {step === 4 && <><h2>Set notification preferences</h2><div className="notification-options">{["Critical alerts — always on","Watch and warning alerts","Updates for saved locations","Weekly preparedness summary"].map((x,i)=><div key={x}><span>{x}</span><span className={`toggle ${i<3?"on":""}`}><i/></span></div>)}</div></>}
      {step === 5 && <><h2>Download essential offline guidance</h2><div className="offline-download"><Icon name="check" size="lg"/><div><strong>Saved for offline</strong><span>Saved today, 18:32 ICT</span></div></div><div className="offline-includes">{["Local safety guidance","Emergency checklist","Saved alerts","Emergency contacts"].map(x=><span key={x}><Icon name="check" size="sm"/>{x}</span>)}</div></>}
    </div>
    <div className="setup-actions">{step > 0 && <Action className="secondary-button" onClick={() => setStep(step-1)}>Back</Action>}<Action className="ai-primary" onClick={() => step < steps.length-1 ? setStep(step+1) : onClose()}>{step === steps.length-1 ? "Finish setup" : "Continue"}</Action></div>
  </div></div>;
}

function ProDashboard({ onBack }: { onBack: () => void }) {
  const modules = [{icon:"location" as IconName,title:"Multiple sites",meta:"12 monitored locations"},{icon:"profile" as IconName,title:"Team members",meta:"48 people · 6 roles"},{icon:"bell" as IconName,title:"Alert routing",meta:"8 active routing rules"},{icon:"plan" as IconName,title:"Emergency plans",meta:"14 customized plans"},{icon:"alert" as IconName,title:"Incident timeline",meta:"3 events this month"},{icon:"map" as IconName,title:"Reporting",meta:"Operational readiness 92%"},{icon:"shield" as IconName,title:"Branding",meta:"Organization identity"},{icon:"globe" as IconName,title:"API integrations",meta:"4 connected systems"}];
  return <main className="pro-page"><div className="pro-sidebar"><Brand/><Action className="pro-back" onClick={onBack}><Icon name="arrow"/>Back to MyanAid</Action><div className="pro-org"><div className="avatar">GA</div><div><strong>Global Aid Network</strong><span>Enterprise workspace</span></div></div></div><div className="pro-main"><div className="pro-header"><div><div className="eyebrow">MyanAid Pro</div><h1>Operational readiness</h1><p>Monitor sites, route alerts, and coordinate verified emergency information.</p></div><Action className="ai-primary">Create emergency plan</Action></div><div className="pro-stats"><div><span>Sites monitored</span><strong>12</strong><small>3 countries</small></div><div><span>Active team</span><strong>48</strong><small>All roles covered</small></div><div><span>Open incidents</span><strong>2</strong><small>1 requires review</small></div><div><span>Readiness</span><strong>92%</strong><small>Up 4% this month</small></div></div><div className="pro-grid">{modules.map(x=><Action className="pro-module" key={x.title}><div className="setting-icon"><Icon name={x.icon}/></div><h2>{x.title}</h2><p>{x.meta}</p><Icon name="arrow"/></Action>)}</div></div></main>;
}

function CategoryDrawer({ title, onClose, onAI }: { title: string; onClose: () => void; onAI: () => void }) {
  const category = categories.find(x => x.title === title)!;
  return <div className="overlay" onClick={onClose}><div className="detail-panel" onClick={e => e.stopPropagation()}>
    <Action className="close-action" onClick={onClose}>Close</Action>
    <div className="detail-header"><div className="category-icon large"><Icon name={category.icon} size="lg" /></div><div><div className="eyebrow">Bangkok, Thailand</div><h1>{title}</h1><div className={`category-status ${category.tone}`}><span />{category.status}</div></div></div>
    <div className="fact-grid"><div className="fact-card"><span>Current measurement</span><strong>{title.includes("Air") ? "AQI 58" : title.includes("Storm") ? "12 km/h wind" : "No local threshold exceeded"}</strong><small>Bangkok · Updated 10 min ago</small></div><div className="fact-card"><span>Forecast / trend</span><strong>{title.includes("Storm") ? "Rain increasing" : "Stable"}</strong><small>Source: official local authority</small></div></div>
    <h2>Safety guidance</h2><div className="guidance-tabs"><span className="active">Before</span><span>During</span><span>After</span></div>
    <div className="guidance-card"><Icon name="shield" /><div><strong>Stay aware and prepare calmly</strong><p>Review your household plan, keep essential supplies accessible, and follow updates from local authorities.</p></div></div>
    <div className="trusted-source"><Icon name="check" size="sm" />Trusted sources: Thai Meteorological Department, WHO, GDACS</div>
    <div className="panel-actions"><Action className="ai-primary" onClick={onAI}><Icon name="sparkle" size="sm" />Ask MyanAid AI</Action><Action className="secondary-button"><Icon name="arrow" size="sm" />Share safety guidance</Action></div>
  </div></div>;
}

function AlertDrawer({ alert, onClose }: { alert: AlertData; onClose: () => void }) {
  return <div className="overlay" onClick={onClose}><div className="detail-panel alert-detail" onClick={e => e.stopPropagation()}>
    <Action className="close-action" onClick={onClose}>Close</Action>
    <div className={`severity-banner tone-${alert.tone}`}><Icon name={alert.icon} /><span>{alert.severity} · {alert.sourceType} · {alert.location}</span></div>
    <h1>{alert.title}</h1><div className="authority-classification">{alert.authorityClassification}</div>
    <div className="relevance-box"><Icon name="location" /><div><strong>Location relevance</strong><span>{alert.relevance}</span></div></div>
    <div className="detail-section"><h2>Three immediate actions</h2><div className="immediate-actions">{alert.guidance.map((step, index) => <div key={step}><strong>{index + 1}</strong><span>{step}</span></div>)}</div></div>
    <Action className="official-guidance-action"><Icon name="shield" size="sm" />Read official safety guidance</Action>
    <div className="detail-section"><h2>Event facts</h2><div className="event-facts"><span><strong>Issued</strong>{alert.issuedTime}</span><span><strong>Last updated</strong>{alert.updatedTime}</span><span><strong>Expected end</strong>{alert.expiryTime}</span><span><strong>Affected area</strong>{alert.affectedArea}</span><span><strong>Confidence</strong>{alert.confidence}</span><span><strong>Source</strong>{alert.source}</span></div><p>{alert.summary}</p></div>
    <div className="map-preview"><Icon name="map" size="lg" /><span>Map preview · {alert.location}</span></div>
    <div className="source-box"><Icon name="shield" /><div><strong>{alert.source}</strong><span>{alert.sourceType} · {alert.confidence}</span></div></div>
    <div className="update-history"><strong>Update history</strong><span>Latest · {alert.updatedTime} — Guidance reviewed</span><span>Issued · {alert.issuedTime}</span><span>Expected end · {alert.expiryTime}</span></div>
    <div className="disclaimer compact"><Icon name="alert" size="sm" />Information may change. Follow official local authorities for emergency instructions.</div>
    <div className="panel-actions"><Action className="secondary-button">Save alert</Action><Action className="secondary-button">Share alert</Action><Action className="secondary-button">Save for offline</Action></div>
  </div></div>;
}

function AIPanel({ onClose }: { onClose: () => void }) {
  return <div className="overlay" onClick={onClose}><div className="ai-panel" onClick={e => e.stopPropagation()}>
    <Action className="close-action" onClick={onClose}>Close</Action><div className="ai-orb"><Icon name="sparkle" size="lg" /></div><div className="eyebrow">Source-backed guidance tool</div><h1>Ask MyanAid AI</h1><p>AI guidance is based on verified sources. Follow official local authorities for emergency instructions.</p>
    <div className="ai-trust-card"><div><strong>Alert location</strong><span>Bangkok, Thailand</span></div><div><strong>Last update</strong><span>10 minutes ago</span></div><div><strong>Sources used</strong><span>TMD · Bangkok Metropolitan Administration</span></div></div>
    <div className="chat-greeting"><Icon name="sparkle" /><span>How can I help you prepare today?</span></div>
    <div className="ai-next-steps"><strong>Clear next steps</strong><span>Ask for plain-language explanations, preparedness guidance, or source-backed actions.</span><Action>Open official guidance<Icon name="arrow" size="sm"/></Action></div>
    <div className="suggestions">{["Prepare for heavy rain", "Check my emergency kit", "Air quality guidance"].map(x => <Action className="suggestion" key={x}>{x}<Icon name="arrow" size="sm" /></Action>)}</div>
    <div className="chat-input"><span>Ask a safety question…</span><Action className="send-button"><Icon name="arrow" size="sm" /></Action></div><div className="ai-dispatch-note"><Icon name="alert" size="sm"/>This is not emergency dispatch.</div>
  </div></div>;
}

function ActionPage({ title, onClose }: { title: string; onClose: () => void }) {
  const normalized = title.toLowerCase();
  const isSaved = normalized.includes("save");
  const isShare = normalized.includes("share");
  const isOfficial = normalized.includes("official");
  const isZoom = title === "+" || title === "−";
  return <div className="overlay" onClick={onClose}><div className="action-page" onClick={e => e.stopPropagation()}>
    <Action className="close-action" onClick={onClose}>Close</Action>
    <div className="action-page-icon"><Icon name={isSaved ? "check" : isShare ? "arrow" : isOfficial ? "shield" : isZoom ? "map" : "plan"} size="lg" /></div>
    <div className="eyebrow">MyanAid</div><h1>{isZoom ? "Map view updated" : title}</h1>
    <p>{isSaved ? "This information is now available in your saved items and can be accessed from your profile." : isShare ? "Choose a trusted contact or service to share this verified safety information." : isOfficial ? "You are ready to continue to the verified authority source. External guidance opens in your preferred language when available." : isZoom ? "The map scale has been adjusted. Select an alert marker to view verified details." : "This section is ready. Review the information below and return when you are finished."}</p>
    {isShare && <div className="action-options"><Action>Copy secure link</Action><Action>Share with family</Action><Action>More options</Action></div>}
    {!isShare && <div className="guidance-card"><Icon name="shield" /><div><strong>Trusted information</strong><p>Information may change. Follow official local authorities for emergency instructions.</p></div></div>}
    <Action className="ai-primary action-page-primary" onClick={onClose}>{isOfficial ? "Continue to official source" : "Done"}</Action>
  </div></div>;
}

function BottomNav({ current, setCurrent }: { current: string; setCurrent: (page: string) => void }) {
  const items = [{ name: "Home", icon: "home" }, { name: "Map", icon: "map" }, { name: "Alerts", icon: "bell" }, { name: "Preparedness", icon: "plan" }, { name: "Profile", icon: "profile" }] as { name: string; icon: IconName }[];
  return <nav className="bottom-nav">{items.map(item => <Action key={item.name} className={`nav-item ${current === item.name ? "active" : ""}`} onClick={() => setCurrent(item.name)}><Icon name={item.icon} /><span>{item.name}</span></Action>)}</nav>;
}

export default function App() {
  const [page, setPage] = useState("Home");
  const [aiOpen, setAIOpen] = useState(false);
  const [locationSetupOpen, setLocationSetupOpen] = useState(false);
  const [actionPage, setActionPage] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);
  const goMap = () => setPage("Map");
  useEffect(() => {
    const handleAction = (event: Event) => setActionPage((event as CustomEvent<string>).detail);
    window.addEventListener("mynaid-action", handleAction);
    return () => window.removeEventListener("mynaid-action", handleAction);
  }, []);
  return <div className="app-shell">
    {page !== "Pro" && <Header onLocation={() => setLocationSetupOpen(true)} onNotifications={() => setPage("Alerts")} />}
    {page === "Home" && <Home onMap={goMap} onAI={() => setAIOpen(true)} onCategory={setCategory} onAlert={setSelectedAlert} onAlerts={() => setPage("Alerts")} onPreparedness={() => setPage("Preparedness")} />}
    {page === "Map" && <MapView onAlert={setSelectedAlert} />}
    {page === "Alerts" && <AlertsView onAlert={setSelectedAlert} />}
    {page === "Preparedness" && <PreparednessView />}
    {page === "Profile" && <ProfileView onPro={() => setPage("Pro")} onLocations={() => setLocationSetupOpen(true)} />}
    {page === "Pro" && <ProDashboard onBack={() => setPage("Profile")} />}
    {page !== "Pro" && !selectedAlert && <FloatingAI onClick={() => setAIOpen(true)} />}
    {page !== "Pro" && <BottomNav current={page} setCurrent={setPage} />}
    {category && <CategoryDrawer title={category} onClose={() => setCategory(null)} onAI={() => setAIOpen(true)} />}
    {selectedAlert && <AlertDrawer alert={selectedAlert} onClose={() => setSelectedAlert(null)} />}
    {aiOpen && <AIPanel onClose={() => setAIOpen(false)} />}
    {locationSetupOpen && <LocationSetup onClose={() => setLocationSetupOpen(false)} />}
    {actionPage && <ActionPage title={actionPage} onClose={() => setActionPage(null)} />}
  </div>;
}
