import { mount, shallowMount } from '@vue/test-utils';
import Vue from 'vue';
import Splitter from '~/components/Splitter';

describe('Splitter.vue', () => {

    let wrapper, startMove;

    startMove = (wrapper) => {
        const handle = wrapper.findComponent({ ref: 'handle' });

        handle.element.setPointerCapture = jest.fn();
        handle.element.releasePointerCapture = jest.fn();

        handle.trigger('pointerdown', {
            clientY: 100,
            pointerId: -1
        });
    };

    describe('direction row', () => {
        beforeEach(() => {
            wrapper = mount(Splitter, {
                propsData: {
                    direction: 'column',
                    id: 'test-column',
                    secondarySize: '45%'
                }
            });
        });

        it('uses default size', () => {
            expect(wrapper.find('.secondary').attributes().style).toBe('height: 45%;');
        });

        it('doesn’t display a hover title', () => {
            expect(wrapper.findComponent({ ref: 'handle' }).attributes().title).toBeUndefined();
        });

        it('adds active class on move', async () => {
            startMove(wrapper);
            await Vue.nextTick();
            expect(wrapper.findComponent({ ref: 'handle' }).attributes().class).toContain('active');
        });

        it('move changes height', async () => {

            const handle = wrapper.findComponent({ ref: 'handle' });
            const secondary = wrapper.findComponent({ ref: 'secondary' });

            handle.element.setPointerCapture = jest.fn();
            handle.element.releasePointerCapture = jest.fn();

            secondary.element.getBoundingClientRect = jest.fn(() => ({
                y: 200,
                height: 150
            }));

            handle.trigger('pointerdown', {
                clientY: 100,
                pointerId: -1
            });
            expect(handle.element.setPointerCapture).toHaveBeenCalledWith(-1);

            handle.trigger('pointermove', {
                clientY: 120
            });
            await Vue.nextTick();
            expect(secondary.attributes().style).toBe('height: 230px;');

            handle.trigger('pointerup', {
                pointerId: -1
            });
            expect(handle.element.releasePointerCapture).toHaveBeenCalledWith(-1);

        });

        it('saves to localStorage', async () => {
            const handle = wrapper.findComponent({ ref: 'handle' });
            const secondary = wrapper.findComponent({ ref: 'secondary' });

            // eslint-disable-next-line no-proto
            let spy = jest.spyOn(window.localStorage.__proto__, 'setItem');

            handle.element.setPointerCapture = jest.fn();
            handle.element.releasePointerCapture = jest.fn();

            secondary.element.getBoundingClientRect = jest.fn(() => ({
                y: 200,
                height: 150
            }));

            handle.trigger('pointerdown', {
                clientY: 100,
                pointerId: -1
            });

            handle.trigger('pointermove', {
                clientY: 120
            });
            await Vue.nextTick();

            expect(spy).toHaveBeenCalledWith('ui-splitter-test-column', '230px');

            handle.trigger('pointerup', {
                pointerId: -1
            });
        });

        it('loads from to localStorage', () => {
            // eslint-disable-next-line no-proto
            let spy = jest.spyOn(window.localStorage.__proto__, 'getItem');
            spy.mockReturnValue('444px');

            let wrapper2 = mount(Splitter, {
                propsData: {
                    direction: 'column',
                    id: 'test-column2',
                    secondarySize: '45%'
                }
            });

            expect(spy).toHaveBeenCalled();

            const secondary = wrapper2.findComponent({ ref: 'secondary' });
            expect(secondary.attributes().style).toBe('height: 444px;');
        });

    });

    describe('direction column', () => {

        beforeEach(() => {
            wrapper = shallowMount(Splitter, {
                propsData: {
                    direction: 'row',
                    id: 'test-row'
                }
            });
        });


        it('uses default size', () => {
            expect(wrapper.find('.secondary').attributes().style).toBe('width: 40%;');
        });

        it('doesn’t display a hover title', () => {
            expect(wrapper.findComponent({ ref: 'handle' }).attributes().title).toBeUndefined();
        });

        it('adds active class on move', async () => {
            startMove(wrapper);
            await Vue.nextTick();
            expect(wrapper.findComponent({ ref: 'handle' }).attributes().class).toContain('active');
        });

        it('move changes width', async () => {

            const handle = wrapper.findComponent({ ref: 'handle' });
            const secondary = wrapper.findComponent({ ref: 'secondary' });

            handle.element.setPointerCapture = jest.fn();
            handle.element.releasePointerCapture = jest.fn();

            secondary.element.getBoundingClientRect = jest.fn(() => ({
                x: 200,
                width: 150
            }));

            handle.trigger('pointerdown', {
                clientX: 100,
                pointerId: -1
            });
            expect(handle.element.setPointerCapture).toHaveBeenCalledWith(-1);

            handle.trigger('pointermove', {
                clientX: 120
            });
            await Vue.nextTick();
            expect(secondary.attributes().style).toBe('width: 230px;');

            handle.trigger('pointerup', {
                pointerId: -1
            });
            expect(handle.element.releasePointerCapture).toHaveBeenCalledWith(-1);

        });

    });

});
