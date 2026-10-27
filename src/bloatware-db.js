export const BLOATWARE_DATABASE = {
  // Facebook / Meta
  "com.facebook.katana": { name: "Facebook", category: "Social", safety: "safe", desc: "Main Facebook app. Safe to remove if you do not use Facebook." },
  "com.facebook.orca": { name: "Messenger", category: "Social", safety: "safe", desc: "Facebook Messenger client." },
  "com.facebook.system": { name: "Meta App Installer", category: "Telemetry", safety: "safe", desc: "Background installer service for Meta apps and tracking." },
  "com.facebook.appmanager": { name: "Meta App Manager", category: "Telemetry", safety: "safe", desc: "Background manager that auto-updates Facebook and collects analytics." },
  "com.facebook.services": { name: "Meta Services", category: "Telemetry", safety: "safe", desc: "Continuous background service for Meta telemetry. Recommended to disable." },

  // Microsoft
  "com.microsoft.skydrive": { name: "OneDrive", category: "Microsoft", safety: "safe", desc: "Microsoft cloud storage client. Safe to remove." },
  "com.microsoft.office.officehubrow": { name: "Microsoft 365 (Office)", category: "Microsoft", safety: "safe", desc: "Pre-installed Microsoft Office suite." },
  "com.microsoft.office.outlook": { name: "Outlook", category: "Microsoft", safety: "safe", desc: "Microsoft Outlook email app." },
  "com.linkedin.android": { name: "LinkedIn", category: "Social", safety: "safe", desc: "Pre-loaded LinkedIn professional network app." },

  // Google Redundant & Telemetry
  "com.google.android.youtube": { name: "YouTube", category: "Google", safety: "safe", desc: "Official YouTube video app." },
  "com.google.android.apps.tachyon": { name: "Google Meet (Duo)", category: "Google", safety: "safe", desc: "Google video calling client." },
  "com.google.android.music": { name: "Google Play Music", category: "Google", safety: "safe", desc: "Discontinued music app. Safe to remove." },
  "com.google.android.videos": { name: "Google TV", category: "Google", safety: "safe", desc: "Google Movies & TV streaming store." },
  "com.google.android.apps.photos": { name: "Google Photos", category: "Google", safety: "safe", desc: "Google cloud photo gallery and backup." },
  "com.google.android.apps.docs": { name: "Google Drive", category: "Google", safety: "safe", desc: "Google Drive cloud document viewer and storage." },
  "com.google.android.apps.podcasts": { name: "Google Podcasts", category: "Google", safety: "safe", desc: "Discontinued Google Podcasts app." },
  "com.google.android.feedback": { name: "Market Feedback Agent", category: "Telemetry", safety: "safe", desc: "Crash and feedback reporting daemon." },
  "com.google.android.apps.wellbeing": { name: "Digital Wellbeing", category: "Google", safety: "caution", desc: "Tracks screen time and app usage. Safe to disable, but stops wellbeing stats." },
  "com.google.android.googlequicksearchbox": { name: "Google App / Assistant", category: "Google", safety: "caution", desc: "Google Search bar and Assistant. Safe to disable if using alternative search." },
  "com.google.android.chrome": { name: "Google Chrome", category: "Google", safety: "safe", desc: "Chrome browser. Safe to remove if using another browser." },
  "com.google.android.gm": { name: "Gmail", category: "Google", safety: "safe", desc: "Google email client." },
  "com.google.android.apps.maps": { name: "Google Maps", category: "Google", safety: "safe", desc: "Google Maps navigation and location search." },
  "com.google.android.gms": { name: "Google Play Services", category: "Core", safety: "essential", desc: "CRITICAL: Required for push notifications, location APIs, and Play Store." },
  "com.google.android.vending": { name: "Google Play Store", category: "Core", safety: "essential", desc: "CRITICAL: Required to install, update, and license apps." },
  "com.google.android.gsf": { name: "Google Services Framework", category: "Core", safety: "essential", desc: "CRITICAL: Underpins all Google services communication." },

  // Samsung Bloatware
  "com.samsung.android.bixby.agent": { name: "Bixby Voice", category: "Samsung", safety: "safe", desc: "Samsung Bixby voice assistant. Safe to disable." },
  "com.samsung.android.bixby.service": { name: "Bixby Service", category: "Samsung", safety: "safe", desc: "Background framework for Bixby assistant." },
  "com.samsung.android.app.spage": { name: "Samsung Free / Daily", category: "Samsung", safety: "safe", desc: "Ad-heavy news feed left of Samsung home screen." },
  "com.samsung.android.game.gamehome": { name: "Gaming Hub", category: "Samsung", safety: "safe", desc: "Samsung game launcher with ads and promo notifications." },
  "com.samsung.android.game.gametools": { name: "Game Booster", category: "Samsung", safety: "safe", desc: "Samsung gaming overlay." },
  "com.samsung.android.game.gos": { name: "Game Optimizing Service (GOS)", category: "Samsung", safety: "safe", desc: "Throttles GPU/CPU performance during intensive apps." },
  "com.sec.android.app.samsungapps": { name: "Galaxy Store", category: "Samsung", safety: "caution", desc: "Samsung app store. Needed if you update Samsung system apps." },
  "com.samsung.android.spay": { name: "Samsung Wallet / Pay", category: "Samsung", safety: "caution", desc: "Contactless payment. Safe to disable if you do not use Samsung Pay." },
  "com.samsung.android.app.tips": { name: "Samsung Tips", category: "Samsung", safety: "safe", desc: "Introductory tutorial tooltips." },
  "com.samsung.android.kidsinstaller": { name: "Samsung Kids", category: "Samsung", safety: "safe", desc: "Kids mode stub installer." },
  "com.samsung.android.arzone": { name: "AR Zone", category: "Samsung", safety: "safe", desc: "Augmented reality camera stickers and 3D avatars." },
  "com.samsung.android.aremoji": { name: "AR Emoji", category: "Samsung", safety: "safe", desc: "Animated avatar generation daemon." },

  // Xiaomi / MIUI Bloatware
  "com.miui.analytics": { name: "MIUI Analytics", category: "Xiaomi", safety: "safe", desc: "MIUI user behavior analytics. Highly recommended to remove." },
  "com.miui.msa.global": { name: "MIUI System Ads (MSA)", category: "Xiaomi", safety: "safe", desc: "Xiaomi system ad pusher. Safe and recommended to remove." },
  "com.miui.bugreport": { name: "MIUI Bug Report", category: "Xiaomi", safety: "safe", desc: "Diagnostics and bug report telemetry sender." },
  "com.mi.globalbrowser": { name: "Mi Browser", category: "Xiaomi", safety: "safe", desc: "Default Xiaomi browser. Known for ad tracking." },
  "com.miui.videoplayer": { name: "Mi Video", category: "Xiaomi", safety: "safe", desc: "Xiaomi media player containing online ad content." },
  "com.miui.player": { name: "Mi Music", category: "Xiaomi", safety: "safe", desc: "Xiaomi music player with integrated stream ads." },
  "com.miui.yellowpage": { name: "Yellow Pages", category: "Xiaomi", safety: "safe", desc: "Caller identification and commercial directory." },
  "com.xiaomi.joyose": { name: "Joyose", category: "Xiaomi", safety: "safe", desc: "System throttling daemon. Safe to remove." },

  // Carrier Bloatware
  "com.vzw.hss.myverizon": { name: "My Verizon", category: "Carrier", safety: "safe", desc: "Verizon account app and carrier telemetry." },
  "com.att.myWireless": { name: "myAT&T", category: "Carrier", safety: "safe", desc: "AT&T wireless carrier management app." },
  "com.tmobile.pr.mytmobile": { name: "T-Mobile", category: "Carrier", safety: "safe", desc: "T-Mobile account manager." },
  "com.sprint.ms.smf.services": { name: "Sprint Services", category: "Carrier", safety: "safe", desc: "Legacy Sprint carrier service package." },
  "com.vodafone.vodafoneplay": { name: "Vodafone Play", category: "Carrier", safety: "safe", desc: "Vodafone carrier media app." },

  // Pre-installed Third-Party Commercial Apps
  "com.amazon.mShop.android.shopping": { name: "Amazon Shopping", category: "OEM", safety: "safe", desc: "Pre-installed Amazon shopping client." },
  "com.amazon.appmanager": { name: "Amazon App Manager", category: "OEM", safety: "safe", desc: "Pre-installed Amazon background updater." },
  "com.netflix.partner.activation": { name: "Netflix Activation", category: "OEM", safety: "safe", desc: "Pre-loaded Netflix activation stub." },
  "com.netflix.mediaclient": { name: "Netflix", category: "OEM", safety: "safe", desc: "Netflix video streaming app." },
  "com.spotify.music": { name: "Spotify", category: "OEM", safety: "safe", desc: "Pre-installed Spotify music client." },
  "com.zhiliaoapp.musically": { name: "TikTok", category: "Social", safety: "safe", desc: "Pre-installed TikTok short video app." }
};

