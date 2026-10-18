"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, functions, isConfigured, storage } from "@/lib/firebase";

// Temporary visual QA window requested for the SOS interaction. It expires
// automatically at 13:14 Bangkok time on October 17, 2026.
const SOS_TEST_PREVIEW_UNTIL = Date.parse("2026-10-17T13:14:00+07:00");

type IconName =
  | "air"
  | "alert"
  | "arrow"
  | "attach"
  | "battery"
  | "bell"
  | "camera"
  | "check"
  | "chevron"
  | "close"
  | "cloud"
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
  | "refresh"
  | "search"
  | "share"
  | "shelter"
  | "shield"
  | "sound"
  | "sparkle"
  | "storm"
  | "sun"
  | "temperature"
  | "wind";

type CompanionChatTurn = { role: "assistant" | "user"; text: string };

// A small, local transcript keeps a conversation intact after the companion is
// closed or the page is refreshed. It deliberately stays on the user's device;
// only the recent turns needed to answer the next question are sent to Gemini.
const COMPANION_CHAT_HISTORY_KEY = "myanaid-companion-history-v1";

const paths: Record<IconName, React.ReactNode> = {
  air: <><path d="M4 9h10a3 3 0 1 0-3-3" /><path d="M4 14h14a3 3 0 1 1-3 3" /><path d="M4 19h7" /></>,
  alert: <><path d="M12 4 3 20h18L12 4Z" /><path d="M12 9v5" /><path d="M12 17h.01" /></>,
  arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
  attach: <><path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l8.1-8.1a4 4 0 0 1 5.7 5.7l-8.1 8.1a2 2 0 1 1-2.8-2.8l7.4-7.4" /></>,
  battery: <><rect x="7" y="4" width="10" height="17" rx="2" /><path d="M10 3h4" /><path d="M12 9.5v6M9 12.5h6" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  camera: <><path d="M4 7h4l1.5-2h5L16 7h4v12H4V7Z" /><circle cx="12" cy="13" r="3.5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  cloud: <path d="M6 18a5 5 0 0 1 .8-9.94A6.5 6.5 0 0 1 19 10.5 3.75 3.75 0 0 1 18 18H6Z" />,
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
  refresh: <><path d="M20 11a8 8 0 0 0-14.9-4L3 10" /><path d="M3 4v6h6" /><path d="M4 13a8 8 0 0 0 14.9 4L21 14" /><path d="M21 20v-6h-6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.5-4.5M8.2 13.2l7.5 4.5" /></>,
  shelter: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-5" /></>,
  sound: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></>,
  sparkle: <><path d="m12 3 1.4 4.1L18 9l-4.6 1.9L12 15l-1.4-4.1L6 9l4.6-1.9L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
  storm: <><path d="M6 16a4 4 0 0 1 1-7.9A6 6 0 0 1 18.4 10 3 3 0 0 1 18 16H6Z" /><path d="m13 15-3 5h4l-2 3" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
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
type AlertData = { id: string; tone: "amber" | "blue" | "green" | "red"; icon: IconName; severity: Severity; authorityClassification: string; sourceType: "Official" | "Partner-verified" | "Satellite / Modelled"; title: string; location: string; source: string; issuedTime: string; updatedTime: string; expiryTime: string; confidence: string; summary: string; affectedArea: string; timeWindow: string; relevance: string; guidance: string[]; coordinates?: SourceCoordinates; areaGeometry?: string };
type SavedLocation = { label: string; city: string; timezone: string; language: string };
type MascotId = "maya" | "scout" | "nimbus" | "volt" | "sprout" | "nova" | "iggy" | "beacon";

const mascots: Array<{ id: MascotId; name: string; role: string; file: string }> = [
  { id: "maya", name: "Maya", role: "Your MyanAid safety companion", file: "/mascots/maya.jpeg" },
  { id: "scout", name: "Scout", role: "Preparedness & first aid", file: "/mascots/scout-transparent.png" },
  { id: "nimbus", name: "Nimbus", role: "Weather & storms", file: "/mascots/nimbus-transparent.png" },
  { id: "volt", name: "Volt", role: "Power & connection", file: "/mascots/volt-transparent.png" },
  { id: "sprout", name: "Sprout", role: "Recovery & wellbeing", file: "/mascots/sprout-transparent.png" },
  { id: "nova", name: "Nova", role: "Calm AI guidance", file: "/mascots/nova-transparent.png" },
  { id: "iggy", name: "Iggy", role: "Fire & haze", file: "/mascots/iggy-transparent.png" },
  { id: "beacon", name: "Beacon", role: "Verified alerts", file: "/mascots/beacon-transparent.png" },
];

const findMascot = (id: MascotId) => mascots.find((mascot) => mascot.id === id) ?? mascots[0];

const starterLocations: SavedLocation[] = [
  { label: "Home", city: "Bangkok, Thailand", timezone: "ICT", language: "English" },
  { label: "Family", city: "Yangon, Myanmar", timezone: "MMT", language: "မြန်မာ" },
];

type LiveWeather = { temperature: number; rain: number; wind: number; code: number; observedAt: string; description?: string; thunderstormProbability?: number; source?: string };
type LiveEarthquake = { magnitude: number; place: string; occurredAt: string; url: string };
type LiveMonitoringState = { weather: LiveWeather | null; earthquake: LiveEarthquake | null; loading: boolean; fetchedAt: string | null };
type SourceCoordinates = { latitude: number; longitude: number };
type GoogleMapsPosition = { lat: number; lng: number };
type GdacsImpact = { alertScore?: number; severityValue?: number; severityUnit?: string; severityText?: string; endAt?: string; affectedCountries?: string[]; overviewMapUrl?: string; rainfallMapUrl?: string };
type SourceFeedItem = { id: string; title: string; category: string; severity: string; location: string; occurredAt: string; updatedAt: string; url: string; source: string; summary?: string; coordinates?: SourceCoordinates; areaGeometry?: string; gdacs?: GdacsImpact };
type SourceFeed = { id: string; provider: string; kind: string; fetchedAt: string; safetyNotice: string; events: SourceFeedItem[] };
type SourceMonitoringState = { airQuality: { pm25: number; pm10: number; usAqi: number; observedAt: string } | null; river: { date: string; discharge: number } | null; feeds: SourceFeed[] };

type GoogleMapInstance = { fitBounds: (bounds: GoogleMapBounds, padding?: number) => void; setMapTypeId: (mapType: string) => void; setTilt: (tilt: number) => void; setZoom: (zoom: number) => void };
type GoogleMapBounds = { extend: (position: GoogleMapsPosition) => void; isEmpty: () => boolean };
type GoogleMapMarker = { addListener: (eventName: string, handler: () => void) => void };
type MapDisplayMode = "roadmap" | "satellite" | "terrain" | "3d" | "street";
type GoogleGeocoderResult = { geometry?: { location?: { lat: () => number; lng: () => number } } };
type GooglePlaceResult = { place_id?: string; name?: string; vicinity?: string; formatted_address?: string; geometry?: { location?: { lat: () => number; lng: () => number } } };
type NearbyPlace = { id: string; name: string; address: string; latitude: number; longitude: number };
const EMPTY_SOURCE_POINTS: Array<SourceFeedItem & { coordinates: SourceCoordinates }> = [];
const EMPTY_NEARBY_PLACES: NearbyPlace[] = [];
type GoogleMapsRuntime = { maps: { Map: new (element: HTMLElement, options: { center: GoogleMapsPosition; zoom: number; mapTypeId?: string; mapId?: string; heading?: number; tilt?: number; mapTypeControl?: boolean; streetViewControl?: boolean; fullscreenControl?: boolean; gestureHandling?: string }) => GoogleMapInstance; Marker: new (options: { map: GoogleMapInstance; position: GoogleMapsPosition; title: string; icon?: string }) => GoogleMapMarker; Polygon: new (options: { map: GoogleMapInstance; paths: GoogleMapsPosition[][]; strokeColor: string; strokeOpacity: number; strokeWeight: number; fillColor: string; fillOpacity: number }) => unknown; InfoWindow: new (options: { content: Node }) => { open: (map: GoogleMapInstance, marker: GoogleMapMarker) => void; setContent: (content: Node) => void }; LatLngBounds: new () => GoogleMapBounds; Geocoder: new () => { geocode: (request: { address: string }, callback: (results: GoogleGeocoderResult[] | null, status: string) => void) => void }; places?: { PlacesService: new (map: GoogleMapInstance) => { textSearch: (request: { query: string; location: GoogleMapsPosition; radius: number }, callback: (results: GooglePlaceResult[] | null, status: string) => void) => void } }; StreetViewService: new () => { getPanorama: (request: { location: GoogleMapsPosition; radius: number }, callback: (result: { location?: { latLng?: GoogleMapsPosition } } | null, status: string) => void) => void }; StreetViewPanorama: new (element: HTMLElement, options: { position: GoogleMapsPosition; pov: { heading: number; pitch: number }; zoom: number; addressControl?: boolean; fullscreenControl?: boolean; motionTracking?: boolean }) => unknown } };

declare global { interface Window { google?: GoogleMapsRuntime; myanAidMapsPromise?: Promise<GoogleMapsRuntime> } }

function displaySourceTime(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  }
  return typeof value === "string" ? value : fallback;
}

const weatherLabel = (code: number) => {
  if (code >= 95) return "Thunderstorm conditions";
  if (code >= 80) return "Rain showers";
  if (code >= 51) return "Drizzle or rain";
  if (code >= 45) return "Low visibility";
  return code <= 3 ? "Fair to partly cloudy" : "Changing conditions";
};

const weatherVisualIcon = (code: number): IconName => {
  if (code >= 95) return "storm";
  if (code >= 51) return "rain";
  if (code >= 45) return "cloud";
  if (code <= 1) return "sun";
  return "cloud";
};

