import type { Store } from "vuex";
import { useStore } from "vuex";

import type { RootStoreState } from "@/store/types";
import type { PluginInitFunction } from "./types";

export type Features = {
  shouldDisplayEmbeddedDialogs: () => boolean;
  shouldDisplayEmbeddedViews: () => boolean;
  isKaiPermitted: () => boolean;
  isKaiInstalled: () => boolean;
};

const featureFlagsPrefix = "org.knime.ui.feature";

const featureFlagDefaults = {
  [`${featureFlagsPrefix}.embedded_views_and_dialogs`]: false,
  [`${featureFlagsPrefix}.ai_assistant`]: true,
  [`${featureFlagsPrefix}.ai_assistant_installed`]: false,
};

const getFlagValue = (store: Store<RootStoreState>, name: string) => {
  const featureFlags =
    store.state.application.featureFlags || featureFlagDefaults;

  return featureFlags[`${featureFlagsPrefix}.${name}`];
};

export const features: ($store: Store<RootStoreState>) => Features = (
  $store,
) => ({
  shouldDisplayEmbeddedDialogs: () =>
    getFlagValue($store, "embedded_views_and_dialogs"),

  shouldDisplayEmbeddedViews: () => true,
  // getFlagValue($store, "embedded_views_and_dialogs"),

  isKaiPermitted: () => getFlagValue($store, "ai_assistant"),

  isKaiInstalled: () => getFlagValue($store, "ai_assistant_installed"),
});

export const useFeatures: () => Features = () => {
  const store = useStore();
  return features(store);
};

const init: PluginInitFunction = ({ app, $store }) => {
  app.config.globalProperties.$features = features($store);
};

export default init;
