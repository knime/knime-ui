import { mount } from '@vue/test-utils';

import PlusButton from 'webapps-common/ui/components/PlusButton.vue';
import SubMenu from 'webapps-common/ui/components/SubMenu.vue';

import ToolbarButton from '@/components/common/ToolbarButton.vue';
import SpaceExplorerActions from '../SpaceExplorerActions.vue';

describe('SpaceExplorerActions.vue', () => {
    const doMount = ({ props = {} } = {}) => {
        const wrapper = mount(SpaceExplorerActions, {
            propsData: props,
            mocks: { $shortcuts: { get: jest.fn(() => ({})) } }
        });

        return { wrapper };
    };

    describe('Normal mode', () => {
        it('should render actions', () => {
            const { wrapper } = doMount();

            expect(wrapper.find('.toolbar-actions-normal').exists()).toBe(true);
            expect(wrapper.find('.toolbar-actions-mini').exists()).toBe(false);

            expect(wrapper.text()).toMatch('Upload to Hub');
            expect(wrapper.text()).toMatch('Create folder');
            expect(wrapper.text()).toMatch('Import workflow');
            expect(wrapper.text()).toMatch('Add files');

            expect(wrapper.findComponent(PlusButton).exists()).toBe(true);
        });

        it('should disable actions', () => {
            const { wrapper } = doMount({
                props: {
                    disabledActions: {
                        uploadToHub: true,
                        createWorkflow: true
                    }
                }
            });

            expect(wrapper.find('#upload-to-hub').attributes('disabled')).toBeTruthy();
            expect(wrapper.find('#create-folder').attributes('disabled')).toBeFalsy();
            expect(wrapper.find('#import-files').attributes('disabled')).toBeFalsy();

            expect(wrapper.findComponent(PlusButton).attributes('disabled')).toBeTruthy();
        });
        
        it.each([
            ['create-folder'],
            ['upload-to-hub'],
            ['import-files'],
            ['import-workflow']
        ])('should emit an "action:%s" event when clicking on the relevant action', (actionId) => {
            const { wrapper } = doMount();

            wrapper.find(`#${actionId}`).trigger('click');
            expect(wrapper.emitted(`action:${actionId}`)).toBeTruthy();
        });
        
        it('should emit an "action:create-workflow" event when clicking on the relevant action', () => {
            const { wrapper } = doMount();

            wrapper.findComponent(PlusButton).vm.$emit('click');
            expect(wrapper.emitted('action:create-workflow')).toBeTruthy();
        });
    });

    describe('Mini mode', () => {
        it('should render actions', () => {
            const { wrapper } = doMount({
                props: { mode: 'mini' }
            });
    
            expect(wrapper.find('.toolbar-actions-mini').exists()).toBe(true);
            expect(wrapper.find('.toolbar-actions-normal').exists()).toBe(false);

            expect(wrapper.text()).toMatch('Upload to Hub');
            expect(wrapper.text()).toMatch('Create folder');
            expect(wrapper.text()).toMatch('Import workflow');
            expect(wrapper.text()).toMatch('Add files');
    
            expect(wrapper.findComponent(SubMenu).exists()).toBe(true);
            expect(wrapper.findComponent(SubMenu).props('items').length).toBe(4);
            expect(wrapper.findComponent(ToolbarButton).exists()).toBe(true);
        });

        it('should disable actions', () => {
            const { wrapper } = doMount({
                props: {
                    mode: 'mini',
                    disabledActions: {
                        createFolder: true,
                        createWorkflow: true
                    }
                }
            });

            expect(wrapper.findComponent(ToolbarButton).attributes('disabled')).toBeTruthy();

            expect(wrapper.findComponent(SubMenu).props('items')).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ id: 'create-folder', disabled: true })
                ])
            );
        });
        
        it.each([
            ['create-folder'],
            ['upload-to-hub'],
            ['import-files'],
            ['import-workflow']
        ])('should emit an "action:%s" event when clicking on the relevant action', (actionId) => {
            const { wrapper } = doMount({
                props: { mode: 'mini' }
            });

            wrapper.findComponent(SubMenu).vm.$emit('item-click', null, { id: actionId });
            
            expect(wrapper.emitted(`action:${actionId}`)).toBeTruthy();
        });

        it('should emit an "action:create-workflow" event when clicking on the relevant action', () => {
            const { wrapper } = doMount({
                props: { mode: 'mini' }
            });

            wrapper.findComponent(ToolbarButton).trigger('click');

            expect(wrapper.emitted('action:create-workflow')).toBeTruthy();
        });
    });
});
