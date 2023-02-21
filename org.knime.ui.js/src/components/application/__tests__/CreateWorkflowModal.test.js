import Vue from 'vue';
import Vuex from 'vuex';
import { mount, createLocalVue } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';
import * as spacesStore from '@/store/spaces';

import Modal from 'webapps-common/ui/components/Modal.vue';

import CreateWorkflowModal from '../CreateWorkflowModal.vue';

describe('CreateWorkflowModal.vue', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

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
        
        const store = mockVuexStore(storeConfig);
        
        const mocks = {
            $store: store
            // stubs: {
            //     FocusTrap: { template: '<div><slot/></div>' }
            // }
        };
        const wrapper = mount(CreateWorkflowModal, { mocks });

        return { wrapper, store };
    };

    describe('CreateWorkflowModal', () => {
        it('Closes on state change', async () => {
            const { wrapper } = doMount({ isOpen: true });
            wrapper.vm.closeModal();
            await Vue.nextTick();
            expect(wrapper.findComponent(Modal).exists()).toBe(false);
        });

        it.todo('Set name suggestion');

        it.todo('Should focus the input');

        it.todo('should create workflow');

        it.todo('should disable button when name is invalid');
    });
});
