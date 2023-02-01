import { registerEventHandlers } from '@api';
import { notifyPatch } from '@/util/event-syncer';
import { APP_ROUTES } from '@/router';
import { generateWorkflowPreview } from '@/util/generateWorkflowPreview';

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
            const nextActiveProject = openProjects?.find(item => item.activeWorkflow);
            
            // Navigate to GetStarted page when no projects are open
            if (openProjects && openProjects.length === 0) {
                await $router.push({ name: APP_ROUTES.EntryPage.GetStartedPage });
            }
            
            // When a new project is set as active, navigate to the corresponding workflow
            if (nextActiveProject && currentProjectId !== nextActiveProject.projectId) {
                await $router.push({
                    name: APP_ROUTES.WorkflowPage,
                    params: {
                        projectId: nextActiveProject.projectId,
                        workflowId: 'root',
                        skipGuards: true
                    }
                });
            }

            $store.dispatch('application/replaceApplicationState', appState);

            // In case a `SaveAndCloseWorkflowsEvent` was received before, which might've triggered
            // an `AppStateChangedEvent` later, then we make sure to clean up the busy state here
            $store.commit('application/setIsBusy', false);
        },

        // Is triggered by the backend, whenever there are AP updates available
        UpdateAvailableEvent({ newReleases, bugfixes }) {
            if (newReleases || bugfixes) {
                $store.commit('application/setAvailableUpdates', { newReleases, bugfixes });
            }
        },

        async SaveAndCloseWorkflowsEvent({ projectIds, params = [] }) {
            $store.commit('application/setIsBusy', true);

            const activeProjectId = $store.state.workflow.activeWorkflow?.projectId;
            const isCanvasEmpty = $store.state.canvas.isEmpty;

            const resolveSVGSnapshots = projectIds
                .map(async projectId => {
                    const snapshotElement = projectId === activeProjectId
                        ? await $store.dispatch('application/getActiveWorkflowSnapshot')
                        : await $store.dispatch('application/getRootWorkflowSnapshotByProjectId', { projectId });

                    return generateWorkflowPreview(snapshotElement, isCanvasEmpty);
                });

            const svgSnapshots = await Promise.all(resolveSVGSnapshots);
            const totalProjects = projectIds.length;

            window.saveAndCloseWorkflows(
                totalProjects,
                ...projectIds,
                ...svgSnapshots,
                // send over any parameters that are sent in the event payload, or empty in case none
                ...params
            );
        }
    });
};
