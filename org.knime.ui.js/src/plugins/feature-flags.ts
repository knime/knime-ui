import { useStore } from "vuex";

import type { ApplicationState } from "@/store/application";

import type { PluginInitFunction } from "./types";

export type Features = {
  // Example feature flag:
  placeholderFeature: () => boolean;
};

const featureFlagsPrefix = "org.knime.ui.feature";

const featureFlagDefaults = {
  // Example default:
  [`${featureFlagsPrefix}.placeholder_feature`]: false,
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
  // Example feature flag:
  placeholderFeature: () => getFlagValue(featureFlags, "placeholder_feature"),
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
