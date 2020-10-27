import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import Breadcrumb from 'webapps-common/ui/components/Breadcrumb';
import ComponentIcon from 'webapps-common/ui/assets/img/icons/node-workflow.svg?inline';
import MetaNodeIcon from 'webapps-common/ui/assets/img/icons/metanode.svg?inline';

describe('WorkflowBreadcrumb.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let store, workflow, wrapper, doShallowMount, loadWorkflow;

    beforeEach(() => {
        workflow = null;
        loadWorkflow = jest.fn();

        doShallowMount = async () => {
            store = mockVuexStore({
                workflow: {
                    state: {
                        activeWorkflow: workflow
                    },
                    actions: {
                        loadWorkflow
                    }
                }
            });

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

        expect(wrapper.findComponent(Breadcrumb).props('items')).toStrictEqual([{
            icon: null,
            text: 'this is a dummy workflow'
        }]);
    });

    it('renders nested', async () => {
        workflow = {
            info: {
                name: 'this is a dummy workflow'
            },
            parents: [{
                containerType: 'project',
                name: 'foo'
            }, {
                containerType: 'component',
                containerId: 'root:201',
                name: 'Comp oh Nent'
            }, {
                containerType: 'metanode',
                containerId: 'root:201:0:42',
                name: 'Matter Node'
            }]
        };
        await doShallowMount();

        expect(wrapper.findComponent(Breadcrumb).props('items')).toStrictEqual([
            {
                href: '#root',
                icon: null,
                text: 'foo'
            }, {
                href: '#root:201',
                icon: ComponentIcon,
                text: 'Comp oh Nent'
            }, {
                href: '#root:201:0:42',
                icon: MetaNodeIcon,
                text: 'Matter Node'
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

        it('handles clicks on nothing', () => {
            const event = {
                target: {
                    tagName: 'DIV'
                }
            };
            wrapper.vm.onClick(event);
            expect(loadWorkflow).not.toHaveBeenCalled();
        });

        it('handles clicks on link', () => {
            const event = {
                target: {
                    tagName: 'A',
                    href: '#root:0:123'
                }
            };
            wrapper.vm.onClick(event);
            expect(loadWorkflow).toHaveBeenCalledWith(expect.anything(), {
                workflowId: 'root:0:123',
                projectId: 'proj'
            });
        });
    });
});
