import { createRouter, createWebHistory } from 'vue-router';
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

export const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
