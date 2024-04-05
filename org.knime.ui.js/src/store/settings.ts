import type { RootStoreState } from "@/store/types";
import type { ActionTree, MutationTree } from "vuex";
/**
 * Store that manages UI settings, for now saved to local storage
 */

export type NodeRepositoryDisplayModesType = "icon" | "list";

const SETTINGS_KEY = "knime-ui-settings";
export interface SettingsState {
  settings: {
    nodeOutputSize: number;
    nodeRepositoryDisplayMode: NodeRepositoryDisplayModesType;
    nodeDialogSize: number;
  };
}

const loadItem = <T>(key: string, defaultValue: T | null = null): T => {
  const item = window?.localStorage?.getItem(key);
  return item === null ? defaultValue : JSON.parse(item);
};

const saveItem = (key: string, value: any) => {
  window?.localStorage?.setItem(key, JSON.stringify(value));
};

export const state = (): SettingsState => ({
  settings: {
    nodeRepositoryDisplayMode: "icon",
    nodeOutputSize: 40, // %
    nodeDialogSize: 400, // px
  },
});

export const mutations: MutationTree<SettingsState> = {
  updateAllSettings(state, payload) {
    state.settings = payload;
  },
};

export const actions: ActionTree<SettingsState, RootStoreState> = {
  fetchSettings({ commit }) {
    const settings = loadItem(SETTINGS_KEY);
    if (settings !== null) {
      commit("updateAllSettings", settings);
    }
  },

  updateSetting({ state, commit }, payload: { key: string; value: any }) {
    commit("updateAllSettings", {
      ...state.settings,
      [payload.key]: payload.value,
    });
    saveItem(SETTINGS_KEY, state.settings);
  },
};
