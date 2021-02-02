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

        expect(buttons.at(0).props()).toStrictEqual({ x: -25, disabled: true });
        expect(buttons.at(1).props()).toStrictEqual({ x: 0, disabled: true });
        expect(buttons.at(2).props()).toStrictEqual({ x: 25, disabled: true });
    });

    it('renders disabled action buttons with openDialog and openView', () => {
        propsData.dialog = true;
        let wrapper = doMount({ canOpenDialog: false, canOpenView: false });
        let buttons = wrapper.findAllComponents(ActionButton);

        expect(buttons.at(0).props()).toStrictEqual({ x: -50, disabled: true });
        expect(buttons.at(1).props()).toStrictEqual({ x: -25, disabled: true });
        expect(buttons.at(2).props()).toStrictEqual({ x: 0, disabled: true });
        // eslint-disable-next-line no-magic-numbers
        expect(buttons.at(3).props()).toStrictEqual({ x: 25, disabled: true });
        // eslint-disable-next-line no-magic-numbers
        expect(buttons.at(4).props()).toStrictEqual({ x: 50, disabled: true });
    });

    it('renders enabled action buttons', () => {
        let wrapper = doMount({ canOpenDialog: true,
            canExecute: true,
            canCancel: true,
            canReset: true,
            canOpenView: true });
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

    it('renders node Id', () => {
        let wrapper = doMount();
        expect(wrapper.find('text').text()).toBe('root:1');
    });
});
