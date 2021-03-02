import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore, shallowMountWithAsyncData } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import WorkflowBreadcrumb from '~/components/WorkflowBreadcrumb';
import Breadcrumb from 'webapps-common/ui/components/Breadcrumb';
import ComponentIcon from 'webapps-common/ui/assets/img/icons/node-workflow.svg?inline';
import MetaNodeIcon from 'webapps-common/ui/assets/img/icons/metanode.svg?inline';
import LinkedComponentIcon from '~/webapps-common/ui/assets/img/icons/linked-component.svg?inline';
import LinkedMetanodeIcon from '~/webapps-common/ui/assets/img/icons/linked-metanode.svg?inline';

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

        expect(wrapper.findComponent(Breadcrumb).props('items')).toStrictEqual([{
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

        expect(wrapper.findComponent(Breadcrumb).props('items')).toStrictEqual([
            {
                href: '#root',
                icon: null,
                text: 'foo'
            }, {
                href: '#root%3Ap1',
                icon: ComponentIcon,
                text: 'Comp oh Nent'
            }, {
                href: '#root%3Ap2',
                icon: LinkedComponentIcon,
                text: 'L ink Comp oh Nent'
            }, {
                href: '#root%3Ap3',
                icon: MetaNodeIcon,
                text: 'Matter Node'
            }, {
                href: '#root%3Ap4',
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

        it('handles clicks on nothing', () => {
            const event = {
                target: {
                    tagName: 'DIV'
                }
            };
            wrapper.vm.onClick(event);
            expect(storeConfig.workflow.actions.loadWorkflow).not.toHaveBeenCalled();
        });

        it('handles clicks on link', () => {
            const event = {
                target: {
                    tagName: 'A',
                    href: '#root:0:123'
                }
            };
            wrapper.vm.onClick(event);
            expect(storeConfig.openedProjects.actions.switchWorkflow).toHaveBeenCalledWith(expect.anything(), {
                workflowId: 'root:0:123',
                projectId: 'proj'
            });
        });

        it('handles clicks on link with weird characters in ID (which should never occur)', () => {
            let weirdId = 'root#;,/?:@&=+$-_.!~*\'"()123';
            const event = {
                target: {
                    tagName: 'A',
                    href: `#${encodeURIComponent(weirdId)}`
                }
            };
            wrapper.vm.onClick(event);
            expect(storeConfig.openedProjects.actions.switchWorkflow).toHaveBeenCalledWith(expect.anything(), {
                workflowId: weirdId,
                projectId: 'proj'
            });
        });
    });
});
