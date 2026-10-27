import { BLOATWARE_DATABASE, getPackageMeta } from './bloatware-db.js';

export class WebAdbEngine {
  constructor() {
    this.usbDevice = null;
    this.isConnected = false;
    this.isDemoMode = false;
    this.deviceInfo = {
      model: "Unknown Device",
      manufacturer: "Android",
      version: "14",
      sdk: "34",
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
    return !!(navigator && navigator.usb);
  }

  async connectWebUsb() {
    if (!this.isWebUsbSupported()) {
      throw new Error("WebUSB is not supported in this browser. Please use Chrome, Edge, or Brave.");
    }

    try {
      const device = await navigator.usb.requestDevice({
        filters: [{ classCode: 0xFF, subclassCode: 0x42, protocolCode: 0x01 }]
      });

      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      this.usbDevice = device;
      this.isConnected = true;
      this.isDemoMode = false;
      this.deviceInfo = {
        model: device.productName || "Android Phone",
        manufacturer: device.manufacturerName || "Android",
        version: "USB Connected",
        sdk: "Active",
        serial: device.serialNumber || "USB-DEVICE"
      };

      this.emit("connected", { mode: "webusb", device: this.deviceInfo });
      await this.loadDevicePackages();
      return true;
    } catch (err) {
      this.isConnected = false;
      throw err;
    }
  }

  startDemoMode() {
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
    if (this.isDemoMode) {
      return Array.from(this.packages.values());
    }

    this.packages.clear();
    for (const [pkg, meta] of Object.entries(BLOATWARE_DATABASE)) {
      this.packages.set(pkg, {
        package: pkg,
        name: meta.name,
        category: meta.category,
        safety: meta.safety,
        status: "Enabled",
        isSystem: true,
        description: meta.desc,
        apkPath: "/system/app/" + pkg + ".apk"
      });
    }

    this.emit("packages_updated", Array.from(this.packages.values()));
    return Array.from(this.packages.values());
  }

  async runAdbCommand(rawCommand) {
    if (this.isDemoMode) {
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

    return "adb shell " + rawCommand + ": Success";
  }


  async lockPlayStore() {
    await this.runAdbCommand("pm disable-user --user 0 com.android.vending");
    await this.runAdbCommand("pm uninstall --user 0 com.android.vending");
    if (this.packages.has("com.android.vending")) {
      this.packages.get("com.android.vending").status = "Uninstalled (User 0)";
    }
    this.emit("packages_updated", Array.from(this.packages.values()));
  }

  async restorePlayStore() {
    await this.runAdbCommand("cmd package install-existing com.android.vending");
    await this.runAdbCommand("pm enable com.android.vending");
    if (this.packages.has("com.android.vending")) {
      this.packages.get("com.android.vending").status = "Enabled";
    }
    this.emit("packages_updated", Array.from(this.packages.values()));
  }

  disconnect() {
    if (this.usbDevice) {
      try {
        this.usbDevice.close();
      } catch (e) {}
    }
    this.usbDevice = null;
    this.isConnected = false;
    this.isDemoMode = false;
    this.emit("disconnected", null);
  }
}
