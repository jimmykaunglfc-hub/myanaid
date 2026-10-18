"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type AppLocale = "en" | "my" | "fr" | "de" | "hi" | "id" | "ja" | "km" | "ko" | "lo" | "ms" | "es" | "tl" | "th";

export const appLanguages: Array<{ code: AppLocale; label: string; flag: string }> = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "my", label: "မြန်မာ", flag: "🇲🇲" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "km", label: "ខ្មែរ", flag: "🇰🇭" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "lo", label: "ລາວ", flag: "🇱🇦" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "tl", label: "Tagalog", flag: "🇵🇭" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
];

const legacyLocale: Record<string, AppLocale> = {
  English: "en", "မြန်မာ": "my", Français: "fr", Deutsch: "de", "हिन्दी": "hi", "Bahasa Indonesia": "id",
  "日本語": "ja", "ខ្មែរ": "km", "한국어": "ko", "ລາວ": "lo", "Bahasa Melayu": "ms", Español: "es", Tagalog: "tl", "ไทย": "th",
};

const englishMessages: Record<string, string> = {
  "brand.tagline": "Prepared. Informed. Safer together.", language: "Language", findingLocation: "Finding your location…", openProfile: "Open profile", signIn: "Sign in",
  "hero.action": "What to do now", "hero.map": "Live map", nearYou: "Near you", viewMap: "View map", currentWeatherSafety: "Current local weather safety", readLocalGuide: "Read local guide",
  checkingWeather: "Checking latest local weather observations", liveData: "Live data", connectingSources: "Connecting to public data sources…", lastChecked: "Last checked {value}",
  emergencyCategories: "Emergency categories", preparedness: "Preparedness", makePlan: "Make a plan before you need it", disclaimer: "Information can change. Follow local authorities for emergency instructions.",
  visualPreview: "Visual preview", home: "Home", map: "Map", alerts: "Alerts", profile: "Profile", liveMap: "Live map", searchLocation: "Search a city, region or country", mapView: "Map view", earthView: "Earth view", nearMe: "Near me", allAlerts: "All alerts", refresh: "Refresh", refreshing: "Refreshing…", searchAlerts: "Search a place, event or source", updates: "updates", updatedNow: "Updated just now",
};

const withEnglish = (translations: Record<string, string>): Record<string, string> => ({ ...englishMessages, ...translations });

