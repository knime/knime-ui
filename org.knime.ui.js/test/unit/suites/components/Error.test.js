import { shallowMount, mount } from '@vue/test-utils';
import Button from '~/webapps-common/ui/components/Button';
import Error from '~/components/Error';
import Vue from 'vue';
import { copyText } from '~/webapps-common/util/copyText.js'; // copyText is already mocked
import FunctionButton from 'webapps-common/ui/components/FunctionButton';

jest.mock('~/webapps-common/util/copyText.js', () => ({
    copyText: jest.fn()
}));

describe('Error.vue', () => {
    it('renders default', () => {
        const wrapper = shallowMount(Error, {
            propsData: {
                message: 'one-liner',
                stack: 'stacky',
                vueInfo: 'error in watcher'
            }
        });
        expect(wrapper.find('.stack').text()).toBe('one-liner\n\nerror in watcher\n\nstacky');
    });

    it('no vueInfo props', () => {
        const wrapper = shallowMount(Error, {
            propsData: {
                message: 'one-liner',
                stack: 'stacky'
            }
        });
        expect(wrapper.find('.stack').text()).toBe('one-liner\n\nstacky');
    });

    it('copy to clipboard', async () => {
        const wrapper = mount(Error, {
            propsData: {
                message: 'one-liner',
                stack: 'stacky',
                vueInfo: 'error in watcher'
            }
        });

        let copyButton = wrapper.findAllComponents(Button).at(1);
        copyButton.trigger('click');

        await Vue.nextTick();

        expect(copyText).toHaveBeenCalledWith(JSON.stringify({
            app: 'KnimeUI',
            // version: 'version' // TODO:NXT-595
            message: 'one-liner',
            vueInfo: 'error in watcher',
            stack: 'stacky'
        }, null, 2));
    });

    it('reload app', () => {
        const wrapper = mount(Error);

        delete window.location;
        window.location = { reload: jest.fn() };

        let reloadButton = wrapper.findAllComponents(Button).at(0);
        reloadButton.trigger('click');

        expect(window.location.reload).toHaveBeenCalled();
    });

    it('switch to java app', () => {
        const wrapper = mount(Error);

        delete window.switchToJavaUI;
        window.switchToJavaUI = jest.fn();

        let switchButton = wrapper.findAllComponents(FunctionButton).at(0);
        switchButton.trigger('click');

        expect(window.switchToJavaUI).toHaveBeenCalled();
    });

    it('shows copy success', async () => {
        const wrapper = mount(Error);
        let copyButton = wrapper.find('.copy-to-clipboard');

        expect(copyButton.attributes().class).not.toMatch('copied');
        copyButton.trigger('click');
        await Vue.nextTick();
        expect(copyButton.attributes().class).toMatch('copied');
    });
});
