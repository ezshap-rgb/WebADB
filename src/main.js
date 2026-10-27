import { WebAdbEngine } from './webusb-adb.js';
import { PROTECTED_SYSTEM_PACKAGES } from './bloatware-db.js';

const engine = new WebAdbEngine();

const el = {
  statusDot: document.getElementById('status-indicator-dot'),
  deviceDisplay: document.getElementById('device-display-name'),
  btnConnect: document.getElementById('btn-connect-usb'),
  btnConnectLabel: document.getElementById('btn-connect-label'),
  btnDemo: document.getElementById('btn-demo-mode'),
  badgeTotal: document.getElementById('badge-total-packages'),
  navTabs: document.querySelectorAll('.nav-tab'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  searchInput: document.getElementById('search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  filterChips: document.querySelectorAll('.filter-chips .chip'),
  tableBody: document.getElementById('package-table-body'),
  emptyState: document.getElementById('empty-state-message'),
  checkAllVisible: document.getElementById('check-all-visible'),
  selectedBar: document.getElementById('selected-actions-bar'),
  selectedCount: document.getElementById('selected-count-number'),
  btnSelectSafeBloat: document.getElementById('btn-select-safe-bloat'),
  btnActionDisable: document.getElementById('btn-action-disable'),
  btnActionEnable: document.getElementById('btn-action-enable'),
  btnActionUninstall: document.getElementById('btn-action-uninstall'),
  btnActionRestore: document.getElementById('btn-action-restore'),
  btnExport: document.getElementById('btn-export-preset'),
  fileImport: document.getElementById('file-import-preset'),
  confirmModal: document.getElementById('confirm-modal'),
  confirmTitle: document.getElementById('confirm-modal-title'),
  confirmDesc: document.getElementById('confirm-modal-desc'),
  confirmPreview: document.getElementById('confirm-commands-preview'),
  btnConfirmExecute: document.getElementById('btn-confirm-execute'),
  btnCancelModal: document.getElementById('btn-cancel-modal'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  inspectorModal: document.getElementById('inspector-modal'),
  inspectAppName: document.getElementById('inspect-app-name'),
  inspectPkgId: document.getElementById('inspect-package-id'),
  inspectSafety: document.getElementById('inspect-safety-badge'),
  inspectStatus: document.getElementById('inspect-status-badge'),
  inspectCategory: document.getElementById('inspect-category-badge'),
  inspectDesc: document.getElementById('inspect-desc'),
  inspectApk: document.getElementById('inspect-apk-path'),
  btnInspectForceStop: document.getElementById('btn-inspect-force-stop'),
  btnInspectClearData: document.getElementById('btn-inspect-clear-data'),
  btnCloseInspector: document.getElementById('btn-close-inspector'),
  terminalOutput: document.getElementById('terminal-output'),
  terminalInput: document.getElementById('terminal-input'),
  btnSendCmd: document.getElementById('btn-send-command'),
  btnClearTerminal: document.getElementById('btn-clear-terminal'),
  infoModel: document.getElementById('info-model'),
  infoManufacturer: document.getElementById('info-manufacturer'),
  infoVersion: document.getElementById('info-version'),
  infoSdk: document.getElementById('info-sdk'),
  infoSerial: document.getElementById('info-serial'),
  btnRebootNormal: document.getElementById('btn-reboot-normal'),
  btnRebootRecovery: document.getElementById('btn-reboot-recovery'),
  btnRebootBootloader: document.getElementById('btn-reboot-bootloader'),
  playStorePill: document.getElementById('playstore-status-pill'),
  btnTogglePlayStore: document.getElementById('btn-toggle-playstore'),
  btnTogglePlayStoreLabel: document.getElementById('btn-toggle-playstore-label'),
  btnToolsLockPlayStore: document.getElementById('btn-tools-lock-playstore'),
  btnToolsRestorePlayStore: document.getElementById('btn-tools-restore-playstore'),
  toastContainer: document.getElementById('toast-container')
};

let currentFilter = 'all';
let searchQuery = '';
let selectedPackages = new Set();
let pendingAction = null;
let currentInspectedPkg = null;

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  el.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// Engine event subscription
engine.subscribe((event, data) => {
  if (event === 'connected') {
    el.statusDot.className = 'status-dot ' + (data.mode === 'demo' ? 'demo' : 'connected');
    el.deviceDisplay.textContent = data.device.manufacturer + ' ' + data.device.model + (data.mode === 'demo' ? ' (Simulator)' : ' (USB)');
    el.btnConnectLabel.textContent = 'Disconnect';
    
    // Update Hardware info
    el.infoModel.textContent = data.device.model;
    el.infoManufacturer.textContent = data.device.manufacturer;
    el.infoVersion.textContent = data.device.version;
    el.infoSdk.textContent = data.device.sdk;
    el.infoSerial.textContent = data.device.serial;

    showToast('Connected to ' + data.device.model + ' via WebUSB', 'success');
el.navTabs[0].click();
  } else if (event === 'disconnected') {
    el.statusDot.className = 'status-dot disconnected';
    el.deviceDisplay.textContent = 'No Device Connected';
    el.btnConnectLabel.textContent = 'Connect WebUSB';
    renderTable([]);
    showToast('Device disconnected', 'info');
  } else if (event === 'packages_updated') {
    renderTable(data);
  }
});

function renderTable(packages = Array.from(engine.packages.values())) {
  el.tableBody.innerHTML = '';
  selectedPackages.clear();
  updateSelectedBar();

  if (!packages || packages.length === 0) {
    el.emptyState.style.display = 'flex';
    el.badgeTotal.textContent = '0';
    return;
  }

  el.emptyState.style.display = 'none';
  // Update Child-Safe Play Store status
  const vending = engine.packages.get('com.android.vending') || engine.packages.get('com.google.android.vending');
  if (vending && vending.status === 'Enabled') {
    el.playStorePill.textContent = 'Play Store: ACTIVE (Unlocked)';
    el.playStorePill.className = 'badge badge-safe';
    el.btnTogglePlayStoreLabel.textContent = '🛡️ Lock Phone (Hide Play Store)';
  } else {
    el.playStorePill.textContent = 'Play Store: LOCKED / HIDDEN (Child-Safe)';
    el.playStorePill.className = 'badge badge-caution';
    el.btnTogglePlayStoreLabel.textContent = '🔓 Unlock Phone (Restore Play Store)';
  }

  el.badgeTotal.textContent = packages.length.toString();

  const filtered = packages.filter(pkg => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = pkg.name.toLowerCase().includes(q) ||
                    pkg.package.toLowerCase().includes(q) ||
                    pkg.category.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (currentFilter === 'safe') return pkg.safety === 'safe';
    if (currentFilter === 'caution') return pkg.safety === 'caution';
    if (currentFilter === 'carrier') return pkg.category === 'Carrier';
    if (currentFilter === 'oem') return pkg.category === 'Samsung' || pkg.category === 'Xiaomi' || pkg.category === 'OEM';
    if (currentFilter === 'telemetry') return pkg.category === 'Telemetry';
    if (currentFilter === 'inactive') return pkg.status === 'Disabled' || pkg.status.includes('Uninstalled');

    return true;
  });

  if (filtered.length === 0) {
    el.tableBody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align:center; padding: 32px;">No matching packages found for filter.</td></tr>';
    return;
  }

  filtered.forEach(pkg => {
    const tr = document.createElement('tr');
    tr.id = 'pkg-row-' + pkg.package.replace(/\./g, '-');

    const isSafe = pkg.safety === 'safe';
    const isCaution = pkg.safety === 'caution';
    const isEssential = pkg.safety === 'essential';
    const safetyBadgeClass = isSafe ? 'badge-safe' : isCaution ? 'badge-caution' : isEssential ? 'badge-essential' : 'badge-unknown';
    const safetyLabel = isSafe ? '🟢 Safe' : isCaution ? '🟡 Caution' : isEssential ? '🔴 Essential' : 'Unknown';

    const isEnabled = pkg.status === 'Enabled';
    const isDisabled = pkg.status === 'Disabled';
    const statusClass = isEnabled ? 'status-enabled' : isDisabled ? 'status-disabled' : 'status-uninstalled';

    tr.innerHTML = `
      <td><input type="checkbox" class="pkg-check" data-pkg="${pkg.package}" /></td>
      <td>
        <div class="app-info-cell">
          <span class="app-title">${escapeHtml(pkg.name)}</span>
          <span class="app-package">${escapeHtml(pkg.package)}</span>
        </div>
      </td>
      <td><span class="badge ${safetyBadgeClass}">${safetyLabel}</span></td>
      <td><span class="badge badge-status ${statusClass}">${escapeHtml(pkg.status)}</span></td>
      <td><span class="badge badge-category">${escapeHtml(pkg.category)}</span></td>
      <td><span class="text-mono text-muted">${escapeHtml(pkg.package)}</span></td>
      <td class="text-right">
        <button class="btn-icon btn-inspect-row" data-pkg="${pkg.package}" title="View details">🔍</button>
      </td>
    `;

    const checkbox = tr.querySelector('.pkg-check');
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectedPackages.add(pkg.package);
        tr.classList.add('selected');
      } else {
        selectedPackages.delete(pkg.package);
        tr.classList.remove('selected');
      }
      updateSelectedBar();
    });

    tr.querySelector('.btn-inspect-row').addEventListener('click', () => {
      openInspector(pkg);
    });

    el.tableBody.appendChild(tr);
  });
}

