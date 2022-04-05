import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import NodeTemplate from '~/components/noderepo/NodeTemplate';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';
import { KnimeMIME } from '~/mixins/dropNode';

describe('NodeTemplate', () => {
    let propsData, doMount, wrapper, testEvent, isWritable, mocks, openDescriptionPanelMock, closeDescriptionPanelMock,
        setSelectedNodeMock, $store, storeConfig, setDraggingNodeMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        isWritable = true;
        wrapper = null;
        openDescriptionPanelMock = jest.fn();
        closeDescriptionPanelMock = jest.fn();
        setSelectedNodeMock = jest.fn();
        setDraggingNodeMock = jest.fn();

        let getBoundingClientRectMock = jest.fn().mockReturnValue({
            width: 70,
            height: 70
        });
        HTMLElement.prototype.getBoundingClientRect = getBoundingClientRectMock;

        testEvent = {
            dataTransfer: {
                setData: jest.fn(),
                setDragImage: jest.fn()
            }
        };

        propsData = {
            nodeTemplate: {
                name: 'node-name',
                id: 'node-id',
                nodeFactory: {
                    className: 'class-name',
                    settings: 'encoded-settings'
                },
                icon: 'data:image/node-icon',
                type: 'node-type',
                inPorts: ['port'],
                outPorts: ['port'],
                component: true
            }
        };

        storeConfig = {
            workflow: {
                getters: {
                    isWritable() {
                        return isWritable;
                    }
                }
            },
            panel: {
                actions: {
                    openDescriptionPanel: openDescriptionPanelMock,
                    closeDescriptionPanel: closeDescriptionPanelMock
                },
                state: {
                    activeDescriptionPanel: false
                }
            },
            nodeRepository: {
                mutations: {
                    setSelectedNode: setSelectedNodeMock,
                    setDraggingNode: setDraggingNodeMock
                },
                state: {
                    selectedNode: null
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        doMount = () => {
            mocks = { $store };
            wrapper = shallowMount(NodeTemplate, { propsData, mocks });
        };
    });

    it('shows node name in label', () => {
        doMount();
        
        expect(wrapper.find('label').text()).toBe('node-name');
    });

    it('renders a node preview', () => {
        doMount();

        let nodePreview = wrapper.findComponent(NodePreview);
        expect(nodePreview.element.className).toMatch('node-preview');
        expect(nodePreview.props()).toStrictEqual({
            type: 'node-type',
            isComponent: false,
            inPorts: ['port'],
            outPorts: ['port'],
            hasDynPorts: false,
            icon: 'data:image/node-icon'
        });
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
        
        // TODO: NXT-844 to have been called with what?
        expect(setSelectedNodeMock).toHaveBeenCalled();
    });

    it('deselects a selected node and closes description panel', () => {
        storeConfig.nodeRepository.state.selectedNode = {
            id: 'node-id'
        };
        storeConfig.panel.state.activeDescriptionPanel = true;
        doMount();

        const node = wrapper.find('.node');
        node.trigger('click');

        expect(setSelectedNodeMock).toHaveBeenCalledWith(expect.anything(), null);
        expect(closeDescriptionPanelMock).toHaveBeenCalled();
    });

    it('adds style if node is selected', () => {
        storeConfig.panel.state.activeDescriptionPanel = true;
        storeConfig.nodeRepository.state.selectedNode = {
            id: 'node-id'
        };
        doMount();

        const node = wrapper.find('.node');
        expect(node.classes()).toContain('selected');
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

            // eslint-disable-next-line no-magic-numbers
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
            storeConfig.panel.state.activeDescriptionPanel = true;
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

            expect(setSelectedNodeMock).toHaveBeenCalledWith(expect.anything(), propsData.nodeTemplate);
            expect(openDescriptionPanelMock).toHaveBeenCalled();
        });

        it('description panel stays closed, when dragging is completed succesfully', () => {
            storeConfig.panel.state.activeDescriptionPanel = true;
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
            wrapper.trigger('dragend');

            expect(setDraggingNodeMock).toHaveBeenCalledWith(expect.anything(), false);
        });
    });
});
