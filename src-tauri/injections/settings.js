(() => {
  if (window.__refinedLineSettingsOverlayInstalled) return;
  window.__refinedLineSettingsOverlayInstalled = true;

  const HOST_ID = "refined-line-settings-overlay";
  const Z_INDEX = "2147483647";

  const getInvoke = () => {
    try {
      const tauri = window.__TAURI__;
      if (tauri?.core?.invoke) {
        return tauri.core.invoke;
      }
    } catch (error) {
      if (typeof console !== "undefined") {
        console.error("[refined-line] settings invoke failed", error);
      }
    }
    return null;
  };

  const getAutostartApi = () => {
    try {
      const direct = window.__TAURI__?.autostart;
      if (direct?.enable && direct?.disable && direct?.isEnabled) {
        return direct;
      }
    } catch (error) {
      if (typeof console !== "undefined") {
        console.error("[refined-line] autostart api failed", error);
      }
    }
    const invoke = getInvoke();
    if (!invoke) return null;
    return {
      enable: () => invoke("plugin:autostart|enable"),
      disable: () => invoke("plugin:autostart|disable"),
      isEnabled: () => invoke("plugin:autostart|is_enabled"),
    };
  };

  const state = {
    open: false,
    autoStart: false,
    startMinimized: false,
    contentProtected: true,
    ready: false,
    autostartAvailable: false,
    tauriAvailable: false,
  };

  let ui = null;

  const buildStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
      }
      .rl-settings-wrap {
        position: relative;
        font-family: "Segoe UI", "Yu Gothic UI", "Meiryo", sans-serif;
        color: #000;
      }
      .rl-settings-button {
        width: 40px;
        height: 40px;
        border-radius: 999px;
        border: 1px solid #efefef;
        background: #202a43;
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.12s ease;
      }
      .rl-settings-button svg {
        width: 18px;
        height: 18px;
        fill: none;
        stroke: #fff;
        stroke-width: 1.7;
      }
      .rl-settings-panel {
        position: absolute;
        top: 46px;
        right: 0;
        width: 210px;
        background: #fff;
        color: #000;
        border: 1px solid #efefef;
        border-radius: 8px;
        padding: 10px 12px;
        display: none;
      }
      .rl-settings-panel.is-open {
        display: block;
      }
      .rl-settings-title {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 8px;
      }
      .rl-settings-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 0;
        font-size: 12px;
        line-height: 1.35;
      }
      .rl-settings-note {
        font-size: 10px;
        color: #000;
        margin-top: 6px;
      }
      .rl-settings-toggle {
        position: relative;
        display: inline-block;
        width: 34px;
        height: 18px;
        flex: 0 0 auto;
      }
      .rl-settings-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .rl-settings-slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background: #efefef;
        border-radius: 8px;
        transition: background 0.2s ease;
      }
      .rl-settings-slider::before {
        content: "";
        position: absolute;
        height: 14px;
        width: 14px;
        left: 2px;
        top: 2px;
        background: #fff;
        border-radius: 7px;
        transition: transform 0.2s ease;
      }
      .rl-settings-toggle input:checked + .rl-settings-slider {
        background: #202a43;
      }
      .rl-settings-toggle input:checked + .rl-settings-slider::before {
        transform: translateX(16px);
      }
      .rl-settings-toggle input:disabled + .rl-settings-slider {
        background: #efefef;
        cursor: not-allowed;
      }
      .rl-settings-toggle input:disabled + .rl-settings-slider::before {
        background: #fff;
      }
      .rl-settings-status {
        font-size: 10px;
        color: #000;
        margin-top: 4px;
      }
    `;
    return style;
  };

  const buildButton = () => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rl-settings-button";
    button.setAttribute("aria-label", "設定");
    button.title = "設定";
    button.innerHTML = `