const messages: Record<AppLocale, Record<string, string>> = {
  en: englishMessages,
  my: {
    "brand.tagline": "ကြိုတင်ပြင်ဆင်ပါ။ အသိပေးထားပါ။ အတူတကွ ပိုလုံခြုံပါ။",
    "language": "ဘာသာစကား",
    "findingLocation": "သင့်တည်နေရာကို ရှာဖွေနေသည်…",
    "openProfile": "ပရိုဖိုင်ဖွင့်ရန်",
    "signIn": "အကောင့်ဝင်ရန်",
    "hero.action": "ယခု ဘာလုပ်ရမလဲ",
    "hero.map": "တိုက်ရိုက်မြေပုံ",
    "nearYou": "သင့်အနီးအနား",
    "viewMap": "မြေပုံကြည့်ရန်",
    "currentWeatherSafety": "လက်ရှိဒေသရာသီဥတု ဘေးကင်းရေး",
    "readLocalGuide": "ဒေသလမ်းညွှန်ကို ဖတ်ရန်",
    "checkingWeather": "နောက်ဆုံးဒေသရာသီဥတုကို စစ်ဆေးနေသည်",
    "liveData": "တိုက်ရိုက်ဒေတာ",
    "connectingSources": "အများပြည်သူဒေတာရင်းမြစ်များသို့ ချိတ်ဆက်နေသည်…",
    "lastChecked": "နောက်ဆုံးစစ်ဆေးချိန် {value}",
    "emergencyCategories": "အရေးပေါ်အမျိုးအစားများ",
    "preparedness": "ကြိုတင်ပြင်ဆင်မှု",
    "makePlan": "လိုအပ်မလာမီ အစီအစဉ်တစ်ခု ပြုလုပ်ပါ",
    "disclaimer": "အချက်အလက်များ ပြောင်းလဲနိုင်သည်။ အရေးပေါ်ညွှန်ကြားချက်များအတွက် ဒေသအာဏာပိုင်များကို လိုက်နာပါ။",
    "visualPreview": "မြင်ကွင်းကြိုတင်ကြည့်ရှုမှု",
    "home": "ပင်မ",
    "map": "မြေပုံ",
    "alerts": "သတိပေးချက်များ",
    "profile": "ပရိုဖိုင်",
    "liveMap": "တိုက်ရိုက်မြေပုံ",
    "searchLocation": "မြို့၊ ဒေသ သို့မဟုတ် နိုင်ငံကို ရှာရန်",
    "mapView": "မြေပုံမြင်ကွင်း",
    "earthView": "ကမ္ဘာမြင်ကွင်း",
    "nearMe": "ကျွန်ုပ်အနီး",
    "allAlerts": "သတိပေးချက်အားလုံး",
    "refresh": "ပြန်လည်စစ်ဆေးရန်",
    "refreshing": "ပြန်လည်စစ်ဆေးနေသည်…",
    "searchAlerts": "နေရာ၊ အဖြစ်အပျက် သို့မဟုတ် ရင်းမြစ်ကို ရှာရန်",
    "updates": "အပ်ဒိတ်များ",
    "updatedNow": "ယခု အပ်ဒိတ်လုပ်ထားသည်",
  },
  th: {
    "brand.tagline": "พร้อมเสมอ รับรู้ข้อมูล ปลอดภัยไปด้วยกัน",
    "language": "ภาษา",
    "findingLocation": "กำลังค้นหาตำแหน่งของคุณ…",
    "openProfile": "เปิดโปรไฟล์",
    "signIn": "เข้าสู่ระบบ",
    "hero.action": "สิ่งที่ควรทำตอนนี้",
    "hero.map": "แผนที่สด",
    "nearYou": "ใกล้คุณ",
    "viewMap": "ดูแผนที่",
    "currentWeatherSafety": "ความปลอดภัยจากสภาพอากาศในพื้นที่",
    "readLocalGuide": "อ่านคู่มือท้องถิ่น",
    "checkingWeather": "กำลังตรวจสอบสภาพอากาศล่าสุดในพื้นที่",
    "liveData": "ข้อมูลสด",
    "connectingSources": "กำลังเชื่อมต่อแหล่งข้อมูลสาธารณะ…",
    "lastChecked": "ตรวจสอบล่าสุด {value}",
    "emergencyCategories": "หมวดเหตุฉุกเฉิน",
    "preparedness": "การเตรียมพร้อม",
    "makePlan": "วางแผนก่อนที่คุณจะต้องใช้",
    "disclaimer": "ข้อมูลอาจเปลี่ยนแปลงได้ โปรดปฏิบัติตามหน่วยงานท้องถิ่นสำหรับคำแนะนำฉุกเฉิน",
    "visualPreview": "ตัวอย่างภาพ",
    "home": "หน้าหลัก",
    "map": "แผนที่",
    "alerts": "การแจ้งเตือน",
    "profile": "โปรไฟล์",
    "liveMap": "แผนที่สด",
    "searchLocation": "ค้นหาเมือง ภูมิภาค หรือประเทศ",
    "mapView": "มุมมองแผนที่",
    "earthView": "มุมมองโลก",
    "nearMe": "ใกล้ฉัน",
    "allAlerts": "การแจ้งเตือนทั้งหมด",
    "refresh": "รีเฟรช",
    "refreshing": "กำลังรีเฟรช…",
    "searchAlerts": "ค้นหาสถานที่ เหตุการณ์ หรือแหล่งข้อมูล",
    "updates": "อัปเดต",
    "updatedNow": "อัปเดตเมื่อสักครู่",
  },
  id: {
    "brand.tagline": "Siap. Terinformasi. Lebih aman bersama.",
    "language": "Bahasa",
    "findingLocation": "Mencari lokasi Anda…",
    "openProfile": "Buka profil",
    "signIn": "Masuk",
    "hero.action": "Yang perlu dilakukan sekarang",
    "hero.map": "Peta langsung",
    "nearYou": "Di dekat Anda",
    "viewMap": "Lihat peta",
    "currentWeatherSafety": "Keamanan cuaca lokal saat ini",
    "readLocalGuide": "Baca panduan lokal",
    "checkingWeather": "Memeriksa pengamatan cuaca lokal terbaru",
    "liveData": "Data langsung",
    "connectingSources": "Menghubungkan ke sumber data publik…",
    "lastChecked": "Terakhir diperiksa {value}",
    "emergencyCategories": "Kategori darurat",
    "preparedness": "Kesiapsiagaan",
    "makePlan": "Buat rencana sebelum Anda membutuhkannya",
    "disclaimer": "Informasi dapat berubah. Ikuti otoritas setempat untuk petunjuk darurat.",
    "visualPreview": "Pratinjau visual",
    "home": "Beranda",
    "map": "Peta",
    "alerts": "Peringatan",
    "profile": "Profil",
    "liveMap": "Peta langsung",
    "searchLocation": "Cari kota, wilayah, atau negara",
    "mapView": "Tampilan peta",
    "earthView": "Tampilan bumi",
    "nearMe": "Dekat saya",
    "allAlerts": "Semua peringatan",
    "refresh": "Segarkan",
    "refreshing": "Menyegarkan…",
    "searchAlerts": "Cari tempat, kejadian, atau sumber",
    "updates": "pembaruan",
    "updatedNow": "Baru saja diperbarui",
  },
  fr: withEnglish({
    "brand.tagline": "Prêts. Informés. Plus en sécurité ensemble.", language: "Langue", findingLocation: "Recherche de votre position…", signIn: "Se connecter", "hero.action": "Que faire maintenant", "hero.map": "Carte en direct", nearYou: "Près de vous", viewMap: "Voir la carte", currentWeatherSafety: "Sécurité météo locale actuelle", readLocalGuide: "Lire le guide local", liveData: "Données en direct", lastChecked: "Dernière vérification {value}", preparedness: "Préparation", visualPreview: "Aperçu visuel", home: "Accueil", map: "Carte", alerts: "Alertes", profile: "Profil", liveMap: "Carte en direct", searchLocation: "Rechercher une ville, région ou pays", mapView: "Vue carte", earthView: "Vue Terre", nearMe: "Près de moi", allAlerts: "Toutes les alertes", refresh: "Actualiser", refreshing: "Actualisation…", updatedNow: "Mis à jour à l’instant",
  }),
  de: withEnglish({
    "brand.tagline": "Vorbereitet. Informiert. Gemeinsam sicherer.", language: "Sprache", findingLocation: "Standort wird gesucht…", signIn: "Anmelden", "hero.action": "Was jetzt zu tun ist", "hero.map": "Live-Karte", nearYou: "In Ihrer Nähe", viewMap: "Karte anzeigen", currentWeatherSafety: "Aktuelle lokale Wettersicherheit", readLocalGuide: "Lokalen Leitfaden lesen", liveData: "Live-Daten", lastChecked: "Zuletzt geprüft {value}", preparedness: "Vorsorge", visualPreview: "Visuelle Vorschau", home: "Startseite", map: "Karte", alerts: "Warnungen", profile: "Profil", liveMap: "Live-Karte", searchLocation: "Stadt, Region oder Land suchen", mapView: "Kartenansicht", earthView: "Erdansicht", nearMe: "In meiner Nähe", allAlerts: "Alle Warnungen", refresh: "Aktualisieren", refreshing: "Wird aktualisiert…", updatedNow: "Gerade aktualisiert",
  }),
  hi: withEnglish({
    "brand.tagline": "तैयार। सूचित। साथ मिलकर अधिक सुरक्षित।", language: "भाषा", findingLocation: "आपका स्थान खोजा जा रहा है…", signIn: "साइन इन करें", "hero.action": "अब क्या करें", "hero.map": "लाइव मैप", nearYou: "आपके पास", viewMap: "मानचित्र देखें", currentWeatherSafety: "वर्तमान स्थानीय मौसम सुरक्षा", readLocalGuide: "स्थानीय मार्गदर्शिका पढ़ें", liveData: "लाइव डेटा", lastChecked: "अंतिम जाँच {value}", preparedness: "तैयारी", visualPreview: "दृश्य पूर्वावलोकन", home: "होम", map: "मानचित्र", alerts: "अलर्ट", profile: "प्रोफ़ाइल", liveMap: "लाइव मैप", searchLocation: "शहर, क्षेत्र या देश खोजें", mapView: "मानचित्र दृश्य", earthView: "पृथ्वी दृश्य", nearMe: "मेरे पास", allAlerts: "सभी अलर्ट", refresh: "रिफ़्रेश", refreshing: "रिफ़्रेश हो रहा है…", updatedNow: "अभी अपडेट किया गया",
  }),
  ja: withEnglish({
    "brand.tagline": "備える。知る。ともに、より安全に。", language: "言語", findingLocation: "現在地を検索しています…", signIn: "サインイン", "hero.action": "今できること", "hero.map": "ライブマップ", nearYou: "周辺", viewMap: "地図を見る", currentWeatherSafety: "現在の地域の気象安全", readLocalGuide: "地域ガイドを読む", liveData: "ライブデータ", lastChecked: "最終確認 {value}", preparedness: "備え", visualPreview: "ビジュアルプレビュー", home: "ホーム", map: "地図", alerts: "アラート", profile: "プロフィール", liveMap: "ライブマップ", searchLocation: "都市、地域、国を検索", mapView: "地図表示", earthView: "地球表示", nearMe: "現在地付近", allAlerts: "すべてのアラート", refresh: "更新", refreshing: "更新中…", updatedNow: "たった今更新",
  }),
  km: withEnglish({
    "brand.tagline": "ត្រៀមខ្លួន។ ទទួលព័ត៌មាន។ សុវត្ថិភាពជាងមុនជាមួយគ្នា។", language: "ភាសា", findingLocation: "កំពុងស្វែងរកទីតាំងរបស់អ្នក…", signIn: "ចូលគណនី", "hero.action": "អ្វីដែលត្រូវធ្វើឥឡូវនេះ", "hero.map": "ផែនទីផ្ទាល់", nearYou: "នៅជិតអ្នក", viewMap: "មើលផែនទី", liveData: "ទិន្នន័យផ្ទាល់", preparedness: "ការត្រៀមខ្លួន", home: "ទំព័រដើម", map: "ផែនទី", alerts: "ការជូនដំណឹង", profile: "ប្រវត្តិរូប", liveMap: "ផែនទីផ្ទាល់", searchLocation: "ស្វែងរកទីក្រុង តំបន់ ឬប្រទេស", mapView: "ទិដ្ឋភាពផែនទី", earthView: "ទិដ្ឋភាពផែនដី", nearMe: "នៅជិតខ្ញុំ", allAlerts: "ការជូនដំណឹងទាំងអស់", refresh: "ធ្វើបច្ចុប្បន្នភាព", refreshing: "កំពុងធ្វើបច្ចុប្បន្នភាព…",
  }),
  ko: withEnglish({
    "brand.tagline": "준비하고, 정보를 알고, 함께 더 안전하게.", language: "언어", findingLocation: "현재 위치를 찾는 중…", signIn: "로그인", "hero.action": "지금 할 일", "hero.map": "실시간 지도", nearYou: "내 주변", viewMap: "지도 보기", currentWeatherSafety: "현재 지역 날씨 안전", readLocalGuide: "지역 안내 읽기", liveData: "실시간 데이터", lastChecked: "마지막 확인 {value}", preparedness: "대비", visualPreview: "시각 미리보기", home: "홈", map: "지도", alerts: "알림", profile: "프로필", liveMap: "실시간 지도", searchLocation: "도시, 지역 또는 국가 검색", mapView: "지도 보기", earthView: "지구 보기", nearMe: "내 주변", allAlerts: "모든 알림", refresh: "새로고침", refreshing: "새로고침 중…", updatedNow: "방금 업데이트됨",
  }),
  lo: withEnglish({
    "brand.tagline": "ພ້ອມ. ຮູ້ຂໍ້ມູນ. ປອດໄພກວ່າໄປດ້ວຍກັນ.", language: "ພາສາ", findingLocation: "ກຳລັງຊອກຫາຕຳແໜ່ງຂອງທ່ານ…", signIn: "ເຂົ້າລະບົບ", "hero.action": "ສິ່ງທີ່ຄວນເຮັດຕອນນີ້", "hero.map": "ແຜນທີ່ສົດ", nearYou: "ໃກ້ທ່ານ", viewMap: "ເບິ່ງແຜນທີ່", liveData: "ຂໍ້ມູນສົດ", preparedness: "ການກະກຽມ", home: "ໜ້າຫຼັກ", map: "ແຜນທີ່", alerts: "ແຈ້ງເຕືອນ", profile: "ໂປຣໄຟລ໌", liveMap: "ແຜນທີ່ສົດ", searchLocation: "ຊອກຫາເມືອງ ເຂດ ຫຼື ປະເທດ", mapView: "ມຸມມອງແຜນທີ່", earthView: "ມຸມມອງໂລກ", nearMe: "ໃກ້ຂ້ອຍ", allAlerts: "ແຈ້ງເຕືອນທັງໝົດ", refresh: "ໂຫຼດໃໝ່", refreshing: "ກຳລັງໂຫຼດໃໝ່…",
  }),
  ms: withEnglish({
    "brand.tagline": "Bersedia. Bermaklumat. Lebih selamat bersama.", language: "Bahasa", findingLocation: "Mencari lokasi anda…", signIn: "Log masuk", "hero.action": "Apa yang perlu dilakukan sekarang", "hero.map": "Peta langsung", nearYou: "Berhampiran anda", viewMap: "Lihat peta", currentWeatherSafety: "Keselamatan cuaca tempatan semasa", readLocalGuide: "Baca panduan tempatan", liveData: "Data langsung", lastChecked: "Semakan terakhir {value}", preparedness: "Persediaan", visualPreview: "Pratonton visual", home: "Utama", map: "Peta", alerts: "Amaran", profile: "Profil", liveMap: "Peta langsung", searchLocation: "Cari bandar, wilayah atau negara", mapView: "Paparan peta", earthView: "Paparan bumi", nearMe: "Dekat saya", allAlerts: "Semua amaran", refresh: "Muat semula", refreshing: "Memuat semula…", updatedNow: "Baru dikemas kini",
  }),
  es: withEnglish({
    "brand.tagline": "Preparados. Informados. Más seguros juntos.", language: "Idioma", findingLocation: "Buscando tu ubicación…", signIn: "Iniciar sesión", "hero.action": "Qué hacer ahora", "hero.map": "Mapa en vivo", nearYou: "Cerca de ti", viewMap: "Ver mapa", currentWeatherSafety: "Seguridad meteorológica local actual", readLocalGuide: "Leer guía local", liveData: "Datos en vivo", lastChecked: "Última revisión {value}", preparedness: "Preparación", visualPreview: "Vista previa visual", home: "Inicio", map: "Mapa", alerts: "Alertas", profile: "Perfil", liveMap: "Mapa en vivo", searchLocation: "Buscar una ciudad, región o país", mapView: "Vista de mapa", earthView: "Vista de la Tierra", nearMe: "Cerca de mí", allAlerts: "Todas las alertas", refresh: "Actualizar", refreshing: "Actualizando…", updatedNow: "Actualizado ahora",
  }),
  tl: withEnglish({
    "brand.tagline": "Handa. May alam. Mas ligtas na magkakasama.", language: "Wika", findingLocation: "Hinahanap ang iyong lokasyon…", signIn: "Mag-sign in", "hero.action": "Ano ang gagawin ngayon", "hero.map": "Live na mapa", nearYou: "Malapit sa iyo", viewMap: "Tingnan ang mapa", currentWeatherSafety: "Kasalukuyang lokal na kaligtasan sa panahon", readLocalGuide: "Basahin ang lokal na gabay", liveData: "Live na datos", lastChecked: "Huling nasuri {value}", preparedness: "Paghahanda", visualPreview: "Biswal na preview", home: "Home", map: "Mapa", alerts: "Mga alerto", profile: "Profile", liveMap: "Live na mapa", searchLocation: "Maghanap ng lungsod, rehiyon o bansa", mapView: "Tanaw ng mapa", earthView: "Tanaw ng mundo", nearMe: "Malapit sa akin", allAlerts: "Lahat ng alerto", refresh: "I-refresh", refreshing: "Nire-refresh…", updatedNow: "Kaka-update lang",
  }),
};

