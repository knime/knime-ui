import { expect, describe, it, vi } from 'vitest';
import * as Vue from 'vue';
import { mount } from '@vue/test-utils';

import Modal from 'webapps-common/ui/components/Modal.vue';
import InputField from 'webapps-common/ui/components/forms/InputField.vue';

import { mockVuexStore } from '@/test/test-utils';
import * as spacesStore from '@/store/spaces';

import CreateWorkflowModal from '../CreateWorkflowModal.vue';
import { escapeStack as escapeStackMock } from '@/mixins/escapeStack';
vi.mock('@/mixins/escapeStack', () => {
    function escapeStack({ onEscape }) { // eslint-disable-line func-style
        escapeStack.onEscape = onEscape;
        return { /* empty mixin */ };
    }
    return { escapeStack };
});

describe('CreateWorkflowModal.vue', () => {
    const MOCK_DATA = [
        {
            id: '1',
            name: 'File 1'
        },
        {
            id: '2',
            name: 'File 2'
        },
        {
            id: '3',
            name: 'File 3'
        },
        {
            id: '4',
            name: 'File 3'
        }
    ];

    const doMount = ({ items = MOCK_DATA, isOpen = true } = {}) => {
        const storeConfig = {
            spaces: {
                ...spacesStore,
                state: {
                    activeSpace: { activeWorkflowGroup: { items } },
                    isLoading: false,
                    isCreateWorkflowModalOpen: isOpen
                }
            }
        };

        const $store = mockVuexStore(storeConfig);
        const dispatchSpy = vi.spyOn($store, 'dispatch');
        const commitSpy = vi.spyOn($store, 'commit');

        const wrapper = mount(CreateWorkflowModal, {
            global: {
                plugins: [$store],
                stubs: { BaseModal: true }
            }
        });

        return { wrapper, $store, dispatchSpy, commitSpy };
    };

    describe('createWorkflowModal', () => {
        it('opens on state change', async () => {
            const { wrapper, $store } = doMount({ isOpen: false });
            await $store.commit('spaces/setIsCreateWorkflowModalOpen', true);
            await Vue.nextTick();
            expect(wrapper.find('input').isVisible()).toBe(true);
        });

        it('closes on state change', async () => {
            const { wrapper, commitSpy } = doMount({ isOpen: true });

            wrapper.findComponent(Modal).vm.$emit('cancel');
            await Vue.nextTick();

            expect(wrapper.find('input').isVisible()).toBe(false);
            expect(commitSpy).toHaveBeenCalledWith('spaces/setIsCreateWorkflowModalOpen', false);
        });

        it('should create workflow', async () => {
            const { wrapper, dispatchSpy } = await doMount();

            const newName = 'Test name';
            const input = wrapper.find('input');
            input.element.value = newName;
            input.trigger('input');

            await wrapper.findAll('button').at(-1).trigger('click');
            expect(dispatchSpy).toHaveBeenCalledWith('spaces/createWorkflow', { workflowName: newName });
        });

        it.each(['.', '\\', '/'])('should clean workflow input', async (invalidChar) => {
            const { wrapper, dispatchSpy } = await doMount();

            const newName = 'Test name';
            const input = wrapper.find('input');
            input.element.value = invalidChar + newName + invalidChar;
            input.trigger('input');

            await wrapper.findAll('button').at(-1).trigger('click');
            expect(dispatchSpy).toHaveBeenCalledWith('spaces/createWorkflow', { workflowName: newName });
        });

        it('should disable button when name is invalid', async () => {
            const { wrapper } = await doMount();

            const input = wrapper.find('input');
            input.element.value = 'invalid Name?*?#:"<>%~|/\\>?';
            input.trigger('input');
            await Vue.nextTick();

            const errorMessage = wrapper.find('.item-error');
            expect(errorMessage.text()).toMatch('contains invalid characters');
        });

        it('should focus the input', async () => {
            vi.useFakeTimers();
            const { wrapper } = await doMount();

            const input = wrapper.find('input');
            const focusSpy = vi.spyOn(input.element, 'focus');
            vi.runAllTimers();
            expect(focusSpy).toHaveBeenCalled();
        });

        describe('name Suggestion', () => {
            it('should set default name suggestion', () => {
                const { wrapper } = doMount();
                const input = wrapper.find('input');
                expect(input.element.value).toBe('KNIME_project');
            });

            it('should find suitable name suggestion', () => {
                const { wrapper } = doMount({ items: [{
                    id: '1',
                    name: 'KNIME_project'
                },
                {
                    id: '2',
                    name: 'KNIME_project1'
                }] });
                const input = wrapper.find('input');
                expect(input.element.value).toBe('KNIME_project2');
            });
        });

        describe('hotkeys', () => {
            it('should submit on keypress enter and with a valid name', async () => {
                const { wrapper, dispatchSpy } = doMount();

                const newName = 'A valid name';
                const input = wrapper.find('input');
                input.element.value = newName;
                input.trigger('input');

                const inputField = wrapper.findComponent(InputField);
                await inputField.vm.$emit('keyup', { key: 'Enter' });
                expect(dispatchSpy).toHaveBeenCalledWith('spaces/createWorkflow', { workflowName: newName });
            });

            it('should not submit on keypress enter with an invalid name', async () => {
                const { wrapper, dispatchSpy } = doMount();

                const newName = 'An invalid name *?#:"<>%~|/\\>?';
                const input = wrapper.find('input');
                input.element.value = newName;
                await input.trigger('input');

                const inputField = wrapper.findComponent(InputField);
                await inputField.vm.$emit('keyup', { key: 'Enter' });
                expect(dispatchSpy).not.toHaveBeenCalledWith('spaces/createWorkflow', { workflowName: newName });
            });

            it('should close on ESC', () => {
                const { wrapper, commitSpy } = doMount();

                escapeStackMock.onEscape.call(wrapper.vm);

                expect(commitSpy).toHaveBeenCalledWith('spaces/setIsCreateWorkflowModalOpen', false);
            });
        });
    });
});
