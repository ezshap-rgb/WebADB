import { Adb, AdbDaemonTransport } from '@yume-chan/adb';
import { AdbDaemonWebUsbDeviceManager } from '@yume-chan/adb-daemon-webusb';
import AdbWebCredentialStore from '@yume-chan/adb-credential-web';
import { BLOATWARE_DATABASE, getPackageMeta } from './bloatware-db.js';

export class WebAdbEngine {
  constructor() {
    this.adb = null;
    this.usbDevice = null;
    this.isConnected = false;
    this.isDemoMode = false;
    this.deviceInfo = {
      model: "Unknown Device",
      manufacturer: "Android",
      version: "Unknown",
      sdk: "Unknown",
      serial: ""
    };
    this.packages = new Map();
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error(e);
      }
    }
  }

  isWebUsbSupported() {
    return !!(typeof navigator !== 'undefined' && navigator.usb);
  }

  async connectWebUsb() {
    if (!this.isWebUsbSupported()) {
      throw new Error("WebUSB is not supported in this browser or context. Please use Chrome/Edge on HTTPS or localhost.");
    }

    try {
      const manager = new AdbDaemonWebUsbDeviceManager(navigator.usb);
      const device = await manager.requestDevice();
      if (!device) {
        return false;
      }

      this.usbDevice = device;
      const connection = await device.connect();
      const credentialStore = new AdbWebCredentialStore();

      const transport = await AdbDaemonTransport.authenticate({
        serial: device.serial,
        connection,
        credentialStore
      });

      this.adb = new Adb(transport);
      this.isConnected = true;
      this.isDemoMode = false;

      // Handle disconnect
      this.adb.disconnected.then(() => {
        this.disconnect();
      }).catch(() => {});

      // Query real device properties
      let model = "Android Device";
      let manufacturer = "Android";
      let version = "Unknown";
      let sdk = "Unknown";

      try {
        model = (await this.runAdbCommand("getprop ro.product.model")).trim() || model;
        manufacturer = (await this.runAdbCommand("getprop ro.product.manufacturer")).trim() || manufacturer;
        version = (await this.runAdbCommand("getprop ro.build.version.release")).trim() || version;
        sdk = (await this.runAdbCommand("getprop ro.build.version.sdk")).trim() || sdk;
      } catch (e) {
        console.warn("Could not read getprop:", e);
      }

      this.deviceInfo = {
        model,
        manufacturer,
        version: "Android " + version,
        sdk,
        serial: device.serial || "USB-DEVICE"
      };

      this.emit("connected", { mode: "webusb", device: this.deviceInfo });
      await this.loadDevicePackages();
      return true;
    } catch (err) {
      this.disconnect();
      throw err;
    }
  }

  startDemoMode() {
    this.adb = null;
    this.usbDevice = null;
    this.isConnected = true;
    this.isDemoMode = true;
    this.deviceInfo = {
      model: "Galaxy S24 Ultra",
      manufacturer: "Samsung",
      version: "Android 14 (OneUI 6.1)",
      sdk: "34",
      serial: "DEMO-USB-HOST"
    };

    this.packages.clear();
    const demoPackages = [
      ...Object.keys(BLOATWARE_DATABASE),
      "com.android.chrome",
      "com.android.settings",
      "com.android.systemui",
      "com.android.phone",
      "com.android.providers.telephony",
      "com.google.android.apps.messaging",
      "com.google.android.dialer",
      "com.google.android.calendar",
      "com.google.android.deskclock",
      "com.google.android.calculator",
      "com.sec.android.app.camera",
      "com.sec.android.gallery3d",
      "com.samsung.android.messaging",
      "com.samsung.android.dialer",
      "com.samsung.android.calendar"
    ];

    for (const pkg of demoPackages) {
      const meta = getPackageMeta(pkg);
      let status = "Enabled";
      if (pkg.includes("bixby.service") || pkg.includes("analytics")) {
        status = "Disabled";
      } else if (pkg.includes("music") || pkg.includes("podcasts")) {
        status = "Uninstalled (User 0)";
      }

      const isSystem = !pkg.includes("whatsapp") && !pkg.includes("spotify") && !pkg.includes("tiktok");

      this.packages.set(pkg, {
        package: pkg,
        name: meta.name,
        category: meta.category,
        safety: meta.safety,
        status: status,
        isSystem: isSystem,
        description: meta.desc,
        apkPath: "/system/app/" + meta.name.replace(/\s+/g, "") + "/" + pkg + ".apk"
      });
    }

    this.emit("connected", { mode: "demo", device: this.deviceInfo });
    this.emit("packages_updated", Array.from(this.packages.values()));
  }

  async loadDevicePackages() {
    if (this.isDemoMode || !this.adb) {
      return Array.from(this.packages.values());
    }

    // Query real package sets from the connected phone
    try {
      const [allOut, uninstalledOut, systemOut, disabledOut, enabledOut] = await Promise.all([
        this.runAdbCommand("pm list packages -a"),
        this.runAdbCommand("pm list packages -u"),
        this.runAdbCommand("pm list packages -s"),
        this.runAdbCommand("pm list packages -d"),
        this.runAdbCommand("pm list packages -e")
      ]);

      const parse = (text) => {
        if (!text) return new Set();
        const set = new Set();
        for (const line of text.split(/[\r\n]+/)) {
          const trimmed = line.trim();
          if (trimmed.startsWith("package:")) {
            set.add(trimmed.slice("package:".length).trim());
          }
        }
        return set;
      };

      const allPkgs = parse(allOut);
      const uninstalledPkgs = parse(uninstalledOut);
      const systemPkgs = parse(systemOut);
      const disabledPkgs = parse(disabledOut);
      const enabledPkgs = parse(enabledOut);

      // Union of all active and uninstalled system packages
      const combined = new Set([...allPkgs, ...uninstalledPkgs]);
      const sorted = Array.from(combined).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

      this.packages.clear();
      for (const pkg of sorted) {
        const isSys = systemPkgs.has(pkg);
        let status = "Unknown";
        if (disabledPkgs.has(pkg)) {
          status = "Disabled";
        } else if (!allPkgs.has(pkg) && uninstalledPkgs.has(pkg)) {
          status = "Uninstalled (User 0)";
        } else if (enabledPkgs.has(pkg) || allPkgs.has(pkg)) {
          status = "Enabled";
        }

        const meta = getPackageMeta(pkg);

        this.packages.set(pkg, {
          package: pkg,
          name: meta.name,
          category: meta.category,
          safety: meta.safety,
          status: status,
          isSystem: isSys,
          description: meta.desc,
          apkPath: "/system/app/" + pkg + ".apk"
        });
      }

      this.emit("packages_updated", Array.from(this.packages.values()));
      return Array.from(this.packages.values());
    } catch (err) {
      console.error("Failed to load device packages:", err);
      throw err;
    }
  }

  async runAdbCommand(rawCommand) {
    if (this.isDemoMode || !this.adb) {
      await new Promise(r => setTimeout(r, 120));
      if (rawCommand.startsWith("pm disable-user")) {
        const pkg = rawCommand.split(" ").pop();
        if (this.packages.has(pkg)) {
          this.packages.get(pkg).status = "Disabled";
        }
        return "Package " + pkg + " new state: disabled-user";
      } else if (rawCommand.startsWith("pm enable")) {
        const pkg = rawCommand.split(" ").pop();
        if (this.packages.has(pkg)) {
          this.packages.get(pkg).status = "Enabled";
        }
        return "Package " + pkg + " new state: default";
      } else if (rawCommand.startsWith("pm uninstall")) {
        const pkg = rawCommand.split(" ").pop();
        if (this.packages.has(pkg)) {
          this.packages.get(pkg).status = "Uninstalled (User 0)";
        }
        return "Success\n[Package " + pkg + " uninstalled for user 0]";
      } else if (rawCommand.startsWith("cmd package install-existing")) {
        const pkg = rawCommand.split(" ").pop();
        if (this.packages.has(pkg)) {
          this.packages.get(pkg).status = "Enabled";
        }
        return "Package " + pkg + " installed for user: 0";
      } else if (rawCommand.startsWith("am force-stop")) {
        return "Success: process killed.";
      } else if (rawCommand.startsWith("pm clear")) {
        return "Success: data and cache reset.";
      } else if (rawCommand.includes("reboot")) {
        return "Broadcast: Rebooting device...";
      }
      return "Simulated output for: " + rawCommand;
    }

    // Real WebUSB execution via ADB NoneProtocol Subprocess
    try {
      const output = await this.adb.subprocess.noneProtocol.spawnWaitText(rawCommand);
      return output;
    } catch (err) {
      console.error("ADB command execution error:", err);
      return "Error: " + err.message;
    }
  }

  async lockPlayStore() {
    await this.runAdbCommand("pm disable-user --user 0 com.android.vending");
    await this.runAdbCommand("pm uninstall --user 0 com.android.vending");
    await this.loadDevicePackages();
  }

  async restorePlayStore() {
    await this.runAdbCommand("cmd package install-existing com.android.vending");
    await this.runAdbCommand("pm enable com.android.vending");
    await this.loadDevicePackages();
  }

  disconnect() {
    if (this.adb) {
      try {
        this.adb.close();
      } catch (e) {}
      this.adb = null;
    }
    this.usbDevice = null;
    this.isConnected = false;
    this.isDemoMode = false;
    this.packages.clear();
    this.emit("disconnected", null);
  }
}
