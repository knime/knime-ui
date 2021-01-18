import { shallowMount } from '@vue/test-utils';
import StreamingDecorator from '~/components/StreamingDecorator.vue';

describe('NodeTorso.vue', () => {

    let doShallowMount = (executionInfo) => shallowMount(StreamingDecorator, {
        propsData: { executionInfo }
    });

    it('streamingSupported', () => {
        const wrapper = doShallowMount({ jobManager: { type: 'streaming' } });
        expect(wrapper.find('path.streamable').exists()).toBe(true);
        expect(wrapper.find('path.not-streamable').exists()).toBe(false);
    });

    it('streamingUnsupported', () => {
        const wrapper = doShallowMount();
        expect(wrapper.find('path.streamable').exists()).toBe(false);
        expect(wrapper.find('path.not-streamable').exists()).toBe(true);
    });

});
