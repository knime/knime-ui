import { API } from "@api";
import { defineStore } from "pinia";


/**
 * Store that manages UI settings, for now saved to local storage
 */
export type NodeRepositoryDisplayModesType = "icon" | "list" | "tree";

const SETTINGS_KEY = "knime-ui-settings";
export const UI_SCALE_STEPSIZE = 0.2;

// Equo chromium applies 1.2 "browser-zoom" per each "zoom level" (compounding)
const CHROMIUM_ZOOM_MULTIPLIER_RATIO = 1.2;
export const ratioToZoomLevel = (ratio: number) =>
  Math.log(ratio) / Math.log(CHROMIUM_ZOOM_MULTIPLIER_RATIO);

export interface SettingsState {
  settings: {
    nodeOutputSize: number;
    nodeRepositoryDisplayMode: NodeRepositoryDisplayModesType;
    nodeDialogSize: number;
    uiScale: number;
    askBeforeAutoApplyNodeConfigChanges: boolean;
    shouldShowExampleWorkflows: boolean;
  };
}

const defaults: SettingsState["settings"] = {
  nodeOutputSize: 40, // %
  nodeDialogSize: 400, // px
  nodeRepositoryDisplayMode: "icon",
  uiScale: 1.0,
  askBeforeAutoApplyNodeConfigChanges: true,
  shouldShowExampleWorkflows: true,
};

const loadItem = <T>(key: string, defaultValue: T | null = null): T => {
  const item = window?.localStorage?.getItem(key);
  return item === null ? defaultValue : JSON.parse(item);
};

const saveItem = (key: string, value: any) => {
  window?.localStorage?.setItem(key, JSON.stringify(value));
};

export const useSettingsStore = defineStore("settings", {
  state: (): SettingsState => ({
    settings: defaults,
  }),
  actions: {
    updateAllSettings(settings: SettingsState["settings"]) {
      this.settings = settings;
    },

    fetchSettings() {
      const settings = loadItem(SETTINGS_KEY);

      this.updateAllSettings({ ...defaults, ...(settings ?? {}) });
    },

    updateSetting(payload: { key: string; value: any }) {
      this.updateAllSettings({
        ...this.settings,
        [payload.key]: payload.value,
      });

      saveItem(SETTINGS_KEY, this.settings);
    },

    async increaseUiScale() {
      const newScale = parseFloat(
        (this.settings.uiScale + UI_SCALE_STEPSIZE).toFixed(2),
      );
      await API.desktop.setZoomLevel(ratioToZoomLevel(newScale));

      this.updateSetting({
        key: "uiScale",
        value: newScale,
      });
    },

    async decreaseUiScale() {
      const newScale = parseFloat(
        (this.settings.uiScale - UI_SCALE_STEPSIZE).toFixed(2),
      );
      await API.desktop.setZoomLevel(ratioToZoomLevel(newScale));

      this.updateSetting({
        key: "uiScale",
        value: newScale,
      });
    },

    async resetUiScale() {
      await API.desktop.setZoomLevel(0);

      this.updateSetting({
        key: "uiScale",
        value: 1.0,
      });
    },
  },
});
