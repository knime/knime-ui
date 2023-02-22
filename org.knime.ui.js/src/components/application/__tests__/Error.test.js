import * as Vue from 'vue';

import { shallowMount, mount } from '@vue/test-utils';
import Button from 'webapps-common/ui/components/Button.vue';
import { copyText } from 'webapps-common/util/copyText';
import FunctionButton from 'webapps-common/ui/components/FunctionButton.vue';

import Error from '../Error.vue';

jest.mock('webapps-common/util/copyText.js', () => ({
    copyText: jest.fn()
}));

describe('Error.vue', () => {
    it('renders default', () => {
        const wrapper = shallowMount(Error, {
            props: {
                message: 'one-liner',
                stack: 'stacky',
                vueInfo: 'error in watcher'
            }
        });
        expect(wrapper.find('.stack').text()).toBe('one-liner\n\nerror in watcher\n\nstacky');
    });

    it('no vueInfo props', () => {
        const wrapper = shallowMount(Error, {
            props: {
                message: 'one-liner',
                stack: 'stacky'
            }
        });
        expect(wrapper.find('.stack').text()).toBe('one-liner\n\nstacky');
    });

    it('copy to clipboard', async () => {
        const wrapper = mount(Error, {
            props: {
                message: 'one-liner',
                stack: 'stacky',
                vueInfo: 'error in watcher'
            }
        });

        let copyButton = wrapper.findAllComponents(Button)[1];
        copyButton.vm.$emit('click');

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
        window.location = { href: '' };

        let reloadButton = wrapper.findAllComponents(Button)[0];
        reloadButton.vm.$emit('click');

        expect(window.location.href).toEqual('/index.html');
    });

    it('switch to java app', () => {
        const wrapper = mount(Error);

        delete window.switchToJavaUI;
        window.switchToJavaUI = jest.fn();

        let switchButton = wrapper.findAllComponents(FunctionButton).at(0);
        switchButton.vm.$emit('click');

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
