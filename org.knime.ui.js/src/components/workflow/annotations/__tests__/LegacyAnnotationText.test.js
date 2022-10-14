import { shallowMount } from '@vue/test-utils';

import * as $shapes from '@/style/shapes.mjs';
import LegacyAnnotationText from '../LegacyAnnotationText.vue';

describe('LegacyAnnotationText.vue', () => {
    const doShallowMount = (props, mocks) => shallowMount(LegacyAnnotationText, {
        props,
        global: { mocks: mocks || { $shapes } }
    });

    it('renders empty text', () => {
        const wrapper = doShallowMount({
            text: '',
            styleRanges: []
        });
        expect(wrapper.findAll('span').length).toBe(0);
    });

    it('renders text', () => {
        const wrapper = doShallowMount({
            text: 'foo👻barbazqu👮🏻‍♂️xあなたは素晴らしい人です',
            styleRanges: [
                { start: 1, length: 2, bold: true, color: 'red' },
                { start: 8, length: 1, italic: true, bold: true },
                { start: 10, length: 1, italic: true, bold: true, fontSize: 13 }
            ]
        });

        const spans = wrapper.findAll('span');
        expect(spans.length).toBe(7);

        expect(spans[0].text()).toBe('f');
        expect(spans[0].text()).toBe('f');
        expect(spans[1].text()).toBe('oo');
        expect(spans[2].text()).toBe('👻bar');
        expect(spans[3].text()).toBe('b');
        expect(spans[4].text()).toBe('a');
        expect(spans[5].text()).toBe('z');
        expect(spans[6].text()).toBe('qu👮🏻‍♂️xあなたは素晴らしい人です');

        expect(spans[0].attributes().style).toBeUndefined();
        expect(spans[1].attributes().style).toBe('color: red; font-weight: bold;');
        expect(spans[2].attributes().style).toBeUndefined();
        expect(spans[3].attributes().style).toBe('font-weight: bold; font-style: italic;');
        expect(spans[4].attributes().style).toBeUndefined();
        expect(spans[5].attributes().style).toBe('font-size: 13px; font-weight: bold; font-style: italic;');
        expect(spans[6].attributes().style).toBeUndefined();
    });

    it('honors annotationsFontSizePointToPixelFactor', () => {
        const shapes = { ...$shapes, annotationsFontSizePointToPixelFactor: 2 };
        const wrapper = doShallowMount({
            text: 'someopthertextdkenaendfkejkansn3',
            styleRanges: [
                { start: 3, length: 1, italic: true, bold: true, fontSize: 13 }
            ]
        }, { $shapes: shapes });
        const spans = wrapper.findAll('span');
        expect(spans[1].attributes().style).toBe('font-size: 26px; font-weight: bold; font-style: italic;');
    });
});