const formatHeroObservedAt = (value?: string) => {
  if (!value) return "Updating now";
  const source = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00+07:00` : value;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Bangkok" }).format(date);
};

type MonitoringTone = "low" | "medium" | "high" | "severe" | "loading";
const weatherMonitoringTone = (weather: LiveWeather | null): MonitoringTone => {
  if (!weather) return "loading";
  if (weather.code >= 95 || weather.rain >= 15 || weather.wind >= 50) return "severe";
  if (weather.code >= 80 || weather.rain >= 5 || weather.wind >= 30) return "high";
  if (weather.code >= 51 || weather.rain > 0 || weather.wind >= 20) return "medium";
  return "low";
};
const earthquakeMonitoringTone = (earthquake: LiveEarthquake | null): MonitoringTone => {
  if (!earthquake) return "loading";
  if (earthquake.magnitude >= 7) return "severe";
  if (earthquake.magnitude >= 6) return "high";
  if (earthquake.magnitude >= 5) return "medium";
  return "low";
};
const monitoringToneLabel: Record<MonitoringTone, string> = { low: "Low", medium: "Elevated", high: "High", severe: "Severe", loading: "Updating" };

type LocalCondition = { severity: "normal" | "watch" | "warning" | "critical"; icon: IconName; label: string; headline: string; facts: Array<{ icon: IconName; value: string; label: string }>; companionMessage: string };
type HeroWeatherAnimation = "cloud" | "drizzle" | "rain" | "snow" | "storm" | "sun" | "partly" | "fog";

function heroWeatherAnimation(weather: LiveWeather | null, condition: LocalCondition): HeroWeatherAnimation {
  const description = weather?.description?.toUpperCase() ?? "";
  if (/SNOW|SLEET|ICE|BLIZZARD/.test(description) || ((weather?.code ?? 0) >= 71 && (weather?.code ?? 0) <= 77)) return "snow";
  if (condition.icon === "storm" || /THUNDER|LIGHTNING/.test(description)) return "storm";
  if (/FOG|MIST|HAZE|LOW VISIBILITY/.test(description) || ((weather?.code ?? 0) >= 45 && (weather?.code ?? 0) <= 48)) return "fog";
  if (/DRIZZLE|LIGHT RAIN/.test(description) || ((weather?.code ?? 0) >= 51 && (weather?.code ?? 0) <= 57)) return "drizzle";
  if (condition.icon === "rain" || (weather?.rain ?? 0) > 0) return "rain";
  if (weather && weather.code <= 2 && /SUN|CLEAR|FAIR|PARTLY|MAINLY/.test(description || "FAIR")) return weather.code >= 2 || /PARTLY|MAINLY/.test(description) ? "partly" : "sun";
  return "cloud";
}

const heroWeatherVariants: HeroWeatherAnimation[] = ["sun", "partly", "cloud", "drizzle", "rain", "storm", "fog", "snow"];

function HeroRainCloudArtwork({ precipitation }: { precipitation: "drizzle" | "rain" | "storm" | null }) {
  const extraDropCount = precipitation === "storm" ? 20 : precipitation === "rain" ? 13 : precipitation === "drizzle" ? 8 : 0;
  const extraDrops = Array.from({ length: extraDropCount }, (_, index) => ({
    x: 58 + (index * 71) % 515,
    y: 364 + (index * 47) % 172,
    scale: 0.68 + (index % 4) * 0.17,
    delay: `${-(index * 0.17)}s`,
    duration: `${1.15 + (index % 5) * 0.13}s`,
  }));
  return <svg className="hero-rain-cloud-art" viewBox="0 0 626 621" role="presentation" aria-hidden="true">
    <defs>
      <linearGradient id="hero-back-cloud-fill" x1="20%" x2="80%" y1="0%" y2="100%"><stop offset="0%" stopColor="#E2F6FF" /><stop offset="45%" stopColor="#A5E4FC" /><stop offset="85%" stopColor="#6DC8F3" /><stop offset="100%" stopColor="#55B6EC" /></linearGradient>
      <linearGradient id="hero-front-cloud-fill" x1="15%" x2="75%" y1="0%" y2="100%"><stop offset="0%" stopColor="#FFFFFF" /><stop offset="35%" stopColor="#E7F7FF" /><stop offset="75%" stopColor="#AEE5FC" /><stop offset="100%" stopColor="#72CEF7" /></linearGradient>
      <linearGradient id="hero-rain-drop-fill" x1="25%" x2="75%" y1="0%" y2="100%"><stop offset="0%" stopColor="#CEF0FF" /><stop offset="40%" stopColor="#69C8F5" /><stop offset="100%" stopColor="#3297DB" /></linearGradient>
      <filter id="hero-cloud-shadow" x="-15%" y="-15%" width="130%" height="130%"><feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#2D85B8" floodOpacity="0.16" /></filter>
    </defs>
    {precipitation && <g className="hero-cloud-rain">
      <g className="hero-cloud-drop hero-cloud-drop-one" transform="translate(90 400)"><path d="M 0,-15 C 4.5,-7 8.5,1 8.5,7 A 8.5,8.5 0 0,1 -8.5,7 C -8.5,1 -4.5,-7 0,-15 Z" fill="url(#hero-rain-drop-fill)" stroke="#3FA0D8" strokeWidth="2.2" strokeLinejoin="round" /><ellipse cx="-2.5" cy="5" rx="1.8" ry="3.8" transform="rotate(-15 -2.5 5)" fill="#fff" opacity=".9" /></g>
      <g className="hero-cloud-drop hero-cloud-drop-two" transform="translate(190 435)"><path d="M 0,-24 C 7.5,-11 14,2 14,10 A 14,14 0 0,1 -14,10 C -14,2 -7.5,-11 0,-24 Z" fill="url(#hero-rain-drop-fill)" stroke="#3FA0D8" strokeWidth="2.8" strokeLinejoin="round" /><ellipse cx="-4" cy="7.5" rx="3" ry="6" transform="rotate(-15 -4 7.5)" fill="#fff" opacity=".92" /></g>
      <g className="hero-cloud-drop hero-cloud-drop-three" transform="translate(340 495)"><path d="M 0,-27 C 8.5,-13 16,2 16,11.5 A 16,16 0 0,1 -16,11.5 C -16,2 -8.5,-13 0,-27 Z" fill="url(#hero-rain-drop-fill)" stroke="#3FA0D8" strokeWidth="3" strokeLinejoin="round" /><ellipse cx="-4.5" cy="8.5" rx="3.5" ry="7" transform="rotate(-15 -4.5 8.5)" fill="#fff" opacity=".92" /></g>
      <g className="hero-cloud-drop hero-cloud-drop-four" transform="translate(485 450)"><path d="M 0,-16 C 5,-7 9,1.5 9,7.5 A 9,9 0 0,1 -9,7.5 C -9,1.5 -5,-7 0,-16 Z" fill="url(#hero-rain-drop-fill)" stroke="#3FA0D8" strokeWidth="2.2" strokeLinejoin="round" /><ellipse cx="-2.6" cy="5.2" rx="2" ry="4" transform="rotate(-15 -2.6 5)" fill="#fff" opacity=".9" /></g>
      {extraDrops.map((drop, index) => <g className="hero-cloud-extra-drop" key={index} transform={`translate(${drop.x} ${drop.y}) scale(${drop.scale})`} style={{ "--rain-delay": drop.delay, "--rain-duration": drop.duration } as React.CSSProperties}><path d="M 0,-14 C 5,-7 9,1 9,7 A 9,9 0 0,1 -9,7 C -9,1 -5,-7 0,-14 Z" fill="url(#hero-rain-drop-fill)" stroke="#3FA0D8" strokeWidth="2.2" strokeLinejoin="round" /><ellipse cx="-2.7" cy="4.8" rx="1.9" ry="3.8" transform="rotate(-15 -2.7 4.8)" fill="#fff" opacity=".88" /></g>)}
    </g>}
    <g className="hero-cloud-back" filter="url(#hero-cloud-shadow)">
      <path d="M68 300C42 265 52 215 95 198C98 160 135 130 180 138C215 90 285 75 340 102C385 88 435 108 455 148C498 152 532 185 530 225C565 245 580 290 560 332C545 365 510 380 472 365C445 385 405 385 375 372C345 388 300 388 270 372C240 385 195 382 170 365C135 378 95 360 80 332C72 320 68 310 68 300Z" fill="url(#hero-back-cloud-fill)" stroke="#42A7DE" strokeWidth="8" strokeLinejoin="round" />
      <path className="hero-cloud-gloss" d="M72 275C60 240 72 212 98 202C105 172 135 148 172 150C188 140 215 122 248 114C212 128 185 152 176 178C142 175 112 198 104 228C80 242 74 260 72 275Z" fill="#fff" opacity=".85" />
      <path className="hero-cloud-gloss" d="M235 122C275 95 330 92 370 118C405 110 438 125 450 150C432 132 400 122 370 128C335 108 280 108 235 122Z" fill="#fff" opacity=".9" />
    </g>
    <g className="hero-cloud-front" filter="url(#hero-cloud-shadow)">
      <path d="M236 375C220 335 242 288 285 270C300 242 335 225 372 228C395 200 440 192 478 212C512 210 545 232 555 268C588 285 605 325 590 362C580 392 548 412 515 405C490 422 455 422 428 408C402 422 368 422 342 408C316 420 280 418 258 400C242 395 236 385 236 375Z" fill="url(#hero-front-cloud-fill)" stroke="#42A7DE" strokeWidth="8" strokeLinejoin="round" />
      <path className="hero-cloud-gloss" d="M242 355C232 325 250 285 285 274C302 248 335 234 370 236C390 215 430 205 465 220C432 212 395 222 376 242C342 242 312 255 296 282C265 292 250 322 255 348Z" fill="#fff" opacity=".95" />
      <path className="hero-cloud-gloss" d="M465 220C500 218 530 236 540 268C525 248 498 235 465 220Z" fill="#fff" opacity=".9" />
    </g>
  </svg>;
}

const weatherAtlasRegions = {
  ring: [0, 80, 350, 370], face: [360, 160, 235, 245], cloud: [610, 175, 327, 245], dark: [940, 180, 314, 230], rain: [12, 550, 320, 235], overcast: [334, 520, 312, 270], wind: [647, 510, 335, 315], leaf: [1005, 565, 205, 200], drop: [100, 910, 180, 255], bolt: [395, 890, 180, 270], snow: [645, 885, 280, 285], hail: [990, 940, 200, 205],
} as const;
type WeatherAtlasPiece = keyof typeof weatherAtlasRegions;

function AtlasPiece({ piece, className = "" }: { piece: WeatherAtlasPiece; className?: string }) {
  const [x, y, width, height] = weatherAtlasRegions[piece];
  return <span className={`wx-piece ${className}`}><svg viewBox={`${x} ${y} ${width} ${height}`} focusable="false" aria-hidden="true"><image href="/weather-atlas-v2.png" width="1254" height="1254" /></svg></span>;
}

function HeroWeatherAtlas({ variant }: { variant: HeroWeatherAnimation }) {
  const kind = variant === "sun" ? "clear" : variant === "cloud" ? "cloudy" : variant;
  const cloudPiece: Partial<Record<HeroWeatherAnimation | "clear" | "cloudy", WeatherAtlasPiece>> = { partly: "cloud", cloudy: "overcast", drizzle: "cloud", rain: "rain", snow: "cloud", storm: "dark", fog: "cloud" };
  const hasRain = variant === "drizzle" || variant === "rain" || variant === "storm";
  return <div className={`weather-sculpture kind-${kind}`} aria-hidden="true">
    <span className="wx-ground" />
    {(variant === "sun" || variant === "partly") && <span className={`wx-solar ${variant === "partly" ? "wx-small" : ""}`}><AtlasPiece piece="ring" className="wx-ring" /><AtlasPiece piece="face" className="wx-face" /></span>}
    {cloudPiece[kind] && <AtlasPiece piece={cloudPiece[kind]} className="wx-cloud" />}
    {hasRain && <span className="wx-rainfall">{Array.from({ length: variant === "storm" ? 16 : variant === "rain" ? 11 : 5 }, (_, index) => <AtlasPiece piece="drop" className={`wx-drop wx-particle-${index % 12}`} key={index} />)}</span>}
    {variant === "storm" && <AtlasPiece piece="bolt" className="wx-bolt" />}
    {variant === "snow" && Array.from({ length: 4 }, (_, index) => <AtlasPiece piece="snow" className={`wx-snow wx-particle-${index}`} key={index} />)}
    {variant === "fog" && <><span className="wx-mist" /><span className="wx-mist second" /></>}
  </div>;
}

function HeroWeatherMotion({ variant }: { variant: HeroWeatherAnimation }) {
  return <div className={`hero-weather-motion weather-motion-${variant}`} aria-hidden="true">
    <HeroWeatherAtlas variant={variant} />
  </div>;
}

function localCondition(weather: LiveWeather | null): LocalCondition {
  if (!weather) return { severity: "watch", icon: "cloud", label: "Updating", headline: "Checking local weather conditions", facts: [{ icon: "rain", value: "—", label: "Rain now" }, { icon: "wind", value: "—", label: "Wind" }, { icon: "cloud", value: "—", label: "Weather" }], companionMessage: "I’m checking the latest local conditions for you." };
  if (weather.code >= 95) return { severity: "critical", icon: "storm", label: "Thunderstorm", headline: "Thunderstorm conditions near you", facts: [{ icon: "rain", value: `${weather.rain} mm`, label: "Rain now" }, { icon: "alert", value: weather.thunderstormProbability ? `${weather.thunderstormProbability}%` : "Active", label: "Storm risk" }, { icon: "wind", value: `${weather.wind} km/h`, label: "Wind" }], companionMessage: "Thunderstorm conditions are active. Tap me for calm, practical next steps." };
  if ((weather.thunderstormProbability ?? 0) >= 35) return { severity: "warning", icon: "storm", label: "Storm possible", headline: "Thunderstorms may develop near you", facts: [{ icon: "rain", value: `${weather.rain} mm`, label: "Rain now" }, { icon: "alert", value: `${weather.thunderstormProbability}%`, label: "Storm chance" }, { icon: "wind", value: `${weather.wind} km/h`, label: "Wind" }], companionMessage: "Thunderstorms are possible near you. I can help you prepare before you travel." };
  if (weather.code >= 80 || weather.rain >= 3) return { severity: "warning", icon: "rain", label: "Rain watch", headline: "Rain may affect your plans today", facts: [{ icon: "rain", value: `${weather.rain} mm`, label: "Rain now" }, { icon: "flood", value: "Watch", label: "Flood risk" }, { icon: "wind", value: `${weather.wind} km/h`, label: "Wind" }], companionMessage: "Rain is being monitored near you. Ask me what to prepare." };
  if (weather.code >= 51 || weather.rain > 0) return { severity: "watch", icon: "rain", label: "Changing conditions", headline: "Light rain conditions near you", facts: [{ icon: "rain", value: `${weather.rain} mm`, label: "Rain now" }, { icon: "wind", value: `${weather.wind} km/h`, label: "Wind" }, { icon: "air", value: "Check", label: "Before travel" }], companionMessage: "Conditions are changing. I can help you plan your next step." };
  return { severity: "normal", icon: weatherVisualIcon(weather.code), label: "Conditions stable", headline: "Local conditions are stable right now", facts: [{ icon: "rain", value: `${weather.rain} mm`, label: "Rain now" }, { icon: "wind", value: `${weather.wind} km/h`, label: "Wind" }, { icon: weatherVisualIcon(weather.code), value: weather.description ?? weatherLabel(weather.code), label: "Weather" }], companionMessage: "Conditions are stable. I’m here if you want to prepare ahead." };
}

function useLiveMonitoring() {
  const [monitoring, setMonitoring] = useState<LiveMonitoringState>({ weather: null, earthquake: null, loading: true, fetchedAt: null });
  useEffect(() => {
    if (!db) return;
    let storedWeather: LiveWeather | null = null;
    let storedEarthquake: LiveEarthquake | null = null;
    let latestStoredAt: unknown = null;
    const applyStoredEvents = () => {
      if (!storedWeather && !storedEarthquake) return;
      setMonitoring(previous => ({
        weather: storedWeather ?? previous.weather,
        earthquake: storedEarthquake ?? previous.earthquake,
        loading: false,
        fetchedAt: displaySourceTime(latestStoredAt, previous.fetchedAt ?? "just now"),
      }));
    };
    const stopWeather = onSnapshot(doc(db, "sourceEvents", "weather-bangkok"), (snapshot) => {
      const event = snapshot.data();
      const data = event?.data as { temperatureC?: unknown; rainMm?: unknown; windKph?: unknown; weatherCode?: unknown; weatherCondition?: unknown; thunderstormProbability?: unknown } | undefined;
      if (data && typeof data.temperatureC === "number") {
        storedWeather = {
          temperature: data.temperatureC,
          rain: typeof data.rainMm === "number" ? data.rainMm : 0,
          wind: typeof data.windKph === "number" ? data.windKph : 0,
          code: typeof data.weatherCode === "number" ? data.weatherCode : 0,
          observedAt: displaySourceTime(event?.observedAt, "Current conditions"),
          description: typeof data.weatherCondition === "string" ? data.weatherCondition : undefined,
          thunderstormProbability: typeof data.thunderstormProbability === "number" ? data.thunderstormProbability : undefined,
          source: typeof (event?.provider as { name?: unknown } | undefined)?.name === "string" ? (event?.provider as { name: string }).name : "Open-Meteo",
        };
        latestStoredAt = event?.fetchedAt;
        applyStoredEvents();
      }
    });
    const stopEarthquake = onSnapshot(doc(db, "sourceEvents", "earthquake-latest"), (snapshot) => {
      const event = snapshot.data();
      const data = event?.data as { magnitude?: unknown; place?: unknown; url?: unknown } | undefined;
      if (data && typeof data.magnitude === "number") {
        storedEarthquake = {
          magnitude: data.magnitude,
          place: typeof data.place === "string" ? data.place : "Location being updated",
          occurredAt: displaySourceTime(event?.occurredAt, "Recently updated"),
          url: typeof data.url === "string" ? data.url : "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php",
        };
        latestStoredAt = event?.fetchedAt;
        applyStoredEvents();
      }
    });
    return () => { stopWeather(); stopEarthquake(); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [weatherResult, earthquakeResult] = await Promise.allSettled([
        fetch("https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,precipitation,rain,wind_speed_10m,weather_code&timezone=Asia%2FBangkok").then(async response => {
          if (!response.ok) throw new Error("Weather provider unavailable");
          return await response.json() as { current?: { temperature_2m?: number; precipitation?: number; rain?: number; wind_speed_10m?: number; weather_code?: number; time?: string } };
        }),
        fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson").then(async response => {
          if (!response.ok) throw new Error("Earthquake provider unavailable");
          return await response.json() as { features?: Array<{ properties?: { mag?: number; place?: string; time?: number; url?: string } }> };
        }),
      ]);
      if (cancelled) return;
      const current = weatherResult.status === "fulfilled" ? weatherResult.value.current : undefined;
      const event = earthquakeResult.status === "fulfilled" ? earthquakeResult.value.features?.[0]?.properties : undefined;
      setMonitoring({
        weather: current?.temperature_2m === undefined ? null : {
          temperature: Math.round(current.temperature_2m),
          rain: Number((current.rain ?? current.precipitation ?? 0).toFixed(1)),
          wind: Math.round(current.wind_speed_10m ?? 0),
          code: current.weather_code ?? 0,
          observedAt: current.time ?? "Current conditions",
        },
        earthquake: event?.mag === undefined ? null : {
          magnitude: Number(event.mag.toFixed(1)),
          place: event.place ?? "Location being updated",
          occurredAt: event.time ? new Date(event.time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Recently updated",
          url: event.url ?? "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php",
        },
        loading: false,
        fetchedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    };
    void load();
    const refresh = window.setInterval(() => void load(), 10 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(refresh); };
  }, []);
  return monitoring;
}

function useCurrentLocation() {
  const [coordinates, setCoordinates] = useState<SourceCoordinates | null>(null);
  const [label, setLabel] = useState("Use my location");
  const [loading, setLoading] = useState(false);
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLabel("Location unavailable");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCoordinates(next);
        setLabel(`Current location · ${next.latitude.toFixed(3)}, ${next.longitude.toFixed(3)}`);
        setLoading(false);
      },
      () => {
        setLabel("Location permission needed");
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  };
  useEffect(() => {
    if (!("permissions" in navigator)) return;
    let active = true;
    void navigator.permissions.query({ name: "geolocation" as PermissionName }).then((permission) => {
      if (active && permission.state === "granted") requestLocation();
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return { coordinates, label, loading, requestLocation };
}

function useSourceMonitoring() {
  const [sourceMonitoring, setSourceMonitoring] = useState<SourceMonitoringState>({ airQuality: null, river: null, feeds: [] });
  useEffect(() => {
    if (!db) return;
    const firestore = db;
    const feedSnapshots: Record<string, SourceFeed> = {};
    const setFeed = (id: string, data: Record<string, unknown> | undefined) => {
      const rawEvents = Array.isArray(data?.events) ? data.events : [];
      const events = rawEvents.flatMap((event): SourceFeedItem[] => {
        if (!event || typeof event !== "object") return [];
        const item = event as Record<string, unknown>;
        if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.url !== "string") return [];
        return [{
          id: item.id,
          title: item.title,
          category: typeof item.category === "string" ? item.category : "Information",
          severity: typeof item.severity === "string" ? item.severity : "Not rated",
          location: typeof item.location === "string" ? item.location : "Location being updated",
          occurredAt: typeof item.occurredAt === "string" ? item.occurredAt : "Unknown",
          updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "Unknown",
          url: item.url,
          source: typeof item.source === "string" ? item.source : "Provider source",
          summary: typeof item.summary === "string" ? item.summary : undefined,
          coordinates: typeof item.coordinates === "object" && item.coordinates !== null && typeof (item.coordinates as Record<string, unknown>).latitude === "number" && typeof (item.coordinates as Record<string, unknown>).longitude === "number" ? item.coordinates as SourceCoordinates : undefined,
          areaGeometry: typeof item.areaGeometry === "string" ? item.areaGeometry : undefined,
          gdacs: typeof item.gdacs === "object" && item.gdacs !== null ? (() => {
            const gdacs = item.gdacs as Record<string, unknown>;
            return {
              alertScore: typeof gdacs.alertScore === "number" ? gdacs.alertScore : undefined,
              severityValue: typeof gdacs.severityValue === "number" ? gdacs.severityValue : undefined,
              severityUnit: typeof gdacs.severityUnit === "string" ? gdacs.severityUnit : undefined,
              severityText: typeof gdacs.severityText === "string" ? gdacs.severityText : undefined,
              endAt: typeof gdacs.endAt === "string" ? gdacs.endAt : undefined,
              affectedCountries: Array.isArray(gdacs.affectedCountries) ? gdacs.affectedCountries.filter((country): country is string => typeof country === "string") : undefined,
              overviewMapUrl: typeof gdacs.overviewMapUrl === "string" ? gdacs.overviewMapUrl : undefined,
              rainfallMapUrl: typeof gdacs.rainfallMapUrl === "string" ? gdacs.rainfallMapUrl : undefined,
            };
          })() : undefined,
        }];
      });
      if (!data || !events.length) {
        delete feedSnapshots[id];
      } else {
        feedSnapshots[id] = {
          id,
          provider: typeof data.provider === "object" && data.provider !== null && typeof (data.provider as Record<string, unknown>).name === "string" ? (data.provider as Record<string, string>).name : "Provider feed",
          kind: typeof data.provider === "object" && data.provider !== null && typeof (data.provider as Record<string, unknown>).kind === "string" ? (data.provider as Record<string, string>).kind : "source feed",
          fetchedAt: displaySourceTime(data.fetchedAt, "just now"),
          safetyNotice: typeof data.safetyNotice === "string" ? data.safetyNotice : "Verify conditions with official local authorities.",
          events,
        };
      }
      setSourceMonitoring(previous => ({ ...previous, feeds: Object.values(feedSnapshots) }));
    };
    const stopAirQuality = onSnapshot(doc(firestore, "sourceEvents", "air-quality-bangkok"), (snapshot) => {
      const event = snapshot.data();
      const data = event?.data as { pm25?: unknown; pm10?: unknown; usAqi?: unknown } | undefined;
      if (data && typeof data.pm25 === "number" && typeof data.pm10 === "number" && typeof data.usAqi === "number") {
        const airQuality = { pm25: data.pm25, pm10: data.pm10, usAqi: data.usAqi, observedAt: displaySourceTime(event?.observedAt, "Current conditions") };
        setSourceMonitoring(previous => ({ ...previous, airQuality }));
      }
    });
    const stopRiver = onSnapshot(doc(firestore, "sourceEvents", "river-discharge-bangkok"), (snapshot) => {
      const forecast = snapshot.data()?.data as { forecast?: Array<{ date?: unknown; dischargeCubicMetresPerSecond?: unknown }> } | undefined;
      const next = forecast?.forecast?.[0];
      if (next && typeof next.date === "string" && typeof next.dischargeCubicMetresPerSecond === "number") {
        const river = { date: next.date, discharge: next.dischargeCubicMetresPerSecond };
        setSourceMonitoring(previous => ({ ...previous, river }));
      }
    });
    const feedIds = ["gdacs-latest", "nasa-eonet-open", "ifrc-latest", "who-outbreak-news", "gistda-flood-latest", "hko-warnings-latest", "canada-weather-alerts-latest", "england-flood-warnings-latest"];
    const stopFeeds = feedIds.map((id) => onSnapshot(doc(firestore, "sourceEvents", id), (snapshot) => setFeed(id, snapshot.data())));
    return () => { stopAirQuality(); stopRiver(); stopFeeds.forEach((stop) => stop()); };
  }, []);
  return sourceMonitoring;
}

const localAlert: AlertData = { id: "bangkok-rain", tone: "amber", icon: "rain", severity: "Warning", authorityClassification: "TMD Weather Watch", sourceType: "Official", title: "Heavy rain and localized flooding possible", location: "Bangkok, Thailand", source: "Thai Meteorological Department", issuedTime: "Today, 18:10 ICT", updatedTime: "10 min ago", expiryTime: "Expected through 23:00 ICT", confidence: "High confidence", summary: "Heavy rainfall may cause temporary flooding on low-lying roads and near canals this evening.", affectedArea: "Bangkok Metropolitan Area, especially low-lying districts and roads near canals", timeWindow: "Today, 18:10–23:00 ICT", relevance: "This alert directly affects your current location.", guidance: ["Avoid low-lying roads and underpasses", "Do not walk or drive through floodwater", "Keep your phone charged and official alerts enabled"], coordinates: { latitude: 13.7563, longitude: 100.5018 } };

const alerts: AlertData[] = [
  { id: "manila-rain", tone: "amber", icon: "storm", severity: "Warning", authorityClassification: "PAGASA Heavy Rain Advisory", sourceType: "Official", title: "Heavy Rain Advisory", location: "Manila, Philippines", source: "PAGASA", issuedTime: "Today, 17:00 PHT", updatedTime: "18 min ago", expiryTime: "Expected through 23:00 PHT", confidence: "High confidence", summary: "Periods of heavy rain may cause localized street flooding this evening.", affectedArea: "Metro Manila and nearby provinces", timeWindow: "Today, 17:00–23:00 PHT", relevance: "Global monitoring · Not near your saved locations", guidance: ["Monitor local drainage conditions", "Avoid flooded streets", "Follow PAGASA updates"] },
  { id: "chiangmai-river", tone: "blue", icon: "flood", severity: "Watch", authorityClassification: "Elevated River Level Notice", sourceType: "Official", title: "Elevated River Level", location: "Chiang Mai, Thailand", source: "ThaiWater", issuedTime: "Today, 16:45 ICT", updatedTime: "34 min ago", expiryTime: "Monitoring through tomorrow morning", confidence: "High confidence", summary: "Water levels are elevated but remain below the critical threshold.", affectedArea: "Communities near the Ping River", timeWindow: "Monitoring through tomorrow morning", relevance: "420 km from your current location", guidance: ["Stay away from fast-moving water", "Move valuables above floor level", "Check local river updates"] },
  { id: "singapore-air", tone: "green", icon: "air", severity: "Normal", authorityClassification: "NEA PSI: Moderate", sourceType: "Official", title: "Air Quality: Moderate", location: "Singapore", source: "NEA Singapore", issuedTime: "Today, 16:00 SGT", updatedTime: "1 hr ago", expiryTime: "Next update at 19:00 SGT", confidence: "High confidence", summary: "Most people can continue normal outdoor activities.", affectedArea: "Islandwide", timeWindow: "Current 24-hour PSI period", relevance: "Global monitoring · Not near your saved locations", guidance: ["Continue normal activity if comfortable", "Sensitive groups should monitor symptoms", "Check NEA updates before prolonged activity"] },
  { id: "turkiye-earthquake", tone: "red", icon: "earthquake", severity: "Critical", authorityClassification: "AFAD Earthquake Notification", sourceType: "Official", title: "Earthquake Alert — Check official guidance", location: "Türkiye", source: "AFAD", issuedTime: "Today, 18:22 TRT", updatedTime: "6 min ago", expiryTime: "Aftershocks possible for several hours", confidence: "Confirmed event", summary: "A moderate earthquake was recorded. Check local guidance and inspect for hazards.", affectedArea: "Epicentral region and surrounding provinces", timeWindow: "Issued today · Aftershocks possible", relevance: "Global monitoring · Not near your saved locations", guidance: ["Drop, Cover, and Hold On during shaking", "Move away from damaged structures", "Follow AFAD instructions"] },
];

const shortcuts = [
  { icon: "plan" as IconName, title: "Emergency checklist", meta: "Build your essential kit", tab: "kit" as const },
  { icon: "heart" as IconName, title: "Family safety plan", meta: "Keep everyone connected", tab: "family" as const },
  { icon: "shelter" as IconName, title: "Find public shelters", meta: "Verified nearby locations", tab: "shelters" as const },
  { icon: "firstAid" as IconName, title: "First-aid guidance", meta: "Clear steps for common needs", tab: "aid" as const },
];

function Brand() {
  return <div className="brand"><Image className="brand-maya-logo" src="/mascots/maya.jpeg" alt="MyanAid logo" width={64} height={64} priority /><div><div className="brand-name">MyanAid</div><div className="brand-tagline">Prepared. Informed. Safer together.</div></div></div>;
}

function Header({ onLocation, locationLabel, locationLoading, language, setLanguage, onProfile, user }: { onLocation: () => void; locationLabel: string; locationLoading: boolean; language: string; setLanguage: (language: string) => void; onProfile: () => void; user: User | null }) {
  const [languageOpen, setLanguageOpen] = useState(false);
  const languages = [{ label: "English", flag: "🇬🇧" }, { label: "မြန်မာ", flag: "🇲🇲" }, { label: "ไทย", flag: "🇹🇭" }, { label: "Bahasa Indonesia", flag: "🇮🇩" }];
  const activeLanguage = languages.find((item) => item.label === language) ?? languages[0];
  return <header className="header">
    <div className="header-inner">
      <Brand />
      <div className="header-actions">
        <Action className="location-pill" onClick={onLocation}><Icon name="location" size="sm" /><span>{locationLoading ? "Finding your location…" : locationLabel}</span><Icon name="chevron" size="sm" /></Action>
        <div className="language-wrap">
          <Action className="icon-pill language-toggle" onClick={() => setLanguageOpen(!languageOpen)}><span className="language-flag" aria-hidden="true">{activeLanguage.flag}</span><span className="language-name">{language}</span><Icon name="chevron" size="sm" /></Action>
          {languageOpen && <div className="language-menu"><div className="menu-label">Language</div>{languages.map((item) => <Action key={item.label} className={`menu-item ${language === item.label ? "selected" : ""}`} onClick={() => { setLanguage(item.label); setLanguageOpen(false); }}><span className="language-menu-name"><span className="language-menu-flag" aria-hidden="true">{item.flag}</span>{item.label}</span>{language === item.label && <Icon name="check" size="sm" />}</Action>)}</div>}
        </div>
        <Action className="square-action profile-action" ariaLabel={user ? "Open profile" : "Sign in"} onClick={onProfile}><Icon name="profile" /></Action>
      </div>
    </div>
  </header>;
}

function MascotIcon({ mascotId, className = "" }: { mascotId: MascotId; className?: string }) {
  const mascot = findMascot(mascotId);
  const source = mascotId === "maya" ? "/mascots/maya-hero-transparent.png" : mascot.file;
  return <Image className={`mascot-icon ${className} mascot-${mascot.id}`} src={source} alt={`${mascot.name}, your MyanAid companion`} width={128} height={128} />;
}

function FloatingAI({ onClick, mascotId, message, severity, emergencyActive }: { onClick: () => void; mascotId: MascotId; message: string; severity: LocalCondition["severity"]; emergencyActive: boolean }) {
  const mascot = findMascot(mascotId);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const moved = useRef(false);
  const [calloutVisible, setCalloutVisible] = useState(true);
  useEffect(() => { if (emergencyActive) { setCalloutVisible(true); return; } const timer = window.setTimeout(() => setCalloutVisible(false), 5500); return () => window.clearTimeout(timer); }, [emergencyActive]);
  return <div className={`floating-companion severity-${emergencyActive ? "critical" : severity}`} style={position ? { left: position.left, top: position.top, right: "auto", bottom: "auto" } : undefined} onPointerDown={(event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    dragStart.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    moved.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }} onPointerMove={(event) => {
    if (!dragStart.current) return;
    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) moved.current = true;
    setPosition({ left: Math.max(12, Math.min(window.innerWidth - 76, dragStart.current.left + dx)), top: Math.max(12, Math.min(window.innerHeight - 96, dragStart.current.top + dy)) });
  }} onPointerUp={(event) => { dragStart.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }}>
    {calloutVisible && <div className={`companion-callout ${emergencyActive ? "emergency-callout" : ""}`}><span>{emergencyActive ? "SOS is available" : "MyanAid tip"}</span><strong>{emergencyActive ? `${mascot.name} noticed a critical condition. Open SOS contacts now.` : message}</strong>{emergencyActive && <button type="button" onClick={onClick}>View SOS</button>}</div>}
    <button type="button" className="floating-ai" onClick={() => { if (!moved.current) onClick(); }} aria-label={`Ask ${mascot.name} for help`}><MascotIcon mascotId={mascotId} className={emergencyActive ? "emergency-mascot" : ""} /><span className="maya-chat-signal" aria-hidden="true"><i /><i /><i /></span><span className="floating-ai-label">Ask {mascot.name}</span><span className="floating-ai-status" /></button>
  </div>;
}

function MascotNameSync({ mascotId }: { mascotId: MascotId }) {
  useEffect(() => {
    const mascot = findMascot(mascotId);
    const replacements: Array<[string, string]> = [["Ask Maya about current risks", `Ask ${mascot.name} about current risks`], ["Maya’s family overview", `${mascot.name}’s family overview`], ["Plan with Maya", `Plan with ${mascot.name}`], ["Ask Maya", `Ask ${mascot.name}`]];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    nodes.forEach((node) => replacements.forEach(([from, to]) => { if (node.nodeValue?.includes(from)) node.nodeValue = node.nodeValue.replaceAll(from, to); }));
    const familyMascot = document.querySelector<HTMLImageElement>(".family-maya-help .mascot-icon img");
    if (familyMascot) { familyMascot.src = mascot.file; familyMascot.alt = mascot.name; }
  }, [mascotId]);
  return null;
}

function StatusCard({ onMap, onGuidance, condition, observedAt, weather, visualPreview }: { onMap: () => void; onGuidance: () => void; condition: LocalCondition; observedAt?: string; weather: LiveWeather | null; visualPreview?: HeroWeatherAnimation }) {
  const animation = visualPreview ?? heroWeatherAnimation(weather, condition);
  return <section className={`status-card severity-${condition.severity}`}>
    <HeroWeatherMotion variant={animation} />
    <div className="status-main"><div className="hero-status-row"><div className={`hero-severity severity-${condition.severity}`}>{condition.label}</div></div><h1>{condition.headline}</h1><div className="status-location"><Icon name="location" size="sm" /><span className="hero-location-name">Bangkok, Thailand</span><span className="hero-observed-at">· {formatHeroObservedAt(observedAt)}</span></div></div>
    <div className="hero-priority-facts">{condition.facts.map((fact) => <span key={fact.label}><Icon name={fact.icon} size="sm" /><b>{fact.value}</b><small>{fact.label}</small></span>)}</div>
    <div className="hero-actions"><Action className="guidance-button" onClick={onGuidance}><Icon name="shield" size="sm" /><span>What to do now</span><Icon name="arrow" size="sm" /></Action><Action className="map-button secondary" onClick={onMap}><Icon name="map" size="sm" /><span>Live map</span></Action></div>
  </section>;
}

function NearYou({ onLocalGuide, onMap, monitoring }: { onLocalGuide: () => void; onMap: () => void; monitoring: LiveMonitoringState }) {
  const weather = monitoring.weather;
  const condition = localCondition(weather);
  const localDetails = weather ? `${weather.rain} mm rain · ${weather.wind} km/h wind · Updated ${formatHeroObservedAt(weather.observedAt)}` : "Checking the latest local weather observation";
  return <section className="near-section">
    <div className="near-local-panel">
      <div className="near-local-header">
        <div><span className="near-local-kicker"><Icon name="location" size="sm" />Near you</span><h2>Bangkok, Thailand</h2></div>
        <Action className="near-map-action" onClick={onMap}>View map <Icon name="arrow" size="sm" /></Action>
      </div>
      <div className="near-observation-card">
        <span className={`near-observation-icon severity-${condition.severity}`}><Icon name={condition.icon} /></span>
        <div><span>Current local weather safety</span><strong>{condition.headline}</strong><small>{localDetails}</small></div>
      </div>
      <Action className="near-guide-action" onClick={onLocalGuide}><Icon name="shield" size="sm" />Read local guide <Icon name="arrow" size="sm" /></Action>
    </div>
  </section>;
}

function LiveMonitoring({ monitoring }: { monitoring: LiveMonitoringState }) {
  const weather = monitoring.weather;
  const earthquake = monitoring.earthquake;
  const weatherTone = weatherMonitoringTone(weather);
  const earthquakeTone = earthquakeMonitoringTone(earthquake);
  return <section className="section live-monitoring-section">
    <SectionTitle title="Live data" subtitle={monitoring.loading ? "Connecting to public data sources…" : `Last checked ${monitoring.fetchedAt ?? "just now"}`} />
    <div className="live-data-grid compact-live-grid">
      <article className={`live-data-card weather-live-card tone-${weatherTone}`}>
        <div className="live-data-top"><div className="live-data-icon"><Icon name={weather ? weatherVisualIcon(weather.code) : "rain"} /></div><div><span>Bangkok conditions</span><strong>{weather?.source === "Google Weather" ? "Google Weather conditions" : "Open-Meteo forecast"}</strong></div><span className="source-pill">{weather?.source === "Google Weather" ? "Current ·" : "Modelled ·"} {monitoringToneLabel[weatherTone]}</span></div>
        {weather ? <><div className="live-weather-reading"><strong>{weather.temperature}°</strong><span>{weather.description ?? weatherLabel(weather.code)}</span></div><div className="live-data-facts"><span><Icon name="rain" size="sm" />{weather.rain} mm rain</span><span><Icon name="wind" size="sm" />{weather.wind} km/h</span></div></> : <p className="live-empty">Weather data is temporarily unavailable.</p>}
      </article>
      <article className={`live-data-card quake-live-card tone-${earthquakeTone}`}>
        <div className="live-data-top"><div className="live-data-icon"><Icon name="earthquake" /></div><div><span>Global earthquakes M4.5+</span><strong>USGS live feed</strong></div><span className="source-pill official">Scientific · {monitoringToneLabel[earthquakeTone]}</span></div>
        {earthquake ? <><div className="live-quake-reading"><strong>M{earthquake.magnitude.toFixed(1)}</strong><span>{earthquake.place}</span></div><a className="live-source-link" href={earthquake.url} target="_blank" rel="noreferrer">Source details <Icon name="arrow" size="sm" /></a></> : <p className="live-empty">No M4.5+ event is currently listed.</p>}
      </article>
    </div>
  </section>;
}

function SourceMonitoring({ sourceMonitoring, onSelectEvent }: { sourceMonitoring: SourceMonitoringState; onSelectEvent: (event: SourceFeedItem, feed: SourceFeed) => void }) {
  const { airQuality, river, feeds } = sourceMonitoring;
  const [expanded, setExpanded] = useState(false);
  if (!airQuality && !river && !feeds.length) return null;
  return <section className="section source-monitoring-section compact-signal-section">
    <div className="global-kicker"><Icon name="shield" size="sm" />Provider-source monitoring</div>
    <SectionTitle title="More safety signals" subtitle="A compact view of current provider data." />
    {(airQuality || river) && <div className="source-condition-grid">
      {airQuality && <article className="source-condition-card air-condition-card">
        <div className="source-condition-head"><div className="live-data-icon"><Icon name="air" /></div><div><span>Bangkok air quality</span><strong>Open-Meteo model</strong></div><span className="source-pill">Modelled</span></div>
        <div className="source-condition-reading"><strong>AQI {airQuality.usAqi}</strong><span>PM2.5 {airQuality.pm25} µg/m³ · PM10 {airQuality.pm10} µg/m³</span></div>
        <p>{airQuality.observedAt} · This is modelled air quality, not a regulatory monitor reading.</p>
      </article>}
      {river && <article className="source-condition-card river-condition-card">
        <div className="source-condition-head"><div className="live-data-icon"><Icon name="flood" /></div><div><span>Bangkok river model</span><strong>Open-Meteo flood API</strong></div><span className="source-pill">Forecast</span></div>
        <div className="source-condition-reading"><strong>{river.discharge} m³/s</strong><span>Modelled discharge for {river.date}</span></div>
        <p>Discharge is not flood depth, street conditions, dam status, or an evacuation instruction.</p>
      </article>}
    </div>}
    {!!feeds.length && <div className="provider-feed-grid">{(expanded ? feeds : feeds.slice(0, 1)).map((feed) => <article className="provider-feed-card" key={feed.id}>
      <div className="provider-feed-head"><div><span>{feed.kind.replaceAll("_", " ")}</span><h3>{feed.provider}</h3></div><span className="feed-count">{feed.events.length} records</span></div>
      <div className="provider-event-list">{feed.events.slice(0, expanded ? 3 : 1).map((event) => <button type="button" className="provider-event" key={event.id} onClick={() => onSelectEvent(event, feed)}>
        <div><span className="provider-event-category">{event.category} · {event.severity}</span><strong>{event.title}</strong><p><Icon name="location" size="sm" />{event.location}</p>{event.summary && <small>{event.summary}</small>}</div><Icon name="arrow" size="sm" />
      </button>)}</div>
      {expanded && <p className="provider-feed-notice">{feed.safetyNotice}</p>}
    </article>)}</div>}
    {feeds.length > 1 && <button type="button" className="monitoring-expand" onClick={() => setExpanded(value => !value)}>{expanded ? "Show compact summary" : `Browse all ${feeds.length} source feeds`}<Icon name="arrow" size="sm" /></button>}
  </section>;
}

function GDACSVisual({ url, title }: { url: string; title: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="provider-visual-fallback"><div className="provider-visual-orbit"><Icon name="storm" size="lg" /></div><div><span>Provider visual unavailable</span><strong>{title}</strong><p>GDACS did not make its event image available in this view. The official report remains linked below.</p></div></div>;
  return <img src={url} alt={`GDACS forecast overview for ${title}`} onError={() => setFailed(true)} />;
}

function SourceEventDrawer({ event, feed, onClose }: { event: SourceFeedItem; feed: SourceFeed; onClose: () => void }) {
  const coordinates = event.coordinates ? `${event.coordinates.latitude.toFixed(4)}, ${event.coordinates.longitude.toFixed(4)}` : null;
  const mapPoints = event.coordinates ? [event as SourceFeedItem & { coordinates: SourceCoordinates }] : [];
  const hasOfficialArea = providerAreaPaths(event.areaGeometry).length > 0;
  const gdacs = event.gdacs;
  const eventWindow = gdacs?.endAt ? `${event.occurredAt} to ${gdacs.endAt}` : event.occurredAt;
  const maximumWind = gdacs?.severityValue && gdacs.severityUnit ? `${Math.round(gdacs.severityValue)} ${gdacs.severityUnit}` : null;
  return <div className="overlay source-event-overlay" onClick={onClose}><aside className="detail-panel source-event-panel" onClick={event => event.stopPropagation()}>
    <button type="button" className="source-event-close" onClick={onClose} aria-label="Close provider record"><Icon name="close" size="sm" /></button>
    <div className="eyebrow">Provider record · {feed.provider}</div><h1>{event.title}</h1>
    <p className="source-event-summary">{event.summary ?? "MyanAid is displaying the provider record in-app. Check the original provider report for any later changes."}</p>
    {gdacs && <section className="gdacs-impact-card">
      <div className="gdacs-impact-heading"><div><span>GDACS impact overview</span><strong>Provider-published forecast context</strong></div><b className={`gdacs-alert gdacs-alert-${event.severity.toLowerCase()}`}>{event.severity} alert</b></div>
      <div className="gdacs-metric-grid">
        <div><span>Maximum wind</span><strong>{maximumWind ?? "Not published"}</strong><small>{gdacs.severityText ?? "GDACS severity data"}</small></div>
        <div><span>Exposed countries</span><strong>{gdacs.affectedCountries?.length ? gdacs.affectedCountries.join(", ") : event.location}</strong><small>Published by GDACS</small></div>
        <div><span>Event window</span><strong>{eventWindow}</strong><small>Provider report timing</small></div>
        <div><span>GDACS score</span><strong>{gdacs.alertScore ? `${gdacs.alertScore} / 3` : "Not published"}</strong><small>Provider alert score</small></div>
      </div>
    </section>}
    <section className="source-event-facts"><div><span>Location</span><strong><Icon name="location" size="sm" />{event.location}</strong></div><div><span>Reported</span><strong>{event.occurredAt}</strong></div><div><span>Last updated</span><strong>{event.updatedAt}</strong></div><div><span>Record source</span><strong>{event.source}</strong></div></section>
    {gdacs?.overviewMapUrl && <section className="gdacs-visual-card"><div className="gdacs-visual-heading"><div><span>Official event visual</span><strong>Forecast track and cloud context</strong></div><span>GDACS / {event.source}</span></div><GDACSVisual url={gdacs.overviewMapUrl} title={event.title} /><p>This provider-published visual stays in MyanAid when available. The original report is always the authoritative source.</p></section>}
    <section className="source-map-card"><div><Icon name="map" /><div><strong>{hasOfficialArea ? "Provider-published affected area" : coordinates ? "Provider-published map point" : "No provider map point"}</strong><span>{hasOfficialArea ? `${severityAreaStyle(event.severity).label} fill from provider geometry.` : coordinates ? coordinates : "This record has no verified latitude and longitude, so MyanAid will not place an estimated marker."}</span></div></div>{coordinates && <><div className="source-detail-map"><GoogleSourceMap points={mapPoints} compact /><div className="source-map-hud"><span><Icon name="location" size="sm" />Verified coordinates</span><strong>{coordinates}</strong><small>{hasOfficialArea ? "Provider boundary included" : "Provider point only"}</small></div></div><p>{hasOfficialArea ? "The coloured shape is provider-published geometry. Its colour reflects the provider severity label." : "This point comes directly from the provider. It does not define an affected-area boundary."}</p></>}</section>
    <section className="source-safety-card"><Icon name="alert" size="sm" /><span>{feed.safetyNotice}</span></section>
    <a className="source-report-link" href={event.url} target="_blank" rel="noreferrer">Open original provider report <Icon name="arrow" size="sm" /></a>
  </aside></div>;
}

function SectionTitle({ title, subtitle, action, onAction }: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return <div className="section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <Action className="text-action" onClick={onAction}>{action}<Icon name="arrow" size="sm" /></Action>}</div>;
}

function Home({ onMap, onCategory, onAlert, onPreparedness, onLocalGuide, savedLocations, monitoring, sourceMonitoring, mascotId }: { onMap: () => void; onCategory: (title: string) => void; onAlert: (alert: AlertData) => void; onPreparedness: (tab: "kit" | "family" | "shelters" | "aid") => void; onLocalGuide: () => void; savedLocations: SavedLocation[]; monitoring: LiveMonitoringState; sourceMonitoring: SourceMonitoringState; mascotId: MascotId }) {
  const condition = localCondition(monitoring.weather);
  const [heroPreview, setHeroPreview] = useState<HeroWeatherAnimation | null>(null);
  const [heroPreviewEnabled, setHeroPreviewEnabled] = useState(false);
  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("heroPreview");
    if (preview === "all") { setHeroPreviewEnabled(true); setHeroPreview("sun"); return; }
    if (heroWeatherVariants.includes(preview as HeroWeatherAnimation)) { setHeroPreviewEnabled(true); setHeroPreview(preview as HeroWeatherAnimation); }
  }, []);
  const categoryIsEmergency = (title: string) => {
    if (title === "Storm & Weather") return condition.severity === "warning" || condition.severity === "critical";
    if (title === "Earthquake & Tsunami") return (monitoring.earthquake?.magnitude ?? 0) >= 6;
    if (title === "Fire, Haze & Air Quality") return (sourceMonitoring.airQuality?.usAqi ?? 0) >= 151;
    return false;
  };
  const categorySignal = (title: string) => {
    if (title === "Flood & Water") return sourceMonitoring.river ? `${sourceMonitoring.river.discharge} m³/s river model` : "River model updating";
    if (title === "Storm & Weather") return monitoring.weather ? `${weatherLabel(monitoring.weather.code)} · ${monitoring.weather.rain} mm` : "Weather model updating";
    if (title === "Fire, Haze & Air Quality") return sourceMonitoring.airQuality ? `AQI ${sourceMonitoring.airQuality.usAqi} · modelled` : "Air quality updating";
    if (title === "Earthquake & Tsunami") return monitoring.earthquake ? `M${monitoring.earthquake.magnitude.toFixed(1)} latest event` : "USGS feed updating";
    if (title === "Public Health Alerts") return sourceMonitoring.feeds.find((feed) => /who|health/i.test(`${feed.id} ${feed.provider}`)) ? "WHO provider feed" : "No provider update";
    return sourceMonitoring.feeds.find((feed) => /ifrc|humanitarian/i.test(`${feed.id} ${feed.provider}`)) ? "IFRC provider feed" : "Services normal";
  };
  return <main>
    <div className="hero-wash" />
    <div className="content">
      <StatusCard onMap={onMap} onGuidance={onLocalGuide} condition={condition} observedAt={monitoring.weather?.observedAt} weather={monitoring.weather} visualPreview={heroPreview ?? undefined} />
      {heroPreviewEnabled && <section className="hero-scene-preview" aria-label="Hero weather scene preview"><span>Visual preview</span><div>{heroWeatherVariants.map((variant) => <button type="button" className={heroPreview === variant ? "active" : ""} onClick={() => setHeroPreview(variant)} key={variant}>{variant}</button>)}</div></section>}
      <NearYou onLocalGuide={onLocalGuide} onMap={onMap} monitoring={monitoring} />
      <LiveMonitoring monitoring={monitoring} />
      <section className="section category-home-section">
        <SectionTitle title="Emergency categories" />
        <div className="category-grid">{categories.map((item) => <Action key={item.title} className={`category-card ${categoryIsEmergency(item.title) ? "watched" : "inactive"}`} onClick={() => onCategory(item.title)}>
          <div className="category-icon category-icon-3d"><Emergency3DIcon name={item.icon as EmergencyIconName} /></div>
          <div className="category-copy"><h3>{item.title}</h3><p>{item.description}</p><div className={`category-status ${item.tone}`}><span />{categorySignal(item.title)}</div></div>
          <Icon name="chevron" />
        </Action>)}</div>
      </section>
      <section className="section home-action-hub preparedness-home-hub"><div className="home-hub-module"><SectionTitle title="Preparedness" subtitle="Make a plan before you need it" /><div className="compact-shortcut-grid">{shortcuts.map((item) => <Action key={item.title} className="compact-shortcut" onClick={() => onPreparedness(item.tab)}><div className="shortcut-icon shortcut-icon-3d"><Preparedness3DIcon name={item.icon as PreparednessIconName} /></div><span>{item.title}</span></Action>)}</div></div></section>
      <div className="disclaimer"><Icon name="shield" size="sm" /><span>Information may change. Follow official local authorities for emergency instructions.</span></div>
    </div>
  </main>;
}

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (window.myanAidMapsPromise) return window.myanAidMapsPromise;
  window.myanAidMapsPromise = new Promise<GoogleMapsRuntime>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => window.google?.maps ? resolve(window.google) : reject(new Error("Google Maps did not load."));
    script.onerror = () => reject(new Error("Google Maps could not be loaded."));
    document.head.appendChild(script);
  });
  return window.myanAidMapsPromise;
}

function pointCategory(event: SourceFeedItem) {
  const value = `${event.category} ${event.title}`.toLowerCase();
  if (value.includes("earthquake")) return { label: "Earthquake", color: "red" };
  if (value.includes("flood") || value.includes("water")) return { label: "Flood & water", color: "blue" };
  if (value.includes("cyclone") || value.includes("storm") || value.includes("hurricane") || value.includes("tropical")) return { label: "Storm", color: "orange" };
  if (value.includes("fire") || value.includes("wildfire")) return { label: "Fire", color: "yellow" };
  if (value.includes("health") || value.includes("disease") || value.includes("outbreak")) return { label: "Health", color: "purple" };
  return { label: "Other", color: "green" };
}

function matchesMapFilter(event: SourceFeedItem, filter: string) {
  const category = pointCategory(event).label;
  return filter === "All alerts" || (filter === "Flood" && category === "Flood & water") || (filter === "Storm" && category === "Storm") || (filter === "Earthquake" && category === "Earthquake") || (filter === "Fire & Air Quality" && category === "Fire") || (filter === "Health" && category === "Health") || (filter === "Humanitarian" && event.category.toLowerCase().includes("humanitarian"));
}

function distanceInKm(a: SourceCoordinates, b: SourceCoordinates) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitude = toRadians(b.latitude - a.latitude);
  const longitude = toRadians(b.longitude - a.longitude);
  const origin = Math.sin(latitude / 2) ** 2 + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(origin), Math.sqrt(1 - origin));
}

type AreaPaths = GoogleMapsPosition[][];

function providerAreaPaths(serialized?: string): AreaPaths[] {
  if (!serialized) return [];
  try {
    const geometry = JSON.parse(serialized) as { type?: string; coordinates?: unknown };
    const asRing = (ring: unknown): GoogleMapsPosition[] | null => Array.isArray(ring) ? ring.flatMap((position) => Array.isArray(position) && typeof position[0] === "number" && typeof position[1] === "number" && position[0] >= -180 && position[0] <= 180 && position[1] >= -90 && position[1] <= 90 ? [{ lat: position[1], lng: position[0] }] : []) : null;
    const asPolygon = (polygon: unknown): AreaPaths | null => {
      if (!Array.isArray(polygon)) return null;
      const rings = polygon.map(asRing).filter((ring): ring is GoogleMapsPosition[] => Boolean(ring && ring.length >= 3));
      return rings.length ? rings : null;
    };
    if (geometry.type === "Polygon") return asPolygon(geometry.coordinates) ? [asPolygon(geometry.coordinates)!] : [];
    if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) return geometry.coordinates.map(asPolygon).filter((polygon): polygon is AreaPaths => Boolean(polygon));
  } catch { /* Ignore malformed provider geometry. */ }
  return [];
}

function severityAreaStyle(severity: string) {
  const value = severity.toLowerCase();
  if (value.includes("official mapped extent")) return { color: "#087fbe", label: "Official mapped extent (not severity-rated)" };
  if (value.includes("red") || value.includes("high") || value.includes("critical") || value.includes("extreme")) return { color: "#d92d20", label: "High severity" };
  if (value.includes("orange") || value.includes("medium") || value.includes("moderate") || value.includes("warning")) return { color: "#e87817", label: "Moderate severity" };
  if (value.includes("yellow") || value.includes("low") || value.includes("watch")) return { color: "#c68b00", label: "Lower severity" };
  return { color: "#087fbe", label: "Provider severity not rated" };
}

function GoogleSourceMap({ points, mode = "roadmap", compact = false, currentLocation, focusCurrentLocation = false, searchedLocation, focusZoom, placeQuery, nearbySearchQuery, nearbyFacilities = EMPTY_NEARBY_PLACES, onNearbyPlaces }: { points: Array<SourceFeedItem & { coordinates: SourceCoordinates }>; mode?: MapDisplayMode; compact?: boolean; currentLocation?: SourceCoordinates | null; focusCurrentLocation?: boolean; searchedLocation?: SourceCoordinates | null; focusZoom?: number; placeQuery?: string; nearbySearchQuery?: string; nearbyFacilities?: NearbyPlace[]; onNearbyPlaces?: (places: NearbyPlace[], status: string) => void }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing-key" | "3d-location-required" | "3d-map-id-required" | "street-location-required" | "street-unavailable" | "error">("loading");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  useEffect(() => {
    if (!apiKey) { setStatus("missing-key"); return; }
    if (!mapElement.current) return;
    let active = true;
    loadGoogleMaps(apiKey).then(async (google) => {
      if (!active || !mapElement.current) return;
      const geocodedPosition = placeQuery ? await new Promise<GoogleMapsPosition | null>((resolve) => new google.maps.Geocoder().geocode({ address: placeQuery }, (results, status) => {
        const location = status === "OK" ? results?.[0]?.geometry?.location : undefined;
        resolve(location ? { lat: location.lat(), lng: location.lng() } : null);
      })) : null;
      if (!active || !mapElement.current) return;
      const selectedPosition = searchedLocation ? { lat: searchedLocation.latitude, lng: searchedLocation.longitude } : currentLocation ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : geocodedPosition;
      const firstPosition = selectedPosition ?? (points[0] ? { lat: points[0].coordinates.latitude, lng: points[0].coordinates.longitude } : { lat: 15, lng: 100 });
      if (mode === "3d" && !selectedPosition) { setStatus("3d-location-required"); return; }
      if (mode === "3d" && !mapId) { setStatus("3d-map-id-required"); return; }
      if (mode === "street") {
        if (!selectedPosition) { setStatus("street-location-required"); return; }
        const panoramaService = new google.maps.StreetViewService();
        panoramaService.getPanorama({ location: selectedPosition, radius: 150 }, (panoramaData, panoramaStatus) => {
          if (!active || !mapElement.current) return;
          if (panoramaStatus === "OK" && panoramaData?.location?.latLng) {
            new google.maps.StreetViewPanorama(mapElement.current, { position: panoramaData.location.latLng, pov: { heading: 0, pitch: 0 }, zoom: 1, addressControl: false, fullscreenControl: false, motionTracking: false });
            setStatus("ready");
          } else {
            new google.maps.Map(mapElement.current, { center: selectedPosition, zoom: 16, mapTypeId: "roadmap", mapTypeControl: false, streetViewControl: false, fullscreenControl: false, gestureHandling: "cooperative" });
            setStatus("street-unavailable");
          }
        });
        return;
      }
      const mapTypeId = mode === "3d" ? "satellite" : mode;
      const threeDimensionalFocus = mode === "3d" && Boolean(selectedPosition);
      const map = new google.maps.Map(mapElement.current, { center: firstPosition, zoom: threeDimensionalFocus ? 17 : mode === "terrain" ? selectedPosition ? 10 : 5 : points.length === 1 ? 6 : 4, mapTypeId, ...(mode === "3d" ? { mapId } : {}), ...(mode === "3d" ? { tilt: 45, heading: 0 } : {}), mapTypeControl: false, streetViewControl: false, fullscreenControl: false, gestureHandling: "cooperative" });
      if (mode === "3d") map.setTilt(45);
      const bounds = new google.maps.LatLngBounds();
      let areaPointCount = 0;
      points.forEach((point) => {
        const position = { lat: point.coordinates.latitude, lng: point.coordinates.longitude };
        const category = pointCategory(point);
        const areaStyle = severityAreaStyle(point.severity);
        const areaPaths = providerAreaPaths(point.areaGeometry);
        areaPaths.forEach((paths) => {
          new google.maps.Polygon({ map, paths, strokeColor: areaStyle.color, strokeOpacity: 1, strokeWeight: 3, fillColor: areaStyle.color, fillOpacity: .58 });
          paths.flat().forEach((areaPoint) => { bounds.extend(areaPoint); areaPointCount += 1; });
        });
        if (!areaPaths.length) {
          const marker = new google.maps.Marker({ map, position, title: `${category.label}: ${point.title} · ${point.source}`, icon: `https://maps.google.com/mapfiles/ms/icons/${category.color}-dot.png` });
          const detail = document.createElement("div");
          detail.textContent = `${category.label} · ${point.title}`;
          const info = new google.maps.InfoWindow({ content: detail });
          marker.addListener("click", () => info.open(map, marker));
        }
        bounds.extend(position);
      });
      if (currentLocation) {
        const position = { lat: currentLocation.latitude, lng: currentLocation.longitude };
        new google.maps.Marker({ map, position, title: "Your current location", icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" });
        if (!focusCurrentLocation) bounds.extend(position);
      }
      if (nearbyFacilities.length) {
        const info = new google.maps.InfoWindow({ content: document.createElement("div") });
        nearbyFacilities.forEach((facility) => {
          const marker = new google.maps.Marker({ map, position: { lat: facility.latitude, lng: facility.longitude }, title: facility.name, icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" });
          marker.addListener("click", () => {
            const detail = document.createElement("div");
            const name = document.createElement("strong"); name.textContent = facility.name;
            const address = document.createElement("small"); address.textContent = facility.address;
            detail.className = "shelter-place-popup"; detail.append(name, address);
            info.setContent(detail); info.open(map, marker);
          });
        });
      }
      if (nearbySearchQuery) map.setZoom(focusZoom ?? 13);
      else if (searchedLocation || geocodedPosition) {
        new google.maps.Marker({ map, position: firstPosition, title: "Searched location", icon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png" });
        map.setZoom(focusZoom ?? 6);
      } else if (focusCurrentLocation && currentLocation) map.setZoom(10);
      else if (!bounds.isEmpty() && (areaPointCount > 0 || points.length > 1)) map.fitBounds(bounds, compact ? 28 : 52);
      if (nearbySearchQuery && google.maps.places) {
        const info = new google.maps.InfoWindow({ content: document.createElement("div") });
        new google.maps.places.PlacesService(map).textSearch({ query: `${nearbySearchQuery} near ${placeQuery ?? "this area"}`, location: firstPosition, radius: 5000 }, (results, placeStatus) => {
          const nearbyPlaces = placeStatus === "OK" && results ? results.slice(0, 16).flatMap((place, index) => {
            const location = place.geometry?.location;
            if (!location) return [];
            const nearbyPlace = { id: place.place_id ?? `${place.name ?? nearbySearchQuery}-${index}`, name: place.name ?? nearbySearchQuery, address: place.vicinity ?? place.formatted_address ?? "Google Maps place result", latitude: location.lat(), longitude: location.lng() };
            const marker = new google.maps.Marker({ map, position: { lat: nearbyPlace.latitude, lng: nearbyPlace.longitude }, title: nearbyPlace.name, icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" });
            marker.addListener("click", () => {
              const detail = document.createElement("div");
              const name = document.createElement("strong"); name.textContent = nearbyPlace.name;
              const address = document.createElement("small"); address.textContent = nearbyPlace.address;
              detail.className = "shelter-place-popup"; detail.append(name, address);
              info.setContent(detail); info.open(map, marker);
            });
            return [nearbyPlace];
          }) : [];
          if (active) onNearbyPlaces?.(nearbyPlaces, placeStatus);
        });
      } else if (nearbySearchQuery && active) onNearbyPlaces?.([], "PLACES_UNAVAILABLE");
      setStatus("ready");
    }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, [apiKey, compact, currentLocation, focusCurrentLocation, focusZoom, mapId, mode, nearbyFacilities, nearbySearchQuery, onNearbyPlaces, placeQuery, points, searchedLocation]);
  if (status === "missing-key") return <div className="google-map-fallback"><Icon name="map" size="lg" /><strong>Map setup is incomplete</strong><span>Add a restricted Maps JavaScript API key to show provider event points.</span></div>;
  if (status === "3d-location-required") return <div className="google-map-fallback"><Icon name="location" size="lg" /><strong>Choose a location for 3D</strong><span>Search for a place or use Near me first. MyanAid will then open genuine Google 3D imagery for that location.</span></div>;
  if (status === "3d-map-id-required") return <div className="google-map-fallback"><Icon name="map" size="lg" /><strong>Google 3D needs a Maps Map ID</strong><span>Add <code>NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID</code> for this project, then 3D buildings and tilt can load for your selected location.</span></div>;
  if (status === "error") return <div className="google-map-fallback"><Icon name="alert" size="lg" /><strong>Map is unavailable right now</strong><span>The provider records remain available below. Check the Maps key restrictions and try again.</span></div>;
  return <div className="google-map-wrap"><div className="google-source-map" ref={mapElement} aria-label="Provider-published event point and affected-area map" />{status === "loading" && <div className="google-map-loading">Loading provider map…</div>}{status === "street-location-required" && <div className="street-view-notice"><Icon name="location" size="sm" />Search for a place or use Near me first. Street View never picks an unrelated provider pin.</div>}{status === "street-unavailable" && <div className="street-view-notice"><Icon name="location" size="sm" />No Street View imagery is available within 150 metres, so this view is showing your selected location on the road map.</div>}</div>;
}

function mapboxEventGeometry(event: SourceFeedItem & { coordinates: SourceCoordinates }) {
  if (event.areaGeometry) {
    try {
      const geometry = JSON.parse(event.areaGeometry) as { type?: string; coordinates?: unknown };
      if ((geometry.type === "Polygon" || geometry.type === "MultiPolygon") && Array.isArray(geometry.coordinates)) return geometry;
    } catch { /* A malformed provider geometry is handled as its exact point. */ }
  }
  return { type: "Point", coordinates: [event.coordinates.longitude, event.coordinates.latitude] };
}

function GlobalEarthMap({ points, currentLocation, searchedLocation }: { points: Array<SourceFeedItem & { coordinates: SourceCoordinates }>; currentLocation: SourceCoordinates | null; searchedLocation?: SourceCoordinates | null }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing-token" | "error">("loading");
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  useEffect(() => {
    if (!token) { setStatus("missing-token"); return; }
    if (!mapElement.current) return;
    let active = true;
    let map: import("mapbox-gl").Map | null = null;
    let rotationFrame: number | null = null;
    let lastRotation = 0;
    let pausedByGesture = false;
    let automatedRotation = false;
    let automatedRotationUntil = 0;
    let resumeTimer: number | null = null;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (!active || !mapElement.current) return;
      mapboxgl.accessToken = token;
      map = new mapboxgl.Map({ container: mapElement.current, style: "mapbox://styles/mapbox/satellite-streets-v12", center: searchedLocation ? [searchedLocation.longitude, searchedLocation.latitude] : [104, 15], zoom: searchedLocation ? 3.4 : 1.25, projection: "globe", attributionControl: true });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
      map.on("load", () => {
        if (!map) return;
        // Mapbox's current satellite style supplies its own globe atmosphere.
        // Resizing after layout prevents a blank WebGL canvas in mobile emulation.
        map.resize();
        window.requestAnimationFrame(() => map?.resize());
        const features = points.map((point) => ({ type: "Feature" as const, geometry: mapboxEventGeometry(point), properties: { title: point.title, location: point.location, category: pointCategory(point).label, severity: point.severity, source: point.source } }));
        if (currentLocation) features.push({ type: "Feature" as const, geometry: { type: "Point", coordinates: [currentLocation.longitude, currentLocation.latitude] }, properties: { title: "Your current location", location: "Shared only in this browser", category: "Your location", severity: "Location", source: "MyanAid" } });
        map.addSource("myanaid-events", { type: "geojson", data: { type: "FeatureCollection", features } });
        const categoryColor = ["match", ["get", "category"], "Earthquake", "#e63946", "Storm", "#f28c24", "Flood & water", "#1687d4", "Fire", "#e1bd18", "Health", "#d946ef", "Your location", "#2563eb", "#36a269"] as unknown as import("mapbox-gl").ExpressionSpecification;
        map.addLayer({ id: "earth-areas-fill", type: "fill", source: "myanaid-events", filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]], paint: { "fill-color": categoryColor, "fill-opacity": 0.45 } });
        map.addLayer({ id: "earth-areas-outline", type: "line", source: "myanaid-events", filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]], paint: { "line-color": categoryColor, "line-width": 2.2, "line-opacity": 0.95 } });
        map.addLayer({ id: "earth-points", type: "circle", source: "myanaid-events", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 6, "circle-color": categoryColor, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
        const openPopup = (event: import("mapbox-gl").MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          if (!feature || !map) return;
          const properties = (feature as unknown as { properties?: Record<string, unknown> }).properties ?? {};
          const content = document.createElement("div");
          const category = document.createElement("strong"); category.textContent = `${properties.category ?? "Provider event"} · ${properties.severity ?? "Not rated"}`;
          const title = document.createElement("span"); title.textContent = String(properties.title ?? "Provider event");
          const location = document.createElement("small"); location.textContent = `${properties.location ?? "Location updating"} · ${properties.source ?? "Provider"}`;
          content.className = "earth-popup"; content.append(category, title, location);
          new mapboxgl.Popup({ closeButton: true, maxWidth: "240px" }).setLngLat(event.lngLat).setDOMContent(content).addTo(map);
        };
        map.on("click", "earth-points", openPopup);
        map.on("click", "earth-areas-fill", openPopup);
        map.on("mouseenter", "earth-points", () => { if (map) map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "earth-points", () => { if (map) map.getCanvas().style.cursor = ""; });
        // A subtle rotation makes Earth View feel alive. Any direct map gesture
        // immediately pauses it, then it resumes after the person has explored.
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const pauseRotation = () => { if (automatedRotation || performance.now() < automatedRotationUntil) return; pausedByGesture = true; if (resumeTimer) window.clearTimeout(resumeTimer); };
        const resumeRotation = () => { if (resumeTimer) window.clearTimeout(resumeTimer); resumeTimer = window.setTimeout(() => { pausedByGesture = false; }, 2400); };
        map.on("dragstart", pauseRotation); map.on("zoomstart", pauseRotation); map.on("rotatestart", pauseRotation);
        map.on("dragend", resumeRotation); map.on("zoomend", resumeRotation); map.on("rotateend", resumeRotation);
        const rotate = (timestamp: number) => {
          if (!active || !map) return;
          if (!reduceMotion && !pausedByGesture && !document.hidden && timestamp - lastRotation > 110) {
            automatedRotation = true;
            automatedRotationUntil = performance.now() + 250;
            // Keep north fixed and advance the world below the camera. This
            // produces a globe spin instead of rotating the camera/compass.
            const center = map.getCenter();
            map.setCenter([center.lng - 0.12, center.lat]);
            automatedRotation = false;
            lastRotation = timestamp;
          }
          rotationFrame = window.requestAnimationFrame(rotate);
        };
        rotationFrame = window.requestAnimationFrame(rotate);
        if (active) setStatus("ready");
      });
    }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; if (rotationFrame) window.cancelAnimationFrame(rotationFrame); if (resumeTimer) window.clearTimeout(resumeTimer); map?.remove(); mapRef.current = null; };
  }, [currentLocation, points, searchedLocation, token]);
  if (status === "missing-token") return <div className="earth-setup"><Icon name="globe" size="lg" /><strong>Global Earth needs a Mapbox public token</strong><span>Add <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> to <code>.env.local</code>, then restart or deploy MyanAid. The local Google map remains available.</span></div>;
  if (status === "error") return <div className="earth-setup"><Icon name="alert" size="lg" /><strong>Global Earth is unavailable right now</strong><span>Check the Mapbox access-token restrictions and try again.</span></div>;
  return <div className="global-earth-wrap"><div className="global-earth-map" ref={mapElement} aria-label="Interactive global provider event map" />{status === "loading" && <div className="google-map-loading">Loading Global Earth…</div>}<div className="earth-toolbar" aria-label="Global Earth controls"><button type="button" onClick={() => mapRef.current?.flyTo({ center: [104, 15], zoom: 1.25, bearing: 0, pitch: 0, essential: true })}><Icon name="globe" size="sm" /><span>Reset</span></button><button type="button" onClick={() => mapRef.current?.flyTo({ center: [100.5, 13.75], zoom: 3.2, bearing: 0, pitch: 0, essential: true })}><Icon name="location" size="sm" /><span>Asia</span></button><button type="button" onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 500, essential: true })}><Icon name="alert" size="sm" /><span>North</span></button><button type="button" onClick={() => mapRef.current?.setPitch(mapRef.current.getPitch() > 0 ? 0 : 50)}><Icon name="map" size="sm" /><span>Tilt</span></button></div><div className="global-earth-caption"><Icon name="shield" size="sm" /><span>Exact provider points and published boundaries only. Rotate, tilt, and zoom to explore.</span></div></div>;
}

