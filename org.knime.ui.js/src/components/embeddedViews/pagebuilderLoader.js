import { loadComponentLibrary } from '@/util/loadComponentLibrary';

const pageBuilderResources = [
    {
        componentName: 'knime-pagebuilder',
        url: '/org/knime/core/knime-pagebuilder2.js'
    }
];

const resolvePageBuilderResource = async ({ window, store, resource }) => {
    const getResource = async () => {
        try {
            const RESOURCE_ROOT = 'http://org.knime.js.pagebuilder';
            const { componentName } = resource;
            const resourceLocation = `${RESOURCE_ROOT}${resource.url}`;

            await loadComponentLibrary({
                window,
                resourceLocation,
                componentName,
                onLoad: ({ component }) => {
                    // PageBuilder needs to register with global store
                    if (typeof component.initStore === 'function') {
                        component.initStore(store);
                    }
                }
            });

            return true;
        } catch (error) {
            consola.log('Pagebuilder resource error', error);
            throw error;
        }
    };

    const isResolved = await getResource();

    return new Promise((resolve, reject) => {
        if (isResolved) {
            resolve(isResolved);
        } else {
            // eslint-disable-next-line prefer-promise-reject-errors
            reject();
        }
    });
};

export const loadPageBuilder = async ({ window, store }) => {
    await Promise.all(
        pageBuilderResources.map(resource => resolvePageBuilderResource({ window, resource, store }))
    );
    return window.Vue.component('knime-pagebuilder');
};
