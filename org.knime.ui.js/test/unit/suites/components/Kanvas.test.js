/* eslint-disable no-magic-numbers */
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';
import Vue from 'vue';

import * as $shapes from '~/style/shapes';
import * as canvasStoreConfig from '~/store/canvas';

import Kanvas from '~/components/Kanvas';
import Node from '~/components/Node';
import Connector from '~/components/Connector';
import WorkflowAnnotation from '~/components/WorkflowAnnotation';
import MetaNodePortBars from '~/components/MetaNodePortBars';

const mockNode = ({ id, position }) => ({
    name: '',
    id,
    position,
    inPorts: [],
    outPorts: [],
    type: '',
    annotation: { text: '' },
    kind: 'node',
    icon: 'data:image/',
    state: null
});

const mockConnector = ({ nr, id }) => ({
    sourceNode: '',
    destNode: '',
    id,
    canDelete: false,
    sourcePort: nr,
    destPort: 0,
    flowVariableConnection: false,
    streaming: false
});

describe('Kanvas', () => {
    let propsData, mocks, doShallowMount, wrapper, $store, workflow, workflowStoreConfig, nodeData, storeConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        let getBCRMock = jest.fn();
        getBCRMock.mockReturnValue({
            x: 5,
            y: 10,
            width: 15,
            height: 20
        });
        HTMLElement.prototype.getBoundingClientRect = getBCRMock;

        // Mock ResizeObserver Class
        window.ResizeObserver = function (callback) {
            this.callback = callback;
            this.observe = function (element) {
                this.element = element;
            };
            this.resize = function ({ width, height }) {
                this.callback([{ target: this.element, contentRect: { width, height } }]);
            };
            this.disconnect = jest.fn();
        };

        wrapper = null;
        nodeData = {
            'root:0': mockNode({ id: 'root:0', position: { x: -32, y: -32 } }),
            'root:1': mockNode({ id: 'root:1', position: { x: 50, y: 50 } }),
            'root:2': mockNode({ id: 'root:2', position: { x: 0, y: 100 } })
        };
        propsData = {};
        workflow = {
            projectId: 'some id',
            info: {
                containerType: 'project',
                name: 'wf1'
            },
            executionInfo: {
                jobManager: 'test'
            },
            nodes: nodeData,
            connections: {
                inA: mockConnector({ nr: 0, id: 'inA' }),
                outA: mockConnector({ nr: 1, id: 'outA' }),
                outB: mockConnector({ nr: 2, id: 'outB' })
            },
            workflowAnnotations: []
        };
        workflowStoreConfig = {
            state: {
                activeWorkflow: workflow
            },
            mutations: {
                selectAllNodes: jest.fn()
            },
            getters: {
                workflowBounds() {
                    return {
                        left: -10,
                        top: -10,
                        right: 40,
                        bottom: 40
                    };
                },
                isLinked() {
                    return workflow.info.linked;
                },
                isStreaming() {
                    return workflow.info.jobManager;
                },
                isWritable() {
                    return !workflow.info.linked;
                },
                nodeIcon() {
                    return ({ nodeId }) => `data:image/${nodeId}`;
                },
                nodeName() {
                    return ({ nodeId }) => `name-${nodeId}`;
                },
                nodeType() {
                    return ({ nodeId }) => `type-${nodeId}`;
                },
                executionInfo() {
                    return ({ nodeId }) => workflow.nodes[nodeId].executionInfo;
                }
            }
        };
        storeConfig = {
            workflow: workflowStoreConfig,
            canvas: {
                ...canvasStoreConfig,
                mutations: {
                    ...canvasStoreConfig.mutations,
                    resetZoom: jest.fn(),
                    zoomWithPointer: jest.fn(),
                    setContainerSize: jest.fn(),
                    setScrollContainerElement: jest.fn()
                },
                actions: {
                    ...canvasStoreConfig.actions,
                    setZoomToFit: jest.fn(),
                    zoomCentered: jest.fn()
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        mocks = { $store, $shapes };
        doShallowMount = () => {
            wrapper = shallowMount(Kanvas, { propsData, mocks });
        };
    });

    describe('sample workflow', () => {
        beforeEach(() => {
            doShallowMount();
        });

        it('has portal for selection frames', () => {
            expect(wrapper.find('portal-target[name="node-select"').exists()).toBe(true);
        });

        it('renders nodes', () => {
            wrapper.findAllComponents(Node).wrappers.forEach((n) => {
                let props = n.props();
                let nodeId = props.id;
                let expected = {
                    ...nodeData[nodeId],
                    icon: `data:image/${nodeId}`,
                    name: `name-${nodeId}`,
                    type: `type-${nodeId}`,
                    link: null,
                    allowedActions: {},
                    executionInfo: null,
                    loopInfo: {
                        allowedActions: {}
                    }
                };
                expect(props).toStrictEqual(expected);
            });
        });

        it('renders connectors', () => {
            let props = wrapper.findAllComponents(Connector).wrappers.map(c => c.props());
            expect(props).toEqual(Object.values(workflow.connections));
        });

        it('is not linked', () => {
            expect(wrapper.find('.read-only').exists()).toBe(false);
            expect(wrapper.find('.link-notification').exists()).toBe(false);
        });

        it('is not streaming', () => {
            expect(wrapper.find('.streaming-decorator').exists()).toBe(false);
        });
    });

    it('write-protects and shows warning on being linked', () => {
        workflow.info.linked = true;
        doShallowMount();
        expect(wrapper.find('.read-only').exists()).toBe(true);
        expect(wrapper.find('.type-notification').exists()).toBe(true);
    });

    it('shows decorator in streaming component', () => {
        workflow.info.jobManager = 'test';
        doShallowMount();
        expect(wrapper.find('.streaming-decorator').exists()).toBe(true);
    });

    it('renders workflow annotations', () => {
        const common = { bounds: { x: 0, y: 0, width: 42, height: 42 }, backgroundColor: '#fff', borderColor: '#000' };
        workflow.workflowAnnotations = [
            { ...common, id: 'back' },
            { ...common, id: 'middle' },
            { ...common, id: 'front' }
        ];
        doShallowMount();

        let order = wrapper.findAllComponents(WorkflowAnnotation).wrappers.map(c => c.attributes().id);
        expect(order).toEqual(['back', 'middle', 'front']);
    });

    it('renders metanode ports inside metanodes', () => {
        workflow.info.containerType = 'metanode';
        doShallowMount();

        expect(wrapper.findComponent(MetaNodePortBars).exists()).toBe(true);
    });

    it('doesn’t render metanode ports by default', () => {
        workflow.info.containerType = 'component';
        doShallowMount();

        expect(wrapper.findComponent(MetaNodePortBars).exists()).toBe(false);
    });

    describe('Zoom & Pan', () => {

        it('Suggests Panning', async () => {
            doShallowMount();

            $store.commit('canvas/setSuggestPanning', true);
            await Vue.nextTick();
            expect(wrapper.element.className).toMatch('panning');

            $store.commit('canvas/setSuggestPanning', false);
            await Vue.nextTick();
            expect(wrapper.element.className).not.toMatch('panning');
        });

        it('uses canvasSize and viewBox from store', async () => {
            doShallowMount();
            await Vue.nextTick();
            const { width, height, viewBox } = wrapper.find('svg').attributes();

            expect(Number(width)).toBe(50);
            expect(Number(height)).toBe(50);
            expect(viewBox).toBe('-10 -10 50 50');
        });

        it('makes scrollContainer accessible to store', () => {
            doShallowMount();
            expect(storeConfig.canvas.mutations.setScrollContainerElement)
                .toHaveBeenCalledWith(expect.anything(), wrapper.element);
        });

        test('mouse wheel zooms', () => {
            doShallowMount();

            wrapper.element.dispatchEvent(new WheelEvent('wheel', {
                deltaY: -5,
                ctrlKey: true,
                clientX: 10,
                clientY: 10
            }));
            expect(storeConfig.canvas.mutations.zoomWithPointer).toHaveBeenCalledWith(expect.anything(), {
                delta: 1,
                cursorX: 5,
                cursorY: 0
            });
        });

        it('observes container resize', () => {
            doShallowMount();
            wrapper.vm.resizeObserver.resize({ width: 100, height: 50 });
            expect(storeConfig.canvas.mutations.setContainerSize).toHaveBeenCalledWith(expect.anything(), {
                width: 100, height: 50
            });

        });

        it('stop resize observer', () => {
            doShallowMount();
            let resizeObserver = wrapper.vm.resizeObserver;
            wrapper.destroy();
            expect(resizeObserver.disconnect).toHaveBeenCalled();
        });

        it('pans', async () => {
            doShallowMount();
            wrapper.element.setPointerCapture = jest.fn();
            wrapper.element.releasePointerCapture = jest.fn();

            wrapper.element.scrollLeft = 100;
            wrapper.element.scrollTop = 100;
            wrapper.trigger('pointerdown', {
                button: 1, // middle
                screenX: 100,
                screenY: 100,
                pointerId: -1
            });
            expect(wrapper.element.setPointerCapture).toHaveBeenCalledWith(-1);

            wrapper.trigger('pointermove', {
                screenX: 90,
                screenY: 90
            });
            await Vue.nextTick();
            expect(wrapper.element.scrollLeft).toBe(110);
            expect(wrapper.element.scrollTop).toBe(110);

            wrapper.trigger('pointerup', {
                pointerId: -1
            });
            expect(wrapper.element.releasePointerCapture).toHaveBeenCalledWith(-1);

        });
    });


});
