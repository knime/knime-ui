import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

describe('application store', () => {
    let store, setProjects, fetchApplicationState, localVue;

    beforeAll(() => {
        fetchApplicationState = jest.fn().mockReturnValue({
            openedWorkflows: [{ projectId: 'foo', name: 'bar' }]
        });

        jest.doMock('~api', () => ({
            __esModule: true,
            fetchApplicationState
        }), { virtual: true });

        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(async () => {
        setProjects = jest.fn();
        store = mockVuexStore({
            application: await import('~/store/application'),
            application: {
                actions: {
                    setProjects
                }
            }
        });
    });

    it('allows initialization', async () => {
        await store.dispatch('application/initializeApplication');

        expect(fetchApplicationState).toHaveBeenCalled();
        expect(setProjects).toHaveBeenCalledWith(expect.anything(), [{ projectId: 'foo', name: 'bar' }]);
    });
});
