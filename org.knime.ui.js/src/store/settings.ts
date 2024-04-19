import type { RootStoreState } from "@/store/types";
import type { ActionTree, MutationTree } from "vuex";

import { API } from "@api";

/**
 * Store that manages UI settings, for now saved to local storage
 */

export type NodeRepositoryDisplayModesType = "icon" | "list";

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
  };
}

const defaults: SettingsState["settings"] = {
  nodeOutputSize: 40, // %
  nodeDialogSize: 400, // px
  nodeRepositoryDisplayMode: "icon",
  uiScale: 1.0,
};

const loadItem = <T>(key: string, defaultValue: T | null = null): T => {
  const item = window?.localStorage?.getItem(key);
  return item === null ? defaultValue : JSON.parse(item);
};

const saveItem = (key: string, value: any) => {
  window?.localStorage?.setItem(key, JSON.stringify(value));
};

export const state = (): SettingsState => ({
  settings: defaults,
});

export const mutations: MutationTree<SettingsState> = {
  updateAllSettings(state, payload) {
    state.settings = payload;
  },
};

export const actions: ActionTree<SettingsState, RootStoreState> = {
  fetchSettings({ commit }) {
    const settings = loadItem(SETTINGS_KEY);

    commit("updateAllSettings", { ...defaults, ...(settings ?? {}) });
  },

  updateSetting({ state, commit }, payload: { key: string; value: any }) {
    commit("updateAllSettings", {
      ...state.settings,
      [payload.key]: payload.value,
    });
    saveItem(SETTINGS_KEY, state.settings);
  },

  async increaseUiScale({ state, dispatch }) {
    const newScale = parseFloat(
      (state.settings.uiScale + UI_SCALE_STEPSIZE).toFixed(2),
    );
    await API.desktop.setZoomLevel(ratioToZoomLevel(newScale));

    dispatch("updateSetting", {
      key: "uiScale",
      value: newScale,
    });
  },
  async decreaseUiScale({ state, dispatch }) {
    const newScale = parseFloat(
      (state.settings.uiScale - UI_SCALE_STEPSIZE).toFixed(2),
    );
    await API.desktop.setZoomLevel(ratioToZoomLevel(newScale));

    dispatch("updateSetting", {
      key: "uiScale",
      value: newScale,
    });
  },
  async resetUiScale({ dispatch }) {
    await API.desktop.setZoomLevel(0);

    dispatch("updateSetting", {
      key: "uiScale",
      value: 1.0,
    });
  },
};