function updateSelectedBar() {
  const count = selectedPackages.size;
  el.selectedCount.textContent = count.toString();
  if (count > 0) {
    el.selectedBar.style.display = 'flex';
  } else {
    el.selectedBar.style.display = 'none';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openInspector(pkg) {
  currentInspectedPkg = pkg;
  el.inspectAppName.textContent = pkg.name;
  el.inspectPkgId.textContent = pkg.package;
  el.inspectSafety.textContent = pkg.safety.toUpperCase();
  el.inspectSafety.className = 'badge ' + (pkg.safety === 'safe' ? 'badge-safe' : pkg.safety === 'caution' ? 'badge-caution' : 'badge-essential');
  el.inspectStatus.textContent = pkg.status;
  el.inspectCategory.textContent = pkg.category;
  el.inspectDesc.textContent = pkg.description || "Installed system package.";
  el.inspectApk.textContent = pkg.apkPath || ('/system/app/' + pkg.package + '.apk');
  el.inspectorModal.style.display = 'flex';
}

el.btnCloseInspector.addEventListener('click', () => {
  el.inspectorModal.style.display = 'none';
});

el.btnInspectForceStop.addEventListener('click', async () => {
  if (!currentInspectedPkg) return;
  await engine.runAdbCommand('am force-stop ' + currentInspectedPkg.package);
  showToast('Force stopped: ' + currentInspectedPkg.name, 'info');
  el.inspectorModal.style.display = 'none';
});

el.btnInspectClearData.addEventListener('click', async () => {
  if (!currentInspectedPkg) return;
  if (confirm('Reset cache and storage for ' + currentInspectedPkg.name + '?')) {
    await engine.runAdbCommand('pm clear ' + currentInspectedPkg.package);
    showToast('Data cleared for ' + currentInspectedPkg.name, 'info');
    el.inspectorModal.style.display = 'none';
  }
});

el.navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.getAttribute('data-tab');
    el.navTabs.forEach(t => t.classList.remove('active'));
    el.tabPanes.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

el.searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  el.btnClearSearch.style.display = searchQuery ? 'block' : 'none';
  renderTable();
});

