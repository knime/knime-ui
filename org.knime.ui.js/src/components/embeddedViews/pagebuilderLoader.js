import { loadComponentLibrary, isComponentRegistered } from '@/util/loadComponentLibrary';

const pageBuilderResources = [
    {
        name: 'knime-pagebuilder',
        componentName: 'PageBuilder',
        url: '/org/knime/core/knime-pagebuilder2.js'
    }
];

const resolvePageBuilderResource = async ({ resource, vueInstance, store }) => {
    const getResource = async () => {
        const RESOURCE_ROOT = 'http://org.knime.js.pagebuilder';
        const { name } = resource;
        // abort if resource was already loaded and registered by a previous route
        if (isComponentRegistered({ vueInstance, name })) {
            // Promise can resolve right away if no loading needed
            return true;
        }
    
        const resourceLocation = `${RESOURCE_ROOT}${resource.url}`;

        try {
            await loadComponentLibrary({
                window,
                resourceLocation,
                componentName: name,
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

export const loadPageBuilder = async (store, vueInstance) => {
    await Promise.all(
        pageBuilderResources.map(resource => resolvePageBuilderResource({ resource, store, vueInstance }))
    );
    return vueInstance.component('knime-pagebuilder');
};
