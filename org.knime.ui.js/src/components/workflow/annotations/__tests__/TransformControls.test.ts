import { describe, it, expect, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { h as createElement } from 'vue';

import type { Bounds } from '@/api/gateway-api/generated-api';

import * as $shapes from '@/style/shapes.mjs';
import * as $colors from '@/style/colors.mjs';

import TransformControls from '../TransformControls.vue';
import { transformBounds,
    DIRECTIONS,
    getTransformControlPosition,
    getGridAdjustedBounds,
    type Directions } from '../transform-control-utils';
import { mockVuexStore } from '@/test/utils';

vi.mock('../transform-control-utils', async () => {
    const actual: any = await vi.importActual('../transform-control-utils');
    return {
        ...actual,
        transformBounds: vi.fn(),
        getGridAdjustedBounds: vi.fn(),
        getTransformControlPosition: vi.fn()
    };
});

describe('TransformControls.vue', () => {
    const defaultProps: { initialValue: Bounds, showTransformControls: boolean, showSelection: boolean} = {
        initialValue: {
            x: 10,
            y: 10,
            width: 100,
            height: 100
        },
        showTransformControls: false,
        showSelection: false
    };

    const mockedTransformBounds = vi.mocked(transformBounds).mockReturnValue({
        x: 40,
        y: 40,
        height: 100,
        width: 200
    });

    const mockGetTransformControlPosition = vi.mocked(getTransformControlPosition).mockReturnValue({
        x: 10,
        y: 10
    });

    vi.mocked(getGridAdjustedBounds).mockReturnValue({
        ...defaultProps.initialValue
    });

    const doMount = ({
        props = {},
        screenToCanvasCoordinatesMock = vi.fn().mockReturnValue(() => [5, 5])
    } = {}) => {
        const componentInSlot = `<foreignObject
            id="slotted-component"
            v-bind="scope.transformedBounds">
        </foreignObject>`;

        const getScopedComponent = {
            name: 'SlottedChild',
            template: componentInSlot,
            props: {
                scope: {
                    type: Object,
                    required: true
                }
            }
        };

        const $store = mockVuexStore({
            canvas: {
                getters: {
                    screenToCanvasCoordinates: screenToCanvasCoordinatesMock
                }
            }
        });

        const wrapper = mount(TransformControls, {
            props: { ...defaultProps, ...props },
            slots: {
                default: (props) => createElement(getScopedComponent, { scope: props })
            },
            global: { plugins: [$store], mocks: { $shapes, $colors } }
        });

        return { wrapper };
    };

    const getSlottedChildComponent = (wrapper: VueWrapper<any>) => wrapper.findComponent({ name: 'SlottedChild' });

    const startDraggingControl = (wrapper: VueWrapper<any>, controlDirection: Directions) => {
        const control = wrapper.find(`.transform-control-${controlDirection}`);
        control.element.setPointerCapture = vi.fn();
        control.trigger('pointerdown');
    };

    const stopDraggingControl = (wrapper: VueWrapper<any>, controlDirection: Directions) => {
        const control = wrapper.find(`.transform-control-${controlDirection}`);
        control.element.releasePointerCapture = vi.fn();
        return control.trigger('pointerup');
    };

    it('should render the transform box', () => {
        const { wrapper } = doMount({ props: { showSelection: true } });

        const transformBox = wrapper.find('rect.transform-box');
        expect(transformBox.attributes('x')).toBe(defaultProps.initialValue.x.toString());
        expect(transformBox.attributes('y')).toBe(defaultProps.initialValue.y.toString());
        expect(transformBox.attributes('width')).toBe(defaultProps.initialValue.width.toString());
        expect(transformBox.attributes('height')).toBe(defaultProps.initialValue.height.toString());
    });

    it('should render the transform controls correctly', () => {
        const { wrapper } = doMount({ props: { showTransformControls: true } });

        const { initialValue: bounds } = defaultProps;
        expect(wrapper.findAll('.transform-control').length).toBe(DIRECTIONS.length);

        DIRECTIONS.forEach(direction => {
            const transformControl = wrapper.find(`.transform-control-${direction}`);
            expect(transformControl.exists()).toBe(true);

            expect(mockGetTransformControlPosition).toHaveBeenCalledWith({
                bounds,
                direction
            });

            // output of the mock function
            expect(transformControl.attributes('x')).toBe('10');
            expect(transformControl.attributes('y')).toBe('10');
        });
    });

    it('should expose the transformed bounds on the default slot props', () => {
        const { wrapper } = doMount();

        const { initialValue: bounds } = defaultProps;
        const slottedChild = getSlottedChildComponent(wrapper);
        expect(slottedChild.attributes('x')).toBe(bounds.x.toString());
        expect(slottedChild.attributes('y')).toBe(bounds.y.toString());
        expect(slottedChild.attributes('width')).toBe(bounds.width.toString());
        expect(slottedChild.attributes('height')).toBe(bounds.height.toString());
    });

    it.each(DIRECTIONS)('should transform direction "%s" correctly', (direction) => {
        const { wrapper } = doMount({
            screenToCanvasCoordinatesMock: vi.fn(() => () => [20, 20]),
            props: { showTransformControls: true }
        });
        const { initialValue: bounds } = defaultProps;

        startDraggingControl(wrapper, direction);
        const mouseMove = new Event('mousemove');
        window.dispatchEvent(mouseMove);

        expect(mockedTransformBounds).toHaveBeenCalledWith(bounds, {
            direction,
            moveX: 20,
            moveY: 20,
            startX: bounds.x,
            startY: bounds.y,
            origHeight: bounds.height,
            origWidth: bounds.width
        });
    });

    it('should emit a transformEnd event', () => {
        const { wrapper } = doMount({ props: { showTransformControls: true } });

        const { initialValue: bounds } = defaultProps;

        stopDraggingControl(wrapper, 'n');

        expect(wrapper.emitted('transformEnd')[0][0]).toEqual({ bounds });
        expect(wrapper.find(`.transform-control-n`).element.releasePointerCapture).toHaveBeenCalled();
    });

    it('should clean up event listeners', () => {
        const { wrapper } = doMount({ props: { showTransformControls: true } });

        startDraggingControl(wrapper, 'n');

        const windowSpy = vi.spyOn(window, 'removeEventListener');

        const mouseUp = new Event('mouseup');
        window.dispatchEvent(mouseUp);

        expect(windowSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
        expect(windowSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    });

    it('should hide the controls if the disabled prop is true', () => {
        const { wrapper } = doMount({ props: { showTransformControls: false } });

        expect(wrapper.find('.transform-box').exists()).toBe(false);
        wrapper.findAll('.transform-control').forEach(_wrapper => {
            expect(_wrapper.exists()).toBe(false);
        });
    });
});
