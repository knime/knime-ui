/**
 * Store providing actions that can be triggered via the global `jsonrpcCallback` function
 * (which is injected into the global namespace via plugin)
 */
export const actions = {
    WorkflowChangedEvent({ dispatch }, [{ patch: { ops } }]) {
        ops.forEach(op => {
            op.path = `/activeWorkflow${op.path}`;
        });
        dispatch('workflow/patch.apply', ops, { root: true });
    }
};
