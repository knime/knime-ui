import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import NodeTemplate from '~/components/noderepo/NodeTemplate';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';
import { KnimeMIME } from '~/mixins/dropNode';

describe('NodeTemplate', () => {
    let propsData, doMount, wrapper, testEvent, isWritable, mocks, openDescriptionPanel, closeDescriptionPanel,
        setSelectedNode, $store, storeConfig;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        isWritable = true;
        wrapper = null;
        openDescriptionPanel = jest.fn();
        closeDescriptionPanel = jest.fn();
        setSelectedNode = jest.fn();

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
                    openDescriptionPanel,
                    closeDescriptionPanel
                },
                state: {
                    activeDescriptionPanel: false
                }
            },
            nodeRepository: {
                mutations: {
                    setSelectedNode
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
        expect(openDescriptionPanel).toHaveBeenCalled();
    });

    it('selects a node when clicked', () => {
        doMount();
        const node = wrapper.find('.node');

        node.trigger('click');
        expect(setSelectedNode).toHaveBeenCalled();
    });

    it('adds style if node is selected', () => {
        storeConfig.panel.state.activeDescriptionPanel = true;
        storeConfig.nodeRepository.state.selectedNode = {
            id: 'node-id'
        };
        doMount();
        const node = wrapper.find('.node');

        expect(node.classes()).toContain('node-preview-active');
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
            wrapper.trigger('dragend');

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

            wrapper.trigger('dragend');

            expect(node.attributes().style).toBe(undefined);
        });

        it('closes description panel when dragging starts', () => {
            doMount();
            wrapper.trigger('dragstart', testEvent);

            expect(closeDescriptionPanel).toHaveBeenCalled();
        });
    });
});
