import { expect, describe, beforeEach, it, vi } from 'vitest';
import * as Vue from 'vue';
import { mount } from '@vue/test-utils';
import { mockVuexStore } from '@/test/test-utils/mockVuexStore';

import Description from 'webapps-common/ui/components/Description.vue';
import NodeFeatureList from 'webapps-common/ui/components/node/NodeFeatureList.vue';

import ExternalResourcesList from '@/components/common/ExternalResourcesList.vue';
import NodeDescription from '../NodeDescription.vue';

describe('NodeDescription', () => {
    let doMount, wrapper, storeConfig, $store, closeDescriptionPanelMock,
        getNodeDescriptionMock, props;

    beforeEach(() => {
        wrapper = null;
        closeDescriptionPanelMock = vi.fn();
        getNodeDescriptionMock = vi.fn().mockReturnValue({
            id: 1,
            description: 'This is a node.',
            links: [{
                text: 'link',
                url: 'www.link.com'
            }]
        });

        storeConfig = {
            nodeRepository: {
                actions: {
                    getNodeDescription: getNodeDescriptionMock,
                    closeDescriptionPanel: closeDescriptionPanelMock
                }
            }
        };

        $store = mockVuexStore(storeConfig);

        props = {
            selectedNode: {
                id: 1,
                name: 'Test',
                nodeFactory: {
                    className: 'some.class.name',
                    settings: ''
                }
            }
        };

        doMount = async () => {
            wrapper = mount(NodeDescription, {
                props,
                global: { plugins: [$store] }
            });
            // wait for the initial fetch of data
            await Vue.nextTick();
            await Vue.nextTick();
        };
    });

    it('renders all components', async () => {
        await doMount();
        expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
        expect(wrapper.findComponent(Description).exists()).toBe(true);
        expect(wrapper.findComponent(ExternalResourcesList).exists()).toBe(true);
        expect(wrapper.findComponent(NodeFeatureList).exists()).toBe(true);
    });

    it('renders name of the selected node', async () => {
        await doMount();
        const title = wrapper.find('h2');
        expect(title.text()).toBe('Test');
    });

    it('renders description of the selected node', async () => {
        await doMount();
        const description = wrapper.find('.description');
        expect(description.text()).toBe('This is a node.');
    });

    it('renders placeholder text if there is no description', async () => {
        getNodeDescriptionMock.mockReturnValue({
            id: 1
        });
        await doMount();
        const description = wrapper.find('span');
        expect(description.text()).toBe('There is no description for this node.');
    });

    it('does not render external links if there are not any', async () => {
        getNodeDescriptionMock.mockReturnValue({
            id: 1,
            description: 'This is a node.'
        });
        await doMount();
        expect(wrapper.findComponent(NodeDescription).exists()).toBe(true);
        expect(wrapper.findComponent(Description).exists()).toBe(true);
        expect(wrapper.findComponent(ExternalResourcesList).exists()).toBe(false);
    });

    it('calls getNodeDescriptionMock when selected node changes', async () => {
        doMount();
        expect(getNodeDescriptionMock).toHaveBeenCalled();
        wrapper.setProps({
            selectedNode: {
                id: 2,
                name: 'Node',
                nodeFactory: {
                    className: 'some.other.thing',
                    settings: ''
                }
            }
        });
        await Vue.nextTick();
        expect(getNodeDescriptionMock).toHaveBeenCalledTimes(2);
    });

    it('changes title and description when node is not visible', () => {
        props.selectedNode = null;
        doMount();
        const title = wrapper.find('h2');
        expect(title.text()).toBe('');
        expect(wrapper.findComponent(Description).exists()).toBe(false);
        expect(wrapper.findComponent(NodeFeatureList).exists()).toBe(false);
        const placeholder = wrapper.find('.placeholder');
        expect(placeholder.text()).toBe('Please select a node');
    });
});
