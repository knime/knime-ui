import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import ComponentIcon from 'webapps-common/ui/assets/img/icons/node-workflow.svg?inline';
import MetaNodeIcon from 'webapps-common/ui/assets/img/icons/metanode.svg?inline';
import LinkedComponentIcon from '~/webapps-common/ui/assets/img/icons/linked-component.svg?inline';
import LinkedMetanodeIcon from '~/webapps-common/ui/assets/img/icons/linked-metanode.svg?inline';
import BreadcrumbEventBased from '~/components/ActionBreadcrumb';

describe('WorkflowBreadcrumb.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let store, workflow, wrapper, doShallowMount, storeConfig;

    beforeEach(() => {
        workflow = null;

        doShallowMount = async () => {
            storeConfig = {
                workflow: {
                    state: {
                        activeWorkflow: workflow
                    },
                    actions: {
                        loadWorkflow: jest.fn()
                    }
                },
                openedProjects: {
                    actions: {
                        switchWorkflow: jest.fn()
                    }
                }
            };
            store = mockVuexStore(storeConfig);

            wrapper = await shallowMountWithAsyncData(
                WorkflowBreadcrumb,
                { store },
                {
                    mocks: { $store: store }
                }
            );
        };
    });

    it('renders default', async () => {
        workflow = {
            info: {
                name: 'this is a dummy workflow'
            }
        };
        await doShallowMount();

        expect(wrapper.findComponent(BreadcrumbEventBased).props('items')).toStrictEqual([{
            icon: null,
            text: 'this is a dummy workflow'
        }]);
    });

    it('renders nested', async () => {
        workflow = {
            info: {
                name: 'this is a dummy workflow',
                linked: true
            },
            parents: [{
                containerType: 'project',
                name: 'foo'
            }, {
                containerType: 'component',
                containerId: 'root:p1',
                name: 'Comp oh Nent'
            }, {
                containerType: 'component',
                containerId: 'root:p2',
                name: 'L ink Comp oh Nent',
                linked: true
            }, {
                containerType: 'metanode',
                containerId: 'root:p3',
                name: 'Matter Node'
            },
            {
                containerType: 'metanode',
                containerId: 'root:p4',
                name: 'Latter Node',
                linked: true
            }]
        };
        await doShallowMount();

        expect(wrapper.findComponent(BreadcrumbEventBased).props('items')).toStrictEqual([
            {
                id: 'root',
                icon: null,
                text: 'foo'
            }, {
                id: 'root:p1',
                icon: ComponentIcon,
                text: 'Comp oh Nent'
            }, {
                id: 'root:p2',
                icon: LinkedComponentIcon,
                text: 'L ink Comp oh Nent'
            }, {
                id: 'root:p3',
                icon: MetaNodeIcon,
                text: 'Matter Node'
            }, {
                id: 'root:p4',
                icon: LinkedMetanodeIcon,
                text: 'Latter Node'
            }, {
                icon: null,
                text: 'this is a dummy workflow'
            }
        ]);
    });

    describe('event handling', () => {
        // unfortunately, event simulation in vue-test-utils is pretty crappy, especially in combination with
        // nested components and nuxt-links. So we call the event handler directly.

        beforeEach(async () => {
            workflow = {
                parents: [],
                info: {
                    containerType: 'project'
                },
                projectId: 'proj'
            };
            await doShallowMount();
        });


        it('handles clicks on link', () => {
            const event = {
                target: {
                    tagName: 'A'
                },
                id: 'root:0:123'
            };
            wrapper.vm.onClick(event);
            expect(storeConfig.openedProjects.actions.switchWorkflow).toHaveBeenCalledWith(expect.anything(), {
                workflowId: 'root:0:123',
                projectId: 'proj'
            });
        });
    });
});
