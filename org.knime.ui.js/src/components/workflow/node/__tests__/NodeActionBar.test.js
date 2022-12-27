import { mount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import * as $shapes from '@/style/shapes.mjs';

import ActionButton from '@/components/common/ActionButton.vue';
import NodeActionBar from '../NodeActionBar.vue';

describe('NodeActionBar', () => {
    const $shortcuts = {
        get: jest.fn(() => ({}))
    };

    const doMount = ({ props, isNodeSelected = () => () => false } = {}) => {
        const defaultProps = {
            nodeId: 'root:1'
        };
        const storeConfig = {
            workflow: {
                actions: {
                    executeNodes: jest.fn(),
                    cancelNodeExecution: jest.fn(),
                    resetNodes: jest.fn(),
                    pauseLoopExecution: jest.fn(),
                    resumeLoopExecution: jest.fn(),
                    stepLoopExecution: jest.fn(),
                    openView: jest.fn(),
                    openNodeConfiguration: jest.fn()
                }
            },
            selection: {
                getters: {
                    isNodeSelected
                }
            }
        };

        const $store = mockVuexStore(storeConfig);

        const wrapper = mount(NodeActionBar, {
            props: {
                ...defaultProps,
                ...props
            },
            global: {
                plugins: [$store],
                mocks: { $shapes, $shortcuts }
            }
        });

        return { wrapper, storeConfig };
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders disabled action buttons without openNodeConfiguration and openView', () => {
        const { wrapper } = doMount();

        let buttons = wrapper.findAllComponents(ActionButton);
        
        expect(buttons[0].props()).toStrictEqual(expect.objectContaining({ x: -25, disabled: true }));
        expect(buttons[1].props()).toStrictEqual(expect.objectContaining({ x: 0, disabled: true }));
        expect(buttons[2].props()).toStrictEqual(expect.objectContaining({ x: 25, disabled: true }));
    });

    it('renders disabled action buttons with openNodeConfiguration and without openView', () => {
        const { wrapper } = doMount({ props: { canOpenDialog: false } });

        let buttons = wrapper.findAllComponents(ActionButton);
        
        expect(buttons.at(0).props()).toStrictEqual(expect.objectContaining({ x: -37.5, disabled: true }));
        expect(buttons.at(1).props()).toStrictEqual(expect.objectContaining({ x: -12.5, disabled: true }));
        expect(buttons.at(2).props()).toStrictEqual(expect.objectContaining({ x: 12.5, disabled: true }));
        expect(buttons.at(3).props()).toStrictEqual(expect.objectContaining({ x: 37.5, disabled: true }));
    });

    it('renders disabled action buttons with openNodeConfiguration and openView', () => {
        const { wrapper } = doMount({
            props: { canOpenDialog: false, canOpenView: false }
        });

        let buttons = wrapper.findAllComponents(ActionButton);
        
        expect(buttons.at(0).props()).toStrictEqual(expect.objectContaining({ x: -50, disabled: true }));
        expect(buttons.at(1).props()).toStrictEqual(expect.objectContaining({ x: -25, disabled: true }));
        expect(buttons.at(2).props()).toStrictEqual(expect.objectContaining({ x: 0, disabled: true }));
        expect(buttons.at(3).props()).toStrictEqual(expect.objectContaining({ x: 25, disabled: true }));
        expect(buttons.at(4).props()).toStrictEqual(expect.objectContaining({ x: 50, disabled: true }));
    });

    it('renders enabled action buttons', () => {
        const { wrapper, storeConfig } = doMount({
            props: {
                canOpenDialog: true,
                canExecute: true,
                canCancel: true,
                canReset: true,
                canOpenView: true
            }
        });

        let buttons = wrapper.findAllComponents(ActionButton);

        // fires action event
        buttons.forEach(button => {
            button.vm.$emit('click');
        });
        expect(storeConfig.workflow.actions.openNodeConfiguration).toHaveBeenCalled();
        expect(storeConfig.workflow.actions.executeNodes).toHaveBeenCalled();
        expect(storeConfig.workflow.actions.cancelNodeExecution).toHaveBeenCalled();
        expect(storeConfig.workflow.actions.resetNodes).toHaveBeenCalled();
        expect(storeConfig.workflow.actions.openView).toHaveBeenCalled();
    });

    describe('loop action buttons', () => {
        it('should step and pause', () => {
            const { wrapper, storeConfig } = doMount({
                props: { canStep: true, canPause: true, canResume: false }
            });

            // fires action event
            let buttons = wrapper.findAllComponents(ActionButton);
            buttons.forEach(button => {
                button.vm.$emit('click');
            });

            expect(storeConfig.workflow.actions.pauseLoopExecution).toHaveBeenCalled();
            expect(storeConfig.workflow.actions.stepLoopExecution).toHaveBeenCalled();
        });

        it('should step and resume', () => {
            const { wrapper, storeConfig } = doMount({
                props: { canStep: true, canPause: false, canResume: true }
            });

            let buttons = wrapper.findAllComponents(ActionButton);
            buttons.forEach(button => {
                button.vm.$emit('click');
            });
            expect(storeConfig.workflow.actions.resumeLoopExecution).toHaveBeenCalled();
            expect(storeConfig.workflow.actions.stepLoopExecution).toHaveBeenCalled();
        });

        it('should step, pause, resume', () => {
            // ensure only two of the three loop options are rendered at a time
            const { wrapper, storeConfig } = doMount({
                props: { canStep: true, canPause: true, canResume: true }
            });

            let buttons = wrapper.findAllComponents(ActionButton);
            buttons.forEach(button => {
                button.vm.$emit('click');
            });
            expect(storeConfig.workflow.actions.pauseLoopExecution).toHaveBeenCalled();
            expect(storeConfig.workflow.actions.stepLoopExecution).toHaveBeenCalled();
            expect(storeConfig.workflow.actions.resumeLoopExecution).not.toHaveBeenCalled();
        });
    });

    it('renders node Id', () => {
        const { wrapper } = doMount();

        expect(wrapper.find('text').text()).toBe('root:1');
    });

    it('should add the hotkey binding to the action tooltip when node is selected', () => {
        $shortcuts.get = jest.fn((name) => ({ hotkeyText: 'MOCK HOTKEY TEXT' }));

        const { wrapper } = doMount({
            props: { canReset: true },
            isNodeSelected: () => () => true
        });

        const buttons = wrapper.findAllComponents(ActionButton);
        const lastButton = buttons.at(buttons.length - 1);

        expect(lastButton.props('title')).toMatch('- MOCK HOTKEY TEXT');
    });
});
