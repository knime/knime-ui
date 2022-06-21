import { shallowMount } from '@vue/test-utils';
import * as $shapes from '~knime-ui/style/shapes';

import NodeNameEditorActionBar from '~knime-ui/components/workflow/NodeNameEditorActionBar';
import ActionButton from '~knime-ui/components/workflow/ActionButton';

describe('NodeNameEditorActionBar', () => {
    let mocks, doShallowMount, wrapper;

    beforeEach(() => {
        wrapper = null;
        doShallowMount = () => {
            mocks = { $shapes };
            wrapper = shallowMount(NodeNameEditorActionBar, { propsData: {}, mocks });
        };
        doShallowMount();
    });

    it('renders', () => {
        let buttons = wrapper.findAllComponents(ActionButton);
        /* eslint-disable no-magic-numbers */
        expect(buttons.at(0).props()).toStrictEqual(
            expect.objectContaining({ x: -12.5, disabled: false, primary: true })
        );
        expect(buttons.at(1).props()).toStrictEqual(
            expect.objectContaining({ x: 12.5, disabled: false, primary: false })
        );
    });

    it('emits @save event', () => {
        let buttons = wrapper.findAllComponents(ActionButton);

        expect(wrapper.emitted().save).toBeUndefined();
        buttons.at(0).vm.$emit('click');
        expect(wrapper.emitted().save).toBeTruthy();
    });

    it('emits @cancel event', () => {
        let buttons = wrapper.findAllComponents(ActionButton);

        expect(wrapper.emitted().close).toBeUndefined();
        buttons.at(1).vm.$emit('click');
        expect(wrapper.emitted().cancel).toBeTruthy();
    });
});