function MapView({ onAlert, sourceMonitoring }: { onAlert: (alert: AlertData) => void; sourceMonitoring: SourceMonitoringState }) {
  const [experience, setExperience] = useState<"local" | "earth">("local");
  const [filter, setFilter] = useState("All alerts");
  const [scope, setScope] = useState("Global");
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const [mapMode, setMapMode] = useState<MapDisplayMode>("roadmap");
  const [currentLocation, setCurrentLocation] = useState<SourceCoordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedLocation, setSearchedLocation] = useState<{ coordinates: SourceCoordinates; label: string } | null>(null);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [focusedFloodAreaId, setFocusedFloodAreaId] = useState<string | null>(null);
  const filters = ["All alerts", "Flood", "Storm", "Earthquake", "Fire & Air Quality", "Health", "Humanitarian"];
  const allProviderPoints = sourceMonitoring.feeds.flatMap((feed) => feed.events.filter((event): event is SourceFeedItem & { coordinates: SourceCoordinates } => Boolean(event.coordinates)).map((event) => ({ ...event, title: event.title, source: `${feed.provider} · ${event.source}` })));
  const officialFloodAreas = allProviderPoints.filter((event) => pointCategory(event).label === "Flood & water" && providerAreaPaths(event.areaGeometry).length > 0);
  useEffect(() => {
    if (filter !== "Flood") setFocusedFloodAreaId(null);
  }, [filter]);
  const filteredProviderPoints = allProviderPoints.filter((event) => matchesMapFilter(event, filter)).filter((event) => scope !== "Near you" || !currentLocation || distanceInKm(event.coordinates, currentLocation) <= 800);
  const providerPoints = focusedFloodAreaId ? filteredProviderPoints.filter((event) => event.id === focusedFloodAreaId) : filteredProviderPoints;
  const requestCurrentLocation = () => {
    if (!navigator.geolocation) { setLocationMessage("Your browser does not support location access."); return; }
    setLocationMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition((position) => { setCurrentLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setScope("Near you"); setLocationPromptOpen(false); setLocationMessage("Showing provider points within 800 km of your location."); }, () => { setLocationPromptOpen(false); setLocationMessage("Location access was not granted. You can still browse global provider points."); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  };
  const askForLocation = () => currentLocation ? requestCurrentLocation() : setLocationPromptOpen(true);
  const searchForLocation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) { setLocationMessage("Enter a city, region, or country to centre the map."); return; }
    setSearchingLocation(true);
    setLocationMessage(`Finding ${query}…`);
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      if (!response.ok) throw new Error("Location service unavailable");
      const data = await response.json() as { results?: Array<{ latitude?: number; longitude?: number; name?: string; admin1?: string; country?: string }> };
      const result = data.results?.[0];
      if (!result || typeof result.latitude !== "number" || typeof result.longitude !== "number" || !result.name) {
        setSearchedLocation(null);
        setLocationMessage(`No map location was found for “${query}”. Try a city, region, or country name.`);
        return;
      }
      const label = [result.name, result.admin1, result.country].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index).join(", ");
      setSearchedLocation({ coordinates: { latitude: result.latitude, longitude: result.longitude }, label });
      setLocationMessage(`Map centred on ${label}. Provider pins remain visible where published.`);
    } catch {
      setLocationMessage("Location search is unavailable right now. Check your connection and try again.");
    } finally { setSearchingLocation(false); }
  };
  const chooseMapMode = (nextMode: MapDisplayMode) => {
    setMapMode(nextMode);
    if (nextMode === "street" && !searchedLocation && !currentLocation) setLocationMessage("Search for a place or use Near me before opening Street View.");
    if (nextMode === "3d") setLocationMessage(searchedLocation || currentLocation ? "Showing the selected location in tilted 3D satellite view." : "Choose a location for close 3D satellite detail; global provider pins remain visible meanwhile.");
  };
  return <main className="map-page">
    <div className="map-toolbar">
      <div className="map-heading"><div><h1>Live map</h1></div></div>
      <form className="map-search-group" onSubmit={searchForLocation}>
        <label className="map-search"><button type="submit" aria-label="Search location" disabled={searchingLocation}><Icon name="search" /></button><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search a city, region or country" aria-label="Search a location" />{searchedLocation && <button type="button" className="map-search-clear" onClick={() => { setSearchTerm(""); setSearchedLocation(null); setLocationMessage("Showing the provider map."); }} aria-label="Clear location search"><Icon name="close" size="sm" /></button>}</label>
      </form>
    </div>
    <div className="map-control-row"><div className="map-experience-switch" aria-label="Map experience"><button type="button" className={experience === "local" ? "active" : ""} onClick={() => setExperience("local")}><Icon name="map" size="sm" />Map view</button><button type="button" className={experience === "earth" ? "active" : ""} onClick={() => setExperience("earth")}><Icon name="globe" size="sm" />Earth view</button></div><button type="button" className="map-near-button" onClick={askForLocation}><Icon name="location" size="sm" />Near me</button></div>
    <div className="filter-row">{filters.map(x => <Action key={x} className={`filter-chip ${filter === x ? "active" : ""}`} onClick={() => setFilter(x)}>{x === "Flood" ? "Flood & water" : x === "Storm" ? "Storm & weather" : x}</Action>)}</div>
    <section className={`provider-map-section ${experience === "earth" ? "global-earth-section" : ""}`}><div className="provider-map-heading"><div><div className="eyebrow">Provider-published map data</div><h2>{experience === "earth" ? "Global hazard explorer" : "Live source map"}</h2></div><span>{providerPoints.length} mapped record{providerPoints.length === 1 ? "" : "s"}</span></div>{experience === "local" && <div className="map-mode-switch" aria-label="Map view"><button type="button" className={mapMode === "roadmap" ? "active" : ""} onClick={() => chooseMapMode("roadmap")}>Map</button><button type="button" className={mapMode === "satellite" ? "active" : ""} onClick={() => chooseMapMode("satellite")}>Satellite</button><button type="button" className={mapMode === "terrain" ? "active" : ""} onClick={() => chooseMapMode("terrain")}>Terrain</button><button type="button" className={mapMode === "3d" ? "active" : ""} onClick={() => chooseMapMode("3d")}>3D</button><button type="button" className={mapMode === "street" ? "active" : ""} onClick={() => chooseMapMode("street")}>Street</button></div>}<div className="provider-map-legend"><span><i className="quake" />Earthquake</span><span><i className="storm" />Storm</span><span><i className="flood" />Flood & water</span><span><i className="fire" />Fire</span><span><i className="health" />Health</span><span><i className="other" />Other</span><span><i className="you" />Your location</span></div><div className="area-severity-legend"><span><i className="official" />Official mapped extent</span><span><i className="high" />High</span><span><i className="medium" />Moderate</span><span><i className="low" />Lower</span><small>Filled areas appear only when a provider publishes boundary geometry.</small></div>{experience === "local" && filter === "Flood" && officialFloodAreas.length > 0 && <div className="flood-area-picker"><span>Official flood areas</span><button type="button" className={!focusedFloodAreaId ? "active" : ""} onClick={() => setFocusedFloodAreaId(null)}>All areas</button>{officialFloodAreas.map((event, index) => <button type="button" className={focusedFloodAreaId === event.id ? "active" : ""} onClick={() => setFocusedFloodAreaId(event.id)} key={event.id}>Area {index + 1}</button>)}</div>}{experience === "earth" ? <GlobalEarthMap points={providerPoints} currentLocation={currentLocation} searchedLocation={searchedLocation?.coordinates} /> : <GoogleSourceMap points={providerPoints} mode={mapMode} currentLocation={currentLocation} focusCurrentLocation={scope === "Near you"} searchedLocation={searchedLocation?.coordinates} />}{locationMessage && <p className="map-location-message">{locationMessage}</p>}<p><Icon name="shield" size="sm" />{experience === "earth" ? "Global Earth is a visual explorer. It uses the same verified data as the local map, not a separate alert source." : "Pins are used for point-only records. Filled shapes are provider-published boundaries; blue means an official extent without a provider severity rating."}</p></section>
    {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && <div className="world-map">
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
    </div>}
    {locationPromptOpen && <div className="map-location-overlay" role="dialog" aria-modal="true" aria-labelledby="location-prompt-title"><section className="map-location-dialog"><button type="button" className="map-location-close" onClick={() => setLocationPromptOpen(false)} aria-label="Close location prompt"><Icon name="close" /></button><h2 id="location-prompt-title">Use your current location?</h2><p>Your coordinates are used only in this browser to show nearby provider records and centre the map. MyanAid does not save or share them automatically.</p><button type="button" className="ai-primary" onClick={requestCurrentLocation}>Allow location request <Icon name="shield" size="sm" /></button><button type="button" className="map-city-choice" onClick={() => { setLocationPromptOpen(false); setScope("Saved locations"); setLocationMessage("Choose a saved city from your Profile. MyanAid will not estimate coordinates from a city name."); }}>Choose a city instead <Icon name="map" size="sm" /></button></section></div>}
  </main>;
}

