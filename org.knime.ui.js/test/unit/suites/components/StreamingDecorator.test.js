import { shallowMount } from '@vue/test-utils';
import LinkDecorator from '~/components/StreamingDecorator.vue';
import StreamingSupportedIcon from '~/assets/streamable-node.svg?inline';
import StreamingUnsupportedIcon from '~/assets/unstreamable-node.svg?inline';

describe('NodeTorso.vue', () => {

    let doShallowMount = (executionInfo) => shallowMount(LinkDecorator, {
        propsData: { executionInfo }
    });

    it('streamingSupported', () => {
        const wrapper = doShallowMount({ jobManager: 'exampleManager' });
        expect(wrapper.findComponent(StreamingSupportedIcon).exists()).toBe(true);
        expect(wrapper.findComponent(StreamingUnsupportedIcon).exists()).toBe(false);
    });

    it('streamingUnsupported', () => {
        const wrapper = doShallowMount();
        expect(wrapper.findComponent(StreamingUnsupportedIcon).exists()).toBe(true);
        expect(wrapper.findComponent(StreamingSupportedIcon).exists()).toBe(false);
    });

});
