/**
 * Store providing actions that can be triggered via the global `jsonrpcCallback` function
 * (which is injected into the global namespace via plugin)
 */
export const actions = {
    WorkflowChangedEvent({ state, commit, dispatch, getters, rootState, rootGetters }, ...payload) {
        dispatch('workflow/applyPatch', payload, { root: true });
    }
};
