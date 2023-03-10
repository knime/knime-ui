import { expect, describe, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import PlusButton from 'webapps-common/ui/components/PlusButton.vue';
import SubMenu from 'webapps-common/ui/components/SubMenu.vue';

import SpaceExplorerActions from '../SpaceExplorerActions.vue';

describe('SpaceExplorerActions.vue', () => {
    const doMount = ({ props = {} } = {}) => {
        const wrapper = mount(SpaceExplorerActions, {
            props,
            global: { mocks: { $shortcuts: { get: vi.fn(() => ({})) } } }
        });

        return { wrapper };
    };

    describe('normal mode', () => {
        it('should render actions for local space', () => {
            const { wrapper } = doMount({
                props: {
                    isLocal: true
                }
            });

            expect(wrapper.find('.toolbar-actions-normal').exists()).toBe(true);
            expect(wrapper.find('.toolbar-actions-mini').exists()).toBe(false);

            expect(wrapper.text()).toMatch('Upload to Hub');
            expect(wrapper.text()).toMatch('Create folder');
            expect(wrapper.text()).toMatch('Import workflow');
            expect(wrapper.text()).toMatch('Add files');

            expect(wrapper.findComponent(PlusButton).exists()).toBe(true);
        });

        it('should render actions for hub', () => {
            const { wrapper } = doMount();

            expect(wrapper.find('.toolbar-actions-normal').exists()).toBe(true);
            expect(wrapper.find('.toolbar-actions-mini').exists()).toBe(false);

            expect(wrapper.text()).toMatch('Download to local space');
            expect(wrapper.text()).toMatch('Create folder');
            expect(wrapper.text()).toMatch('Import workflow');
            expect(wrapper.text()).toMatch('Add files');

            expect(wrapper.findComponent(PlusButton).exists()).toBe(true);
        });

        it('should disable actions', () => {
            const { wrapper } = doMount({
                props: {
                    disabledActions: {
                        downloadToLocalSpace: true,
                        createWorkflow: true
                    }
                }
            });

            expect(wrapper.find('#downloadToLocalSpace').attributes('aria-disabled')).toBeTruthy();
            expect(wrapper.find('#createFolder').attributes('disabled')).toBeFalsy();
            expect(wrapper.find('#importFiles').attributes('disabled')).toBeFalsy();
            expect(wrapper.findComponent(PlusButton).attributes('disabled')).toBe('true');
        });

        it.each([
            ['createFolder'],
            ['downloadToLocalSpace'],
            ['importFiles'],
            ['importWorkflow']
        ])('should emit an "action:%s" event when clicking on the relevant action', (actionId) => {
            const { wrapper } = doMount();

            wrapper.find(`#${actionId}`).trigger('click');
            expect(wrapper.emitted(`action:${actionId}`)).toBeTruthy();
        });

        it('should emit an "action:createWorkflow" event when clicking on the relevant action', () => {
            const { wrapper } = doMount();

            wrapper.findComponent(PlusButton).vm.$emit('click');
            expect(wrapper.emitted('action:createWorkflow')).toBeTruthy();
        });
    });

    describe('mini mode', () => {
        it('should render actions for local space', () => {
            const { wrapper } = doMount({
                props: {
                    mode: 'mini',
                    isLocal: true
                }
            });

            expect(wrapper.find('.toolbar-actions-mini').exists()).toBe(true);
            expect(wrapper.find('.toolbar-actions-normal').exists()).toBe(false);

            expect(wrapper.text()).toMatch('Upload to Hub');
            expect(wrapper.text()).toMatch('Create folder');
            expect(wrapper.text()).toMatch('Import workflow');
            expect(wrapper.text()).toMatch('Create workflow');
            expect(wrapper.text()).toMatch('Add files');

            expect(wrapper.findComponent(SubMenu).exists()).toBe(true);
            expect(wrapper.findComponent(SubMenu).props('items').length).toBe(5);
        });

        it('should render actions for hub', () => {
            const { wrapper } = doMount({
                props: { mode: 'mini' }
            });

            expect(wrapper.find('.toolbar-actions-mini').exists()).toBe(true);
            expect(wrapper.find('.toolbar-actions-normal').exists()).toBe(false);

            expect(wrapper.text()).toMatch('Download to local space');
            expect(wrapper.text()).toMatch('Create folder');
            expect(wrapper.text()).toMatch('Create workflow');
            expect(wrapper.text()).toMatch('Import workflow');
            expect(wrapper.text()).toMatch('Add files');

            expect(wrapper.findComponent(SubMenu).exists()).toBe(true);
            expect(wrapper.findComponent(SubMenu).props('items').length).toBe(5);
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

            expect(wrapper.findComponent(SubMenu).props('items')).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ id: 'createFolder', disabled: true })
                ])
            );
        });

        it.each([
            ['createFolder'],
            ['createWorkflow'],
            ['uploadToHub'],
            ['importFiles'],
            ['importWorkflow']
        ])('should emit an "action:%s" event when clicking on the relevant action', (actionId) => {
            const { wrapper } = doMount({
                props: { mode: 'mini' }
            });

            wrapper.findComponent(SubMenu).vm.$emit('item-click', null, { id: actionId });

            expect(wrapper.emitted(`action:${actionId}`)).toBeTruthy();
        });
    });
});
