import { shallowMount, mount } from '@vue/test-utils';
import Button from '~/webapps-common/ui/components/Button';
import Error from '~/components/Error';
import Vue from 'vue';
import { copyText } from '~/webapps-common/util/copyText.js'; // copyText is already mocked

jest.mock('~/webapps-common/util/copyText.js', () => ({
    copyText: jest.fn()
}));

describe('Error.vue', () => {

    beforeEach(() => {
        // mockCopyText = jest.fn();
    });

    it('renders default', () => {
        const wrapper = shallowMount(Error, {
            propsData: {
                message: 'one-liner',
                stack: 'stacky',
                vueInfo: 'error in watcher'
            }
        });
        expect(wrapper.find('.message').text()).toBe('“one-liner”');
        expect(wrapper.find('.stack').text()).toBe('error in watcher\nstacky');
    });

    it('no vueInfo props', () => {
        const wrapper = shallowMount(Error, {
            propsData: {
                message: 'one-liner',
                stack: 'stacky'
            }
        });
        expect(wrapper.find('.message').text()).toBe('“one-liner”');
        expect(wrapper.find('.stack').text()).toBe('stacky');
    });

    it('copy to clipboard', async () => {
        const wrapper = mount(Error, {
            propsData: {
                message: 'one-liner',
                stack: 'stacky',
                vueInfo: 'error in watcher'
            }
        });
        // eslint-disable-next-line no-process-env
        process.env.version = 'v0-beta';

        let copyButton = wrapper.findAllComponents(Button).at(0);
        copyButton.trigger('click');

        await Vue.nextTick();

        expect(copyText).toHaveBeenCalledWith(JSON.stringify({
            app: 'KnimeUI',
            version: 'v0-beta',
            message: 'one-liner',
            vueInfo: 'error in watcher',
            stack: 'stacky'
        }, null, 2));
    });

    it('reload app', () => {
        const wrapper = mount(Error);

        delete window.location;
        window.location = { reload: jest.fn() };

        let reloadButton = wrapper.findAllComponents(Button).at(1);
        reloadButton.trigger('click');

        expect(window.location.reload).toHaveBeenCalled();
    });
});
