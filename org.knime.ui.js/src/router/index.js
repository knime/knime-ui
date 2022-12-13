import Vue from 'vue';
import VueRouter from 'vue-router';
import WorkflowPage from '@/components/WorkflowPage.vue';
import WorkflowEntryPage from '@/components/workflow/WorkflowEntryPage.vue';
import WorkflowInfoPage from '@/components/workflow/WorkflowInfoPage.vue';

Vue.use(VueRouter);

const router = new VueRouter({
    mode: 'history',
    routes: [
        { path: '/workflow', component: WorkflowPage },
        { path: '/workflow-entry', component: WorkflowEntryPage },
        { path: '/workflow-info', component: WorkflowInfoPage },
        { path: '*', redirect: '/workflow' }
    ]
});

export default router;
