import { createLocalVue, mount } from '@vue/test-utils';
import { mockVuexStore } from '~knime-ui/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import portIconRenderer from '~knime-ui/components/output/PortIconRenderer';
import * as $colors from '~knime-ui/style/colors';
import * as $shapes from '~knime-ui/style/shapes';

describe('PortIconRenderer', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    let $store, doMount, storeConfig, wrapper, port, iconSize;

    beforeEach(() => {
        storeConfig = {
            application: {
                state: {
                    availablePortTypes: {
                        table: {
                            kind: 'table',
                            name: 'Data'
                        },
                        flowVariable: {
                            kind: 'flowVariable',
                            name: 'Flow Variable'
                        }
                    }
                }
            }
        };
        doMount = () => {
            $store = mockVuexStore(storeConfig);
            let mocks = { $shapes, $colors, $store };
            
            wrapper = mount(portIconRenderer(port, iconSize), { mocks });
        };
    });

    it('renders a table portIcon', () => {
        port = {
            typeId: 'table',
            state: 'EXECUTED'
        };
        doMount();
        
        expect(wrapper.element.tagName.toLowerCase()).toBe('svg');
        expect(wrapper.findAll('.scale g').length).toBe(0);
        expect(wrapper.findAll('.scale g *').length).toBe(0);
        expect(wrapper.find('.scale *').element.tagName.toLowerCase()).toBe('polygon');
    });

    it('renders a flowVar port Icon', () => {
        port = {
            typeId: 'flowVariable',
            inactive: true,
            state: 'EXECUTED'
        };
        doMount();

        expect(wrapper.element.tagName.toLowerCase()).toBe('svg');
        expect(wrapper.findAll('.scale g').length).toBe(0);
        expect(wrapper.findAll('.scale *').length).toBe(1 + 2); // 1 circle + 2 paths for "X"
        expect(wrapper.find('.scale *').element.tagName.toLowerCase()).toBe('circle');
    });

    it('renders the port according to the port size', () => {
        port = {
            typeId: 'table',
            state: 'EXECUTED'
        };
        doMount();
        
        let { portSize } = $shapes;
        expect(wrapper.attributes().viewBox).toBe(`-${portSize / 2} -${portSize / 2} ${portSize} ${portSize}`);
    });

    it('doesn´t set svg´s width', () => {
        port = {
            typeId: 'table',
            state: 'EXECUTED'
        };
        doMount();
        
        expect(wrapper.element.style.width).toBe('');
    });

    it('set svg´s width to provided arguments', () => {
        port = {
            typeId: 'table',
            state: 'EXECUTED'
        };
        iconSize = 12; // eslint-disable-line no-magic-numbers
        doMount();

        expect(wrapper.element.style.width).toBe('12px');
    });
});
