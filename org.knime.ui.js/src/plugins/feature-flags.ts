/* eslint-disable unused-imports/no-unused-vars */
import { useStore } from "vuex";

import type { ApplicationState } from "@/store/application";

import type { PluginInitFunction } from "./types";

export type Features = {
  // Define your feature flags here, e.g.:
  // newFeature: () => boolean;
};

const featureFlagsPrefix = "org.knime.ui.feature";

const featureFlagDefaults = {
  // Define default values for your feature flags here, e.g.:
  // [`${featureFlagsPrefix}.new_feature`]: false,
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
  // Define your feature flag getters here, e.g.:
  // newFeature: () => getFlagValue(featureFlags, "new_feature"),
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
