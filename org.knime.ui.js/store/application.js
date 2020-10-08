import { fetchApplicationState } from '~api';

/*
* This store provides global application logic
*/

export const actions = {
    async initState({ dispatch }) {
        const { openedWorkflows = [] } = await fetchApplicationState();

        dispatch('openedProjects/setProjects', openedWorkflows, { root: true });
    }
};
