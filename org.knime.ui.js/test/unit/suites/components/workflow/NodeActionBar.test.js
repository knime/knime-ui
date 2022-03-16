import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';
import { mockVuexStore } from '~/test/unit/test-utils';

import * as $shapes from '~/style/shapes';

import NodeActionBar from '~/components/workflow/NodeActionBar';
import ActionButton from '~/components/workflow/ActionButton';

const nodeId = 'root:1';

jest.mock('~/commands', () => ({
    resetSelected: {
        hotkeyText: 'MOCK HOTKEY TEXT'
    }
}));

describe('NodeActionBar', () => {
    let mocks, doMount, workflowStoreConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        mocks = { $shapes };

        doMount = (allowedActions = {}, storeConfig = {}) => {
            workflowStoreConfig = {
                actions: {
                    executeNodes: jest.fn(),
                    cancelNodeExecution: jest.fn(),
                    resetNodes: jest.fn(),
                    pauseLoopExecution: jest.fn(),
                    resumeLoopExecution: jest.fn(),
                    stepLoopExecution: jest.fn(),
                    openView: jest.fn(),
                    openDialog: jest.fn()
                }
            };
            mocks.$store = mockVuexStore({ workflow: workflowStoreConfig, ...storeConfig });
            return shallowMount(NodeActionBar, {
                propsData: {
                    nodeId,
                    ...allowedActions
                },
                mocks
            });
        };
    });

    it('renders disabled action buttons without openDialog and openView', () => {
        let wrapper = doMount();
        let buttons = wrapper.findAllComponents(ActionButton);

        /* eslint-disable no-magic-numbers */
        expect(buttons.at(0).props()).toStrictEqual(expect.objectContaining({ x: -25, disabled: true }));
        expect(buttons.at(1).props()).toStrictEqual(expect.objectContaining({ x: 0, disabled: true }));
        expect(buttons.at(2).props()).toStrictEqual(expect.objectContaining({ x: 25, disabled: true }));
        /* eslint-enable no-magic-numbers */
    });

    it('renders disabled action buttons with openDialog and without openView', () => {
        let wrapper = doMount({ canOpenDialog: false });
        let buttons = wrapper.findAllComponents(ActionButton);

        /* eslint-disable no-magic-numbers */
        expect(buttons.at(0).props()).toStrictEqual(expect.objectContaining({ x: -37.5, disabled: true }));
        expect(buttons.at(1).props()).toStrictEqual(expect.objectContaining({ x: -12.5, disabled: true }));
        expect(buttons.at(2).props()).toStrictEqual(expect.objectContaining({ x: 12.5, disabled: true }));
        expect(buttons.at(3).props()).toStrictEqual(expect.objectContaining({ x: 37.5, disabled: true }));
        /* eslint-enable no-magic-numbers */
    });

    it('renders disabled action buttons with openDialog and openView', () => {
        let wrapper = doMount({ canOpenDialog: false, canOpenView: false });
        let buttons = wrapper.findAllComponents(ActionButton);

        /* eslint-disable no-magic-numbers */
        expect(buttons.at(0).props()).toStrictEqual(expect.objectContaining({ x: -50, disabled: true }));
        expect(buttons.at(1).props()).toStrictEqual(expect.objectContaining({ x: -25, disabled: true }));
        expect(buttons.at(2).props()).toStrictEqual(expect.objectContaining({ x: 0, disabled: true }));
        expect(buttons.at(3).props()).toStrictEqual(expect.objectContaining({ x: 25, disabled: true }));
        expect(buttons.at(4).props()).toStrictEqual(expect.objectContaining({ x: 50, disabled: true }));
        /* eslint-enable no-magic-numbers */
    });

    it('renders enabled action buttons', () => {
        let wrapper = doMount({
            canOpenDialog: true,
            canExecute: true,
            canCancel: true,
            canReset: true,
            canOpenView: true
        });
        let buttons = wrapper.findAllComponents(ActionButton);

        // fires action event
        buttons.wrappers.forEach(button => { button.vm.$emit('click'); });
        expect(workflowStoreConfig.actions.openDialog).toHaveBeenCalled();
        expect(workflowStoreConfig.actions.executeNodes).toHaveBeenCalled();
        expect(workflowStoreConfig.actions.cancelNodeExecution).toHaveBeenCalled();
        expect(workflowStoreConfig.actions.resetNodes).toHaveBeenCalled();
        expect(workflowStoreConfig.actions.openView).toHaveBeenCalled();
    });

    it('renders loop action buttons', () => {
        let wrapper = doMount({ canStep: true, canPause: true, canResume: false });
        let buttons = wrapper.findAllComponents(ActionButton);

        // fires action event
        buttons.wrappers.forEach(button => { button.vm.$emit('click'); });
        expect(workflowStoreConfig.actions.pauseLoopExecution).toHaveBeenCalled();
        expect(workflowStoreConfig.actions.stepLoopExecution).toHaveBeenCalled();

        wrapper = doMount({ canStep: true, canPause: false, canResume: true });

        buttons = wrapper.findAllComponents(ActionButton);
        buttons.wrappers.forEach(button => { button.vm.$emit('click'); });
        expect(workflowStoreConfig.actions.resumeLoopExecution).toHaveBeenCalled();
        expect(workflowStoreConfig.actions.stepLoopExecution).toHaveBeenCalled();

        // ensure only two of the three loop options are rendered at a time
        wrapper = doMount({ canStep: true, canPause: true, canResume: true });

        buttons = wrapper.findAllComponents(ActionButton);
        buttons.wrappers.forEach(button => { button.vm.$emit('click'); });
        expect(workflowStoreConfig.actions.pauseLoopExecution).toHaveBeenCalled();
        expect(workflowStoreConfig.actions.stepLoopExecution).toHaveBeenCalled();
        expect(workflowStoreConfig.actions.resumeLoopExecution).not.toHaveBeenCalled();
    });

    it('renders node Id', () => {
        let wrapper = doMount();
        expect(wrapper.find('text').text()).toBe('root:1');
    });

    it('should add the hotkey binding to the action tooltip when node is selected', () => {
        const getters = {
            singleSelectedNode() {
                return { id: nodeId };
            }
        };
        const wrapper = doMount({ canReset: true }, { selection: { getters } });
        const buttons = wrapper.findAllComponents(ActionButton);
        const lastButton = buttons.at(buttons.length - 1);

        expect(lastButton.props('title')).toMatch('- MOCK HOTKEY TEXT');
    });
});
