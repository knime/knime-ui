import { shallowMount } from '@vue/test-utils';

import * as $shapes from '~/style/shapes';

import NodeActionBar from '~/components/NodeActionBar';
import ActionButton from '~/components/ActionButton';

describe('NodeActionBar', () => {
    let doMount = (allowedActions = {}) => shallowMount(NodeActionBar, {
        propsData: {
            nodeId: 'root:1',
            ...allowedActions
        },
        mocks: {
            $shapes
        }
    });

    it('renders disabled action buttons', () => {
        let wrapper = doMount();
        let buttons = wrapper.findAllComponents(ActionButton);

        expect(buttons.at(0).props()).toStrictEqual({ x: -25, disabled: true });
        expect(buttons.at(1).props()).toStrictEqual({ x: 0, disabled: true });
        expect(buttons.at(2).props()).toStrictEqual({ x: 25, disabled: true });
    });

    it('renders enabled action buttons', () => {
        let wrapper = doMount({ canExecute: true, canCancel: true, canReset: true });
        let buttons = wrapper.findAllComponents(ActionButton);

        // fires action event
        buttons.wrappers.forEach(button => { button.vm.$emit('click'); });
        expect(wrapper.emitted('action')).toStrictEqual([
            ['executeNodes'],
            ['cancelNodeExecution'],
            ['resetNodes']
        ]);
    });

    it('renders node Id', () => {
        let wrapper = doMount();
        expect(wrapper.find('text').text()).toBe('root:1');
    });
});