function AlertsView({ onAlert }: { onAlert: (alert: AlertData) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All alerts");
  const [refreshing, setRefreshing] = useState(false);
  const visibleAlerts = [localAlert, ...alerts].filter((alert) => `${alert.title} ${alert.location} ${alert.source}`.toLowerCase().includes(query.toLowerCase())).filter((alert) => filter === "All alerts" || (filter === "Flood & water" && alert.icon === "flood") || (filter === "Storm & weather" && ["rain", "storm"].includes(alert.icon)) || (filter === "Earthquake" && alert.icon === "earthquake"));
  const refreshAlerts = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 700);
  };
  return <main className="inner-page content reference-screen alerts-reference"><div className="page-heading"><h1>Alerts</h1><button type="button" className={`refresh-button ${refreshing ? "is-refreshing" : ""}`} onClick={refreshAlerts} disabled={refreshing} aria-live="polite"><Icon name="refresh" size="sm" /><span>{refreshing ? "Refreshing…" : "Refresh"}</span></button></div><label className="reference-search"><Icon name="search" size="sm" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search place, event or source" /></label><div className="reference-filter-row">{["All alerts", "Flood & water", "Storm & weather", "Earthquake"].map((item) => <button type="button" className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="results-row"><span>{visibleAlerts.length} updates</span><span>{refreshing ? "Checking updates…" : "Updated just now"}</span></div><div className="stacked-alerts">{visibleAlerts.map((a) => <Action className={`list-alert tone-${a.tone}`} key={a.id} onClick={() => onAlert(a)}><div className="alert-symbol"><Icon name={a.icon} /></div><div className="list-alert-copy"><div className="list-topline"><span className={`severity-label tone-${a.tone}`}>{a.severity}</span></div><h3>{a.title}</h3><p><Icon name="location" size="sm" />{a.location}</p><div className="alert-summary">{a.summary}</div><div className="source-line"><strong>{a.source}</strong></div><strong className="view-details">View details <Icon name="arrow" size="sm" /></strong></div></Action>)}</div></main>;
}

type PublicShelter = { id: string; name: string; latitude: number; longitude: number; shelterType: string; displayStatus: string; sourceStatus: string | null; source: string; sourceUrl: string; address: string; reportedCapacity: number | null; details: string; hazardSuitability: string; sourceUpdatedAt: string | null; distanceKm: number };

type FamilyPlace = { id: string; label: string; location: string };

type FamilyGroupMember = { id: string; displayName: string; sharingEnabled: boolean };
type FamilySharedLocation = { id: string; latitude: number; longitude: number; accuracy: number; updatedAt: Date | null; expiresAt: Date | null };
type FamilySavedPlace = { id: string; label: string; address: string; latitude: number; longitude: number };

