import type { Store } from "vuex";
import { useStore } from "vuex";

import type { RootStoreState } from "@/store/types";
import type { PluginInitFunction } from "./types";

export type Features = {
  shouldDisplayEmbeddedDialogs: () => boolean;
  shouldDisplayEmbeddedViews: () => boolean;
  shouldLoadPageBuilder: () => boolean;
  shouldPromoteKai: () => boolean;
  isKaiInstalled: () => boolean;
};

const featureFlagsPrefix = "org.knime.ui.feature";

const featureFlagDefaults = {
  [`${featureFlagsPrefix}.embedded_views_and_dialogs`]: false,
  [`${featureFlagsPrefix}.ai_assistant`]: false,
};

const getFlagValue = (store, name) => {
  const featureFlags =
    store.state.application.featureFlags || featureFlagDefaults;
  return featureFlags[`${featureFlagsPrefix}.${name}`];
};

export const features: ($store: Store<RootStoreState>) => Features = (
  $store,
) => ({
  shouldDisplayEmbeddedDialogs: () =>
    getFlagValue($store, "embedded_views_and_dialogs"),

  shouldDisplayEmbeddedViews: () =>
    getFlagValue($store, "embedded_views_and_dialogs"),

  shouldLoadPageBuilder: () =>
    getFlagValue($store, "embedded_views_and_dialogs"),

  shouldPromoteKai: () => getFlagValue($store, "promote_ai_assistant"),

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
