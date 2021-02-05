import { shallowMount } from '@vue/test-utils';

import * as $shapes from '~/style/shapes';

import NodeActionBar from '~/components/NodeActionBar';
import ActionButton from '~/components/ActionButton';

describe('NodeActionBar', () => {
    let propsData;

    beforeEach(() => {
        propsData = {};
    });
    let doMount = (allowedActions = {}) => shallowMount(NodeActionBar, {
        propsData: {
            nodeId: 'root:1',
            ...allowedActions
        },
        mocks: {
            $shapes
        }
    });

    it('renders disabled action buttons without openDialog and openView', () => {
        let wrapper = doMount();
        let buttons = wrapper.findAllComponents(ActionButton);

        /* eslint-disable no-magic-numbers */
        expect(buttons.at(0).props()).toStrictEqual({ x: -25, disabled: true });
        expect(buttons.at(1).props()).toStrictEqual({ x: 0, disabled: true });
        expect(buttons.at(2).props()).toStrictEqual({ x: 25, disabled: true });
        /* eslint-enable no-magic-numbers */
    });

    it('renders disabled action buttons with openDialog and without openView', () => {
        let wrapper = doMount({ canOpenDialog: false });
        let buttons = wrapper.findAllComponents(ActionButton);

        /* eslint-disable no-magic-numbers */
        expect(buttons.at(0).props()).toStrictEqual({ x: -37.5, disabled: true });
        expect(buttons.at(1).props()).toStrictEqual({ x: -12.5, disabled: true });
        expect(buttons.at(2).props()).toStrictEqual({ x: 12.5, disabled: true });
        expect(buttons.at(3).props()).toStrictEqual({ x: 37.5, disabled: true });
        /* eslint-enable no-magic-numbers */
    });

    it('renders disabled action buttons with openDialog and openView', () => {
        propsData.dialog = true;
        let wrapper = doMount({ canOpenDialog: false, canOpenView: false });
        let buttons = wrapper.findAllComponents(ActionButton);

        /* eslint-disable no-magic-numbers */
        expect(buttons.at(0).props()).toStrictEqual({ x: -50, disabled: true });
        expect(buttons.at(1).props()).toStrictEqual({ x: -25, disabled: true });
        expect(buttons.at(2).props()).toStrictEqual({ x: 0, disabled: true });
        expect(buttons.at(3).props()).toStrictEqual({ x: 25, disabled: true });
        expect(buttons.at(4).props()).toStrictEqual({ x: 50, disabled: true });
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
        expect(wrapper.emitted('action')).toStrictEqual([
            ['openDialog'],
            ['executeNodes'],
            ['cancelNodeExecution'],
            ['resetNodes'],
            ['openView']
        ]);
    });

    it('renders loop action buttons', () => {
        let wrapper = doMount({ canStep: true, canPause: true, canResume: false });
        let buttons = wrapper.findAllComponents(ActionButton);

        // fires action event
        buttons.wrappers.forEach(button => { button.vm.$emit('click'); });
        expect(wrapper.emitted('action')).toContainEqual(['pauseNodeExecution']);
        expect(wrapper.emitted('action')).toContainEqual(['stepNodeExecution']);

        wrapper = doMount({ canStep: true, canPause: false, canResume: true });

        buttons = wrapper.findAllComponents(ActionButton);
        buttons.wrappers.forEach(button => { button.vm.$emit('click'); });
        expect(wrapper.emitted('action')).toContainEqual(['resumeNodeExecution']);
        expect(wrapper.emitted('action')).toContainEqual(['stepNodeExecution']);

        // ensure only two of the three loop options are rendered at a time
        wrapper = doMount({ canStep: true, canPause: true, canResume: true });

        buttons = wrapper.findAllComponents(ActionButton);
        buttons.wrappers.forEach(button => { button.vm.$emit('click'); });
        expect(wrapper.emitted('action')).toContainEqual(['pauseNodeExecution']);
        expect(wrapper.emitted('action')).toContainEqual(['stepNodeExecution']);
        expect(wrapper.emitted('action')).not.toContainEqual(['resumeNodeExecution']);
    });

    it('renders node Id', () => {
        let wrapper = doMount();
        expect(wrapper.find('text').text()).toBe('root:1');
    });
});