function FamilyPlanJourney({ planLocation, weather, onAskCompanion, user, onSignIn, mascotId }: { planLocation: string; weather: LiveWeather | null; onAskCompanion: (prompt: string) => void; user: User | null; onSignIn: () => void; mascotId: MascotId }) {
  const mascot = findMascot(mascotId);
  const [members, setMembers] = useState<FamilyPlace[]>([]);
  const [draft, setDraft] = useState("");
  const [liveSharing, setLiveSharing] = useState(false);
  const [livePosition, setLivePosition] = useState<SourceCoordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("Location sharing is off.");
  const [familyId, setFamilyId] = useState("");
  const [familyMembers, setFamilyMembers] = useState<FamilyGroupMember[]>([]);
  const [sharedLocations, setSharedLocations] = useState<FamilySharedLocation[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<FamilySavedPlace[]>([]);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeCandidate, setPlaceCandidate] = useState<FamilySavedPlace | null>(null);
  const [placeSearchMessage, setPlaceSearchMessage] = useState("");
  const [familyMapOpen, setFamilyMapOpen] = useState(false);
  const [familyBusy, setFamilyBusy] = useState(false);
  const [pendingInvite, setPendingInvite] = useState("");
  const [plan, setPlan] = useState({ nearby: "", backup: "", contact: "", checkIn: "I will text my family when it is safe.", needs: "" });
  const [reviewed, setReviewed] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastSentLocation = useRef<{ at: number; latitude: number; longitude: number } | null>(null);
  const prepared = [plan.nearby, plan.backup, plan.contact, plan.checkIn, plan.needs].filter(Boolean).length;
  const suggestions = [planLocation, "Bangkok, Thailand", "Yangon, Myanmar", "Mandalay, Myanmar", "Chiang Mai, Thailand"].filter((place, index, list) => list.indexOf(place) === index && place.toLowerCase().includes(draft.trim().toLowerCase())).slice(0, 5);
  const planText = `Family safety plan\nHome: ${planLocation}\nLive sharing: ${liveSharing ? "On from this device while MyanAid is open" : "Off"}\nNearby meeting place: ${plan.nearby || "Not set"}\nBackup meeting place: ${plan.backup || "Not set"}\nOut-of-area contact: ${plan.contact || "Not set"}\nCheck-in: ${plan.checkIn || "Not set"}\nHousehold needs: ${plan.needs || "Not set"}`;
  useEffect(() => {
    try { setPendingInvite(new URLSearchParams(window.location.search).get("familyInvite") || ""); } catch { /* no invitation in this session */ }
  }, []);
  useEffect(() => {
    if (!user || !db) { setFamilyId(""); return; }
    return onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const profile = snapshot.data();
      setFamilyId(typeof profile?.familyGroupId === "string" ? profile.familyGroupId : "");
    });
  }, [user]);
  useEffect(() => {
    if (!familyId || !db) { setFamilyMembers([]); setSharedLocations([]); setSavedPlaces([]); return; }
    const unsubscribeMembers = onSnapshot(collection(db, "familyGroups", familyId, "members"), (snapshot) => setFamilyMembers(snapshot.docs.map((entry) => ({ id: entry.id, displayName: typeof entry.data().displayName === "string" ? entry.data().displayName : "Family member", sharingEnabled: entry.data().sharingEnabled === true }))));
    const unsubscribeLocations = onSnapshot(collection(db, "familyGroups", familyId, "locations"), (snapshot) => setSharedLocations(snapshot.docs.flatMap((entry) => {
      const data = entry.data();
      const latitude = typeof data.latitude === "number" ? data.latitude : null;
      const longitude = typeof data.longitude === "number" ? data.longitude : null;
      if (latitude === null || longitude === null) return [];
      const toDate = (value: unknown) => value && typeof (value as { toDate?: unknown }).toDate === "function" ? (value as { toDate: () => Date }).toDate() : null;
      return [{ id: entry.id, latitude, longitude, accuracy: typeof data.accuracy === "number" ? data.accuracy : 0, updatedAt: toDate(data.updatedAt), expiresAt: toDate(data.expiresAt) }];
    })));
    const unsubscribePlaces = onSnapshot(collection(db, "familyGroups", familyId, "places"), (snapshot) => setSavedPlaces(snapshot.docs.flatMap((entry) => {
      const data = entry.data();
      return typeof data.label === "string" && typeof data.latitude === "number" && typeof data.longitude === "number" ? [{ id: entry.id, label: data.label, address: typeof data.address === "string" ? data.address : data.label, latitude: data.latitude, longitude: data.longitude }] : [];
    })));
    return () => { unsubscribeMembers(); unsubscribeLocations(); unsubscribePlaces(); };
  }, [familyId]);
  useEffect(() => () => { if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current); }, []);
  const stopLiveSharing = () => {
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null; setLiveSharing(false); lastSentLocation.current = null;
    if (familyId && functions) void httpsCallable<{ familyId: string; enabled: boolean }, { enabled: boolean }>(functions, "setFamilyLocationSharing")({ familyId, enabled: false }).catch(() => undefined);
    setLocationMessage("Location sharing is off. Your shared position was removed from the family group.");
  };
  const startLiveSharing = () => {
    const sharingFunctions = functions;
    if (!user) { setLocationMessage("Sign in from Profile before you can create or join a family group."); return; }
    if (!familyId || !sharingFunctions) { setLocationMessage("Create or join a family group before sharing a live location."); return; }
    if (!navigator.geolocation) { setLocationMessage("This browser does not support live location sharing."); return; }
    setLocationMessage("Requesting permission for this device…");
    watchId.current = navigator.geolocation.watchPosition((position) => {
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const previous = lastSentLocation.current;
      const moved = !previous || Math.abs(previous.latitude - next.latitude) > 0.0009 || Math.abs(previous.longitude - next.longitude) > 0.0009;
      if (previous && !moved && Date.now() - previous.at < 30000) return;
      lastSentLocation.current = { ...next, at: Date.now() };
      void httpsCallable<{ familyId: string; latitude: number; longitude: number; accuracy: number }, { expiresAt: string }>(sharingFunctions, "updateFamilyLocation")({ familyId, ...next, accuracy: position.coords.accuracy }).then(() => {
        setLivePosition(next);
        setLiveSharing(true);
        setLocationMessage(`Sharing with your family · accuracy about ${Math.round(position.coords.accuracy)} m · expires 15 minutes after the last update`);
      }).catch(() => setLocationMessage("MyanAid could not update your shared location. Check your connection and try again."));
    }, () => { setLiveSharing(false); setLocationMessage("Location permission was not granted. You can still create the family plan."); }, { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 });
  };
  const createFamilyGroup = async () => {
    if (!user || !functions) { setLocationMessage("Sign in from Profile before creating a family group."); return; }
    setFamilyBusy(true);
    try {
      const result = await httpsCallable<{ name: string }, { familyId: string }>(functions, "createFamilyGroup")({ name: "My family" });
      setFamilyId(result.data.familyId); setLocationMessage("Family group ready. Invite each person to join with their own MyanAid account.");
    } catch { setLocationMessage("MyanAid could not create the family group. Please try again."); } finally { setFamilyBusy(false); }
  };
  const inviteFamily = async () => {
    if (!familyId || !functions) { await createFamilyGroup(); return; }
    setFamilyBusy(true);
    try {
      const result = await httpsCallable<{ familyId: string }, { inviteId: string; expiresAt: string }>(functions, "createFamilyInvite")({ familyId });
      const url = `${window.location.origin}${window.location.pathname}?familyInvite=${encodeURIComponent(result.data.inviteId)}`;
      const text = "Join my MyanAid Family Safety Plan. Sign in, accept this private invitation, then choose whether to share your live location.";
      if (navigator.share) await navigator.share({ title: "Join my MyanAid family group", text, url });
      else await navigator.clipboard?.writeText(`${text}\n${url}`);
      setLocationMessage("Private invitation link ready. It expires in seven days and does not share anyone’s location by itself.");
    } catch { setLocationMessage("MyanAid could not create the invitation. Only the group owner can invite people."); } finally { setFamilyBusy(false); }
  };
  const acceptInvitation = async () => {
    if (!user) { onSignIn(); return; }
    if (!functions || !pendingInvite) { setLocationMessage("The invitation link is no longer available. Please open it again."); return; }
    setFamilyBusy(true);
    try {
      const result = await httpsCallable<{ inviteId: string }, { familyId: string }>(functions, "acceptFamilyInvite")({ inviteId: pendingInvite });
      setFamilyId(result.data.familyId); setPendingInvite(""); window.history.replaceState({}, "", window.location.pathname);
      setLocationMessage("You joined the family group. You choose separately whether to start sharing your live location.");
    } catch { setLocationMessage("This invitation could not be accepted. It may have expired or the group may be full."); } finally { setFamilyBusy(false); }
  };
  const searchSavedPlace = async () => {
    const query = placeQuery.trim();
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!query) return;
    if (!apiKey) { setPlaceSearchMessage("Google Maps search is not configured in this build."); return; }
    const isGoogleMapsLink = /^https:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|(?:www\.)?(?:maps\.)?google\.com\/maps)/i.test(query);
    setPlaceSearchMessage("Searching Google Maps…");
    try {
      if (isGoogleMapsLink) {
        if (!functions || !user) { setPlaceSearchMessage("Sign in before saving an exact Google Maps pin."); return; }
        const resolved = await httpsCallable<{ url: string }, { matched: boolean; label: string; address: string; latitude: number; longitude: number }>(functions, "resolveFamilyGoogleMapsLink")({ url: query });
        if (!resolved.data.matched) throw new Error("No exact pin");
        setPlaceCandidate({ id: "candidate", label: resolved.data.label, address: resolved.data.address, latitude: resolved.data.latitude, longitude: resolved.data.longitude });
        setPlaceSearchMessage("Exact Google Maps pin found. Review it on the map, then save it for your family.");
        return;
      }
      const google = await loadGoogleMaps(apiKey);
      const result = await new Promise<GoogleGeocoderResult | null>((resolve) => new google.maps.Geocoder().geocode({ address: query }, (results, status) => resolve(status === "OK" ? results?.[0] ?? null : null)));
      const location = result?.geometry?.location;
      if (!location) { setPlaceCandidate(null); setPlaceSearchMessage("No Google Maps location matched that search. Try a more specific city, address, landmark, or Google Maps place name."); return; }
      setPlaceCandidate({ id: "candidate", label: query, address: query, latitude: location.lat(), longitude: location.lng() });
      setPlaceSearchMessage("Google Maps match found. Review the pin, then save it for your family.");
    } catch { setPlaceCandidate(null); setPlaceSearchMessage(isGoogleMapsLink ? "MyanAid could not read an exact pin from that link. Use a Google Maps dropped-pin link, or search by place name instead." : "Google Maps search is unavailable right now. Please try again."); }
  };
  const savePlace = async () => {
    if (!user) { onSignIn(); return; }
    if (!familyId || !functions || !placeCandidate) { setPlaceSearchMessage("Create or join a family group, then choose a map location to save."); return; }
    setFamilyBusy(true);
    try {
      await httpsCallable<{ familyId: string; label: string; address: string; latitude: number; longitude: number }, FamilySavedPlace>(functions, "saveFamilyMonitoredPlace")({ familyId, ...placeCandidate });
      setPlaceQuery(""); setPlaceCandidate(null); setPlaceSearchMessage("Saved for this family group. Everyone in the group can view its exact map pin.");
    } catch { setPlaceSearchMessage("MyanAid could not save this monitored place. Please try again."); } finally { setFamilyBusy(false); }
  };
  const addMember = (location: string) => {
    if (!location || members.some((member) => member.location === location) || members.length >= 4) return;
    setMembers((current) => [...current, { id: `${Date.now()}-${location}`, label: "Family member", location }]); setDraft("");
  };
  const sharePlan = async () => { await inviteFamily(); };
  const freshLocations = sharedLocations.filter((location) => !location.expiresAt || location.expiresAt.getTime() > Date.now());
  const monitored = familyMembers.map((member) => ({ ...member, location: freshLocations.find((location) => location.id === member.id) }));
  const familyMapPoints: Array<SourceFeedItem & { coordinates: SourceCoordinates }> = [
    ...freshLocations.map((location) => ({ id: `member-${location.id}`, title: familyMembers.find((member) => member.id === location.id)?.displayName ?? "Family member", category: "Family live location", severity: "Opted in", location: "Live family location", occurredAt: "Current", updatedAt: location.updatedAt?.toISOString() ?? "Current", url: "", source: "MyanAid family group", summary: "Shared by this family member", coordinates: { latitude: location.latitude, longitude: location.longitude } })),
    ...savedPlaces.map((place) => ({ id: `place-${place.id}`, title: place.label, category: "Family saved place", severity: "Saved", location: place.address, occurredAt: "Saved", updatedAt: "Saved", url: "", source: "MyanAid family group", summary: "Saved family monitoring location", coordinates: { latitude: place.latitude, longitude: place.longitude } })),
  ];
  return <section className="family-journey">
    <section className="family-plan-hero"><div className="preparedness-panel-icon"><Preparedness3DIcon name="heart" /></div><div><span className="family-eyebrow">Family safety plan</span><h2>Know your next step, together.</h2><p>{prepared} of 5 plan details ready</p></div><div className="family-plan-progress"><i style={{ width: `${prepared / 5 * 100}%` }} /></div></section>
    <section className="family-live-card"><header><div><span className="family-eyebrow">Live location sharing</span><h2>Stay connected during changing conditions</h2></div><span className={liveSharing ? "live-status active" : "live-status"}><i />{liveSharing ? "Sharing live" : "Not sharing"}</span></header><p>Each person must sign in, join this private family group, and choose to share. Location updates only while MyanAid is open and expire 15 minutes after the last update.</p>{pendingInvite && <><p className="family-invite-notice">You received a private family invitation. Sign in or create an account to review and join this group.</p><button type="button" className="family-invite-button family-join-button" onClick={() => void acceptInvitation()} disabled={familyBusy}><Icon name="check" size="sm" />{user ? "Join family group" : "Sign in to join"}</button></>}<div className="live-sharing-actions"><button type="button" className={liveSharing ? "live-share-button active" : "live-share-button"} onClick={liveSharing ? stopLiveSharing : startLiveSharing} disabled={familyBusy}><Icon name={liveSharing ? "close" : "location"} size="sm" />{liveSharing ? "Stop live sharing" : "Start live sharing"}</button><button type="button" className="family-invite-button" onClick={() => user ? void sharePlan() : onSignIn()} disabled={familyBusy}><Icon name="share" size="sm" />{familyId ? "Invite family" : "Create family group"}</button></div><small><Icon name="shield" size="sm" />{locationMessage}</small></section>
    <section className="family-monitoring"><header><div><h2>Family location monitoring</h2><p>{familyMembers.length}/5 signed-in members · {savedPlaces.length} saved places</p></div><button type="button" onClick={() => setFamilyMapOpen(true)} disabled={!familyMapPoints.length}>View map</button></header><div className="family-overview"><Icon name="sparkle" /><div><strong>Check before you travel</strong><p>Shared pins show only opted-in family members. MyanAid cannot determine whether a person is inside or outside a danger zone unless an authority publishes the relevant boundary.</p></div><button type="button" onClick={() => onAskCompanion(`Review the family safety plan for ${planLocation} and explain any current risks.`)}>Ask {mascot.name} to review</button></div><div className="family-member-list">{monitored.length ? monitored.map((member) => <article className="family-location-card" key={member.id}><div><h3>{member.displayName}{member.id === user?.uid ? " (you)" : ""}</h3><p>{member.location ? "Live location shared with this family" : "No current location shared"}</p></div><span className={member.location ? "member-status sharing" : "member-status"}>{member.location ? "Live location updating" : member.sharingEnabled ? "Waiting for location" : "Not sharing"}</span><p className="family-signal">{member.location ? `Updated ${member.location.updatedAt ? member.location.updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "just now"} · accuracy about ${Math.round(member.location.accuracy)} m` : "This person has not opted in to location sharing."}</p><strong>{weather ? `${weather.temperature.toFixed(1)}°C` : "—"}</strong><small>{weather ? `${weather.rain} mm rain · ${weather.wind} km/h wind · modelled local weather` : "Weather data unavailable"}</small></article>) : <article className="family-location-card"><h3>No family group yet</h3><p>Create a group, send a private invitation link, and ask each person to join with their own account.</p></article>}</div></section>
    <section className="family-add-location"><header><div><h2>Save a monitored place</h2><p>Search Google Maps worldwide by city, address, landmark, place name, or paste a Google Maps dropped-pin link. Saved pins are visible to this family group.</p></div><span>{savedPlaces.length}/12 saved</span></header><label>Google Maps place, address, or exact pin link<input value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="e.g. Shwedagon Pagoda, Yangon or maps.app.goo.gl/..." /></label><button type="button" className="family-add-button" onClick={() => void searchSavedPlace()} disabled={!placeQuery.trim() || familyBusy}>Search Google Maps</button>{placeSearchMessage && <p className="family-signal">{placeSearchMessage}</p>}{placeCandidate && <div className="family-location-results"><button type="button" onClick={() => setFamilyMapOpen(true)}><Icon name="map" size="sm" /><span><strong>{placeCandidate.label}</strong><small>Exact Google Maps pin selected</small></span><Icon name="arrow" size="sm" /></button><button type="button" className="family-add-button" onClick={() => void savePlace()} disabled={familyBusy}>Save this location for my family</button></div>}{savedPlaces.length > 0 && <div className="family-location-results">{savedPlaces.map((place) => <button type="button" key={place.id} onClick={() => setFamilyMapOpen(true)}><Icon name="location" size="sm" /><span><strong>{place.label}</strong><small>{place.address}</small></span><Icon name="map" size="sm" /></button>)}</div>}</section>
    <section className="family-maya-help"><MascotIcon mascotId={mascotId} /><div><span>Plan with {mascot.name}</span><h2>Build the plan in the right order</h2><p>Add places, agree how to reconnect, then share a reviewed copy.</p></div><button type="button" onClick={() => onAskCompanion(`Help me complete a family safety plan for ${planLocation}.`)}>Help me start</button><button type="button" onClick={() => setReviewOpen(true)}>Review my plan</button></section>
    <section className="family-step"><span>1</span><div><h2>Choose your meeting places</h2><p>Agree on a nearby place and a backup outside your neighbourhood.</p><label>Nearby meeting place<input value={plan.nearby} onChange={(event) => setPlan((current) => ({ ...current, nearby: event.target.value }))} placeholder="e.g. Main entrance" /></label><label>Backup meeting place<input value={plan.backup} onChange={(event) => setPlan((current) => ({ ...current, backup: event.target.value }))} placeholder="e.g. Community centre" /></label></div></section>
    <section className="family-step"><span>2</span><div><h2>Decide how to reconnect</h2><p>Choose one out-of-area contact and one simple check-in message.</p><label>Out-of-area contact<input value={plan.contact} onChange={(event) => setPlan((current) => ({ ...current, contact: event.target.value }))} placeholder="Phone number or name" /></label><label>Check-in arrangement<input value={plan.checkIn} onChange={(event) => setPlan((current) => ({ ...current, checkIn: event.target.value }))} /></label></div></section>
    <section className="family-step"><span>3</span><div><h2>Include everyone’s needs</h2><p>Think about children, mobility, medicines and pets.</p><label>Household needs & responsibilities<textarea value={plan.needs} onChange={(event) => setPlan((current) => ({ ...current, needs: event.target.value }))} placeholder="Who brings food, medicine, documents, and pet supplies?" /></label><button type="button" className={`family-review-check ${reviewed ? "checked" : ""}`} onClick={() => setReviewed((value) => !value)}><Icon name="check" size="sm" />We have reviewed this plan together</button></div></section>
    <section className="family-share"><h2>Keep everyone in the loop</h2><p>Review the plan first, then share a copy with the people in it.</p><button type="button" className="family-share-primary" onClick={() => setReviewOpen(true)}>Review and share <Icon name="share" size="sm" /></button><button type="button" onClick={() => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([planText], { type: "text/plain" })); link.download = "myanaid-family-safety-plan.txt"; link.click(); URL.revokeObjectURL(link.href); }}>Download copy <Icon name="arrow" size="sm" /></button></section>
    {reviewOpen && <div className="overlay family-review-overlay" role="dialog" aria-modal="true" aria-labelledby="family-review-title" onClick={() => setReviewOpen(false)}><section className="family-review-dialog" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setReviewOpen(false)} aria-label="Close review"><Icon name="close" size="sm" /></button><span className="family-eyebrow">Ready to share</span><h2 id="family-review-title">Review your family plan</h2><p>Confirm these details with your household before you share them.</p><pre>{planText}</pre><button type="button" onClick={() => void sharePlan()}>Share this plan <Icon name="share" size="sm" /></button></section></div>}
    {familyMapOpen && <div className="overlay family-review-overlay" role="dialog" aria-modal="true" aria-labelledby="family-map-title" onClick={() => setFamilyMapOpen(false)}><section className="family-review-dialog family-map-dialog" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setFamilyMapOpen(false)} aria-label="Close family map"><Icon name="close" size="sm" /></button><span className="family-eyebrow">Private family map</span><h2 id="family-map-title">Shared and saved locations</h2><p>Only group members can see these pins. A map pin is a location reference, not a safe-route or danger-zone determination.</p><div className="family-map-frame"><GoogleSourceMap points={placeCandidate ? [...familyMapPoints, { id: "candidate-preview", title: placeCandidate.label, category: "Family place preview", severity: "Preview", location: placeCandidate.address, occurredAt: "Now", updatedAt: "Now", url: "", source: "Google Maps search", summary: "Preview before saving", coordinates: { latitude: placeCandidate.latitude, longitude: placeCandidate.longitude } }] : familyMapPoints} searchedLocation={placeCandidate ? { latitude: placeCandidate.latitude, longitude: placeCandidate.longitude } : undefined} focusZoom={placeCandidate ? 15 : 11} /></div></section></div>}
  </section>;
}

function PreparednessView({ locationLabel, savedLocations, monitoring, sourceMonitoring, currentCoordinates, requestCurrentLocation, onAskCompanion, selectedTab, user, onSignIn, mascotId }: { locationLabel: string; savedLocations: SavedLocation[]; monitoring: LiveMonitoringState; sourceMonitoring: SourceMonitoringState; currentCoordinates: SourceCoordinates | null; requestCurrentLocation: () => void; onAskCompanion: (prompt: string) => void; selectedTab: "kit" | "family" | "shelters" | "aid"; user: User | null; onSignIn: () => void; mascotId: MascotId }) {
  const checklist = ["Drinking water", "Shelf-stable food", "Essential medicines", "First-aid supplies", "Torch & spare batteries", "Charged power bank", "Important documents", "Hygiene supplies", "Cash & emergency contacts"];
  const tabs: Array<{ id: "kit" | "familyJourney" | "shelters" | "aid"; title: string; icon: PreparednessIconName; description: string }> = [
    { id: "kit", title: "Emergency checklist", icon: "plan", description: "Build your essential kit" },
    { id: "familyJourney", title: "Family safety plan", icon: "heart", description: "Keep everyone connected" },
    { id: "shelters", title: "Find public shelters", icon: "shelter", description: "Explore nearby public places" },
    { id: "aid", title: "First-aid guidance", icon: "firstAid", description: "Respond calmly to common risks" },
  ];
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"] | "family">(selectedTab === "family" ? "familyJourney" : selectedTab);
  useEffect(() => setActiveTab(selectedTab === "family" ? "familyJourney" : selectedTab), [selectedTab]);
  const [checked, setChecked] = useState<string[]>(checklist);
  const [locationSharing, setLocationSharing] = useState(false);
  const [publicShelters, setPublicShelters] = useState<PublicShelter[]>([]);
  const [sheltersLoading, setSheltersLoading] = useState(false);
  const [shelterMessage, setShelterMessage] = useState("");
  const [shelterMap, setShelterMap] = useState<{ title: string; query: string; coordinates?: SourceCoordinates; nearbyQuery?: string } | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyPlaceStatus, setNearbyPlaceStatus] = useState<string>("");
  const [familyPlan, setFamilyPlan] = useState({ nearby: "", backup: "", contact: "", checkIn: "I will text my family when it is safe.", needs: "" });
  const [familyReviewed, setFamilyReviewed] = useState(false);
  const [familySaved, setFamilySaved] = useState(false);
  const [familyLocations, setFamilyLocations] = useState<string[]>([]);
  const [familyLocationDraft, setFamilyLocationDraft] = useState("");
  const [reviewPlanOpen, setReviewPlanOpen] = useState(false);
  const planLocation = savedLocations[0]?.city ?? (locationLabel.startsWith("Current location") ? locationLabel : "your saved location");
  const familyPlanText = `Family safety plan\nHome: ${familyLocations[0] || planLocation}\nNearby meeting place: ${familyPlan.nearby || "Not set"}\nBackup meeting place: ${familyPlan.backup || "Not set"}\nOut-of-area contact: ${familyPlan.contact || "Not set"}\nCheck-in: ${familyPlan.checkIn || "Not set"}\nHousehold needs: ${familyPlan.needs || "Not set"}`;
  const saveFamilyPlan = () => { try { window.localStorage.setItem("myanaid-family-plan", JSON.stringify({ familyPlan, familyReviewed, familyLocations })); } catch { /* retain the plan in this session */ } setFamilySaved(true); };
  const addFamilyLocation = () => { const location = familyLocationDraft.trim(); if (!location || familyLocations.includes(location) || familyLocations.length >= 5) return; setFamilyLocations((current) => [...current, location]); setFamilyLocationDraft(""); };
  const weather = monitoring.weather;
  const condition = weather ? weatherLabel(weather.code) : "current conditions";
  const risk = weather && (weather.rain >= 10 || weather.wind >= 35) ? "heavy rain or strong wind" : sourceMonitoring.airQuality && sourceMonitoring.airQuality.usAqi >= 151 ? "unhealthy air quality" : "changing weather";
  const verifiedShelters = sourceMonitoring.feeds.flatMap((feed) => feed.events.filter((event) => /shelter|evacuation centre|evacuation center|public service/i.test(`${event.title} ${event.category} ${event.summary ?? ""}`)).map((event) => ({ ...event, provider: feed.provider }))).slice(0, 4);
  const downloadChecklist = () => {
    const content = ["MyanAid emergency checklist", `Prepared for: ${planLocation}`, "", ...checklist.map((item) => `- [${checked.includes(item) ? "x" : " "}] ${item}`), "", "Follow official local authority instructions during emergencies."].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    link.download = "myanaid-emergency-checklist.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const showShelterMap = (place: string, shelter?: PublicShelter) => {
    setNearbyPlaces([]);
    setNearbyPlaceStatus(shelter ? "" : "SEARCHING");
    setShelterMap({
      title: shelter ? shelter.name : `${place} near ${planLocation}`,
      query: shelter ? `${shelter.latitude},${shelter.longitude}` : `${place} near ${planLocation}`,
      ...(shelter ? { coordinates: { latitude: shelter.latitude, longitude: shelter.longitude } } : { nearbyQuery: place }),
    });
  };
  useEffect(() => {
    if (!shelterMap?.nearbyQuery || !currentCoordinates || !functions) return;
    let active = true;
    setNearbyPlaceStatus("SEARCHING");
    const findFacilities = httpsCallable<{ latitude: number; longitude: number; category: string }, { facilities: NearbyPlace[] }>(functions, "findNearbyFacilities");
    void findFacilities({ latitude: currentCoordinates.latitude, longitude: currentCoordinates.longitude, category: shelterMap.nearbyQuery }).then((result) => {
      if (!active) return;
      setNearbyPlaces(result.data.facilities);
      setNearbyPlaceStatus("OK");
    }).catch((error) => {
      console.error("Nearby facility lookup failed", error);
      if (active) setNearbyPlaceStatus("FACILITY_SEARCH_UNAVAILABLE");
    });
    return () => { active = false; };
  }, [currentCoordinates, shelterMap?.nearbyQuery]);
  const navigateWithGoogleMaps = () => {
    if (!shelterMap) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shelterMap.query)}`, "_blank", "noopener,noreferrer");
  };
  const navigateToPlace = (place: NearbyPlace) => {
    const origin = currentCoordinates ? `&origin=${currentCoordinates.latitude},${currentCoordinates.longitude}` : "";
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.latitude},${place.longitude}`)}${origin}&travelmode=driving`, "_blank", "noopener,noreferrer");
  };
  const findPublicShelters = async () => {
    if (!currentCoordinates) {
      requestCurrentLocation();
      setShelterMessage("Allow location access, then select Find verified shelters again.");
      return;
    }
    if (!functions) { setShelterMessage("Shelter search is unavailable until Firebase is configured."); return; }
    setSheltersLoading(true); setShelterMessage("");
    try {
      const findShelters = httpsCallable<{ latitude: number; longitude: number }, { shelters: PublicShelter[]; sourceErrors?: string[]; notice: string }>(functions, "findPublicShelters");
      const result = await findShelters(currentCoordinates);
      setPublicShelters(result.data.shelters);
      setShelterMessage(result.data.shelters.length ? result.data.notice : "No matching records were returned for this small area. You can still explore public-place candidates below.");
    } catch (error) {
      console.error("Public shelter lookup failed", error);
      setShelterMessage("Shelter sources are temporarily unavailable. Try again shortly or use official local guidance.");
    } finally { setSheltersLoading(false); }
  };
  const sharePlan = async () => {
    const text = `MyanAid family safety plan for ${planLocation}: agree on a meeting place, an out-of-area contact, and how to check in.`;
    if (navigator.share) await navigator.share({ title: "MyanAid family safety plan", text });
    else await navigator.clipboard?.writeText(text);
  };
  return <main className="inner-page content reference-screen preparedness-reference"><div className="page-heading"><div><h1>Preparedness</h1><p>Make a plan before you need it.</p></div></div>
    <section className="preparedness-tabs" aria-label="Preparedness categories">{tabs.map((tab) => <button type="button" key={tab.id} className={`preparedness-tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}><span className="shortcut-icon shortcut-icon-3d"><Preparedness3DIcon name={tab.icon} /></span><span><strong>{tab.title}</strong><small>{tab.description}</small></span></button>)}</section>
    {activeTab === "familyJourney" && <FamilyPlanJourney planLocation={planLocation} weather={weather} onAskCompanion={onAskCompanion} user={user} onSignIn={onSignIn} mascotId={mascotId} />}
    {activeTab === "kit" && <><button type="button" className="download-checklist" onClick={downloadChecklist}>Download checklist <Icon name="plan" size="sm" /></button><section className="kit-checklist"><div className="kit-header"><div><h2>Emergency kit</h2><p>Adapt these essentials to your household and local authority advice.</p></div><strong>{Math.round(checked.length / checklist.length * 100)}%<small>prepared</small></strong></div><div className="kit-progress"><i style={{ width: `${checked.length / checklist.length * 100}%` }} /></div>{checklist.map((item) => <button type="button" key={item} className="kit-row" onClick={() => setChecked((items) => items.includes(item) ? items.filter((entry) => entry !== item) : [...items, item])}><span className={checked.includes(item) ? "checked" : ""}><Icon name="check" size="sm" /></span><strong>{item}</strong><small>{checked.includes(item) ? "Ready" : "To prepare"}</small></button>)}</section></>}
    {activeTab === "family" && <section className="family-plan"><section className="family-plan-hero"><div className="preparedness-panel-icon"><Preparedness3DIcon name="heart" /></div><div><h2>Know your next step, together.</h2><p>{[familyPlan.nearby, familyPlan.backup, familyPlan.contact, familyPlan.checkIn, familyPlan.needs].filter(Boolean).length} of 5 details ready</p></div><div className="family-plan-progress"><i style={{ width: `${[familyPlan.nearby, familyPlan.backup, familyPlan.contact, familyPlan.checkIn, familyPlan.needs].filter(Boolean).length / 5 * 100}%` }} /></div></section><section className="family-monitoring"><header><h2>Family location monitoring</h2><button type="button" onClick={() => setFamilySaved(false)}>Refresh all</button></header><div className="family-overview"><Icon name="sparkle" /><div><strong>Maya’s family overview</strong><p>Connected feeds show the latest available weather and earthquake data for your monitored locations. This is not an all-clear.</p></div><button type="button" onClick={() => onAskCompanion(`Review my family safety plan for ${familyLocations[0] || planLocation}.`)}>Ask AI to review</button></div><article className="family-location-card"><div><h3>Family’s home</h3><p>{familyLocations[0] || planLocation}</p></div><button type="button" aria-label="Remove monitored location" onClick={() => setFamilyLocations((current) => current.slice(1))}><Icon name="close" size="sm" /></button><span>Monitoring</span><p className="family-signal">No elevated signals in the connected feeds.</p><strong>{weather ? `${weather.temperature.toFixed(1)}°C` : "—"}</strong><small>{weather ? `${weather.rain} mm rain · ${weather.wind} km/h wind · Open-Meteo modelled weather` : "Weather data unavailable"}</small><hr /><b>No matching earthquake observations</b><small>USGS · recent event feed</small></article></section><section className="family-add-location"><header><div><h2>Add a monitored location</h2><p>Search for the family member’s city or region.</p></div><span>{familyLocations.length + 1}/5 saved</span></header><label>Location label<input value={familyLocationDraft} onChange={(event) => setFamilyLocationDraft(event.target.value)} placeholder="e.g. Parents’ home" /></label><div className="family-location-suggestions">{[planLocation, "Yangon", "Mandalay", "Chiang Mai"].filter((city, index, list) => list.indexOf(city) === index).map((city) => <button type="button" key={city} onClick={() => setFamilyLocationDraft(city)}>{city}<small>{city === planLocation ? "Saved location" : "Available city"}</small></button>)}</div><button type="button" className="family-add-button" onClick={addFamilyLocation} disabled={!familyLocationDraft.trim() || familyLocations.length >= 5}>+ Monitor this location</button></section><section className="family-maya-help"><MascotIcon mascotId="maya" /><div><span>Plan with Maya</span><h2>A little help getting ready</h2><p>Get a starter checklist or spot missing steps.</p></div><button type="button" onClick={() => onAskCompanion(`Help me complete a family safety plan for ${planLocation}.`)}>Help me start</button><button type="button" onClick={() => setReviewPlanOpen(true)}>Review my plan</button></section><section className="family-step"><span>1</span><div><h2>Choose your meeting places</h2><p>Agree on a nearby place and a backup outside your neighbourhood.</p><label>Nearby meeting place<input value={familyPlan.nearby} onChange={(event) => setFamilyPlan((current) => ({ ...current, nearby: event.target.value }))} placeholder="e.g. Yangon's main entrance" /></label><label>Backup meeting place<input value={familyPlan.backup} onChange={(event) => setFamilyPlan((current) => ({ ...current, backup: event.target.value }))} placeholder="e.g. Bangkok" /></label></div></section><section className="family-step"><span>2</span><div><h2>Decide how to reconnect</h2><p>Make sure everyone knows who to contact.</p><label>Out-of-area contact<input value={familyPlan.contact} onChange={(event) => setFamilyPlan((current) => ({ ...current, contact: event.target.value }))} placeholder="Phone number" /></label><label>Check-in arrangement<input value={familyPlan.checkIn} onChange={(event) => setFamilyPlan((current) => ({ ...current, checkIn: event.target.value }))} placeholder="How will you check in?" /></label></div></section><section className="family-step"><span>3</span><div><h2>Include everyone’s needs</h2><p>Think about children, mobility, medicines and pets.</p><label>Household needs & responsibilities<textarea value={familyPlan.needs} onChange={(event) => setFamilyPlan((current) => ({ ...current, needs: event.target.value }))} placeholder="Who brings food, medicine, documents, and pet supplies?" /></label><button type="button" className={`family-review-check ${familyReviewed ? "checked" : ""}`} onClick={() => setFamilyReviewed((checked) => !checked)}><Icon name="check" size="sm" />We have reviewed this plan together</button></div></section><button type="button" className="family-save-button" onClick={saveFamilyPlan}><Icon name="check" size="sm" />Save family plan</button>{familySaved && <p className="family-saved-note"><Icon name="shield" size="sm" />Saved on this device.</p>}<section className="family-share"><h2>Keep everyone in the loop</h2><p>Save your changes, then review a copy to share with your household.</p><button type="button" onClick={() => void sharePlan()}>Share plan <Icon name="heart" size="sm" /></button><button type="button" onClick={() => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([familyPlanText], { type: "text/plain" })); link.download = "myanaid-family-safety-plan.txt"; link.click(); URL.revokeObjectURL(link.href); }}>Download copy <Icon name="arrow" size="sm" /></button></section>{reviewPlanOpen && <div className="overlay family-review-overlay" role="dialog" aria-modal="true" onClick={() => setReviewPlanOpen(false)}><section className="family-review-dialog" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setReviewPlanOpen(false)} aria-label="Close review"><Icon name="close" size="sm" /></button><h2>Review your family plan</h2><p>This copy includes your saved meeting places and contact details.</p><pre>{familyPlanText}</pre><button type="button" onClick={() => void sharePlan()}>Share this copy <Icon name="heart" size="sm" /></button></section></div>}</section>}
    {activeTab === "shelters" && <section className="preparedness-panel"><div className="preparedness-panel-heading"><div className="preparedness-panel-icon"><Preparedness3DIcon name="shelter" /></div><div><span>Near your current location</span><h2>Public shelters</h2><p>Official sources are shown first; opening, capacity, and safe travel must always be confirmed locally.</p></div></div><button type="button" className="shelter-find-button" onClick={() => void findPublicShelters()} disabled={sheltersLoading}>{sheltersLoading ? "Searching nearby sources…" : currentCoordinates ? "Find verified shelters near me" : "Use my location to find shelters"}<Icon name={currentCoordinates ? "search" : "location"} size="sm" /></button>{publicShelters.length > 0 && <div className="public-shelter-list">{publicShelters.map((shelter) => <button type="button" key={shelter.id} onClick={() => showShelterMap("", shelter)}><Icon name={shelter.shelterType === "heat_relief_center" ? "sun" : "shelter"} size="sm" /><span><em className={`shelter-status ${shelter.displayStatus}`}>{shelter.displayStatus === "reported_open" ? "Reported open" : shelter.displayStatus === "designated_status_unknown" ? "Designated · opening unconfirmed" : "Status unavailable"}</em><strong>{shelter.name}</strong><small>{shelter.distanceKm} km · {shelter.source}{shelter.reportedCapacity ? ` · reported capacity ${shelter.reportedCapacity}` : ""}</small>{(shelter.address || shelter.hazardSuitability !== "Unknown") && <small>{shelter.address || shelter.hazardSuitability}</small>}</span><Icon name="arrow" size="sm" /></button>)}</div>}{verifiedShelters.length > 0 && <div className="verified-shelter-list">{verifiedShelters.map((place) => <a key={place.id} href={place.url} target="_blank" rel="noreferrer"><Icon name="shield" size="sm" /><span><strong>{place.title}</strong><small>{place.provider} · {place.location}</small></span><Icon name="arrow" size="sm" /></a>)}</div>}{!publicShelters.length && !verifiedShelters.length && <div className="shelter-empty"><Icon name="search" /><div><strong>Search nearby official and mapped shelter sources.</strong><p>Location access lets MyanAid query a small surrounding area instead of assuming a country-wide result is nearby.</p></div></div>}{shelterMessage && <p className="preparedness-note"><Icon name="alert" size="sm" />{shelterMessage}</p>}<div className="shelter-searches">{["Government school", "Hospital", "Monastery", "Church", "Community centre"].map((place) => <button type="button" key={place} onClick={() => showShelterMap(place)}><Icon name={place === "Hospital" ? "firstAid" : "shelter"} size="sm" />{place}<Icon name="arrow" size="sm" /></button>)}</div><p className="preparedness-note"><Icon name="alert" size="sm" />Public-place searches are candidates only, not verified emergency shelters.</p></section>}
    {shelterMap && <div className="overlay shelter-map-overlay" role="dialog" aria-modal="true" aria-labelledby="shelter-map-title" onClick={() => setShelterMap(null)}><section className="shelter-map-sheet" onClick={(event) => event.stopPropagation()}><header><div><span>In-app map</span><h2 id="shelter-map-title">{shelterMap.title}</h2></div><button type="button" className="shelter-map-close" onClick={() => setShelterMap(null)} aria-label="Close map"><Icon name="close" /></button></header><p>Explore the area here first. Check local authority guidance and contact a facility before travelling.</p>{!currentCoordinates && !shelterMap.coordinates && <button type="button" className="shelter-location-request" onClick={requestCurrentLocation}><Icon name="location" size="sm" />Use my current location for nearby results</button>}<div className="shelter-map-frame"><GoogleSourceMap points={EMPTY_SOURCE_POINTS} currentLocation={currentCoordinates} focusCurrentLocation={!shelterMap.coordinates && Boolean(currentCoordinates)} searchedLocation={shelterMap.coordinates} focusZoom={14} placeQuery={shelterMap.coordinates ? undefined : shelterMap.query} nearbySearchQuery={shelterMap.nearbyQuery} nearbyFacilities={nearbyPlaces} /></div>{shelterMap.nearbyQuery && <section className="nearby-place-results" aria-live="polite"><header><div><span>{currentCoordinates ? "Around your current location" : `Around ${planLocation}`}</span><strong>{nearbyPlaceStatus === "SEARCHING" ? "Finding nearby places…" : nearbyPlaces.length ? `${nearbyPlaces.length} nearby ${shelterMap.nearbyQuery.toLowerCase()} results` : "Nearby places"}</strong></div><i className="map-key"><b />Your location <b className="facility" />Facility</i></header>{nearbyPlaces.length > 0 ? <div>{nearbyPlaces.map((place) => <article key={place.id}><span className="nearby-place-pin"><Icon name="shelter" size="sm" /></span><div><strong>{place.name}</strong><small>{place.address}</small></div><button type="button" onClick={() => navigateToPlace(place)}>Directions <Icon name="arrow" size="sm" /></button></article>)}</div> : nearbyPlaceStatus !== "SEARCHING" && <p>{nearbyPlaceStatus === "PLACES_UNAVAILABLE" ? "Nearby place search is unavailable. Enable Google Places API for this project, then try again." : nearbyPlaceStatus === "FACILITY_SEARCH_UNAVAILABLE" ? "Facility sources are temporarily unavailable. Please try again shortly." : "No matching facilities were found in this area. Try another category or a nearby city."}</p>}</section>}<div className="shelter-map-actions"><button type="button" className="ai-primary" onClick={navigateWithGoogleMaps}>Open area in Google Maps <Icon name="arrow" size="sm" /></button><button type="button" className="preparedness-secondary" onClick={() => setShelterMap(null)}>Close map</button></div><small><Icon name="alert" size="sm" />Candidate places are not confirmed emergency shelters or confirmed safe routes.</small></section></div>}
    {activeTab === "aid" && <section className="preparedness-panel"><div className="preparedness-panel-heading"><div className="preparedness-panel-icon"><Preparedness3DIcon name="firstAid" /></div><div><span>Condition-aware guidance</span><h2>First aid and immediate safety</h2><p>Current monitoring shows {condition}{weather ? ` · ${weather.rain} mm rain · ${weather.wind} km/h wind` : ""}.</p></div></div><div className="first-aid-cards"><article><Icon name="shield" /><div><strong>Start safely</strong><p>Move away from immediate danger before helping. Do not enter floodwater, unstable buildings, or downed-wire areas.</p></div></article><article><Icon name="firstAid" /><div><strong>For injury or illness</strong><p>Use clean pressure for bleeding and seek urgent professional help for severe bleeding, breathing difficulty, unconsciousness, or suspected fractures.</p></div></article><article><Icon name="air" /><div><strong>For weather exposure</strong><p>Move to a dry, sheltered place; remove wet clothing when safe, keep warm, and give small sips of water only if the person is awake.</p></div></article></div><button type="button" className="ai-primary preparedness-ai" onClick={() => onAskCompanion(`Based on the current conditions around ${planLocation}, what safe first-aid and preparedness steps should my household take?`)}>Ask Maya about current risks <Icon name="arrow" size="sm" /></button><p className="preparedness-note"><Icon name="alert" size="sm" />This is general information, not a diagnosis or emergency service. Call local emergency services for urgent danger.</p></section>}
  </main>;
}

