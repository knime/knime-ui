import { registerEventHandlers } from '~knime-ui/api/json-rpc-notifications';

export default ({ store: $store }) => {
    registerEventHandlers({
        /*
         * Is triggered by the backend, whenever a change to the workflow has been made/requested
         * Sends a list of json-patch operations to update the frontend's state
         */
        // NXT-962: Unpack arguments from Object?
        WorkflowChangedEvent({ patch: { ops } }) {
            // for all patch ops rewrite their path such that they are applied to 'activeWorkflow'
            ops.forEach(op => {
                op.path = `/activeWorkflow${op.path}`;
            });
            $store.dispatch('workflow/patch.apply', ops);
        },
        
        /*
         * Is triggered by the backend, whenever the application state changes
         * sends the new state
         */
        // NXT-962: Unpack arguments from Object?
        AppStateChangedEvent({ appState }) {
            $store.dispatch('application/replaceApplicationState', appState);
        }
    });
};
