import {
  type ApplicationState,
  useApplicationStore,
} from "@/store/application/application";

import type { PluginInitFunction } from "./types";

export type Features = {
  // Define your feature flags here, e.g.:
  // newFeature: () => boolean;
  isComponentSearchEnabled: () => boolean;
};

const featureFlagsPrefix = "org.knime.ui.feature";

const featureFlagDefaults = {
  // Define default values for your feature flags here, e.g.:
  // [`${featureFlagsPrefix}.new_feature`]: false,
  [`${featureFlagsPrefix}.component_search`]: false,
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
  isComponentSearchEnabled: () =>
    Boolean(getFlagValue(featureFlags, "component_search")),
});

export const useFeatures: () => Features = () => {
  return features(useApplicationStore().featureFlags);
};

const init: PluginInitFunction = ({ app }) => {
  app.config.globalProperties.$features = features(
    useApplicationStore().featureFlags,
  );
};

export default init;
