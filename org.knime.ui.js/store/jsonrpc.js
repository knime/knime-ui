/**
 * Store providing actions that can be triggered via the global `jsonrpcNotification` function
 * (which is injected into the global namespace via plugin)
 */
export const actions = {
    /*
     * Is triggered by the backend, whenever a change to the workflow has been made/requested
     * Sends a list of json-patch operations to update the frontend's state
     */
    // NXT-962: Unpack arguments from Array
    WorkflowChangedEvent({ dispatch }, [{ patch: { ops } }]) {
        // for all patch ops rewrite their path such that they are applied to 'activeWorkflow'
        ops.forEach(op => {
            op.path = `/activeWorkflow${op.path}`;
        });
        dispatch('workflow/patch.apply', ops, { root: true });
    },

    /*
     * Is triggered by the backend, whenever the application state changes
     * sends the new state
     */
    // NXT-962: Unpack arguments from Array
    AppStateChangedEvent({ dispatch }, [args]) {
        dispatch('application/replaceApplicationState', args.appState, { root: true });
    }
};