type Translation = (key: string, values?: Record<string, string | number>) => string;
type LocaleContextValue = { locale: AppLocale; setLocale: (locale: AppLocale) => void; t: Translation; language: (typeof appLanguages)[number] };
const LocaleContext = createContext<LocaleContextValue | null>(null);

type GeminiTranslation = { source: string; translated: string };
const publicTranslationCache = new Map<string, string>();

// Use this only for public product copy or verified provider/weather text.
// Do not pass profile, family, location-sharing, form, or account data here.
export function PublicTranslation({ text }: { text: string }) {
  const { locale } = useAppI18n();
  const [translated, setTranslated] = useState(text);
  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${locale}:${text}`;
    const translationFunctions = functions;
    if (locale === "en" || !translationFunctions || !text.trim()) { setTranslated(text); return; }
    const cached = publicTranslationCache.get(cacheKey);
    if (cached) { setTranslated(cached); return; }
    setTranslated(text);
    const translate = async () => {
      try {
        const call = httpsCallable<{ locale: AppLocale; texts: string[] }, { translations: GeminiTranslation[] }>(translationFunctions, "translateInterfaceText");
        const result = await call({ locale, texts: [text] });
        const value = result.data.translations[0]?.translated;
        if (value) {
          publicTranslationCache.set(cacheKey, value);
          if (!cancelled) setTranslated(value);
        }
      } catch {
        // Static i18n copy remains available if Gemini is temporarily busy.
      }
    };
    void translate();
    return () => { cancelled = true; };
  }, [locale, text]);
  return <>{translated}</>;
}

function detectLocale(): AppLocale {
  if (typeof window === "undefined") return "en";
  const pathLocale = window.location.pathname.split("/").filter(Boolean)[0];
  if (appLanguages.some((language) => language.code === pathLocale)) return pathLocale as AppLocale;
  const saved = window.localStorage.getItem("myanaid-locale") || window.localStorage.getItem("myanaid-language") || "";
  return appLanguages.find((language) => language.code === saved)?.code ?? legacyLocale[saved] ?? "en";
}

export function AppLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("en");
  useEffect(() => setLocaleState(detectLocale()), []);
  const setLocale = (nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem("myanaid-locale", nextLocale);
    const nextPath = nextLocale === "en" ? "/" : `/${nextLocale}`;
    window.history.replaceState(null, "", `${nextPath}${window.location.search}${window.location.hash}`);
  };
  const value = useMemo<LocaleContextValue>(() => {
    const t: Translation = (key, values) => Object.entries(values ?? {}).reduce((text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)), messages[locale][key] ?? key);
    return { locale, setLocale, t, language: appLanguages.find((item) => item.code === locale) ?? appLanguages[0] };
  }, [locale]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useAppI18n() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useAppI18n must be used inside AppLocaleProvider");
  return context;
}
