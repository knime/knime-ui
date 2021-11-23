import { createLocalVue, shallowMount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import CloseIcon from '~/webapps-common/ui/assets/img/icons/close.svg?inline';
import LensIcon from '~/webapps-common/ui/assets/img/icons/lens.svg?inline';
import FunctionButton from '~/webapps-common/ui/components/FunctionButton';

import NodeSearcher from '~/components/NodeSearcher';

describe('NodeRepositoryCategory', () => {
    let mocks, doShallowMount, wrapper, $store,
        updateQueryMock;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        updateQueryMock = jest.fn();

        $store = mockVuexStore({
            nodeRepository: {
                actions: {
                    updateQuery: updateQueryMock
                }
            }
        });
        doShallowMount = () => {
            mocks = { $store };
            wrapper = shallowMount(NodeSearcher, { mocks });
        };
    });

    it('renders', () => {
        doShallowMount();
        const functionButtons = wrapper.findAllComponents(FunctionButton);
        expect(functionButtons.length).toBe(2);
        expect(functionButtons.wrappers[0].findComponent(LensIcon).exists()).toBe(true);
        expect(functionButtons.wrappers[1].findComponent(CloseIcon).exists()).toBe(true);
        expect(wrapper.find('input').exists()).toBe(true);
    });

    describe('searching event', () => {
        it('searches on input in search box', () => {
            doShallowMount();
            const input = wrapper.find('input');
            input.setValue('some node');
            expect(updateQueryMock).toHaveBeenCalled();
        });

        it('ignores clicks on lens button', () => {
            doShallowMount();
            const lensButton = wrapper.findAllComponents(FunctionButton).wrappers[0];
            expect(lensButton.findComponent(LensIcon).exists()).toBe(true);
            lensButton.vm.$emit('click');
            expect(updateQueryMock).not.toHaveBeenCalled();
        });

        it('clears on clear button click', () => {
            doShallowMount();
            const closeButton = wrapper.findAllComponents(FunctionButton).wrappers[1];
            expect(closeButton.findComponent(CloseIcon).exists()).toBe(true);
            closeButton.vm.$emit('click');
            expect(updateQueryMock).toHaveBeenCalled();
        });
    });
});