function ProfileView({ onPro, onLocations, onMascot, mascotId, user, onAuth, syncStatus, savedAlerts, onClearDetails }: { onPro: () => void; onLocations: () => void; onMascot: () => void; mascotId: MascotId; user: User | null; onAuth: () => void; syncStatus: "idle" | "saving" | "saved" | "error"; savedAlerts: AlertData[]; onClearDetails: () => void }) {
  const [tab, setTab] = useState<"details" | "alerts" | "privacy">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contact, setContact] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [prefs, setPrefs] = useState({ notifications: true, audio: false, companion: false, widget: false, camera: false, files: false, contrast: false, largeText: false, location: true, analytics: false });
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    if (!user || !db) return;
    void getDoc(doc(db, "users", user.uid)).then((snapshot) => {
      const profile = snapshot.data();
      if (!profile) return;
      setName(typeof profile.displayName === "string" ? profile.displayName : "");
      setPhone(typeof profile.phone === "string" ? profile.phone : "");
      setContact(typeof profile.emergencyContact === "string" ? profile.emergencyContact : "");
      setAvatarPreview(typeof profile.photoURL === "string" ? profile.photoURL : "");
      if (profile.preferences && typeof profile.preferences === "object") setPrefs(current => ({ ...current, ...(profile.preferences as Partial<typeof current>) }));
    }).catch(() => setNotice("Your profile could not be loaded. You can still update it."));
  }, [user]);
  useEffect(() => { document.documentElement.classList.toggle("high-contrast-mode", prefs.contrast); document.documentElement.classList.toggle("large-text-mode", prefs.largeText); }, [prefs.contrast, prefs.largeText]);
  const toggle = (key: keyof typeof prefs) => setPrefs(previous => ({ ...previous, [key]: !previous[key] }));
  const toggleCamera = async () => {
    if (!prefs.camera && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
      } catch {
        setNotice("Camera access was not granted. You can enable it later in your device settings.");
        return;
      }
    }
    toggle("camera");
  };
  const save = async () => { if (!user || !db) return onAuth(); setSaving(true); try { let photoURL = avatarPreview; let uploadWarning = ""; if (avatarFile && storage) { try { const avatarRef = ref(storage, `profile-photos/${user.uid}/avatar`); await uploadBytes(avatarRef, avatarFile, { contentType: avatarFile.type }); photoURL = await getDownloadURL(avatarRef); setAvatarPreview(photoURL); setAvatarFile(null); } catch { photoURL = ""; uploadWarning = "Your details were saved, but profile-photo storage is not ready yet."; } } await setDoc(doc(db, "users", user.uid), { displayName: name, phone, emergencyContact: contact, photoURL: photoURL || null, preferences: prefs, updatedAt: serverTimestamp() }, { merge: true }); setNotice(uploadWarning || "Saved privately to your MyanAid profile."); } catch { setNotice("Could not save your changes. Please retry."); } finally { setSaving(false); } };
  const deleteAccount = async () => { if (!functions) return; try { await httpsCallable<Record<string, never>, { deleted: boolean }>(functions, "deleteMyAccount")({}); window.location.reload(); } catch { setNotice("Account deletion could not be completed. Please sign in again and retry."); } };
  const initial = (name || user?.email || "M").slice(0, 1).toUpperCase();
  const statusCopy = { idle: "Sign in to sync saved locations", saving: "Saving your protected profile…", saved: "Saved locations are synced privately", error: "Profile sync needs attention — check Firestore rules" }[syncStatus];
  const [openPanel, setOpenPanel] = useState<"details" | "alerts" | "privacy" | "saved" | "account" | null>(null);
  const preferenceRows = ([ ["notifications", "Notifications", "New safety updates while the app is open."], ["audio", "Audio alerts", "Sound for high-priority alerts when notifications are enabled."], ["companion", "Mascot outside the app", "Available in supported device surfaces."], ["widget", "Emergency widget", "Home-screen widgets are not available yet."] ] as Array<[keyof typeof prefs, string, string]>);
  const accessRows = ([ ["contrast", "High contrast", "Stronger text and clearer card boundaries."], ["largeText", "Large text", "More comfortable reading and controls."], ["location", "Precise location", "Requested only when you choose to share your location."], ["camera", "Camera & files", "Photos are selected by you. Camera access is never automatic."], ["analytics", "Anonymous diagnostics", "No diagnostics are collected without your permission."] ] as Array<[keyof typeof prefs, string, string]>);
  return <main className="inner-page content reference-screen profile-reference"><div className="page-heading"><h1>Profile</h1><p>Your details, your companion, your preferences.</p></div><section className="profile-overview-card"><div className="profile-overview-icon">{avatarPreview ? <Image src={avatarPreview ?? ""} alt="Profile" width={56} height={56} unoptimized /> : initial}</div><div><span>Your personal space</span><h2>{name || "Your MyanAid profile"}</h2><p><Icon name="location" size="sm" />Bangkok, Thailand</p></div><button type="button" className="profile-edit-link" onClick={() => setOpenPanel(openPanel === "details" ? null : "details")}>Edit details <Icon name="arrow" size="sm" /></button></section><section className="profile-companion-card"><MascotIcon mascotId={mascotId} /><div><span>Your AI companion</span><h2>{findMascot(mascotId).name}</h2><p>Choose a familiar face for your everyday guidance.</p></div><button type="button" onClick={onMascot}>Change companion <Icon name="profile" size="sm" /></button></section>{openPanel === "details" && <section className="profile-settings-card detail-editor"><header><span className="profile-card-icon"><Icon name="profile" /></span><div><h2>Personal details</h2><p>Keep your safety information close.</p></div></header><div className="profile-form"><label>Display name<input value={name} onChange={e => setName(e.target.value)} placeholder="What should we call you?" /></label><label>Phone number <small>Optional</small><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your phone number" /></label><label>Emergency contact <small>Optional</small><input value={contact} onChange={e => setContact(e.target.value)} placeholder="Name and phone number" /></label></div><div className="profile-inline-actions"><button type="button" onClick={onLocations}>Manage saved locations</button><button type="button" onClick={onAuth}>{user ? "Sign out" : "Sign in or create account"}</button></div><button type="button" className="ai-primary profile-save" onClick={() => void save()}>{saving ? "Saving…" : "Save personal details"}</button>{notice && <p className="profile-notice">{notice}</p>}</section>}<section className="profile-settings-card"><header><span className="profile-card-icon alert"><Icon name="bell" /></span><div><h2>Alert preferences</h2><p>Choose how you stay informed.</p></div><button type="button" className="card-expand" onClick={() => setOpenPanel(openPanel === "alerts" ? null : "alerts")} aria-label="Toggle alert preferences"><Icon name="chevron" size="sm" /></button></header>{openPanel === "alerts" && <div className="profile-card-content">{preferenceRows.map(([key, title, copy]) => <button type="button" className="preference-row" key={key} onClick={() => toggle(key)}><span><strong>{title}</strong><small>{copy}</small></span><i className={prefs[key] ? "switch on" : "switch"} /></button>)}<button type="button" className="ai-primary profile-save" onClick={() => void save()}>Save alert preferences</button></div>}</section><section className="profile-settings-card"><header><span className="profile-card-icon privacy"><Icon name="shield" /></span><div><h2>Accessibility & privacy</h2><p>Make MyanAid feel right for you.</p></div><button type="button" className="card-expand" onClick={() => setOpenPanel(openPanel === "privacy" ? null : "privacy")} aria-label="Toggle accessibility and privacy"><Icon name="chevron" size="sm" /></button></header>{openPanel === "privacy" && <div className="profile-card-content">{accessRows.map(([key, title, copy]) => <button type="button" className="preference-row" key={key} onClick={() => key === "camera" ? void toggleCamera() : toggle(key)}><span><strong>{title}</strong><small>{copy}</small></span>{["contrast", "largeText", "analytics"].includes(key) && <i className={prefs[key] ? "switch on" : "switch"} />}</button>)}<div className="disclaimer-card"><Icon name="shield" /><div><h3>Data sources & disclaimer</h3><p>MyanAid combines provider data and modelled forecasts. It is not an emergency service, evacuation order, or medical diagnosis.</p></div></div><button type="button" className="ai-primary profile-save" onClick={() => void save()}>Save accessibility settings</button></div>}</section><section className="profile-settings-card saved-alerts-card"><header><span className="profile-card-icon saved"><Icon name="alert" /></span><div><h2>Saved alerts</h2><p>{savedAlerts.length} saved {savedAlerts.length === 1 ? "alert" : "alerts"}</p></div><button type="button" className="card-expand" onClick={() => setOpenPanel(openPanel === "saved" ? null : "saved")} aria-label="Toggle saved alerts"><Icon name="chevron" size="sm" /></button></header>{openPanel === "saved" && <div className="profile-card-content">{savedAlerts.length ? <div className="saved-alert-list">{savedAlerts.map(alert => <article key={alert.id}><Icon name={alert.icon} size="sm" /><div><strong>{alert.title}</strong><span>{alert.location} · {alert.source}</span></div></article>)}</div> : <p className="empty-card-copy">Your bookmarked alerts will appear here.</p>}</div>}</section><section className="profile-settings-card account-data-card"><header><span className="profile-card-icon account"><Icon name="profile" /></span><div><h2>Account & data</h2><p>Your profile stays private and under your control.</p></div><button type="button" className="card-expand" onClick={() => setOpenPanel(openPanel === "account" ? null : "account")} aria-label="Toggle account and data"><Icon name="chevron" size="sm" /></button></header>{openPanel === "account" && <div className="profile-card-content"><p className="empty-card-copy">{statusCopy}. You can clear personal details from this device or permanently delete your signed-in account.</p><button type="button" className="clear-details-button" onClick={() => setConfirmClear(true)}>Clear personal details</button>{confirmDelete ? <div className="account-danger-actions"><button type="button" className="delete-account-button" onClick={() => void deleteAccount()}>Permanently delete my account</button><button type="button" className="cancel-delete-button" onClick={() => setConfirmDelete(false)}>Cancel</button></div> : <button type="button" className="delete-account-button" onClick={() => setConfirmDelete(true)}>Delete account</button>}</div>}</section>{confirmClear && <div className="overlay clear-details-overlay" role="dialog" aria-modal="true" aria-labelledby="clear-details-title"><section className="clear-details-dialog"><button type="button" className="clear-details-close" onClick={() => setConfirmClear(false)} aria-label="Close"><Icon name="close" size="sm" /></button><h2 id="clear-details-title">Clear personal details?</h2><p>This removes your name, photo, phone and emergency contact from this browser. Your saved alerts and preferences stay available.</p><button type="button" className="clear-details-confirm" onClick={() => { onClearDetails(); setName(""); setPhone(""); setContact(""); setAvatarPreview(""); setAvatarFile(null); setConfirmClear(false); }}>Clear personal details <Icon name="close" size="sm" /></button></section></div>}</main>;
  const profileTabs = <div className="profile-tabs"><button type="button" className={tab === "details" ? "active" : ""} onClick={() => setTab("details")}>Your details</button><button type="button" className={tab === "alerts" ? "active" : ""} onClick={() => setTab("alerts")}>Alert preferences</button><button type="button" className={tab === "privacy" ? "active" : ""} onClick={() => setTab("privacy")}>Access & privacy</button></div>;
  if (tab === "details") return <main className="inner-page content reference-screen profile-settings"><div className="page-heading"><h1>Settings</h1><p>Manage your personal safety profile and account.</p></div>{profileTabs}<section className="profile-section"><div className="profile-summary"><label className="avatar avatar-upload" title="Choose a profile photo"><input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); } }} />{avatarPreview ? <Image src={avatarPreview} alt="Profile preview" width={54} height={54} unoptimized /> : initial}<b>Change photo</b></label><div><span className="eyebrow">Private profile</span><h2>{name || "Your MyanAid profile"}</h2><p>{user?.email ?? "Sign in to save your profile."}</p><small className={`sync-status ${syncStatus}`}>{statusCopy}</small></div></div><div className="profile-form"><label>Display name<input value={name} onChange={e => setName(e.target.value)} placeholder="How should MyanAid address you?" /></label><label>Phone number <small>Optional</small><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="For your emergency plan" /></label><label>Emergency contact <small>Optional</small><input value={contact} onChange={e => setContact(e.target.value)} placeholder="Name and phone number" /></label></div><div className="profile-inline-actions"><button type="button" onClick={onLocations}>Manage saved locations</button><button type="button" onClick={onMascot}>My companion · {findMascot(mascotId).name}</button><button type="button" onClick={onAuth}>{user ? "Sign out" : "Sign in or create account"}</button></div><button type="button" className="ai-primary profile-save" onClick={() => void save()}>{saving ? "Saving…" : "Save personal details"}</button>{notice && <p className="profile-notice">{notice}</p>}</section></main>;
  if (tab === "alerts") return <main className="inner-page content reference-screen profile-settings"><div className="page-heading"><h1>Alert preferences</h1><p>Control only the safety permissions you want.</p></div>{profileTabs}<section className="profile-section">{([ ["notifications", "Notifications", "Receive relevant emergency updates."], ["audio", "Audio alerts", "Play a sound for high-priority alerts."], ["companion", "Mascot outside the app", "Show your companion in supported device surfaces."], ["widget", "Emergency widget", "Allow future home-screen safety widgets."], ["camera", "Camera access", "Used only when you start a camera feature."], ["files", "File access", "Used only when you choose an attachment."] ] as Array<[keyof typeof prefs, string, string]>).map(([key, title, copy]) => <button type="button" className="preference-row" key={key} onClick={() => key === "camera" ? void toggleCamera() : toggle(key)}><span><strong>{title}</strong><small>{copy}</small></span><i className={prefs[key] ? "switch on" : "switch"} /></button>)}<button type="button" className="ai-primary profile-save" onClick={() => void save()}>Save alert preferences</button>{notice && <p className="profile-notice">{notice}</p>}</section></main>;
  return <main className="inner-page content reference-screen profile-settings"><div className="page-heading"><h1>Accessibility & privacy</h1><p>Make MyanAid easier to use and keep control of your data.</p></div>{profileTabs}<section className="profile-section">{([ ["contrast", "High contrast mode", "Stronger colours, edges, and readability."], ["largeText", "Large text mode", "Elderly-friendly type and controls."], ["location", "Precise location", "Improve nearby maps and shelters."], ["analytics", "Anonymous diagnostics", "Help improve reliability without sharing your profile."] ] as Array<[keyof typeof prefs, string, string]>).map(([key, title, copy]) => <button type="button" className="preference-row" key={key} onClick={() => toggle(key)}><span><strong>{title}</strong><small>{copy}</small></span><i className={prefs[key] ? "switch on" : "switch"} /></button>)}<section className="disclaimer-card"><Icon name="shield" /><div><h3>Data sources & disclaimer</h3><p>MyanAid combines provider data, modelled forecasts, and selected locations. It is not an emergency service, evacuation order, or medical diagnosis. Follow local authorities in immediate danger.</p></div></section><button type="button" className="ai-primary profile-save" onClick={() => void save()}>Save privacy settings</button><section className="delete-account-card"><h3>Delete account</h3><p>This permanently removes your MyanAid sign-in and private profile. It cannot be undone.</p>{confirmDelete ? <div><button type="button" className="delete-account-button" onClick={() => void deleteAccount()}>Permanently delete my account</button><button type="button" className="cancel-delete-button" onClick={() => setConfirmDelete(false)}>Cancel</button></div> : <button type="button" className="delete-account-button" onClick={() => setConfirmDelete(true)}>Delete my account</button>}</section></section></main>;
}

