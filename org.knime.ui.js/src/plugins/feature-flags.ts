export type Features = {
  shouldDisplayEmbeddedDialogs: () => boolean;
  shouldDisplayEmbeddedViews: () => boolean;
  shouldLoadPageBuilder: () => boolean;
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

export default ({ app, $store }) => {
  const features: Features = {
    shouldDisplayEmbeddedDialogs: () =>
      getFlagValue($store, "embedded_views_and_dialogs"),

    shouldDisplayEmbeddedViews: () =>
      getFlagValue($store, "embedded_views_and_dialogs"),

    shouldLoadPageBuilder: () =>
      getFlagValue($store, "embedded_views_and_dialogs"),
  };

  app.config.globalProperties.$features = features;
};
