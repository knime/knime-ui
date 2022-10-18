import { shallowMount } from '@vue/test-utils';

import OpenSourceCreditsModal from '../OpenSourceCreditsModal.vue';
import WorkflowEntryPage from '../WorkflowEntryPage.vue';

describe('WorkflowEntryPage', () => {
    const $shortcuts = {
        dispatch: jest.fn()
    };

    const doShallowMount = () => shallowMount(WorkflowEntryPage, { global: { mocks: { $shortcuts } } });

    it('renders two buttons', () => {
        const wrapper = doShallowMount();
        const buttons = wrapper.findAll('button');
        expect(buttons.length).toBe(2);
    });

    it('renders open source credits modal', () => {
        const wrapper = doShallowMount();

        expect(wrapper.findComponent(OpenSourceCreditsModal).exists()).toBe(true);
    });

    it('dispatches shortcut handler to openWorkflow', () => {
        const wrapper = doShallowMount();

        const buttons = wrapper.findAll('button');
        buttons.at(1).trigger('click');
        expect($shortcuts.dispatch).toHaveBeenCalledWith('openWorkflow');
    });

    it('dispatches shortcut handler to createWorkflow', () => {
        const wrapper = doShallowMount();

        const buttons = wrapper.findAll('button');
        buttons.at(0).trigger('click');
        expect($shortcuts.dispatch).toHaveBeenCalledWith('createWorkflow');
    });
});
