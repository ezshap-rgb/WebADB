# WebADB — Android Debloater & Device Manager

A modern, in-browser Android debloater and device controller powered by WebUSB. 

WebADB allows you to clean bloatware, disable telemetry, uninstall system apps for user 0, and reboot your phone **directly from Google Chrome, Edge, or Brave with zero software installation on the PC or phone**.

It also supports **Phone-to-Phone debloating**: connect two Android phones with a USB-C to USB-C cable and debloat one phone from the other's browser!

---

## 🚀 Quick Start

### 1. Run Locally
```bash
# In the WebADB folder:
npm install
npm run dev
```
Then open the local URL (typically `http://localhost:5173`) in Google Chrome, Microsoft Edge, or Brave.

### 2. Or Build Static Distribution
```bash
npm run build
```
The compiled `dist/` folder can be hosted on GitHub Pages, Cloudflare Pages, or Vercel with zero server costs.

---

## 📱 How to Connect Your Device

### Desktop / PC to Phone:
1. On your Android phone, enable Developer options (**Settings > About phone > tap Build number 7 times**).
2. Go to **Settings > Developer options** and turn on **USB debugging**.
3. Plug the phone into your computer using a USB data cable.
4. Open WebADB in Chrome/Edge, click **Connect WebUSB**, and select your device.
5. Tap **Allow** on the USB debugging authorization prompt that appears on your phone screen.

### Phone-to-Phone (No PC required!):
1. Connect Phone A (Controller) to Phone B (Target phone) with a **USB-C to USB-C cable**.
2. Make sure USB Debugging is turned on on Phone B.
3. Open WebADB in Chrome on Phone A and tap **Connect WebUSB**.
4. Grant the browser USB permission on Phone A and tap **Allow USB debugging** on Phone B.

---

## ✨ Features

- **Zero Install**: No Python, no platform-tools, and no drivers required.
- **Debloating Intelligence**: 150+ categorized bloatware packages with safety ratings (**Safe**, **Caution**, **Essential**) and human-readable descriptions.
- **One-Click Safe Selection**: Instantly select all recommended safe bloatware packages across Google, Samsung, Xiaomi, and Carriers.
- **Accurate State Tracking**: Live status pills for **Enabled**, **Disabled**, and **Uninstalled (User 0)**.
- **Non-Root Safe Execution**:
  - Disable: `pm disable-user --user 0 <pkg>`
  - Enable: `pm enable <pkg>`
  - Uninstall: `pm uninstall --user 0 <pkg>`
  - Restore: `cmd package install-existing <pkg>`
- **Critical Component Safeguards**: Blocks deletion of vital system frameworks and warns before touching active launchers or keyboards.
- **App Inspector**: Click on any package to see its APK path, description, category, and trigger **Force Stop** or **Clear Cache & Data**.
- **Interactive Simulator / Demo Mode**: Explore and test all features without needing a phone plugged in.
- **Hardware Power & Recovery**: Quick reboot triggers to restart normally, reboot into **Recovery**, or reboot into **Fastboot/Bootloader**.
- **Integrated Web Shell**: Interactive terminal console to run custom ADB commands with real-time output.
- **Export & Import Snapshots**: Save your package configuration to a JSON file to backup or restore across devices.
