import {
  type ApplicationState,
  useApplicationStore,
} from "@/store/application/application";

import type { PluginInitFunction } from "./types";

export type Features = {
  isQuickAddComponentSearchEnabled: () => boolean;
  isComponentReplacementInsertionEnabled: () => boolean;
};

const featureFlagsPrefix = "org.knime.ui.feature";

const featureFlagDefaults = {
  [`${featureFlagsPrefix}.component_search_quick_add`]: false,
  [`${featureFlagsPrefix}.component_drag_replace_insert`]: false,
};

const getFlagValue = (
  featureFlags: ApplicationState["featureFlags"] = featureFlagDefaults,
  name: string,
) => {
  return (
    featureFlags[`${featureFlagsPrefix}.${name}`] ??
    featureFlagDefaults[`${featureFlagsPrefix}.${name}`]
  );
};

export const features: (
  featureFlags: ApplicationState["featureFlags"],
) => Features = (featureFlags) => ({
  isQuickAddComponentSearchEnabled: () =>
    Boolean(getFlagValue(featureFlags, "component_search_quick_add")),
  isComponentReplacementInsertionEnabled: () =>
    Boolean(getFlagValue(featureFlags, "component_drag_replace_insert")),
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
