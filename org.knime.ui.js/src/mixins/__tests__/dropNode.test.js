import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';

import * as $shapes from '@/style/shapes.mjs';

import { dropNode, KnimeMIME } from '../dropNode';

describe('Drop Node Mixin', () => {
    let doMount, wrapper, addNodeMock, dummyEvent, kanvasElement, isWritable;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        isWritable = true;
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

        kanvasElement = {
            scrollLeft: 5,
            scrollTop: 5,
            offsetLeft: 5,
            offsetTop: 5
        };
    
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
                },
                getters: {
                    isWritable() {
                        return isWritable;
                    }
                }
            },
            canvas: {
                getters: {
                    screenToCanvasCoordinates: state => ([x, y]) => [x - 10, y - 10]
                }
            }
        });

        document.getElementById = (id) => id === 'kanvas' ? kanvasElement : null;
        
        doMount = () => {
            wrapper = shallowMount(dropNodeTarget, { mocks: { $store, $shapes } });
        };
    });

    it('doesnt allow normal drag & drop', () => {
        doMount();

        wrapper.trigger('dragover', dummyEvent);

        expect(dummyEvent.dataTransfer.dropEffect).not.toBe('copy');

        // drop target NOT enabled
        expect(Event.prototype.preventDefault).not.toHaveBeenCalled();
    });

    it('allows drag & drop from node repo', () => {
        doMount();
        dummyEvent.dataTransfer.types.push(KnimeMIME);

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
            position: {
                x: -10 + dummyEvent.clientX - $shapes.nodeSize / 2,
                y: -10 + dummyEvent.clientY - $shapes.nodeSize / 2
            }
        });

        expect(Event.prototype.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('does not allow drag and drop in write-protected workflow', () => {
        isWritable = false;
        doMount();

        wrapper.trigger('dragover', dummyEvent);
        expect(dummyEvent.dataTransfer.dropEffect).toBe('');

        wrapper.trigger('drop', dummyEvent);
        expect(addNodeMock).not.toHaveBeenCalled();
        expect(Event.prototype.preventDefault).toHaveBeenCalledTimes(1);
    });
});
