import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';
import ContextAwareDescription from '@/components/sidebar/ContextAwareDescription.vue';
import WorkflowMetadata from '@/components/workflowMetadata/WorkflowMetadata.vue';
import NodeDescription from '@/components/nodeRepository/NodeDescription.vue';

describe('ContextAwareDescription.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const doMount = ({
        singleSelectedNodeMock = jest.fn()
    } = {}) => {
        const store = mockVuexStore({
            selection: {
                getters: {
                    singleSelectedNode: singleSelectedNodeMock
                }
            },
            workflow: {
                getters: {
                    getNodeName() {
                        return (nodeId) => `Node with id ${nodeId}`;
                    },
                    getNodeFactory() {
                        return () => ({ className: 'someClassName' });
                    }
                }
            }
        });

        const wrapper = shallowMount(ContextAwareDescription, {
            mocks: { $store: store }
        });

        return {
            wrapper,
            store
        };
    };

    it('shows workflow description (metadata) by default', () => {
        const { wrapper } = doMount();
        expect(wrapper.findComponent(WorkflowMetadata).exists()).toBe(true);
        expect(wrapper.findComponent(NodeDescription).exists()).toBe(false);
    });

    it('shows node description if a single node is selected', () => {
        const { wrapper } = doMount({
            singleSelectedNodeMock: jest.fn().mockReturnValue({
                id: 2,
                kind: 'node'
            })
        });
        expect(wrapper.findComponent(WorkflowMetadata).exists()).toBe(false);
        expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
        expect(wrapper.findComponent(NodeDescription).props('selectedNode')).toMatchObject({
            name: 'Node with id 2', // see getter
            nodeFactory: {
                className: 'someClassName'
            }
        });
    });

    it.each([
        'component',
        'metanode'
    ])('shows workflow description if %s is selected', (kind) => {
        const { wrapper } = doMount({
            singleSelectedNodeMock: jest.fn().mockReturnValue({
                id: 1,
                kind
            })
        });
        expect(wrapper.findComponent(WorkflowMetadata).exists()).toBe(true);
        expect(wrapper.findComponent(NodeDescription).exists()).toBe(false);
    });
});