el.btnClearSearch.addEventListener('click', () => {
  el.searchInput.value = '';
  searchQuery = '';
  el.btnClearSearch.style.display = 'none';
  renderTable();
});

el.filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    el.filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.getAttribute('data-filter');
    renderTable();
  });
});

el.checkAllVisible.addEventListener('change', (e) => {
  const visibleChecks = el.tableBody.querySelectorAll('.pkg-check');
  visibleChecks.forEach(chk => {
    chk.checked = e.target.checked;
    const pkg = chk.getAttribute('data-pkg');
    const tr = chk.closest('tr');
    if (e.target.checked) {
      selectedPackages.add(pkg);
      if (tr) tr.classList.add('selected');
    } else {
      selectedPackages.delete(pkg);
      if (tr) tr.classList.remove('selected');
    }
  });
  updateSelectedBar();
});

el.btnSelectSafeBloat.addEventListener('click', () => {
  let count = 0;
  const checks = el.tableBody.querySelectorAll('.pkg-check');
  checks.forEach(chk => {
    const pkg = chk.getAttribute('data-pkg');
    const data = engine.packages.get(pkg);
    if (data && data.safety === 'safe') {
      chk.checked = true;
      selectedPackages.add(pkg);
      chk.closest('tr')?.classList.add('selected');
      count++;
    }
  });
  updateSelectedBar();
  showToast('Selected ' + count + ' recommended safe bloatware packages', 'success');
});

