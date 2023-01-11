import Vuex from 'vuex';
import { createLocalVue, shallowMount } from '@vue/test-utils';

import UpdateBanner from '../UpdateBanner.vue';

describe('UpdateBanner', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    const doShallowMount = ({ props = {} } = { }) => {
        const defaultProps = {
            availableUpdates: {
                newReleases: [
                    {
                        isUpdatePossible: true,
                        name: 'KNIME Analytics Platform 5.0',
                        shortName: '5.0'
                    }
                ],
                bugfixes: ['Update1', 'Update2']
            }
        };

        const wrapper = shallowMount(UpdateBanner, {
            propsData: { ...defaultProps, ...props }
        });

        return { wrapper };
    };

    it('shows banner with right text if release update is available', () => {
        const { wrapper } = doShallowMount();
        const updateText = wrapper.find('.text');

        expect(updateText.text()).toBe('Get the latest features and enhancements! Update now to 5.0');
    });

    it('shows banner with right text if there are bug fixes but no release available', () => {
        const propsData = {
            availableUpdates: {
                newReleases: undefined,
                bugfixes: ['Update1', 'Update2']
            }
        };
        const { wrapper } = doShallowMount({
            props: propsData
        });
        const updateText = wrapper.find('.text');

        expect(updateText.text()).toBe('There are updates for 2 extensions available.');
    });

    it('shows banner with right text if there is one bug fixe but no release available', () => {
        const propsData = {
            availableUpdates: {
                newReleases: undefined,
                bugfixes: ['Update1']
            }
        };
        const { wrapper } = doShallowMount({
            props: propsData
        });
        const updateText = wrapper.find('.text');

        expect(updateText.text()).toBe('There is an update for 1 extension available.');
    });
});
