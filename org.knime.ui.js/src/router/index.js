import VueRouter from 'vue-router';
import WorkflowPage from '@/components/WorkflowPage.vue';
import WorkflowEntryPage from '@/components/workflow/WorkflowEntryPage.vue';
import WorkflowInfoPage from '@/components/workflow/WorkflowInfoPage.vue';

export const APP_ROUTES = {
    WorkflowPage: {
        name: 'WorkflowPage',
        path: '/workflow/:projectId/:workflowId',
        component: WorkflowPage
    },
    EntryPage: {
        name: 'EntryPage',
        path: '/entry',
        component: WorkflowEntryPage
    },
    InfoPage: {
        name: 'InfoPage',
        path: '/info',
        component: WorkflowInfoPage
    }
};

const router = new VueRouter({
    mode: 'history',
    routes: Object.values(APP_ROUTES)
});

// See: https://github.com/vuejs/vue-router/issues/2932#issuecomment-533453711
const originalPush = router.push;
router.push = function push(location, onResolve, onReject) {
    if (onResolve || onReject) {
        return originalPush.call(this, location, onResolve, onReject);
    }

    const ERROR_TYPES = {
        '2': 'redirected',
        '4': 'aborted',
        '8': 'cancelled',
        '16': 'duplicated'
    };

    return originalPush.call(this, location).catch((err) => {
        if (!ERROR_TYPES[err.type]) {
            // If there really is an error, throw it
            return Promise.reject(err);
        }

        // Otherwise resolve to false to indicate the original push call didn't go to its original
        // destination.
        return Promise.resolve(false);
    });
};

export default router;