<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg"><path d="M19.875 6.27a2.225 2.225 0 0 1 1.125 1.948v7.284c0 .809 -.443 1.555 -1.158 1.948l-6.75 4.27a2.269 2.269 0 0 1 -2.184 0l-6.75 -4.27a2.225 2.225 0 0 1 -1.158 -1.948v-7.285c0 -.809 .443 -1.554 1.158 -1.947l6.75 -3.98a2.33 2.33 0 0 1 2.25 0l6.75 3.98h-.033z"></path><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"></path></svg>
    `;
    return button;
  };

  const buildToggle = (labelText, key) => {
    const row = document.createElement("div");
    row.className = "rl-settings-item";

    const label = document.createElement("span");
    label.textContent = labelText;

    const toggleWrap = document.createElement("label");
    toggleWrap.className = "rl-settings-toggle";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("data-key", key);

    const slider = document.createElement("span");
    slider.className = "rl-settings-slider";

    toggleWrap.appendChild(input);
    toggleWrap.appendChild(slider);
    row.appendChild(label);
    row.appendChild(toggleWrap);

    return { row, input };
  };

  const buildPanel = () => {
    const panel = document.createElement("div");
    panel.className = "rl-settings-panel";

    const title = document.createElement("div");
    title.className = "rl-settings-title";
    title.textContent = "設定";

    const protectToggle = buildToggle("画面を保護 (Alt+H)", "contentProtected");
    const autoStartToggle = buildToggle("Windows 起動時に自動起動", "autoStart");
    const startMinToggle = buildToggle("起動時に最小化", "startMinimized");

    const note = document.createElement("div");
    note.className = "rl-settings-note";
    note.textContent = "※ 起動時に最小化は次回起動から有効";

    const status = document.createElement("div");
    status.className = "rl-settings-status";

    panel.appendChild(title);
    panel.appendChild(protectToggle.row);
    panel.appendChild(autoStartToggle.row);
    panel.appendChild(startMinToggle.row);
    panel.appendChild(note);
    panel.appendChild(status);

    return {
      panel,
      protectInput: protectToggle.input,
      autoStartInput: autoStartToggle.input,
      startMinInput: startMinToggle.input,
      status,
    };
  };

  const ensureUi = () => {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.style.position = "fixed";
      host.style.top = "10px";
      host.style.right = "10px";
      host.style.zIndex = Z_INDEX;
      host.style.background = "transparent";
      document.documentElement.appendChild(host);
    }

    if (!host.shadowRoot) {
      host.attachShadow({ mode: "open" });
    }

    if (!ui || !host.shadowRoot.contains(ui.wrap)) {
      const wrap = document.createElement("div");
      wrap.className = "rl-settings-wrap";
      wrap.style.pointerEvents = "auto";

      const style = buildStyles();
      const button = buildButton();
      const panel = buildPanel();

      wrap.appendChild(button);
      wrap.appendChild(panel.panel);
      host.shadowRoot.appendChild(style);
      host.shadowRoot.appendChild(wrap);

      ui = {
        host,
        wrap,
        button,
        panel: panel.panel,
        protectInput: panel.protectInput,
        autoStartInput: panel.autoStartInput,
        startMinInput: panel.startMinInput,
        status: panel.status,
      };

      button.addEventListener("click", (event) => {
        event.stopPropagation();
        state.open = !state.open;
        render();
      });

      panel.protectInput.addEventListener("change", async (event) => {
        event.stopPropagation();
        const checked = event.currentTarget.checked;
        await handleContentProtectionToggle(checked);
      });

      panel.autoStartInput.addEventListener("change", async (event) => {
        event.stopPropagation();
        const checked = event.currentTarget.checked;
        await handleAutoStartToggle(checked);
      });

      panel.startMinInput.addEventListener("change", async (event) => {
        event.stopPropagation();
        const checked = event.currentTarget.checked;
        await handleStartMinimizedToggle(checked);
      });
    }

    return ui;
  };

  const render = () => {
    if (!ui) return;
    ui.panel.classList.toggle("is-open", state.open);
    ui.protectInput.checked = state.contentProtected;
    ui.autoStartInput.checked = state.autoStart;
    ui.startMinInput.checked = state.startMinimized;
    ui.protectInput.disabled = !state.tauriAvailable;
    ui.autoStartInput.disabled = !state.autostartAvailable;
    ui.status.textContent = state.tauriAvailable
      ? state.autostartAvailable
        ? ""
        : "自動起動はこの環境では利用できません"
      : "Tauri API が検出できませんでした";
  };

  const persistSettings = async () => {
    const invoke = getInvoke();
    if (!invoke) return;
    try {
      await invoke("update_settings", {
        settings: {
          autoStart: state.autoStart,
          startMinimized: state.startMinimized,
          contentProtection: state.contentProtected,
        },
      });
    } catch (error) {
      if (typeof console !== "undefined") {
        console.error("[refined-line] update_settings failed", error);
      }
    }
  };

  const handleContentProtectionToggle = async (enabled) => {
    state.contentProtected = enabled;
    const invoke = getInvoke();
    if (invoke) {
      try {
        const next = await invoke("set_content_protection", { enabled });
        state.contentProtected = Boolean(next);
      } catch (error) {
        if (typeof console !== "undefined") {
          console.error("[refined-line] set_content_protection failed", error);
        }
      }
    }
    render();
  };

  const handleAutoStartToggle = async (enabled) => {
    state.autoStart = enabled;
    const api = getAutostartApi();
    if (api?.enable && api?.disable) {
      try {
        if (enabled) {
          await api.enable();
        } else {
          await api.disable();
        }
      } catch (error) {
        if (typeof console !== "undefined") {
          console.error("[refined-line] autostart toggle failed", error);
        }
      }
    }
    await persistSettings();
    render();
  };

  const handleStartMinimizedToggle = async (enabled) => {
    state.startMinimized = enabled;
    await persistSettings();
    render();
  };

  const loadState = async () => {
    const invoke = getInvoke();
    state.tauriAvailable = Boolean(invoke);
    if (invoke) {
      try {
        const settings = await invoke("get_settings");
        state.autoStart = Boolean(settings?.autoStart);
        state.startMinimized = Boolean(settings?.startMinimized);
        state.contentProtected = Boolean(settings?.contentProtection ?? true);
      } catch (error) {
        if (typeof console !== "undefined") {
          console.error("[refined-line] get_settings failed", error);
        }
      }
      try {
        const enabled = await invoke("get_content_protection");
        state.contentProtected = Boolean(enabled);
      } catch (error) {
        if (typeof console !== "undefined") {
          console.error("[refined-line] get_content_protection failed", error);
        }
      }
    }

    const api = getAutostartApi();
    if (api?.isEnabled) {
      state.autostartAvailable = true;
      try {
        state.autoStart = await api.isEnabled();
      } catch (error) {
        state.autostartAvailable = false;
        if (typeof console !== "undefined") {
          console.error("[refined-line] autostart isEnabled failed", error);
        }
      }
    } else {
      state.autostartAvailable = false;
    }

    await persistSettings();
    render();
  };

  const attachContentProtectionListener = async () => {
    try {
      const eventApi = window.__TAURI__?.event;
      if (!eventApi?.listen) return;
      await eventApi.listen("content-protection-changed", (event) => {
        state.contentProtected = Boolean(event?.payload);
        render();
      });
    } catch (error) {
      if (typeof console !== "undefined") {
        console.error("[refined-line] event listen failed", error);
      }
    }
  };

  const attachOutsideClick = () => {
    document.addEventListener(
      "click",
      (event) => {
        if (!state.open || !ui?.host) return;
        const path = event.composedPath?.() ?? [];
        if (!path.includes(ui.host)) {
          state.open = false;
          render();
        }
      },
      { capture: true },
    );
  };

  const ensureHost = () => {
    ensureUi();
    render();
  };

  ensureHost();
  attachOutsideClick();
  attachContentProtectionListener();
  loadState();

  const observer = new MutationObserver(() => {
    if (!document.getElementById(HOST_ID)) {
      ui = null;
      ensureHost();
      loadState();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
