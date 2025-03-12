import { API } from "@api";
import { type DebouncedFunc, debounce } from "lodash-es";
import { defineStore } from "pinia";

import { runInEnvironment } from "@/environment";

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

const loadItem = <T>(key: string, defaultValue: T | null = null): T | null => {
  const item = window?.localStorage?.getItem(key);
  return item === null ? defaultValue : JSON.parse(item);
};

const saveItem = (key: string, value: any) => {
  window?.localStorage?.setItem(key, JSON.stringify(value));
};

let debouncedSetUserProfilePart: DebouncedFunc<
  typeof API.desktop.setUserProfilePart
>;

export const useSettingsStore = defineStore("settings", {
  state: (): SettingsState => ({
    settings: defaults,
  }),
  actions: {
    updateAllSettings(settings: SettingsState["settings"]) {
      this.settings = settings;
    },

    async fetchSettings() {
      try {
        const settings = await runInEnvironment({
          DESKTOP: () => API.desktop.getUserProfilePart({ key: SETTINGS_KEY }),
          BROWSER: () => Promise.resolve(loadItem(SETTINGS_KEY)),
        });

        this.updateAllSettings({ ...defaults, ...(settings ?? {}) });
      } catch (error) {
        consola.error("Failed to get user profile", error);
      }
    },

    async updateSetting(payload: { key: string; value: any }) {
      if (!debouncedSetUserProfilePart) {
        // the API import is undefined on the module root and makes the tests fail
        // This is due to order issues when importing the modules, so we use
        // a singleton approach to avoid this problem
        debouncedSetUserProfilePart = debounce(
          API.desktop.setUserProfilePart,
          // eslint-disable-next-line no-magic-numbers
          5_000,
        );
      }

      this.updateAllSettings({
        ...this.settings,
        [payload.key]: payload.value,
      });

      await runInEnvironment({
        DESKTOP: () => {
          debouncedSetUserProfilePart({
            key: SETTINGS_KEY,
            data: this.settings,
          });
        },
        BROWSER: () => saveItem(SETTINGS_KEY, this.settings),
      });
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
