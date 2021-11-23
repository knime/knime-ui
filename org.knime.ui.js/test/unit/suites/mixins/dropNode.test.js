/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import * as $shapes from '~/style/shapes';
import { dropNode } from '~/mixins';

let doMount,
    wrapper,
    addNodeMock,
    dummyEvent,
    kanvasElement;

describe('Drop Node Mixin', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        Event.prototype.preventDefault = jest.fn();

        dummyEvent = {
            clientX: 0,
            clientY: 1,
            dataTransfer: {
                dropEffect: '',
                types: ['text/plain'],
                getData: jest.fn().mockReturnValue(JSON.stringify({ className: 'sampleClassName' }))
            },
            preventDefault: jest.fn()
        };
        addNodeMock = jest.fn();
    });

    kanvasElement = {
        scrollLeft: 5,
        scrollTop: 5,
        offsetLeft: 5,
        offsetTop: 5
    };

    doMount = () => {
        let dropNodeTarget = {
            template: `
                <div
                    @drop.stop="onDrop"
                    @dragover.stop="onDragOver"
                />`,
            mixins: [dropNode]
        };

        let $store = mockVuexStore({
            workflow: {
                actions: {
                    addNode: addNodeMock
                }
            },
            canvas: {
                getters: {
                    fromAbsoluteCoordinates: state => ([x, y]) => [x - 10, y - 10]
                }
            }
        });
        wrapper = shallowMount(dropNodeTarget, { mocks: { $store, $shapes } });
        document.getElementById = (id) => id === 'kanvas' ? kanvasElement : null;
    };

    it('doesnt allow normal drag & drop', () => {
        doMount();

        wrapper.trigger('dragover', dummyEvent);

        expect(dummyEvent.dataTransfer.dropEffect).not.toBe('copy');

        // drop target NOT enabled
        expect(Event.prototype.preventDefault).not.toHaveBeenCalled();
    });

    it('allows drag & drop from node repo', () => {
        doMount();
        dummyEvent.dataTransfer.types.push('text/knime-noderepo');

        wrapper.trigger('dragover', dummyEvent);

        expect(dummyEvent.dataTransfer.dropEffect).toBe('copy');

        // drop target enabled
        expect(Event.prototype.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('calls the addNode api', () => {
        doMount();

        wrapper.trigger('drop', dummyEvent);

        expect(addNodeMock).toHaveBeenCalledWith(expect.anything(), {
            nodeFactory: { className: 'sampleClassName' },
            position: [
                -10 + dummyEvent.clientX - $shapes.nodeSize / 2,
                -10 + dummyEvent.clientY - $shapes.nodeSize / 2
            ]
        });

        expect(Event.prototype.preventDefault).toHaveBeenCalledTimes(1);
    });
});
