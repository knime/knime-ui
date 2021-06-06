import { mount, createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import vuex from 'vuex';
import * as panelStoreConfig from '~/store/panel';

import Sidebar from '~/components/Sidebar';

describe('Sidebar', () => {
    let wrapper;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(vuex);
    });

    beforeEach(() => {
        wrapper = mount(Sidebar, {
            mocks: {
                $store: mockVuexStore({ panel: panelStoreConfig })
            }
        });
    });

    it('renders default', () => {
        expect(wrapper.exists()).toBe(true);
        expect(wrapper.findAll('svg').length).toBe(2);
        wrapper.findAll('div').wrappers.forEach(wp => {
            expect(wp.classes('active')).toBe(false);
        });
    });

    it('expands and activates wf meta info', () => {
        expect(wrapper.vm.expanded).toBe(false);
        wrapper.find('li').trigger('click');
        expect(wrapper.vm.expanded).toBe(true);
        expect(wrapper.vm.wfMetaActive).toBe(true);
    });

    it('expands and activates node repo', () => {
        expect(wrapper.vm.expanded).toBe(false);
        wrapper.findAll('li').at(1).trigger('click');
        expect(wrapper.vm.expanded).toBe(true);
        expect(wrapper.vm.nodeRepoActive).toBe(true);
    });
});
