import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';
import WorkflowEntryPage from '~/components/workflow/WorkflowEntryPage.vue';
import OpenSourceCreditsModal from '~/components/OpenSourceCreditsModal.vue';


describe('WorkflowEntryPage', () => {
    let mocks, doShallowMount, wrapper, $shortcuts;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;

        $shortcuts = {
            dispatch: jest.fn()
        };

        mocks = { $shortcuts };
        doShallowMount = () => {
            wrapper = shallowMount(WorkflowEntryPage, { mocks });
        };
    });

    it('renders two buttons', () => {
        doShallowMount();
        const buttons = wrapper.findAll('button');
        expect(buttons.length).toBe(2);
    });

    it('renders open source credits modal', () => {
        doShallowMount();

        expect(wrapper.findComponent(OpenSourceCreditsModal).exists()).toBe(true);
    });

    it('dispatches shortcut handler to openWorkflow', () => {
        doShallowMount();

        const buttons = wrapper.findAll('button');
        buttons.at(1).trigger('click');
        expect($shortcuts.dispatch).toHaveBeenCalledWith('openWorkflow');
    });

    it('dispatches shortcut handler to createWorkflow', () => {
        doShallowMount();

        const buttons = wrapper.findAll('button');
        buttons.at(0).trigger('click');
        expect($shortcuts.dispatch).toHaveBeenCalledWith('createWorkflow');
    });
});
