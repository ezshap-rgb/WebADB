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
      let device;
      try {
        // First try standard ADB interface filter
        device = await manager.requestDevice();
      } catch (err) {
        console.warn("Filtered requestDevice failed, trying raw requestDevice:", err);
      }

      // If standard filter returned nothing, allow user to pick ANY connected USB device
      if (!device) {
        try {
          const rawDevice = await navigator.usb.requestDevice({ filters: [] });
          if (rawDevice) {
            // Find an ADB or compatible interface on the selected device
            let adbInterface = null;
            for (const config of rawDevice.configurations) {
              for (const iface of config.interfaces) {
                for (const alt of iface.alternates) {
                  // Standard ADB is class 255 (0xFF), subclass 66 (0x42), protocol 1 (0x01)
                  if (alt.interfaceClass === 0xff && alt.interfaceSubclass === 0x42 && alt.interfaceProtocol === 1) {
                    adbInterface = { configuration: config, interface_: iface, alternate: alt };
                    break;
                  }
                }
                if (adbInterface) break;
              }
              if (adbInterface) break;
            }

            // If not strictly matching 0xFF/0x42/0x01, fallback to the first vendor-specific interface (class 255)
            if (!adbInterface) {
              for (const config of rawDevice.configurations) {
                for (const iface of config.interfaces) {
                  for (const alt of iface.alternates) {
                    if (alt.interfaceClass === 0xff) {
                      adbInterface = { configuration: config, interface_: iface, alternate: alt };
                      break;
                    }
                  }
                  if (adbInterface) break;
                }
                if (adbInterface) break;
              }
            }

            if (adbInterface) {
              const { AdbDaemonWebUsbDevice } = await import('@yume-chan/adb-daemon-webusb');
              device = new AdbDaemonWebUsbDevice(rawDevice, adbInterface, navigator.usb);
            } else {
              throw new Error("The selected USB device does not have an active ADB interface. Please make sure USB Debugging is turned ON on the target phone.");
            }
          }
        } catch (rawErr) {
          if (rawErr.name === "NotFoundError") {
            return false;
          }
          throw rawErr;
        }
      }

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


  async checkDpmStatus() {
    const out = await this.runAdbCommand("dpm list-owners");
    return out.includes("com.afwsamples.testdpc");
  }

  async setupDeviceOwner() {
    // Check if accounts exist
    const acc = await this.runAdbCommand("dumpsys account");
    const hasAccounts = acc.includes("Account {name=") && acc.includes("type=");
    if (hasAccounts) {
      throw new Error("ACCOUNTS_DETECTED");
    }
    await this.runAdbCommand("dpm set-device-owner com.afwsamples.testdpc/.DeviceAdminReceiver");
    await this.runAdbCommand("dpm set-user-restriction no_install_unknown_sources 1");
  }

  async removeDeviceOwner() {
    await this.runAdbCommand("dpm remove-active-admin com.afwsamples.testdpc/.DeviceAdminReceiver");
    await this.runAdbCommand("pm uninstall com.afwsamples.testdpc");
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
