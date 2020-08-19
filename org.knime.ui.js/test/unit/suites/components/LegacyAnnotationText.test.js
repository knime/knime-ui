/* eslint-disable no-magic-numbers */
import { shallowMount } from '@vue/test-utils';
import LegacyAnnotationText from '~/components/LegacyAnnotationText';

describe('LegacyAnnotationText.vue', () => {
    it('renders empty text', () => {
        let propsData = {
            text: '',
            styleRanges: [{ start: 0, length: 10 }]
        };
        let wrapper = shallowMount(LegacyAnnotationText, { propsData });
        expect(wrapper.findAll('span').length).toBe(0);
    });

    it('renders text', () => {
        let propsData = {
            text: 'foo👻barbazqu👮🏻‍♂️xあなたは素晴らしい人です',
            styleRanges: [
                { start: 1, length: 2, bold: true, color: 'red' },
                { start: 8, length: 1, italic: true, bold: true },
                { start: 10, length: 1, italic: true, bold: true, fontSize: 13 }
            ]
        };
        let wrapper = shallowMount(LegacyAnnotationText, { propsData });
        let spans = wrapper.findAll('span');
        expect(spans.length).toBe(7);


        expect(spans.at(0).text()).toBe('f');
        expect(spans.at(0).text()).toBe('f');
        expect(spans.at(1).text()).toBe('oo');
        expect(spans.at(2).text()).toBe('👻bar');
        expect(spans.at(3).text()).toBe('b');
        expect(spans.at(4).text()).toBe('a');
        expect(spans.at(5).text()).toBe('z');
        expect(spans.at(6).text()).toBe('qu👮🏻‍♂️xあなたは素晴らしい人です');

        expect(spans.at(0).attributes().style).toBeUndefined();
        expect(spans.at(1).attributes().style).toBe('color: red; font-weight: bold;');
        expect(spans.at(2).attributes().style).toBeUndefined();
        expect(spans.at(3).attributes().style).toBe('font-weight: bold; font-style: italic;');
        expect(spans.at(4).attributes().style).toBeUndefined();
        expect(spans.at(5).attributes().style).toBe('font-size: 13px; font-weight: bold; font-style: italic;');
        expect(spans.at(6).attributes().style).toBeUndefined();
    });
});
