import VueRouter from 'vue-router';
import WorkflowPage from '@/components/workflow/WorkflowPage.vue';
import EntryPage from '@/components/entryPage/EntryPage.vue';
import InfoPage from '@/components/infoPage/InfoPage.vue';

export const APP_ROUTES = {
    WorkflowPage: {
        name: 'WorkflowPage',
        path: '/workflow/:projectId/:workflowId',
        component: WorkflowPage
    },
    EntryPage: {
        name: 'EntryPage',
        path: '/entry',
        component: EntryPage
    },
    InfoPage: {
        name: 'InfoPage',
        path: '/info',
        component: InfoPage
    }
};

export const routes = Object.values(APP_ROUTES);

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

export default router;
