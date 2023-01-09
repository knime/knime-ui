import { registerEventHandlers } from '@api';
import { notifyPatch } from '@/util/event-syncer';
import { APP_ROUTES } from '@/router';

export default ({ store: $store, router: $router }) => {
    registerEventHandlers({
        /**
         * Is triggered by the backend, whenever a change to the workflow has been made/requested
         * Sends a list of json-patch operations to update the frontend's state
         */
        // NXT-962: Unpack arguments from Object?
        WorkflowChangedEvent({ patch: { ops }, snapshotId }) {
            // for all patch ops rewrite their path such that they are applied to 'activeWorkflow'
            ops.forEach(op => {
                op.path = `/activeWorkflow${op.path}`;
            });
            $store.dispatch('workflow/patch.apply', ops);
        
            if (snapshotId) {
                notifyPatch(snapshotId);
            }
        },
        
        /**
         * Is triggered by the backend, whenever the application state changes
         * sends the new state
         */
        // NXT-962: Unpack arguments from Object?
        async AppStateChangedEvent({ appState }) {
            const { openProjects } = appState;
            const currentProjectId = $store.state.application.activeProjectId;
            const nextActiveProject = openProjects.find(item => item.activeWorkflow);
            
            // Navigate to EntryPage when no projects are open
            if (openProjects.length === 0) {
                await $router.push({ name: APP_ROUTES.EntryPage.name });
            }
            
            // When a new project is set as active, navigate to the corresponding workflow
            if (nextActiveProject && currentProjectId !== nextActiveProject.projectId) {
                await $router.push({
                    name: APP_ROUTES.WorkflowPage.name,
                    params: {
                        projectId: nextActiveProject.projectId,
                        workflowId: 'root',
                        skipGuards: true
                    }
                });
            }

            $store.dispatch('application/replaceApplicationState', appState);
        },

        /**
         * Is triggered by the backend, whenever there are AP updates available
         */
        UpdateAvailableEvent({ newReleases, bugfixes }) {
            // TODO: Do something here, it works now.
        }
    });
};
