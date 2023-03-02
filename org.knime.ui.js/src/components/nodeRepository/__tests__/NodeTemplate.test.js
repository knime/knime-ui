import * as Vue from 'vue';
import { shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils';
import NodePreview from 'webapps-common/ui/components/node/NodePreview.vue';

import { KnimeMIME } from '@/mixins/dropNode';
import { nodeSize } from '@/style/shapes.mjs';
import NodeTemplate, { WORKFLOW_ADD_START_MIN } from '../NodeTemplate.vue';

describe('NodeTemplate', () => {
    let props, doMount, wrapper, testEvent, isWritable, openDescriptionPanelMock, closeDescriptionPanelMock,
        setSelectedNodeMock, $store, storeConfig, setDraggingNodeMock, addNodeMock, getElementByIdMock, activeWorkflow,
        toCanvasCoordinatesMock;

    beforeEach(() => {
        isWritable = true;
        wrapper = null;
        openDescriptionPanelMock = vi.fn();
        closeDescriptionPanelMock = vi.fn();
        setSelectedNodeMock = vi.fn();
        setDraggingNodeMock = vi.fn();
        addNodeMock = vi.fn();

        let getBoundingClientRectMock = vi.fn().mockReturnValue({
            width: 70,
            height: 70
        });
        getElementByIdMock = vi.fn();
        HTMLElement.prototype.getBoundingClientRect = getBoundingClientRectMock;
        Document.prototype.getElementById = getElementByIdMock;

        testEvent = {
            dataTransfer: {
                setData: vi.fn(),
                setDragImage: vi.fn()
            }
        };

        props = {
            nodeTemplate: {
                name: 'node-name',
                id: 'node-id',
                nodeFactory: {
                    className: 'class-name',
                    settings: 'encoded-settings'
                },
                icon: 'data:image/node-icon',
                type: 'node-type',
                inPorts: [{ typeId: 'org.port.mockId' }],
                outPorts: [{ typeId: 'org.port.mockId' }],
                component: true
            }
        };

        activeWorkflow = {
            nodes: {
                'root:1': {
                    position: {
                        x: 10,
                        y: 20
                    }
                }
            }
        };

        toCanvasCoordinatesMock = ([x, y]) => [x - 10, y - 10];

        storeConfig = {
            application: {
                state: {
                    availablePortTypes: {
                        'org.port.mockId': {
                            kind: 'mockKind',
                            color: 'mockColor'
                        }
                    }
                }
            },
            workflow: {
                state: {
                    activeWorkflow
                },
                getters: {
                    isWritable() {
                        return isWritable;
                    }
                },
                actions: {
                    addNode: addNodeMock
                }
            },
            nodeRepository: {
                mutations: {
                    setSelectedNode: setSelectedNodeMock,
                    setDraggingNode: setDraggingNodeMock
                },
                actions: {
                    openDescriptionPanel: openDescriptionPanelMock,
                    closeDescriptionPanel: closeDescriptionPanelMock
                },
                state: {
                    selectedNode: null,
                    isDescriptionPanelOpen: false
                }
            },
            canvas: {
                getters: {
                    toCanvasCoordinates: state => toCanvasCoordinatesMock
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        doMount = () => {
            wrapper = shallowMount(NodeTemplate, {
                props,
                global: {
                    plugins: [$store],
                    mocks: { $shapes: { nodeSize: 32 } }
                }
            });
        };
    });

    it('shows node name in label', () => {
        doMount();

        expect(wrapper.find('label').text()).toBe('node-name');
    });

    it('opens description panel when clicked', () => {
        doMount();

        const nodePreview = wrapper.findComponent(NodePreview);
        nodePreview.trigger('click');

        expect(openDescriptionPanelMock).toHaveBeenCalled();
    });

    it('selects a node when clicked', () => {
        doMount();

        const node = wrapper.find('.node');
        node.trigger('click');

        expect(setSelectedNodeMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ name: 'node-name' })
        );
    });

    it('never deselects a selected item via click', () => {
        storeConfig.nodeRepository.state.selectedNode = {
            id: 'node-id'
        };
        storeConfig.nodeRepository.state.isDescriptionPanelOpen = true;
        doMount();

        const node = wrapper.find('.node');
        node.trigger('click');

        expect(setSelectedNodeMock).not.toHaveBeenCalledWith(expect.anything(), null);
        expect(closeDescriptionPanelMock).not.toHaveBeenCalled();
    });

    it('adds style if node is selected', () => {
        storeConfig.nodeRepository.state.isDescriptionPanelOpen = true;
        storeConfig.nodeRepository.state.selectedNode = {
            id: 'node-id'
        };
        doMount();

        const node = wrapper.find('.node');
        expect(node.classes()).toContain('selected');
    });

    describe('double click', () => {
        beforeEach(() => {
            getElementByIdMock.mockImplementation(() => ({
                clientWidth: 1920,
                clientHeight: 1080,
                scrollLeft: 10,
                scrollTop: 10
            }));
        });

        it('adds node to workflow on double click', async () => {
            isWritable = true;
            doMount();

            wrapper.find('.node').trigger('dblclick');
            await Vue.nextTick();

            expect(addNodeMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ position: { x: 560, y: 200 } })
            );
        });

        it('does nothing on double click if workflow it not writeable', async () => {
            isWritable = false;
            doMount();

            wrapper.find('.node').trigger('dblclick');
            await Vue.nextTick();

            expect(addNodeMock).not.toHaveBeenCalled();
        });

        it('looks for free space to position node if there is already a node', async () => {
            activeWorkflow.nodes['root:2'] = {
                position: {
                    x: 560,
                    y: 200
                }
            };
            doMount();

            wrapper.find('.node').trigger('dblclick');
            await Vue.nextTick();

            expect(addNodeMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ position: { x: 649.6, y: 200 } })
            );
        });

        it('avoids to insert behind overlay panel by using min x position', async () => {
            getElementByIdMock.mockImplementation(() => ({
                clientWidth: 100,
                clientHeight: 100,
                scrollLeft: 10,
                scrollTop: 10
            }));
            doMount();

            wrapper.find('.node').trigger('dblclick');
            await Vue.nextTick();

            const { scrollLeft } = getElementByIdMock();
            const [x] = toCanvasCoordinatesMock([WORKFLOW_ADD_START_MIN + scrollLeft - (nodeSize / 2), 0]);

            expect(addNodeMock).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ position: { x, y: 4 } })
            );
        });
    });

    describe('drag node', () => {
        afterEach(() => {
            // clean up document body to where nodePreview is cloned after each test
            document.body.childNodes.forEach(node => {
                document.body.removeChild(node);
            });
        });

        it('adds and removes dragGhost to/from vm and document.body', () => {
            doMount();
            expect(document.body.childNodes.length).toBe(0);

            // add node preview clone
            wrapper.trigger('dragstart', testEvent);

            expect(document.body.childNodes.length).toBe(1);
            expect(document.body.childNodes[0]).toBe(wrapper.vm.dragGhost);
            expect(wrapper.vm.dragGhost).toBeTruthy();

            // remove node preview clone
            wrapper.trigger('dragend', { dataTransfer: { dropEffect: '' } });

            expect(document.body.childNodes.length).toBe(0);
            expect(wrapper.vm.dragGhost).toBeFalsy();
        });

        it('sets a ghostImage', () => {
            doMount();

            wrapper.trigger('dragstart', testEvent);

            let clonedNodePreview = wrapper.vm.dragGhost;

            // Correct Styling
            expect(clonedNodePreview.style.position).toBe('absolute');
            expect(clonedNodePreview.style.left).toBe('-100px');
            expect(clonedNodePreview.style.top).toBe('0px');
            expect(clonedNodePreview.style.width).toBe('70px');
            expect(clonedNodePreview.style.height).toBe('70px');

            expect(testEvent.dataTransfer.setDragImage).toHaveBeenCalledWith(wrapper.vm.dragGhost, 35, 35);
        });

        it('sets dataTransfer types properly onDragStart', () => {
            doMount();
            wrapper.trigger('dragstart', testEvent);

            expect(testEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'node-id');
            expect(testEvent.dataTransfer.setData).toHaveBeenCalledWith(KnimeMIME,
                JSON.stringify({ className: 'class-name', settings: 'encoded-settings' }));
        });

        it('changes cursor when dragged in write-protected mode', () => {
            isWritable = false;
            doMount();

            wrapper.trigger('drag');
            const node = wrapper.find('.node');

            expect(node.attributes().style).toBe('cursor: not-allowed;');
        });

        it('removes style from node when dragging ends', () => {
            isWritable = false;
            doMount();

            wrapper.trigger('drag');
            const node = wrapper.find('.node');

            expect(node.attributes().style).toBe('cursor: not-allowed;');

            wrapper.trigger('dragend', { dataTransfer: { dropEffect: '' } });

            expect(node.attributes().style).toBe(undefined);
        });

        it('closes description panel when dragging starts', () => {
            doMount();
            wrapper.trigger('dragstart', testEvent);

            expect(closeDescriptionPanelMock).toHaveBeenCalled();
        });

        it('re-opens description panel, when dragging is aborted', () => {
            storeConfig.nodeRepository.state.isDescriptionPanelOpen = true;
            storeConfig.nodeRepository.state.selectedNode = {
                id: 'node-id'
            };
            doMount();

            // start dragging while node is selected
            wrapper.trigger('dragstart', testEvent);

            // clear mock records
            setSelectedNodeMock.mockClear();
            openDescriptionPanelMock.mockClear();

            // abort dragging
            wrapper.trigger('dragend', {
                dataTransfer: {
                    dropEffect: 'none' // this means abort
                }
            });

            expect(setSelectedNodeMock).toHaveBeenCalledWith(expect.anything(), props.nodeTemplate);
            expect(openDescriptionPanelMock).toHaveBeenCalled();
        });

        it('description panel stays closed, when dragging is completed succesfully', () => {
            storeConfig.nodeRepository.state.isDescriptionPanelOpen = true;
            storeConfig.nodeRepository.state.selectedNode = {
                id: 'node-id'
            };
            doMount();

            // start dragging while node is selected
            wrapper.trigger('dragstart', testEvent);

            // clear mock records
            setSelectedNodeMock.mockClear();
            openDescriptionPanelMock.mockClear();

            // abort dragging
            wrapper.trigger('dragend', {
                dataTransfer: {
                    dropEffect: 'copy' // this means success
                }
            });

            expect(setSelectedNodeMock).not.toHaveBeenCalled();
            expect(openDescriptionPanelMock).not.toHaveBeenCalled();
        });

        it('sets isDraggingNode as true when dragging starts', () => {
            doMount();
            wrapper.trigger('dragstart', testEvent);

            expect(setDraggingNodeMock).toHaveBeenCalledWith(expect.anything(), true);
        });

        it('sets isDraggingNode as false when dragging ends', () => {
            doMount();
            wrapper.trigger('dragend', { dataTransfer: { dropEffect: '' } });

            expect(setDraggingNodeMock).toHaveBeenCalledWith(expect.anything(), false);
        });
    });
});
