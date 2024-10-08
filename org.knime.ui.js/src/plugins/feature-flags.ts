import { useStore } from "vuex";

import type { ApplicationState } from "@/store/application";

import type { PluginInitFunction } from "./types";

export type Features = {
  shouldDisplayEmbeddedDialogs: () => boolean;
  isKaiPermitted: () => boolean;
  isKaiInstalled: () => boolean;
};

const featureFlagsPrefix = "org.knime.ui.feature";

const featureFlagDefaults = {
  [`${featureFlagsPrefix}.embedded_views_and_dialogs`]: false,
  [`${featureFlagsPrefix}.ai_assistant`]: true,
  [`${featureFlagsPrefix}.ai_assistant_installed`]: false,
};

const getFlagValue = (
  featureFlags: ApplicationState["featureFlags"] = featureFlagDefaults,
  name: string,
) => {
  return featureFlags[`${featureFlagsPrefix}.${name}`];
};

export const features: (
  featureFlags: ApplicationState["featureFlags"],
) => Features = (featureFlags) => ({
  shouldDisplayEmbeddedDialogs: () =>
    getFlagValue(featureFlags, "embedded_views_and_dialogs"),

  isKaiPermitted: () => getFlagValue(featureFlags, "ai_assistant"),

  isKaiInstalled: () => getFlagValue(featureFlags, "ai_assistant_installed"),
});

export const useFeatures: () => Features = () => {
  const store = useStore();
  return features(store.state.application.featureFlags);
};

const init: PluginInitFunction = ({ app, $store }) => {
  app.config.globalProperties.$features = features(
    $store.state.application.featureFlags,
  );
};

export default init;
