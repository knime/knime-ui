import VueRouter from 'vue-router';
import WorkflowPage from '@/components/workflow/WorkflowPage.vue';
import SpaceBrowsingPage from '@/components/spaces/SpaceBrowsingPage.vue';
import EntryPageLayout from '@/components/entryPage/EntryPageLayout.vue';
import GetStartedPage from '@/components/entryPage/GetStartedPage.vue';
import InfoPage from '@/components/infoPage/InfoPage.vue';

import { APP_ROUTES } from './appRoutes';

/**
 * @type {Array<import('vue-router').Route>}
 */
export const routes = [
    {
        name: APP_ROUTES.WorkflowPage,
        path: '/workflow/:projectId/:workflowId',
        component: WorkflowPage
    },
    {
        name: APP_ROUTES.EntryPage,
        path: '/',
        component: EntryPageLayout,
        children: [
            {
                name: APP_ROUTES.EntryPage.GetStartedPage,
                path: '/get-started',
                component: GetStartedPage,
                meta: { showUpdateBanner: true }
            }
            // TODO: NXT-1461 enable again when we have a dedicated stand alone SpaceSelection page again
            // {
            //    name: APP_ROUTES.EntryPage.SpaceSelectionPage,
            //    path: '/space-selection',
            //    component: SpaceSelectionPage,
            //    meta: { showUpdateBanner: true }
            // }
        ]
    },
    {
        name: APP_ROUTES.SpaceBrowsingPage,
        path: '/space-browsing',
        component: SpaceBrowsingPage
    },
    {
        name: APP_ROUTES.InfoPage,
        path: '/info',
        component: InfoPage
    }
];

export const getPathFromRouteName = (name) => {
    const searchByName = (_routes, name, fullPath = '') => {
        const foundRoute = _routes.find(route => route.name === name);
        if (foundRoute) {
            return `${fullPath}${foundRoute.path}`;
        }

        let result = null;
        for (let i = 0; i < _routes.length; i++) {
            const currentRoute = _routes[i];
            if (currentRoute.children) {
                result = searchByName(routes[i].children, name, currentRoute.path);
            }
        }
        return result;
    };

    return searchByName(routes, name).replaceAll('//', '/');
};

const router = new VueRouter({
    mode: 'history',
    routes
});

export const muteRouterExceptions = (_router) => {
    // See: https://github.com/vuejs/vue-router/issues/2932#issuecomment-533453711
    const originalPush = _router.push;
    _router.push = function push(location, onResolve, onReject) {
        if (onResolve || onReject) {
            return originalPush.call(this, location, onResolve, onReject);
        }

        const ERROR_TYPES = {
            '2': 'redirected',
            '4': 'aborted',
            '8': 'cancelled',
            '16': 'duplicated'
        };

        return originalPush.call(this, location).catch((error) => {
            if (!ERROR_TYPES[error.type]) {
                // If there really is an error, throw it
                return Promise.reject(error);
            }

            // Otherwise resolve to false to indicate the original push call didn't go to its original
            // destination.
            return Promise.resolve(false);
        });
    };
};

muteRouterExceptions(router);

export { router };
