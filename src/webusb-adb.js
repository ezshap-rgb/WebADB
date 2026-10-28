import { Adb, AdbDaemonTransport } from '@yume-chan/adb';
import { AdbDaemonWebUsbDeviceManager } from '@yume-chan/adb-daemon-webusb';
import AdbWebCredentialStore from '@yume-chan/adb-credential-web';
import { BLOATWARE_DATABASE, getPackageMeta } from './bloatware-db.js';

export class WebAdbEngine {
  constructor() {
    this.adb = null;
    this.usbDevice = null;
    this.isConnected = false;
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
      throw new Error("WebUSB is not supported in this browser or context. Please use Chrome or Edge on HTTPS or localhost.");
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

      this.adb.disconnected.then(() => {
        this.disconnect();
      }).catch(() => {});

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

  async loadDevicePackages() {
    if (!this.adb) {
      this.packages.clear();
      this.emit("packages_updated", []);
      return [];
    }

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
    if (!this.adb) {
      return "Error: No device connected";
    }

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
    this.packages.clear();
    this.deviceInfo = {
      model: "Unknown Device",
      manufacturer: "Android",
      version: "Unknown",
      sdk: "Unknown",
      serial: ""
    };
    this.emit("disconnected", null);
  }
}
