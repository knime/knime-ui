const featureFlagsPrefix = 'org.knime.ui.feature';

const getFlagValue = (allFlags, name) => allFlags[`${featureFlagsPrefix}.${name}`];

export default ({ store }, inject) => {
    const featureFlagDefaults = {
        [`${featureFlagsPrefix}.embedded_views_and_dialogs`]: false
    };

    const allFeatures = store.state.application.featureFlags || featureFlagDefaults;

    const features = {
        shouldDisplayEmbeddedDialogs: () => getFlagValue(allFeatures, 'embedded_views_and_dialogs'),
        
        shouldDisplayEmbeddedViews: () => getFlagValue(allFeatures, 'embedded_views_and_dialogs'),

        shouldLoadPageBuilder: () => getFlagValue(allFeatures, 'embedded_views_and_dialogs')
    };

    inject('features', features);
};