export const PROTECTED_SYSTEM_PACKAGES = [
  "android",
  "com.android.settings",
  "com.android.systemui",
  "com.google.android.permissioncontroller",
  "com.google.android.packageinstaller",
  "com.android.phone",
  "com.android.providers.telephony",
  "com.google.android.gms",
  "com.google.android.vending",
  "com.google.android.gsf"
];

export function getPackageMeta(pkgName) {
  if (BLOATWARE_DATABASE[pkgName]) {
    return BLOATWARE_DATABASE[pkgName];
  }

  const lower = pkgName.toLowerCase();
  let category = "General";
  let safety = "unknown";
  let desc = "Installed Android package.";

  if (lower.includes("facebook") || lower.includes("meta.")) {
    category = "Social";
    safety = "safe";
    desc = "Facebook/Meta background service or client.";
  } else if (lower.includes("vzw") || lower.includes("verizon") || lower.includes("att.") || lower.includes("tmobile") || lower.includes("sprint")) {
    category = "Carrier";
    safety = "safe";
    desc = "Carrier-installed account manager or analytics.";
  } else if (lower.includes("analytics") || lower.includes("telemetry") || lower.includes("tracking")) {
    category = "Telemetry";
    safety = "safe";
    desc = "Diagnostics and telemetry collection service.";
  } else if (lower.includes("samsung") || lower.includes("sec.android")) {
    category = "Samsung";
    safety = "caution";
    desc = "Samsung OEM application or component.";
  } else if (lower.includes("miui") || lower.includes("xiaomi")) {
    category = "Xiaomi";
    safety = "caution";
    desc = "Xiaomi OEM application or service.";
  }

  const parts = pkgName.split(".");
  const suffix = parts[parts.length - 1].replace(/[_-]/g, " ");
  const name = suffix.charAt(0).toUpperCase() + suffix.slice(1);

  if (PROTECTED_SYSTEM_PACKAGES.some(p => pkgName === p || pkgName.startsWith(p + "."))) {
    safety = "essential";
    desc = "Critical Android operating system component. Protected from modification.";
  }

  return { name, category, safety, desc };
}
