import { shallowMount } from '@vue/test-utils';

import NodeDecorators from '~/components/workflow/NodeDecorators.vue';

import LinkDecorator from '~/components/workflow/LinkDecorator.vue';
import StreamingDecorator from '~/components/workflow/StreamingDecorator.vue';
import LoopDecorator from '~/components/workflow/LoopDecorator.vue';

let wrapper, propsData, doMount;

describe('NodeDecorators.vue', () => {
    beforeEach(() => {
        wrapper = null;
        
        propsData = {
            type: 'Learner',
            link: null,
            kind: 'component',
            executionInfo: null
        };
        
        doMount = () => {
            let mocks = { };
            wrapper = shallowMount(NodeDecorators, {
                propsData,
                mocks
            });
        };
    });

    it('has no Decorator by default', () => {
        doMount();
        expect(wrapper.findComponent(LinkDecorator).exists()).toBe(false);
        expect(wrapper.findComponent(StreamingDecorator).exists()).toBe(false);
        expect(wrapper.findComponent(LoopDecorator).exists()).toBe(false);
    });

    it('shows/hides LinkDecorator', () => {
        propsData.link = 'linkylinky';
        doMount();

        let linkDecorator = wrapper.findComponent(LinkDecorator);
        expect(linkDecorator.attributes('transform')).toBe('translate(0, 21)');
    });

    it('shows/hides StreamingDecorator', () => {
        propsData.executionInfo = { jobManager: 'sampleJobManager' };
        doMount();

        let streamingDecorator = wrapper.findComponent(StreamingDecorator);
        expect(streamingDecorator.attributes('transform')).toBe('translate(21, 21)');
        expect(streamingDecorator.props('executionInfo')).toStrictEqual({
            jobManager: 'sampleJobManager'
        });
    });

    it.each(['LoopStart', 'LoopEnd'])('shows/hides LoopDecorator', (type) => {
        propsData.type = type;
        propsData.loopInfo = { status: 'ok' };
        doMount();

        let loopDecorator = wrapper.findComponent(LoopDecorator);
        expect(loopDecorator.attributes('transform')).toBe('translate(20, 20)');
        expect(loopDecorator.props('loopStatus')).toBe('ok');
    });

    it.each([
        [{ type: 'Learner', kind: 'node' }, 'Learner'],
        [{ kind: 'component' }, 'Component'],
        [{ kind: 'metanode' }, 'Metanode']
    ])('provides background type', (nodeProps, expectedType) => {
        propsData = {
            ...nodeProps,
            link: 'linky',
            executionInfo: { mock: 'something' }
        };
        doMount();

        expect(wrapper.findComponent(LinkDecorator).props('backgroundType')).toBe(expectedType);
        expect(wrapper.findComponent(StreamingDecorator).props('backgroundType')).toBe(expectedType);
    });
});