function promptBatchAction(actionName, commandGenerator, promptText) {
  if (selectedPackages.size === 0) {
    showToast("Please select one or more packages first", "warning");
    return;
  }

  const pkgs = Array.from(selectedPackages);
  const unsafe = pkgs.filter(p => PROTECTED_SYSTEM_PACKAGES.includes(p));
  if (unsafe.length > 0) {
    alert('Action blocked: The following packages are critical to Android operation:\n' + unsafe.join('\n'));
    return;
  }

  const critical = pkgs.filter(p => /launcher|keyboard|inputmethod|ime/i.test(p));
  if (critical.length > 0) {
    if (!confirm('Warning: You have selected a launcher or keyboard package:\n' + critical.join('\n') + '\nRemoving your active keyboard/launcher may make the phone unusable. Continue?')) {
      return;
    }
  }

  const commands = pkgs.map(p => commandGenerator(p));
  el.confirmTitle.textContent = actionName + ' (' + pkgs.length + ' packages)';
  el.confirmDesc.textContent = promptText;
  el.confirmPreview.textContent = commands.map(c => 'adb shell ' + c).join('\n');

  pendingAction = async () => {
    for (const cmd of commands) {
      await engine.runAdbCommand(cmd);
    }
    showToast('Successfully executed ' + actionName, 'success');
    await engine.loadDevicePackages();
  };

  el.confirmModal.style.display = 'flex';
}

el.btnActionDisable.addEventListener('click', () => {
  promptBatchAction(
    "Disable Packages",
    (pkg) => 'pm disable-user --user 0 ' + pkg,
    "Disable selected packages for user 0? (Can be re-enabled at any time)"
  );
});

el.btnActionEnable.addEventListener('click', () => {
  promptBatchAction(
    "Enable Packages",
    (pkg) => 'pm enable ' + pkg,
    "Re-enable selected packages on device?"
  );
});

el.btnActionUninstall.addEventListener('click', () => {
  promptBatchAction(
    "Uninstall Packages",
    (pkg) => 'pm uninstall --user 0 ' + pkg,
    "Uninstall packages for user 0? The underlying system APK is kept in /system and can be restored."
  );
});

el.btnActionRestore.addEventListener('click', () => {
  promptBatchAction(
    "Restore Packages",
    (pkg) => 'cmd package install-existing ' + pkg,
    "Restore previously uninstalled packages for the current user?"
  );
});

el.btnConfirmExecute.addEventListener('click', async () => {
  el.confirmModal.style.display = 'none';
  if (pendingAction) {
    await pendingAction();
    pendingAction = null;
  }
});

el.btnCancelModal.addEventListener('click', () => { el.confirmModal.style.display = 'none'; });
el.btnCloseModal.addEventListener('click', () => { el.confirmModal.style.display = 'none'; });

el.btnConnect.addEventListener('click', async () => {
  if (engine.isConnected) {
    engine.disconnect();
    return;
  }
  try {
    await engine.connectWebUsb();
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      alert('Connection failed: ' + err.message);
    }
  }
});