function MascotPicker({ onClose, mascotId, signedIn, onSave }: { onClose: () => void; mascotId: MascotId; signedIn: boolean; onSave: (mascotId: MascotId) => Promise<void> }) {
  const [chosenId, setChosenId] = useState<MascotId>(mascotId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const chosen = findMascot(chosenId);
  const save = async () => {
    if (!signedIn) {
      setMessage("Sign in from Profile before choosing your companion.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await onSave(chosenId);
      onClose();
    } catch {
      setMessage("We could not save your companion yet. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  return <div className="overlay" onClick={onClose}><section className="setup-panel mascot-picker" onClick={event => event.stopPropagation()}>
    <Action className="close-action" onClick={onClose}>Close</Action>
    <div className="eyebrow">Your MyanAid companion</div><h1>Choose your friend</h1><p className="setup-help">Your companion appears throughout MyanAid. Their personality changes, but verified information and safety guidance stay the same.</p>
    <div className="chosen-mascot"><MascotIcon mascotId={chosenId} /><div><span>Your companion</span><strong>{chosen.name}</strong><p>{chosen.role}</p></div></div>
    <div className="mascot-grid">{mascots.map((mascot) => <button type="button" key={mascot.id} className={`mascot-choice ${mascot.id === chosenId ? "selected" : ""}`} onClick={() => setChosenId(mascot.id)} aria-pressed={mascot.id === chosenId}><MascotIcon mascotId={mascot.id} className="mascot-choice-image" /><strong>{mascot.name}</strong><span>{mascot.role}</span>{mascot.id === chosenId && <i><Icon name="check" size="sm" /></i>}</button>)}</div>
    {message && <p className="location-message" role="alert">{message}</p>}
    <div className="setup-actions"><Action className="secondary-button" onClick={onClose}>Cancel</Action><button type="button" className="ai-primary location-save-button" onClick={save} disabled={saving}>{saving ? "Saving…" : `Choose ${chosen.name}`}</button></div>
  </section></div>;
}

function LocationSetup({ onClose, locations, signedIn, onSave }: { onClose: () => void; locations: SavedLocation[]; signedIn: boolean; onSave: (locations: SavedLocation[]) => Promise<void> }) {
  const [drafts, setDrafts] = useState(locations);
  const [newLocation, setNewLocation] = useState<SavedLocation>({ label: "", city: "", timezone: "", language: "English" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setDrafts(locations), [locations]);

  const updateDraft = (index: number, field: keyof SavedLocation, value: string) => {
    setDrafts((current) => current.map((location, currentIndex) => currentIndex === index ? { ...location, [field]: value } : location));
  };
  const addLocation = () => {
    if (!newLocation.label.trim() || !newLocation.city.trim()) {
      setMessage("Add a label and city before saving this location.");
      return;
    }
    setDrafts((current) => [...current, { ...newLocation, label: newLocation.label.trim(), city: newLocation.city.trim(), timezone: newLocation.timezone.trim() || "Local time" }]);
    setNewLocation({ label: "", city: "", timezone: "", language: "English" });
    setMessage("");
  };
  const save = async () => {
    if (!signedIn) {
      setMessage("Sign in from Profile before saving locations.");
      return;
    }
    if (!drafts.length) {
      setMessage("Keep at least one saved location.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await onSave(drafts);
      onClose();
    } catch {
      setMessage("We could not save yet. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="overlay" onClick={onClose}><div className="setup-panel locations-panel" onClick={event => event.stopPropagation()}>
    <div className="setup-top"><div><div className="eyebrow">Your safety profile</div><h1>Saved locations</h1><p className="setup-help">MyanAid uses these places to prioritize verified alerts for you.</p></div><Action className="close-action" onClick={onClose}>Close</Action></div>
    <div className="location-editor-list">
      {drafts.map((location, index) => <section className="location-editor" key={`${location.label}-${index}`}>
        <div className="location-editor-title"><span className="setting-icon"><Icon name="location" /></span><strong>Location {index + 1}</strong>{drafts.length > 1 && <button type="button" className="remove-location" onClick={() => setDrafts(current => current.filter((_, currentIndex) => currentIndex !== index))}>Remove</button>}</div>
        <div className="location-fields">
          <label>Label<input value={location.label} onChange={event => updateDraft(index, "label", event.target.value)} placeholder="Home" /></label>
          <label>City or area<input value={location.city} onChange={event => updateDraft(index, "city", event.target.value)} placeholder="Yangon, Myanmar" /></label>
          <label>Timezone<input value={location.timezone} onChange={event => updateDraft(index, "timezone", event.target.value)} placeholder="MMT" /></label>
          <label>Language<select value={location.language} onChange={event => updateDraft(index, "language", event.target.value)}><option>English</option><option>မြန်မာ</option><option>ไทย</option><option>Bahasa Indonesia</option></select></label>
        </div>
      </section>)}
    </div>
    <section className="add-location-card"><h2>Add another place</h2><div className="location-fields"><label>Label<input value={newLocation.label} onChange={event => setNewLocation(current => ({ ...current, label: event.target.value }))} placeholder="Work" /></label><label>City or area<input value={newLocation.city} onChange={event => setNewLocation(current => ({ ...current, city: event.target.value }))} placeholder="Mandalay, Myanmar" /></label><label>Timezone<input value={newLocation.timezone} onChange={event => setNewLocation(current => ({ ...current, timezone: event.target.value }))} placeholder="MMT" /></label><label>Language<select value={newLocation.language} onChange={event => setNewLocation(current => ({ ...current, language: event.target.value }))}><option>English</option><option>မြန်မာ</option><option>ไทย</option><option>Bahasa Indonesia</option></select></label></div><button type="button" className="secondary-button add-location-button" onClick={addLocation}>Add location</button></section>
    {message && <p className="location-message" role="alert">{message}</p>}
    <div className="setup-actions"><Action className="secondary-button" onClick={onClose}>Cancel</Action><button type="button" className="ai-primary location-save-button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save locations"}</button></div>
  </div></div>;
}

function ProDashboard({ onBack }: { onBack: () => void }) {
  const modules = [{icon:"location" as IconName,title:"Multiple sites",meta:"12 monitored locations"},{icon:"profile" as IconName,title:"Team members",meta:"48 people · 6 roles"},{icon:"bell" as IconName,title:"Alert routing",meta:"8 active routing rules"},{icon:"plan" as IconName,title:"Emergency plans",meta:"14 customized plans"},{icon:"alert" as IconName,title:"Incident timeline",meta:"3 events this month"},{icon:"map" as IconName,title:"Reporting",meta:"Operational readiness 92%"},{icon:"shield" as IconName,title:"Branding",meta:"Organization identity"},{icon:"globe" as IconName,title:"API integrations",meta:"4 connected systems"}];
  return <main className="pro-page"><div className="pro-sidebar"><Brand/><Action className="pro-back" onClick={onBack}><Icon name="arrow"/>Back to MyanAid</Action><div className="pro-org"><div className="avatar">GA</div><div><strong>Global Aid Network</strong><span>Enterprise workspace</span></div></div></div><div className="pro-main"><div className="pro-header"><div><div className="eyebrow">MyanAid Pro</div><h1>Operational readiness</h1><p>Monitor sites, route alerts, and coordinate verified emergency information.</p></div><Action className="ai-primary">Create emergency plan</Action></div><div className="pro-stats"><div><span>Sites monitored</span><strong>12</strong><small>3 countries</small></div><div><span>Active team</span><strong>48</strong><small>All roles covered</small></div><div><span>Open incidents</span><strong>2</strong><small>1 requires review</small></div><div><span>Readiness</span><strong>92%</strong><small>Up 4% this month</small></div></div><div className="pro-grid">{modules.map(x=><Action className="pro-module" key={x.title}><div className="setting-icon"><Icon name={x.icon}/></div><h2>{x.title}</h2><p>{x.meta}</p><Icon name="arrow"/></Action>)}</div></div></main>;
}

function CategoryDrawer({ title, onClose, onAI, onSourceEvent, monitoring, sourceMonitoring }: { title: string; onClose: () => void; onAI: () => void; onSourceEvent: (event: SourceFeedItem, feed: SourceFeed) => void; monitoring: LiveMonitoringState; sourceMonitoring: SourceMonitoringState }) {
  const category = categories.find(x => x.title === title)!;
  const [guidanceStage, setGuidanceStage] = useState<"Before" | "During" | "After">("Before");
  const matchesCategory = (event: SourceFeedItem) => {
    const value = `${event.category} ${event.title} ${event.source}`.toLowerCase();
    if (title === "Flood & Water") return value.includes("flood") || value.includes("water") || value.includes("gistda");
    if (title === "Storm & Weather") return value.includes("storm") || value.includes("cyclone") || value.includes("tropical") || value.includes("weather") || value.includes("gdacs");
    if (title === "Earthquake & Tsunami") return value.includes("earthquake") || value.includes("tsunami");
    if (title === "Fire, Haze & Air Quality") return value.includes("fire") || value.includes("wildfire") || value.includes("haze") || value.includes("air");
    if (title === "Public Health Alerts") return value.includes("health") || value.includes("outbreak") || value.includes("disease") || value.includes("who");
    return value.includes("humanitarian") || value.includes("ifrc") || value.includes("displacement");
  };
  const providerEvents = sourceMonitoring.feeds.flatMap((feed) => feed.events.filter(matchesCategory).map((event) => ({ event, feed, provider: feed.provider }))).slice(0, 4);
  const localSignals = title === "Flood & Water" && sourceMonitoring.river ? [{ label: "Bangkok river model", value: `${sourceMonitoring.river.discharge} m³/s`, note: `Forecast for ${sourceMonitoring.river.date} · modelled discharge` }] : title === "Storm & Weather" && monitoring.weather ? [{ label: "Bangkok weather model", value: weatherLabel(monitoring.weather.code), note: `${monitoring.weather.rain} mm rain · ${monitoring.weather.wind} km/h wind` }] : title === "Earthquake & Tsunami" && monitoring.earthquake ? [{ label: "USGS latest M4.5+ event", value: `M${monitoring.earthquake.magnitude.toFixed(1)}`, note: monitoring.earthquake.place }] : title === "Fire, Haze & Air Quality" && sourceMonitoring.airQuality ? [{ label: "Bangkok air-quality model", value: `AQI ${sourceMonitoring.airQuality.usAqi}`, note: `PM2.5 ${sourceMonitoring.airQuality.pm25} µg/m³ · modelled` }] : [];
  return <div className="overlay" onClick={onClose}><div className="detail-panel category-detail-panel" onClick={e => e.stopPropagation()}>
    <div className="detail-topbar"><button type="button" onClick={onClose}>All categories <Icon name="arrow" size="sm" /></button><button type="button" onClick={() => window.location.reload()}>Refresh <Icon name="sparkle" size="sm" /></button></div>
    <div className="detail-header category-reference-header"><div className="category-reference-icon"><Emergency3DIcon name={category.icon as EmergencyIconName} /></div><div><div className="category-location"><Icon name="location" size="sm" />Bangkok, Thailand</div><h1>{title}</h1><div className={`category-status ${category.tone}`}><span />{localSignals[0]?.value ?? category.status}</div></div></div>
    <section className="category-overview-stack">{localSignals.length ? localSignals.map((signal) => <div className="category-overview-card" key={signal.label}><span>Current overview</span><strong>{signal.value}</strong><small>{signal.note}</small></div>) : <div className="category-overview-card"><span>Current overview</span><strong>No local provider value available</strong><small>MyanAid displays values only when a connected source publishes them.</small></div>}<div className="category-overview-card"><span>Latest update</span><strong>{monitoring.fetchedAt ?? "Updating"}</strong><small>{localSignals[0]?.label ?? "Connected provider records"}</small></div></section>
    <section className="category-provider-updates"><div className="category-provider-heading"><div><span>Available provider records</span><strong>{providerEvents.length ? "Latest source information" : "Waiting for a related record"}</strong></div><b>{providerEvents.length} record{providerEvents.length === 1 ? "" : "s"}</b></div>{providerEvents.length ? <div className="category-provider-list">{providerEvents.map(({ event, feed, provider }) => <button type="button" key={`${provider}-${event.id}`} onClick={() => onSourceEvent(event, feed)}><Icon name={pointCategory(event).color === "red" ? "earthquake" : pointCategory(event).color === "blue" ? "flood" : pointCategory(event).color === "orange" ? "storm" : pointCategory(event).color === "yellow" ? "fire" : pointCategory(event).color === "purple" ? "health" : "globe"} size="sm" /><div><span>{provider} · {event.severity}</span><strong>{event.title}</strong><small>{event.location}</small></div><Icon name="chevron" size="sm" /></button>)}</div> : <p className="category-provider-empty">No related feed record is currently available. This category will update when a connected provider publishes one.</p>}</section>
    <section className="category-guidance"><h2>Safety guidance</h2><div className="guidance-tabs">{(["Before", "During", "After"] as const).map((stage) => <button key={stage} type="button" className={guidanceStage === stage ? "active" : ""} onClick={() => setGuidanceStage(stage)}>{stage}</button>)}</div><div className="guidance-card"><Icon name={guidanceStage === "During" ? "alert" : guidanceStage === "After" ? "heart" : "plan"} /><div><strong>{guidanceStage === "Before" ? "Prepare calmly" : guidanceStage === "During" ? "Prioritize immediate safety" : "Recover and check in"}</strong><p>{guidanceStage === "Before" ? "Review local forecasts, keep essential supplies and important documents ready, and agree your household plan." : guidanceStage === "During" ? "Follow official instructions, avoid known hazards, and contact emergency services if there is immediate danger." : "Check authority updates, contact family safely, and document damage only when it is safe to do so."}</p></div></div></section>
    <section className="category-trusted-sources"><h2>Trusted sources</h2><a href="https://www.tmd.go.th/" target="_blank" rel="noreferrer"><Icon name="arrow" size="sm" />Thai Meteorological Department<Icon name="chevron" size="sm" /></a><a href="https://www.who.int/" target="_blank" rel="noreferrer"><Icon name="arrow" size="sm" />World Health Organization<Icon name="chevron" size="sm" /></a></section>
    <div className="category-bottom-actions"><Action className="ai-primary" onClick={onAI}><Icon name="sparkle" size="sm" />Ask Maya</Action><Action className="secondary-button" onClick={onClose}><Icon name="map" size="sm" />View live map</Action></div>
  </div></div>;
}

function LocalGuideDrawer({ monitoring, onClose, onPreparedness, onAskCompanion }: { monitoring: LiveMonitoringState; onClose: () => void; onPreparedness: () => void; onAskCompanion: () => void }) {
  const weather = monitoring.weather;
  const condition = localCondition(weather);
  const isWet = Boolean(weather && (weather.rain > 0 || weather.code >= 51));
  const conditionName = weather?.description ?? (weather?.code && weather.code >= 95 ? "Thunderstorm" : isWet ? "Rain" : weather ? weatherLabel(weather.code) : "Weather");
  const steps = isWet ? [
    ["Check your route", "Avoid low-lying roads and underpasses if flooding develops."],
    ["Stay out of floodwater", "Do not walk or drive through flooded roads or moving water."],
    ["Keep in touch", "Keep your phone charged and check official local updates."],
  ] : [
    ["Check local updates", "Review the latest official forecast before you travel."],
    ["Plan your route", "Allow extra time and avoid areas affected by changing conditions."],
    ["Keep in touch", "Keep your phone charged and share your plan with someone you trust."],
  ];
  const observedAt = weather ? formatHeroObservedAt(weather.observedAt) : "Updating";
  return <div className="overlay local-guide-overlay" role="dialog" aria-modal="true" aria-labelledby="local-guide-title" onClick={onClose}>
    <section className="local-guide-sheet" onClick={(event) => event.stopPropagation()}>
      <div className="local-guide-content">
        <button type="button" className="local-guide-back" onClick={onClose}>Back to Home <Icon name="arrow" size="sm" /></button>
        <section className={`local-guide-hero severity-${condition.severity}`}>
          <div className="local-guide-hero-top"><span><Icon name="location" size="sm" />Bangkok, Thailand</span><b>Forecast</b></div>
          <span className={`local-guide-weather-icon severity-${condition.severity}`}><Icon name={condition.icon} /></span>
          <h1 id="local-guide-title">{conditionName} conditions near you</h1>
          <p>Check local weather warnings before travel and follow instructions from your local authorities.</p>
          <div className="local-guide-facts">
            <div><span>{isWet ? "Rain now" : "Temperature"}</span><strong>{weather ? (isWet ? `${weather.rain} mm` : `${weather.temperature}°`) : "—"}</strong></div>
            <div><span>Wind</span><strong>{weather ? `${weather.wind} km/h` : "—"}</strong></div>
            <div><span>Safety status</span><strong>{condition.label}</strong></div>
          </div>
        </section>
        <section className="local-guide-actions"><h2>What to do now</h2><div>{steps.map(([title, detail], index) => <article key={title}><b>{index + 1}</b><div><strong>{title}</strong><p>{detail}</p></div></article>)}</div></section>
        <a className="local-guide-official" href="https://www.tmd.go.th/en/" target="_blank" rel="noreferrer">Check official weather updates <Icon name="arrow" /></a>
        <section className="local-guide-glance"><h2>At a glance</h2><dl><div><dt>Location</dt><dd>Bangkok, Thailand</dd></div><div><dt>Forecast time</dt><dd>{observedAt}</dd></div><div><dt>Source</dt><dd>Open-Meteo · modelled forecast</dd></div></dl></section>
        <section className="local-guide-map"><div><Icon name="map" /><h2>Your selected area</h2></div><div className="local-guide-map-frame"><GoogleSourceMap points={EMPTY_SOURCE_POINTS} searchedLocation={{ latitude: 13.7563, longitude: 100.5018 }} focusZoom={12} placeQuery="Bangkok, Thailand" /></div><p><Icon name="location" size="sm" />Selected location, not an affected-area boundary.</p></section>
        <div className="local-guide-bottom-actions"><button type="button" onClick={onPreparedness}>My emergency kit <Icon name="plan" size="sm" /></button><button type="button" onClick={onAskCompanion}>Ask Maya <Icon name="sparkle" size="sm" /></button></div>
      </div>
    </section>
  </div>;
}

function AlertDrawer({ alert, onClose, saved, onToggleSaved }: { alert: AlertData; onClose: () => void; saved: boolean; onToggleSaved: (alert: AlertData) => void }) {
  const [showFacts, setShowFacts] = useState(false);
  return <div className="overlay alert-detail-overlay" onClick={onClose}><article className="detail-panel alert-detail compact-alert-detail" onClick={e => e.stopPropagation()}>
    <header className="compact-alert-header"><button type="button" className="alert-back" onClick={onClose}><Icon name="arrow" size="sm" />Back to alerts</button><button type="button" className="alert-close" onClick={onClose} aria-label="Close alert details"><Icon name="close" size="sm" /></button></header>
    <section className="alert-detail-card"><div className="detail-tags"><span className={`severity-label tone-${alert.tone}`}>{alert.severity}</span></div><h1>{alert.title}</h1><p className="compact-alert-location"><Icon name="location" size="sm" />{alert.location}</p><p className="alert-detail-summary">{alert.summary}</p><div className="compact-facts always-visible"><div><span>Source</span><strong>{alert.source}</strong></div><div><span>Event time</span><strong>{alert.timeWindow}</strong></div></div><section className="compact-steps"><h2>Stay informed. Be prepared.</h2>{alert.guidance.slice(0, 3).map((step, index) => <div key={step}><strong>{index + 1}</strong><span>{step}</span></div>)}</section><div className="detail-actions"><button type="button" className="compact-guidance-button" onClick={() => setShowFacts(!showFacts)}>{showFacts ? "Hide source details" : "View source details"}</button><button type="button" className={`save-alert-button ${saved ? "saved" : ""}`} onClick={() => onToggleSaved(alert)}>{saved ? "Saved" : "Save alert"}</button></div>{showFacts && <section className="compact-facts expanded-facts" aria-live="polite"><div><span>Last updated</span><strong>{alert.updatedTime}</strong></div><div><span>Expected end</span><strong>{alert.expiryTime}</strong></div><div><span>Affected area</span><strong>{alert.affectedArea}</strong></div><div><span>Confidence</span><strong>{alert.confidence}</strong></div></section>}</section>
    <footer className="compact-alert-footer"><Icon name="alert" size="sm" />For an active emergency, follow local authority instructions and official channels.</footer>
  </article></div>;
}

type ActionBrief = {
  id: string;
  headline: string;
  summary: string;
  locationRelevance: string;
  preparednessSteps: string[];
  uncertainty: string;
  sourceEventIds: string[];
  officialReminder: string;
};

function BriefVisual({ brief, sourceMonitoring }: { brief: ActionBrief; sourceMonitoring: SourceMonitoringState }) {
  const signalDefinitions: Array<{ id: string; label: string; icon: IconName }> = [
    { id: "weather-bangkok", label: "Weather", icon: "rain" }, { id: "air-quality-bangkok", label: "Air quality", icon: "air" }, { id: "river-discharge-bangkok", label: "River model", icon: "flood" }, { id: "earthquake-latest", label: "Earthquakes", icon: "earthquake" }, { id: "gdacs-latest", label: "GDACS", icon: "alert" }, { id: "nasa-eonet-open", label: "NASA EONET", icon: "globe" }, { id: "ifrc-latest", label: "IFRC GO", icon: "humanitarian" }, { id: "who-outbreak-news", label: "WHO", icon: "health" }, { id: "gistda-flood-latest", label: "GISTDA flood extent", icon: "flood" },
  ];
  const activeSignals = signalDefinitions.filter((signal) => brief.sourceEventIds.includes(signal.id));
  const briefPoints = sourceMonitoring.feeds.filter((feed) => brief.sourceEventIds.includes(feed.id)).flatMap((feed) => feed.events.filter((event): event is SourceFeedItem & { coordinates: SourceCoordinates } => Boolean(event.coordinates)).map((event) => ({ ...event, source: `${feed.provider} · ${event.source}` })));
  return <section className="brief-visual"><div className="brief-visual-top"><span className={`brief-relevance ${brief.locationRelevance.replaceAll(" ", "-")}`}>{brief.locationRelevance}</span><span>{activeSignals.length} signals reviewed</span></div><div className="brief-signal-grid">{activeSignals.map((signal) => <div key={signal.id}><Icon name={signal.icon} size="sm" /><span>{signal.label}</span></div>)}</div>{briefPoints.length > 0 && <div className="brief-map"><GoogleSourceMap points={briefPoints} compact /><small>Provider map points reviewed for this brief. They are not affected-area boundaries.</small></div>}</section>;
}

function LocalEmergencyContacts({ coordinates, locationLabel, compact = false }: { coordinates: SourceCoordinates | null; locationLabel: string; compact?: boolean }) {
  const inThailand = Boolean(coordinates && coordinates.latitude >= 5 && coordinates.latitude <= 21 && coordinates.longitude >= 97 && coordinates.longitude <= 106);
  const inBangkok = Boolean(coordinates && coordinates.latitude >= 13.55 && coordinates.latitude <= 13.95 && coordinates.longitude >= 100.3 && coordinates.longitude <= 100.9);
  const contacts: Array<{ label: string; number: string; note: string; icon: IconName }> = inThailand ? [
    { label: "Medical emergency", number: "1669", note: "National emergency medical service", icon: "firstAid" },
    { label: "Police emergency", number: "191", note: "Royal Thai Police emergency call centre", icon: "alert" },
    { label: "Fire and rescue", number: "199", note: "Fire emergency line", icon: "fire" },
    ...(inBangkok ? [{ label: "Bangkok medical", number: "1646", note: "Erawan emergency medical centre", icon: "heart" as IconName }] : []),
    { label: "Disaster assistance", number: "1784", note: "Department of Disaster Prevention and Mitigation", icon: "shield" },
    { label: "Tourist Police", number: "1155", note: "Tourist assistance and police support", icon: "profile" },
  ] : [];
  const nearbyHospitalUrl = coordinates ? `https://www.google.com/maps/search/?api=1&query=emergency+hospital&query=${coordinates.latitude},${coordinates.longitude}` : "https://www.google.com/maps/search/?api=1&query=emergency+hospital";
  const visibleContacts = compact ? contacts.slice(0, 3) : contacts;
  return <section className={`local-emergency-contacts ${compact ? "compact" : ""}`} aria-label="Local emergency contacts"><header><div className="contact-title-icon"><Icon name="firstAid" size="sm" /></div><div><div className="eyebrow">Local contacts</div><h3>Call for help</h3></div></header>{inThailand ? <><p className="contact-location"><Icon name="location" size="sm" />Available for your Thailand location{locationLabel.startsWith("Current") ? "" : ` · ${locationLabel}`}</p><div className="emergency-contact-list">{visibleContacts.map((contact) => <a href={`tel:${contact.number}`} key={contact.number} className="emergency-contact"><Icon name={contact.icon} size="sm" /><span><small>{contact.label}</small><strong>{contact.number}</strong><em>{contact.note}</em></span><b>Call</b></a>)}</div>{!compact && <a className="nearby-hospital-link" href={nearbyHospitalUrl} target="_blank" rel="noreferrer"><Icon name="location" size="sm" />Find the nearest hospital <Icon name="arrow" size="sm" /></a>}<small className="contact-source">Source: Thailand Government <Icon name="arrow" size="sm" /></small></> : <p className="contact-location">Checking your permitted location for verified local emergency contacts…</p>}</section>;
}

function AIPanel({ onClose, mascotId, user, sourceMonitoring, language, emergencyActive, currentCoordinates, locationLabel }: { onClose: () => void; mascotId: MascotId; user: User | null; sourceMonitoring: SourceMonitoringState; language: string; emergencyActive: boolean; currentCoordinates: SourceCoordinates | null; locationLabel: string }) {
  const mascot = findMascot(mascotId);
  const [brief, setBrief] = useState<ActionBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const chatThreadRef = useRef<HTMLDivElement>(null);
  const languageCode = language === "ไทย" ? "th-TH" : language === "မြန်မာ" ? "my-MM" : language === "Bahasa Indonesia" ? "id-ID" : "en-GB";
  const greeting = language === "ไทย" ? `สวัสดี ฉันคือ ${mascot.name} ฉันจะช่วยสรุปข้อมูลความปลอดภัยจากแหล่งที่เชื่อถือได้` : language === "မြန်မာ" ? `မင်္ဂလာပါ၊ ကျွန်တော် ${mascot.name} ပါ။ ယုံကြည်ရသော ဘေးကင်းရေးအချက်အလက်များကို ရှင်းပြပေးနိုင်ပါတယ်။` : language === "Bahasa Indonesia" ? `Halo, saya ${mascot.name}. Saya dapat menjelaskan informasi keselamatan dari sumber tepercaya.` : `Hi, I’m ${mascot.name}. I can explain current safety information from verified sources.`;
  const [chat, setChat] = useState<CompanionChatTurn[]>([{ role: "assistant", text: greeting }]);
  const [chatHistoryReady, setChatHistoryReady] = useState(false);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(COMPANION_CHAT_HISTORY_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as unknown;
      if (!Array.isArray(parsed)) return;
      const restored = parsed.filter((turn): turn is CompanionChatTurn => Boolean(
        turn && typeof turn === "object" &&
        ((turn as CompanionChatTurn).role === "assistant" || (turn as CompanionChatTurn).role === "user") &&
        typeof (turn as CompanionChatTurn).text === "string" && (turn as CompanionChatTurn).text.trim(),
      )).slice(-30);
      if (restored.length) setChat(restored);
    } catch {
      window.localStorage.removeItem(COMPANION_CHAT_HISTORY_KEY);
    } finally {
      setChatHistoryReady(true);
    }
  }, []);
  useEffect(() => {
    if (!chatHistoryReady) return;
    window.localStorage.setItem(COMPANION_CHAT_HISTORY_KEY, JSON.stringify(chat.slice(-30)));
  }, [chat, chatHistoryReady]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const thread = chatThreadRef.current;
      if (thread) thread.scrollTop = thread.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chat, chatHistoryReady, loading]);
  useEffect(() => {
    const receivePreparednessQuestion = (event: Event) => {
      const prompt = (event as CustomEvent<unknown>).detail;
      if (typeof prompt === "string") setDraft(prompt);
    };
    window.addEventListener("mynaid-companion-prompt", receivePreparednessQuestion);
    return () => window.removeEventListener("mynaid-companion-prompt", receivePreparednessQuestion);
  }, []);
  const currentSummary = `Current sources: ${sourceMonitoring.airQuality ? `AQI ${sourceMonitoring.airQuality.usAqi} modelled air quality` : "air-quality update pending"}; ${sourceMonitoring.river ? `${sourceMonitoring.river.discharge} m³/s river model` : "river update pending"}; ${sourceMonitoring.feeds.length} connected provider feeds.`;
  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCode;
    window.speechSynthesis.speak(utterance);
  };
  const sendMessage = async (text = draft, replyAloud = voiceEnabled) => {
    const clean = text.trim();
    if (!clean) return;
    setChat((items) => [...items, { role: "user", text: clean }]);
    setDraft("");
    setLoading(true); setMessage("");
    try {
      if (!functions) throw new Error("Firebase is not configured");
      const askCompanion = httpsCallable<{ message: string; language: string; history: CompanionChatTurn[] }, { reply: string }>(functions, "askSafetyCompanion");
      const result = await askCompanion({ message: clean, language, history: chat.slice(-12) });
      const reply = result.data.reply;
      setChat((items) => [...items, { role: "assistant", text: reply }]);
      if (replyAloud) speak(reply);
    } catch (error) {
      console.error("Safety companion request failed", error);
      const fallback = `${currentSummary} I could not reach the safety assistant just now. For immediate danger, follow official local authority instructions.`;
      setChat((items) => [...items, { role: "assistant", text: fallback }]);
      setMessage("I could not reach the live assistant. The summary above uses the latest data available in the app.");
    } finally { setLoading(false); }
  };
  const startVoiceInput = () => {
    type Recognition = { lang: string; interimResults: boolean; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: (event?: { error?: string }) => void; onend: () => void; start: () => void; };
    type RecognitionConstructor = new () => Recognition;
    const BrowserWindow = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const RecognitionApi = BrowserWindow.SpeechRecognition ?? BrowserWindow.webkitSpeechRecognition;
    if (!RecognitionApi) { setMessage("Voice input is not supported by this browser. You can still type your question."); return; }
    const recognition = new RecognitionApi();
    recognition.lang = languageCode;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
      if (!transcript) return;
      setDraft(transcript);
      // Voice is a complete hands-free turn: submit the recognised speech and
      // read the Gemini answer aloud, rather than only filling the text box.
      void sendMessage(transcript, true);
    };
    recognition.onerror = (event) => setMessage(event?.error === "not-allowed" ? "Microphone access is blocked. Allow microphone permission, then try again." : "Voice input could not be started. Check microphone permission and try again.");
    recognition.onend = () => setListening(false);
    setVoiceEnabled(true);
    setListening(true);
    try { recognition.start(); } catch { setListening(false); setMessage("Voice input is already active or unavailable. Please try again."); }
  };

  const createBrief = async () => {
    if (!user) { setMessage("Sign in to create a private, location-aware Action Brief."); return; }
    if (!functions) { setMessage("Firebase is not configured yet."); return; }
    setLoading(true); setMessage("");
    try {
      const requestBrief = httpsCallable<Record<string, never>, ActionBrief>(functions, "generateActionBrief");
      const result = await requestBrief({});
      setBrief(result.data);
    } catch (error) {
      console.error("Action Brief request failed", error);
      setMessage("MyanAid could not create an Action Brief right now. Please try again in a moment.");
    } finally { setLoading(false); }
  };
  const composer = <div className="chat-composer"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void sendMessage(); }} placeholder={language === "ไทย" ? `พิมพ์ข้อความถึง ${mascot.name}` : language === "မြန်မာ" ? "မေးခွန်းကို ရိုက်ထည့်ပါ" : language === "Bahasa Indonesia" ? `Ketik pesan untuk ${mascot.name}` : `Message ${mascot.name}…`} /><button type="button" className={listening ? "voice-button listening" : "voice-button"} onClick={startVoiceInput} aria-label="Use voice input"><Icon name="sound" size="sm" /></button><button type="button" className="send-button" onClick={() => void sendMessage()} aria-label="Send message"><Icon name="arrow" size="sm" /></button></div>;
  const suggestions = ["Emergency kit", "Rain preparedness", "Family plan"];
  const conversation = <><div className="chat-thread" ref={chatThreadRef} aria-live="polite">{chat.map((item, index) => <div className={`chat-bubble ${item.role}`} key={`${item.role}-${index}`}>{item.role === "assistant" && <MascotIcon mascotId={mascotId} className="chat-mascot" />}<div><p>{item.text}</p>{item.role === "assistant" && <small>Offline guide · not live AI</small>}</div></div>)}{loading && <div className="chat-typing"><span /><span /><span />{voiceEnabled ? "Preparing a spoken answer…" : "Checking verified sources…"}</div>}</div><div className="chat-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void sendMessage(`Help me with ${suggestion.toLowerCase()}.`)}>{suggestion}</button>)}</div>{composer}</>;
  return <div className="overlay companion-overlay" onClick={onClose}><div className="ai-panel chat-panel full-chat-panel" onClick={e => e.stopPropagation()}>
    <header className="companion-chat-header reference-chat-header"><button type="button" className="chat-back-button" onClick={onClose} aria-label="Close chat"><Icon name="arrow" size="sm" /></button><div className="ai-companion-head"><MascotIcon mascotId={mascotId} /><div><h1>{mascot.name} · MyanAid</h1><span>{voiceEnabled ? "Voice replies are on" : "Your safety companion"}</span></div></div><div className="companion-toolbar"><button type="button" className="brief-header-action" onClick={() => setBriefOpen(true)}><Icon name="plan" size="sm" /><span>Action Brief</span></button>{emergencyActive && <button type="button" className="sos-button" onClick={() => setSosOpen(true)} aria-label="Emergency contacts"><Icon name="alert" size="sm" /><span>SOS</span></button>}<button type="button" className="toolbar-icon-button" onClick={() => setDraft("")} aria-label="Clear draft"><Icon name="refresh" size="sm" /></button></div></header>
    <div className="companion-chat-body">{conversation}</div>
    <footer className="companion-chat-footer"><div className="voice-hint"><Icon name="sound" size="sm" />{listening ? "Listening…" : "Tap the microphone to talk. Replies can be read aloud."}</div><div className="ai-dispatch-note"><Icon name="alert" size="sm"/>Not an emergency service. Follow official local authority instructions.</div></footer>
    {sosOpen && <><div className="sos-backdrop" onClick={() => setSosOpen(false)} /><section className="sos-dialog" role="dialog" aria-modal="true" aria-labelledby="sos-title"><button type="button" className="companion-close-button" onClick={() => setSosOpen(false)} aria-label="Close SOS guidance"><Icon name="close" size="sm" /></button><div className="eyebrow">Critical condition detected</div><h2 id="sos-title">Get emergency help now</h2><p>If you are in immediate danger, call an emergency authority below and follow local instructions. MyanAid cannot dispatch emergency services.</p><LocalEmergencyContacts coordinates={currentCoordinates} locationLabel={locationLabel} compact /><button type="button" className="sos-acknowledge" onClick={() => setSosOpen(false)}>I understand</button></section></>}
    {briefOpen && <div className="brief-sheet" role="dialog" aria-label="Create Action Brief"><button type="button" className="brief-sheet-back" onClick={() => setBriefOpen(false)}><Icon name="arrow" size="sm" />Back to chat</button><div className="brief-sheet-content"><div className="eyebrow">Your personal safety plan</div><h2>Create my Action Brief</h2><p>Get calm, source-backed preparedness guidance using saved locations and current provider records.</p><button type="button" className="ai-primary action-brief-button" onClick={createBrief} disabled={loading}>{loading ? "Creating brief…" : "Create my Action Brief"}<Icon name="arrow" size="sm"/></button>{brief && <section className="action-brief-card" aria-live="polite"><h2>{brief.headline}</h2><p>{brief.summary}</p><BriefVisual brief={brief} sourceMonitoring={sourceMonitoring} /><h3>Preparedness steps</h3><ol>{brief.preparednessSteps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol><p className="action-brief-uncertainty"><strong>What to keep in mind:</strong> {brief.uncertainty}</p><LocalEmergencyContacts coordinates={currentCoordinates} locationLabel={locationLabel} /><small>{brief.officialReminder}</small></section>}{message && <p className="action-brief-message" role="alert">{message}</p>}</div></div>}
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

function BottomNav({ current, setCurrent, alertCount }: { current: string; setCurrent: (page: string) => void; alertCount: number }) {
  const items = [{ name: "Home", icon: "home" }, { name: "Map", icon: "map" }, { name: "Alerts", icon: "bell" }, { name: "Preparedness", icon: "battery" }, { name: "Profile", icon: "profile" }] as { name: string; icon: IconName }[];
  const unreadAlerts = alertCount;
  return <nav className="bottom-nav">{items.map(item => <Action key={item.name} className={`nav-item ${current === item.name ? "active" : ""}`} onClick={() => setCurrent(item.name)}><span className="nav-icon-wrap"><Icon name={item.icon} />{item.name === "Alerts" && <><b className="nav-alert-badge" aria-label={`${unreadAlerts} new alerts`}>{unreadAlerts}</b><i className="nav-alert-dot" aria-hidden="true" /></>}</span><span>{item.name}</span></Action>)}</nav>;
}

function AuthDialog({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"sign-in" | "create">("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth || !db || !isConfigured) {
      setMessage("Firebase is not configured. Check .env.local and restart the app.");
      return;
    }
    if (mode === "create" && password.length < 6) {
      setMessage("Choose a password with at least 6 characters.");
      return;
    }
    if (mode === "create" && !displayName.trim()) {
      setMessage("Add the name you would like MyanAid to use.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (mode === "create") {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        void setDoc(doc(db, "users", credential.user.uid), {
          email: credential.user.email,
          displayName: displayName.trim(),
          preferredLanguage: "English",
          savedLocations: starterLocations,
          mascotId: "maya",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }).catch(() => {
          // Authentication has succeeded; Firestore will be retried when the user updates their profile.
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onClose();
    } catch (error) {
      const code = (error as { code?: string }).code;
      const errors: Record<string, string> = {
        "auth/email-already-in-use": "That email already has a MyanAid account. Try signing in instead.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/invalid-email": "Enter a valid email address.",
        "permission-denied": "Your account was created, but Firestore needs its user security rule enabled.",
      };
      setMessage(errors[code ?? ""] ?? "We could not complete that request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="overlay auth-overlay" onClick={onClose}><section className="auth-panel" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="auth-title">
    <Action className="close-action" onClick={onClose}>Close</Action>
    <div className="auth-mark"><Icon name="shield" size="lg" /></div>
    <div className="eyebrow">YOUR MYANAID</div>
    <h1 id="auth-title">{mode === "sign-in" ? "Welcome back" : "Create your safety profile"}</h1>
    <p>{mode === "sign-in" ? "Sign in to access your saved locations and personal safety preferences." : "Your saved locations and alert choices stay private to your account."}</p>
    <form onSubmit={submit} className="auth-form">
      {mode === "create" && <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required placeholder="How should we address you?" /></label>}
      <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" /></label>
      <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={6} placeholder="At least 6 characters" /></label>
      {message && <div className="auth-message" role="alert">{message}</div>}
      <button className="ai-primary auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}<Icon name="arrow" size="sm" /></button>
    </form>
    <button className="auth-switch" type="button" onClick={() => { setMode(mode === "sign-in" ? "create" : "sign-in"); setMessage(""); }}>{mode === "sign-in" ? "New to MyanAid? Create an account" : "Already have an account? Sign in"}</button>
    <small>Demo note: MyanAid never shares your location without your permission.</small>
  </section></div>;
}

export default function App() {
  const [page, setPage] = useState("Home");
  const [preparednessTab, setPreparednessTab] = useState<"kit" | "family" | "shelters" | "aid">("kit");
  const [language, setLanguage] = useState("English");
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("familyInvite")) {
        setPreparednessTab("family");
        setPage("Preparedness");
      }
    } catch { /* The regular home route remains available if the URL cannot be read. */ }
  }, []);
  useEffect(() => {
    try {
      const savedLanguage = window.localStorage.getItem("myanaid-language");
      if (savedLanguage && ["English", "မြန်မာ", "ไทย", "Bahasa Indonesia"].includes(savedLanguage)) setLanguage(savedLanguage);
    } catch { /* Language selection remains available without browser storage. */ }
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem("myanaid-language", language); } catch { /* Keep the in-memory choice when storage is unavailable. */ }
  }, [language]);
  const monitoring = useLiveMonitoring();
  const sourceMonitoring = useSourceMonitoring();
  const currentLocation = useCurrentLocation();
  const companionCondition = localCondition(monitoring.weather);
  const [user, setUser] = useState<User | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(starterLocations);
  const [mascotId, setMascotId] = useState<MascotId>("maya");
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [authOpen, setAuthOpen] = useState(false);
  const [aiOpen, setAIOpen] = useState(false);
  const [sosPreviewActive, setSosPreviewActive] = useState(() => Date.now() < SOS_TEST_PREVIEW_UNTIL);
  const [locationSetupOpen, setLocationSetupOpen] = useState(false);
  useEffect(() => {
    const remaining = SOS_TEST_PREVIEW_UNTIL - Date.now();
    if (remaining <= 0) { setSosPreviewActive(false); return; }
    const timeout = window.setTimeout(() => setSosPreviewActive(false), remaining);
    return () => window.clearTimeout(timeout);
  }, []);
  const [mascotPickerOpen, setMascotPickerOpen] = useState(false);
  const [actionPage, setActionPage] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);
  const [savedAlertIds, setSavedAlertIds] = useState<string[]>([]);
  const [localGuideOpen, setLocalGuideOpen] = useState(false);
  const [selectedSourceEvent, setSelectedSourceEvent] = useState<{ event: SourceFeedItem; feed: SourceFeed } | null>(null);
  const goMap = () => setPage("Map");
  useEffect(() => { try { const stored = window.localStorage.getItem("myanaid-saved-alerts"); if (stored) setSavedAlertIds(JSON.parse(stored)); } catch { /* ignore unavailable local storage */ } }, []);
  const toggleSavedAlert = (alert: AlertData) => setSavedAlertIds((current) => { const next = current.includes(alert.id) ? current.filter((id) => id !== alert.id) : [...current, alert.id]; try { window.localStorage.setItem("myanaid-saved-alerts", JSON.stringify(next)); } catch { /* keep the in-memory selection */ } return next; });
  const clearPersonalDetails = () => { try { window.localStorage.removeItem("myanaid-profile-photo"); } catch { /* nothing to clear */ } if (user && db) void setDoc(doc(db, "users", user.uid), { displayName: "", phone: "", emergencyContact: "", photoURL: null, updatedAt: serverTimestamp() }, { merge: true }); };
  const handleAccount = async () => {
    if (user && auth) {
      await signOut(auth);
      setPage("Home");
      return;
    }
    setAuthOpen(true);
  };
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser || !db) return;

      // Create the protected profile explicitly after sign-in. This avoids
      // waiting for the real-time listener before the first Firestore write.
      setSyncStatus("saving");
      try {
        await nextUser.getIdToken(true);
        const userDocument = doc(db, "users", nextUser.uid);
        const existingProfile = await getDoc(userDocument);
        await setDoc(userDocument, existingProfile.exists() ? {
          email: nextUser.email,
          updatedAt: serverTimestamp(),
        } : {
          email: nextUser.email,
          preferredLanguage: "English",
          savedLocations: starterLocations,
          mascotId: "maya",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        setSyncStatus("saved");
      } catch (error) {
        console.error("MyanAid initial profile write failed:", error);
        setSyncStatus("error");
      }
    });
  }, []);
  useEffect(() => {
    if (!user || !db) {
      setSavedLocations(starterLocations);
      setSyncStatus("idle");
      return;
    }
    const userDocument = doc(db, "users", user.uid);
    return onSnapshot(userDocument, (snapshot) => {
      if (!snapshot.exists()) {
        setSyncStatus("saving");
        void user.getIdToken().then(() => setDoc(userDocument, {
          email: user.email,
          preferredLanguage: "English",
          savedLocations: starterLocations,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })).catch((error) => {
          console.error("MyanAid Firestore profile write failed:", error);
          setSyncStatus("error");
        });
        return;
      }
      const locations = snapshot.data()?.savedLocations;
      if (Array.isArray(locations)) setSavedLocations(locations as SavedLocation[]);
      const savedMascot = snapshot.data()?.mascotId;
      setMascotId(mascots.some((mascot) => mascot.id === savedMascot) ? savedMascot as MascotId : "maya");
      setSyncStatus(snapshot.metadata.hasPendingWrites ? "saving" : "saved");
    }, (error) => {
      console.error("MyanAid Firestore profile listener failed:", error);
      setSavedLocations(starterLocations);
      setSyncStatus("error");
    });
  }, [user]);
  const saveLocations = async (nextLocations: SavedLocation[]) => {
    if (!user || !db) {
      throw new Error("Sign in before saving locations");
    }
    setSavedLocations(nextLocations);
    setSyncStatus("saving");
    try {
      await setDoc(doc(db, "users", user.uid), {
        savedLocations: nextLocations,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSyncStatus("saved");
    } catch (error) {
      setSyncStatus("error");
      throw error;
    }
  };
  const saveMascot = async (nextMascotId: MascotId) => {
    if (!user || !db) throw new Error("Sign in before choosing a companion");
    setMascotId(nextMascotId);
    setSyncStatus("saving");
    try {
      await setDoc(doc(db, "users", user.uid), { mascotId: nextMascotId, updatedAt: serverTimestamp() }, { merge: true });
      setSyncStatus("saved");
    } catch (error) {
      setSyncStatus("error");
      throw error;
    }
  };
  useEffect(() => {
    const handleAction = (event: Event) => setActionPage((event as CustomEvent<string>).detail);
    window.addEventListener("mynaid-action", handleAction);
    return () => window.removeEventListener("mynaid-action", handleAction);
  }, []);
  return <div className="app-shell"><MascotNameSync mascotId={mascotId} />
    {page !== "Pro" && <Header onLocation={currentLocation.requestLocation} locationLabel={currentLocation.label} locationLoading={currentLocation.loading} language={language} setLanguage={setLanguage} onProfile={() => setPage("Profile")} user={user} />}
    {page === "Home" && <Home onMap={goMap} onCategory={setCategory} onAlert={setSelectedAlert} onPreparedness={(tab) => { setPreparednessTab(tab); setPage("Preparedness"); }} onLocalGuide={() => setLocalGuideOpen(true)} savedLocations={savedLocations} monitoring={monitoring} sourceMonitoring={sourceMonitoring} mascotId={mascotId} />}
    {page === "Map" && <MapView onAlert={setSelectedAlert} sourceMonitoring={sourceMonitoring} />}
    {page === "Alerts" && <AlertsView onAlert={setSelectedAlert} />}
    {page === "Preparedness" && <PreparednessView locationLabel={currentLocation.label} savedLocations={savedLocations} monitoring={monitoring} sourceMonitoring={sourceMonitoring} currentCoordinates={currentLocation.coordinates} requestCurrentLocation={currentLocation.requestLocation} selectedTab={preparednessTab} user={user} onSignIn={() => setAuthOpen(true)} mascotId={mascotId} onAskCompanion={(prompt) => { setAIOpen(true); window.setTimeout(() => window.dispatchEvent(new CustomEvent("mynaid-companion-prompt", { detail: prompt })), 0); }} />}
    {page === "Profile" && <ProfileView onPro={() => setPage("Pro")} onLocations={() => setLocationSetupOpen(true)} onMascot={() => setMascotPickerOpen(true)} mascotId={mascotId} user={user} onAuth={handleAccount} syncStatus={syncStatus} savedAlerts={[localAlert, ...alerts].filter((alert) => savedAlertIds.includes(alert.id))} onClearDetails={clearPersonalDetails} />}
    {page === "Pro" && <ProDashboard onBack={() => setPage("Profile")} />}
    {page !== "Pro" && !selectedAlert && !localGuideOpen && <FloatingAI onClick={() => setAIOpen(true)} mascotId={mascotId} message={companionCondition.companionMessage} severity={companionCondition.severity} emergencyActive={sosPreviewActive || companionCondition.severity === "critical"} />}
    {page !== "Pro" && <BottomNav current={page} setCurrent={setPage} alertCount={[localAlert, ...alerts].length} />}
    {category && <CategoryDrawer title={category} onClose={() => setCategory(null)} onAI={() => setAIOpen(true)} onSourceEvent={(event, feed) => { setCategory(null); setSelectedSourceEvent({ event, feed }); }} monitoring={monitoring} sourceMonitoring={sourceMonitoring} />}
    {selectedAlert && <AlertDrawer alert={selectedAlert} onClose={() => setSelectedAlert(null)} saved={savedAlertIds.includes(selectedAlert.id)} onToggleSaved={toggleSavedAlert} />}
    {localGuideOpen && <LocalGuideDrawer monitoring={monitoring} onClose={() => setLocalGuideOpen(false)} onPreparedness={() => { setLocalGuideOpen(false); setPage("Preparedness"); }} onAskCompanion={() => { setLocalGuideOpen(false); setAIOpen(true); window.setTimeout(() => window.dispatchEvent(new CustomEvent("mynaid-companion-prompt", { detail: "Help me prepare for the current weather conditions in Bangkok." })), 0); }} />}
    {selectedSourceEvent && <SourceEventDrawer event={selectedSourceEvent.event} feed={selectedSourceEvent.feed} onClose={() => setSelectedSourceEvent(null)} />}
    {aiOpen && <AIPanel onClose={() => setAIOpen(false)} mascotId={mascotId} user={user} sourceMonitoring={sourceMonitoring} language={language} emergencyActive={sosPreviewActive || companionCondition.severity === "critical"} currentCoordinates={currentLocation.coordinates} locationLabel={currentLocation.label} />}
    {locationSetupOpen && <LocationSetup onClose={() => setLocationSetupOpen(false)} locations={savedLocations} signedIn={Boolean(user)} onSave={saveLocations} />}
    {mascotPickerOpen && <MascotPicker onClose={() => setMascotPickerOpen(false)} mascotId={mascotId} signedIn={Boolean(user)} onSave={saveMascot} />}
    {actionPage && <ActionPage title={actionPage} onClose={() => setActionPage(null)} />}
    {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
  </div>;
}
