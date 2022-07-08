import { registerEventHandlers } from '~api';
import { notifyEvent } from '~/util/event-syncer';

export default ({ store: $store }) => {
    registerEventHandlers({
        /*
         * Is triggered by the backend, whenever a change to the workflow has been made/requested
         * Sends a list of json-patch operations to update the frontend's state
         */
        // NXT-962: Unpack arguments from Object?
        WorkflowChangedEvent(payload) {
            const { patch: { ops } } = payload;
            
            // for all patch ops rewrite their path such that they are applied to 'activeWorkflow'
            $store.dispatch(
                'workflow/patch.apply',
                ops.map(op => ({ ...op, path: `/activeWorkflow${op.path}` }))
            );
        
            notifyEvent(payload);
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
