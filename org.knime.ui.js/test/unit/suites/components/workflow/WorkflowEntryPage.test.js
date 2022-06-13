import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';
import WorkflowEntryPage from '~/components/workflow/WorkflowEntryPage';
import OpenSourceCreditsModal from '~/components/OpenSourceCreditsModal';


describe('WorkflowEntryPage', () => {
    let mocks, doShallowMount, wrapper, $commands;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;

        $commands = {
            dispatch: jest.fn()
        };

        mocks = { $commands };
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

    it('dispatches command openWorkflow', () => {
        doShallowMount();

        const buttons = wrapper.findAll('button');
        buttons.at(1).trigger('click');
        expect($commands.dispatch).toHaveBeenCalledWith('openWorkflow');
    });

    it('dispatches command createWorkflow', () => {
        doShallowMount();

        const buttons = wrapper.findAll('button');
        buttons.at(0).trigger('click');
        expect($commands.dispatch).toHaveBeenCalledWith('createWorkflow');
    });
});
