import { createLocalVue, mount } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import portIcon from '~/components/output/PortIconRenderer';

import * as $colors from '~/style/colors';
import * as $shapes from '~/style/shapes';

describe('PortIconRenderer', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let $store, doMount, storeConfig, wrapper;

    beforeEach(() => {
        wrapper = null;
        storeConfig = {
            workflow: {
                state: {
                    activeWorkflow: {
                        portTypes: {
                            TA: {
                                kind: 'table',
                                name: 'Data'
                            },
                            FV: {
                                kind: 'flowVariable',
                                name: 'Flow Variable'
                            }
                        }
                    }
                }
            }
        };
        doMount = (pi) => {
            $store = mockVuexStore(storeConfig);
            let mocks = { $shapes, $colors, $store };
            wrapper = mount(pi, { mocks });
        };
    });

    it('renders a table portIcon', () => {
        let PortIcon = portIcon({
            typeId: 'TA',
            state: 'EXECUTED'
        });
        doMount(PortIcon);
        expect(wrapper.element.tagName.toLowerCase()).toBe('svg');
        expect(wrapper.findAll('.scale g').length).toBe(0);
        expect(wrapper.findAll('.scale g *').length).toBe(0);
        expect(wrapper.find('.scale *').element.tagName.toLowerCase()).toBe('polygon');
    });

    it('renders a flowVar port Icon', () => {
        let PortIcon = portIcon({
            typeId: 'FV',
            inactive: true,
            state: 'EXECUTED'

        });
        doMount(PortIcon);
        expect(wrapper.element.tagName.toLowerCase()).toBe('svg');
        expect(wrapper.findAll('.scale g').length).toBe(0);
        expect(wrapper.findAll('.scale *').length).toBe(1 + 2); // 1 circle + 2 paths for "X"
        expect(wrapper.find('.scale *').element.tagName.toLowerCase()).toBe('circle');
    });
});
