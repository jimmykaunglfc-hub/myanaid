# MyanAid

MyanAid is a global, AI-powered safety companion that turns verified emergency data into clear, location-aware actions.

## Problem

During an emergency, people receive fragmented alerts, technical forecasts, and conflicting information. They may not know whether an event affects them or what to do next.

## Solution

MyanAid combines trusted disaster, weather, earthquake, fire, and air-quality data with Gemini AI to provide:

- Location-aware alerts for current and saved locations
- Clear, source-cited AI Action Briefs
- Flood, storm, earthquake, fire, haze, and air-quality monitoring
- Multilingual safety guidance
- Offline emergency safety packs
- An optional Safety Companion mascot for alert delivery

## MVP

The first version will include:

1. Saved locations
2. Weather data from Open-Meteo
3. Earthquake alerts from USGS
4. Global disaster events from GDACS
5. A live alert map
6. Gemini-generated AI Action Briefs
7. Offline safety packs
8. Push-notification simulation

## Safety principles

- Official guidance always takes priority.
- AI must cite its sources and confidence level.
- MyanAid does not issue evacuation orders.
- Modelled or satellite data must be clearly labelled.
- Missing data means unknown conditions, not safe conditions.

## H5 app-package downloads

The H5 app detects Android and iOS browsers and offers the corresponding
package from the entry dialog and Profile page. Configure the public URLs in
the environment used to build the static site:

```bash
NEXT_PUBLIC_ANDROID_DOWNLOAD_URL=https://downloads.example.com/MyanAid.apk
NEXT_PUBLIC_IOS_DOWNLOAD_URL=https://testflight.apple.com/join/your-code
```

Android may use a signed HTTPS APK or Play Store landing page. iOS must use a
TestFlight, App Store, or signed HTTPS `itms-services` distribution manifest;
Safari cannot install an arbitrary unsigned `.ipa` file. The prompt is not
shown inside the installed Capacitor app, and no device information is sent or
stored for detection.

## Public monitoring ingestion

The browser can show a temporary public-feed fallback during local development.
For production, `functions/index.js` runs every 15 minutes and stores only
provider facts and provenance in these Firestore documents:

- `sourceEvents/weather-bangkok` — Open-Meteo modelled weather conditions
- `sourceEvents/earthquake-latest` — latest USGS M4.5+ event
- `sourceEvents/earthquake-{id}` — an archival record for the observed USGS event

Browsers can read `sourceEvents`, but cannot write to them. The server-side
Firebase Function is the only writer through the Admin SDK.

### Deploying the monitoring worker

Cloud Functions and scheduled jobs require the Firebase **Blaze** plan. After
upgrading the Firebase project and signing into the CLI, deploy the rules,
Function, and website from the project root:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,functions,hosting
```

The Firebase CLI prints the Function deployment status. After its first
scheduled run, open Firestore and look for the `sourceEvents` collection.
The schedule may take up to 15 minutes to produce the first records.
