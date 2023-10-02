import type { Store } from "vuex";
import { useStore } from "vuex";
import { API } from "@api";

export type Features = {
  shouldDisplayEmbeddedDialogs: () => boolean;
  shouldDisplayEmbeddedViews: () => boolean;
  shouldLoadPageBuilder: () => boolean;
  shouldShowAiAssistant: () => boolean;
};

const featureFlagsPrefix = "org.knime.ui.feature";

const featureFlagDefaults = {
  [`${featureFlagsPrefix}.embedded_views_and_dialogs`]: false,
};

const getFlagValue = (store, name) => {
  const featureFlags =
    store.state.application.featureFlags || featureFlagDefaults;
  return featureFlags[`${featureFlagsPrefix}.${name}`];
};

export const features: ($store: Store<any>) => Features = ($store) => ({
  shouldDisplayEmbeddedDialogs: () =>
    getFlagValue($store, "embedded_views_and_dialogs"),

  shouldDisplayEmbeddedViews: () =>
    getFlagValue($store, "embedded_views_and_dialogs"),

  shouldLoadPageBuilder: () =>
    true,

  shouldShowAiAssistant: () => API.desktop.isAiAssistantBackendAvailable(),
});

export const useFeatures: () => Features = () => {
  const store = useStore();
  return features(store);
};

export default ({ app, $store }) => {
  app.config.globalProperties.$features = features($store);
};
