(() => {
  // Avoid injecting duplicate titlebar
  if (document.getElementById("refined-line-titlebar-host")) return;

  const TITLEBAR_HEIGHT = 30;

  const host = document.createElement("div");
  host.id = "refined-line-titlebar-host";
  host.setAttribute("role", "presentation");
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "0";
  host.style.right = "0";
  host.style.height = `${TITLEBAR_HEIGHT}px`;
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "auto";

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      inset: 0 0 auto 0;
      height: ${TITLEBAR_HEIGHT}px;
      z-index: 2147483647;
      pointer-events: auto;
    }

    *, *::before, *::after { box-sizing: border-box; }

    .bar {
      height: ${TITLEBAR_HEIGHT}px;
      display: flex;
      align-items: stretch;
      background: #1e1e1e;
      color: #cccccc;
      border-bottom: 1px solid #2d2d2d;
      user-select: none;
      -webkit-font-smoothing: antialiased;
      font-family: "Segoe UI", "Yu Gothic UI", "Noto Sans JP", system-ui, sans-serif;
      font-size: 12px;
      line-height: 1;
    }

    .left {
      display: flex;
      align-items: stretch;
      flex: 0 0 auto;
      position: relative;
      -webkit-app-region: no-drag;
      app-region: no-drag;
    }

    .menu-button {
      appearance: none;
      border: none;
      background: transparent;
      color: inherit;
      height: 22px;
      padding: 0 10px;
      margin: 0;
      cursor: pointer;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: 6px;
      margin-left: 6px;
      margin-top: 3px;
      margin-bottom: 3px;
    }

    .menu-button:hover {
      background: #2a2d2e;
      color: #e6e6e6;
    }

    .menu-button.is-open {
      background: #094771;
      color: #ffffff;
    }

    .menu-caret {
      width: 10px;
      height: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      opacity: 0.9;
      flex: 0 0 auto;
    }

    .dropdown {
      position: absolute;
      top: ${TITLEBAR_HEIGHT}px;
      left: 6px;
      min-width: 280px;
      max-width: 420px;
      background: #252526;
      color: #cccccc;
      border: 1px solid #3c3c3c;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
      border-radius: 10px;
      padding: 6px 0;
      display: none;
      z-index: 2147483647;
      white-space: nowrap;
      overflow: hidden;
    }

    .dropdown[data-open="true"] { display: block; }

    .item {
      width: 100%;
      border: none;
      background: transparent;
      color: inherit;
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr) max-content;
      align-items: center;
      gap: 10px;
      padding: 7px 12px;
      cursor: pointer;
      text-align: left;
      font-size: 12px;
      white-space: nowrap;
      line-height: 1.2;
    }

    .item:hover { background: #2a2d2e; color: #ffffff; }
    .item:active { background: #303336; }

    .check {
      width: 16px;
      height: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      opacity: 0.95;
    }

    .check-mark {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid rgba(204, 204, 204, 0.35);
      background: transparent;
      position: relative;
    }

    .item.is-radio .check-mark {
      border-radius: 999px;
    }

    .item.is-checked .check-mark {
      border-color: rgba(255, 255, 255, 0.22);
      background: #07b53b;
    }

    .item.is-checked.is-radio .check-mark {
      background: transparent;
      border-color: rgba(255, 255, 255, 0.28);
    }

    .item.is-checked.is-radio .check-mark::after {
      content: "";
      position: absolute;
      inset: 2px;
      border-radius: 999px;
      background: #07b53b;
    }

    .label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    .shortcut {
      opacity: 0.65;
      font-size: 11px;
      white-space: nowrap;
      padding-left: 14px;
    }

    .sep {
      height: 1px;
      margin: 6px 10px;
      background: rgba(255, 255, 255, 0.10);
    }

    .drag {
      flex: 1 1 auto;
      height: ${TITLEBAR_HEIGHT}px;
      -webkit-app-region: drag;
      app-region: drag;
      cursor: default;
    }

    .right {
      display: flex;
      align-items: stretch;
      flex: 0 0 auto;
      -webkit-app-region: no-drag;
      app-region: no-drag;
    }

    .winbtn {
      appearance: none;
      border: none;
      margin: 0;
      padding: 0;
      width: 46px;
      height: ${TITLEBAR_HEIGHT}px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      color: #cccccc;
      cursor: pointer;
    }

    .winbtn:hover {
      background: #2a2d2e;
      color: #ffffff;
    }

    .winbtn:active { background: #303336; }

    .winbtn.close:hover {
      background: #e81123;
      color: #ffffff;
    }

    .icon {
      display: block;
    }
  `;
  shadow.appendChild(style);

  const bar = document.createElement("div");
  bar.className = "bar";

  const left = document.createElement("div");
  left.className = "left";

  const menuButton = document.createElement("button");
  menuButton.className = "menu-button";
  menuButton.type = "button";
  menuButton.textContent = "設定";

  const caret = document.createElement("span");
  caret.className = "menu-caret";
  caret.innerHTML =
    "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 16 16' aria-hidden='true'>" +
    "<path fill='currentColor' d='M4.2 6.2a1 1 0 0 1 1.4 0L8 8.6l2.4-2.4a1 1 0 1 1 1.4 1.4l-3.1 3.1a1 1 0 0 1-1.4 0L4.2 7.6a1 1 0 0 1 0-1.4z'/>" +
    "</svg>";
  menuButton.appendChild(caret);

  const dropdown = document.createElement("div");
  dropdown.className = "dropdown";
  dropdown.setAttribute("data-open", "false");

  left.appendChild(menuButton);
  left.appendChild(dropdown);

  const drag = document.createElement("div");
  drag.className = "drag";
  drag.setAttribute("data-tauri-drag-region", "");

  const right = document.createElement("div");
  right.className = "right";

  const MENU_IDS = {
    contentProtection: "menu.content_protection",
    autostart: "menu.autostart",
    startMinimized: "menu.start_minimized",
    logError: "menu.log.error",
    logWarn: "menu.log.warn",
    logInfo: "menu.log.info",
    logDebug: "menu.log.debug",
    logVerbose: "menu.log.verbose"
  };

  const menuItemElements = new Map();

  const getTauriInvoke = () => window.__TAURI__?.core?.invoke;
  const getCurrentWindow = () => window.__TAURI__?.window?.getCurrentWindow?.();
  const getIsMaximized = async () => {
    const invoke = getTauriInvoke();
    if (!invoke) throw new Error("Tauri invoke not available");
    return await invoke("get_is_maximized");
  };
  const getIsDev = async () => {
    const invoke = getTauriInvoke();
    if (!invoke) return false;
    try {
      return await invoke("get_is_dev");
    } catch (error) {
      console.warn("[menu] get_is_dev failed", error);
      return false;
    }
  };

  const baseMenuItems = [
    {
      id: MENU_IDS.contentProtection,
      label: "画面を保護",
      type: "check",
      shortcut: "Alt+H"
    },
    {
      id: MENU_IDS.autostart,
      label: "Windows 起動時に自動起動",
      type: "check"
    },
    {
      id: MENU_IDS.startMinimized,
      label: "起動時に最小化",
      type: "check"
    }
  ];

  const logMenuItems = [
    {
      id: MENU_IDS.logError,
      label: "ログレベル: Error",
      type: "radio",
      value: "error"
    },
    {
      id: MENU_IDS.logWarn,
      label: "ログレベル: Warn",
      type: "radio",
      value: "warn"
    },
    {
      id: MENU_IDS.logInfo,
      label: "ログレベル: Info",
      type: "radio",
      value: "info"
    },
    {
      id: MENU_IDS.logDebug,
      label: "ログレベル: Debug",
      type: "radio",
      value: "debug"
    },
    {
      id: MENU_IDS.logVerbose,
      label: "ログレベル: Verbose",
      type: "radio",
      value: "verbose"
    }
  ];

  const buildMenuModel = (isDev) => {
    const items = [...baseMenuItems, { type: "separator" }];
    if (isDev) {
      items.push(...logMenuItems, { type: "separator" });
    }
    items.push({
      id: "window.close",
      label: "閉じる",
      type: "action"
    });
    return items;
  };

  const setMenuOpen = (open) => {
    dropdown.setAttribute("data-open", open ? "true" : "false");
    menuButton.classList.toggle("is-open", open);
  };

  const buildMenuItem = (item) => {
    if (item.type === "separator") {
      const sep = document.createElement("div");
      sep.className = "sep";
      dropdown.appendChild(sep);
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "item";
    button.dataset.menuId = item.id;
    button.dataset.menuType = item.type;

    if (item.type === "radio") {
      button.classList.add("is-radio");
    }

    let check = null;
    if (item.type !== "action") {
      check = document.createElement("span");
      check.className = "check";

      const checkMark = document.createElement("span");
      checkMark.className = "check-mark";
      check.appendChild(checkMark);
    } else {
      check = document.createElement("span");
    }

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = item.label;

    const shortcut = document.createElement("span");
    shortcut.className = "shortcut";
    shortcut.textContent = item.shortcut || "";

    button.appendChild(check);
    button.appendChild(label);
    button.appendChild(shortcut);

    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      setMenuOpen(false);

      if (item.type === "action") {
        if (item.id === "window.close") {
          const currentWindow = getCurrentWindow();
          if (currentWindow) {
            await currentWindow.close();
          }
        }
        return;
      }

      const invoke = getTauriInvoke();
      if (!invoke) return;

      try {
        await invoke("menu_action", { id: item.id });
      } catch (error) {
        console.warn("[menu] action failed", error);
      }

      await refreshMenuState();
    });

    dropdown.appendChild(button);
    menuItemElements.set(item.id, button);
  };

  const renderMenu = (items) => {
    dropdown.innerHTML = "";
    menuItemElements.clear();
    items.forEach(buildMenuItem);
  };

  renderMenu(buildMenuModel(false));

  const setMenuItemChecked = (id, checked) => {
    const button = menuItemElements.get(id);
    if (!button) return;
    button.classList.toggle("is-checked", checked);
  };

  const setLogLevelChecked = (level) => {
    const logItems = [
      { id: MENU_IDS.logError, value: "error" },
      { id: MENU_IDS.logWarn, value: "warn" },
      { id: MENU_IDS.logInfo, value: "info" },
      { id: MENU_IDS.logDebug, value: "debug" },
      { id: MENU_IDS.logVerbose, value: "verbose" }
    ];
    logItems.forEach(({ id, value }) => {
      setMenuItemChecked(id, value === level);
    });
  };

  const refreshMenuState = async () => {
    const invoke = getTauriInvoke();
    if (!invoke) return;

    try {
      const [settings, protectedState] = await Promise.all([
        invoke("get_settings"),
        invoke("get_content_protection")
      ]);

      setMenuItemChecked(MENU_IDS.contentProtection, !!protectedState);
      setMenuItemChecked(MENU_IDS.autostart, !!settings?.autoStart);
      setMenuItemChecked(MENU_IDS.startMinimized, !!settings?.startMinimized);
      setLogLevelChecked(settings?.logLevel || "info");
    } catch (error) {
      console.warn("[menu] refresh failed", error);
    }
  };

  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = dropdown.getAttribute("data-open") === "true";
    setMenuOpen(!isOpen);
  });

  const isEventInsideHost = (event) => {
    const path = event.composedPath ? event.composedPath() : [];
    return path.includes(host);
  };

  document.addEventListener("click", (event) => {
    if (!isEventInsideHost(event)) {
      setMenuOpen(false);
      return;
    }
    const path = event.composedPath ? event.composedPath() : [];
    const clickedMenuArea = path.includes(menuButton) || path.includes(dropdown) || path.includes(left);
    if (!clickedMenuArea) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
    }
  });

  const maybeListenContentProtection = () => {
    const listen = window.__TAURI__?.event?.listen;
    if (!listen) return;
    listen("content-protection-changed", (event) => {
      setMenuItemChecked(MENU_IDS.contentProtection, !!event.payload);
    });
  };

  const syncMenuForDev = async () => {
    const isDev = await getIsDev();
    if (!isDev) return;
    renderMenu(buildMenuModel(true));
    await refreshMenuState();
  };

  const minimizeBtn = document.createElement("button");
  minimizeBtn.className = "winbtn";
  minimizeBtn.type = "button";
  minimizeBtn.title = "Minimize";
  minimizeBtn.innerHTML =
    "<svg class='icon' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' aria-hidden='true' style='transform: scale(0.4);'>" +
    "<path fill='currentColor' d='M19 13H5v-2h14z'/>" +
    "</svg>";
  minimizeBtn.addEventListener("click", () => {
    const currentWindow = getCurrentWindow();
    if (currentWindow) {
      currentWindow.minimize();
    }
  });

  const maximizeBtn = document.createElement("button");
  maximizeBtn.className = "winbtn";
  maximizeBtn.type = "button";
  const maximizeIcon =
    "<svg class='icon' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' aria-hidden='true' style='transform: scale(0.4);'>" +
    "<rect x='3' y='3' width='6' height='6' rx='0' ry='0' fill='none' stroke='currentColor' stroke-width='0.8' shape-rendering='crispEdges'/>" +
    "</svg>";

  const restoreIcon =
    "<svg class='icon' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' aria-hidden='true' style='transform: scale(0.4);'>" +
    // back line
    "<line x1='4' y1='2' x2='10' y2='2' stroke='currentColor' stroke-width='1' shape-rendering='crispEdges'/>" +
    "<line x1='9.5' y1='2' x2='9.5' y2='8' stroke='currentColor' stroke-width='1' shape-rendering='crispEdges'/>" +
    // front window
    "<rect x='1.5' y='4' width='6' height='6' fill='none' stroke='currentColor' stroke-width='1' shape-rendering='crispEdges'/>" +
    "</svg>";

  const setMaximizeIcon = (isMaximized) => {
    maximizeBtn.innerHTML = isMaximized ? restoreIcon : maximizeIcon;
    maximizeBtn.title = isMaximized ? "Restore" : "Maximize";
  };

  const refreshMaximizeState = async () => {
    const isMaximized = await getIsMaximized();
    setMaximizeIcon(isMaximized);
  };

  maximizeBtn.addEventListener("click", async () => {
    const currentWindow = getCurrentWindow();
    if (!currentWindow) return;

    const wasMaximized = await getIsMaximized();
    await currentWindow.toggleMaximize();
    setMaximizeIcon(!wasMaximized);
  });

  const closeBtn = document.createElement("button");
  closeBtn.className = "winbtn close";
  closeBtn.type = "button";
  closeBtn.title = "Close";
  closeBtn.innerHTML =
    "<svg class='icon' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' aria-hidden='true' style='transform: scale(0.4);'>" +
    "<path fill='currentColor' d='M13.46 12L19 17.54V19h-1.46L12 13.46L6.46 19H5v-1.46L10.54 12L5 6.46V5h1.46L12 10.54L17.54 5H19v1.46z'/>" +
    "</svg>";
  closeBtn.addEventListener("click", () => {
    const currentWindow = getCurrentWindow();
    if (currentWindow) {
      currentWindow.close();
    }
  });

  const bindWindowStateSync = () => {
    const currentWindow = getCurrentWindow();
    if (currentWindow?.onResized) {
      currentWindow.onResized(refreshMaximizeState).catch(() => {});
    } else {
      const listen = window.__TAURI__?.event?.listen;
      if (listen) {
        listen("tauri://resize", refreshMaximizeState);
      }
    }
  };

  right.appendChild(minimizeBtn);
  right.appendChild(maximizeBtn);
  right.appendChild(closeBtn);

  bar.appendChild(left);
  bar.appendChild(drag);
  bar.appendChild(right);
  shadow.appendChild(bar);

  const injectTitlebar = () => {
    if (document.body && !document.body.contains(host)) {
      document.body.insertBefore(host, document.body.firstChild);
      const currentPadding = parseInt(getComputedStyle(document.body).paddingTop, 10) || 0;
      document.body.style.paddingTop = `${currentPadding + TITLEBAR_HEIGHT}px`;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectTitlebar);
  } else {
    injectTitlebar();
  }

  refreshMenuState();
  maybeListenContentProtection();
  syncMenuForDev();
  refreshMaximizeState();
  bindWindowStateSync();

  const observer = new MutationObserver(() => {
    if (document.body && !document.body.contains(host)) {
      injectTitlebar();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