el.btnDemo.addEventListener('click', () => {
  engine.startDemoMode();
});

// Child-Safe Play Store Actions
el.btnTogglePlayStore.addEventListener('click', async () => {
  if (!engine.isConnected) {
    showToast("Please connect your phone via WebUSB first", "warning");
    return;
  }
  const vending = engine.packages.get('com.android.vending') || engine.packages.get('com.google.android.vending');
  if (vending && vending.status === 'Enabled') {
    if (confirm("CHILD-SAFE LOCK:\nHide and uninstall Google Play Store for user 0?\n\nThe Play Store icon will vanish from the phone so the child cannot browse or install apps. You can restore it anytime with one click.")) {
      showToast("Locking Play Store...", "info");
      await engine.lockPlayStore();
      showToast("Play Store locked and hidden for user 0", "success");
    }
  } else {
    if (confirm("UNLOCK & RESTORE:\nRestore Google Play Store directly from the internal system partition?\n\nNo APK download is required. It will be reinstalled and enabled immediately.")) {
      showToast("Restoring Play Store...", "info");
      await engine.restorePlayStore();
      showToast("Play Store restored and enabled successfully", "success");
    }
  }
});

el.btnToolsLockPlayStore.addEventListener('click', async () => {
  if (!engine.isConnected) {
    showToast("Please connect your phone via WebUSB first", "warning");
    return;
  }
  if (confirm("Hide & Uninstall Google Play Store for user 0?")) {
    showToast("Locking Play Store...", "info");
    await engine.lockPlayStore();
    showToast("Play Store locked", "success");
  }
});

el.btnToolsRestorePlayStore.addEventListener('click', async () => {
  if (!engine.isConnected) {
    showToast("Please connect your phone via WebUSB first", "warning");
    return;
  }
  if (confirm("Restore Google Play Store from internal system partition?")) {
    showToast("Restoring Play Store...", "info");
    await engine.restorePlayStore();
    showToast("Play Store restored and enabled", "success");
  }
});

el.btnRebootNormal.addEventListener('click', async () => {
  if (confirm("Restart phone normally?")) {
    await engine.runAdbCommand("reboot");
    showToast("Reboot command sent", "info");
  }
});

el.btnRebootRecovery.addEventListener('click', async () => {
  if (confirm("Reboot phone directly to Recovery Mode?")) {
    await engine.runAdbCommand("reboot recovery");
    showToast("Recovery reboot signal sent", "warning");
  }
});

el.btnRebootBootloader.addEventListener('click', async () => {
  if (confirm("Reboot phone to Fastboot / Bootloader?")) {
    await engine.runAdbCommand("reboot bootloader");
    showToast("Bootloader reboot signal sent", "warning");
  }
});

el.btnSendCmd.addEventListener('click', runTerminalCommand);
el.terminalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runTerminalCommand();
});

async function runTerminalCommand() {
  const raw = el.terminalInput.value.trim();
  if (!raw) return;
  el.terminalInput.value = '';

  const cmdLine = document.createElement('div');
  cmdLine.className = 'terminal-line command';
  cmdLine.textContent = '$ adb shell ' + raw;
  el.terminalOutput.appendChild(cmdLine);

  const res = await engine.runAdbCommand(raw);
  const outLine = document.createElement('div');
  outLine.className = 'terminal-line output';
  outLine.textContent = res;
  el.terminalOutput.appendChild(outLine);

  el.terminalOutput.scrollTop = el.terminalOutput.scrollHeight;
}

el.btnClearTerminal.addEventListener('click', () => {
  el.terminalOutput.innerHTML = '';
});

el.btnExport.addEventListener('click', () => {
  const data = {
    app: "WebADB",
    version: "1.0",
    date: new Date().toISOString(),
    packages: Array.from(engine.packages.values())
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'webadb-preset-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast("Exported snapshot JSON", "success");
});

// Initial state: empty until connected
renderTable([]);
