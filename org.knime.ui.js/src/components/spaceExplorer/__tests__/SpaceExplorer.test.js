import { mount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';
import * as spaceExplorerStore from '@/store/spaceExplorer';

import Breadcrumb from 'webapps-common/ui/components/Breadcrumb.vue';
import { fetchWorkflowGroupContent } from '@api';

import SpaceExplorer from '../SpaceExplorer.vue';
import FileExplorer from '../FileExplorer.vue';

jest.mock('@api');

const fetchWorkflowGroupContentResponse = {
    id: 'root',
    path: [],
    items: [
        {
            id: '1',
            name: 'Folder 1',
            type: 'WorkflowGroup'
        },
        {
            id: '2',
            name: 'Folder 2',
            type: 'WorkflowGroup'
        },
        {
            id: '4',
            name: 'File 2',
            type: 'Workflow'
        }
    ]
};

describe('SpaceExplorer.vue', () => {
    const doMount = async ({
        awaitLoad = true,
        mockResponse = fetchWorkflowGroupContentResponse,
        mockGetSpaceItems = null
    } = {}) => {
        if (mockGetSpaceItems) {
            fetchWorkflowGroupContent.mockImplementation(mockGetSpaceItems);
        } else {
            fetchWorkflowGroupContent.mockResolvedValue(mockResponse);
        }

        const $store = mockVuexStore({
            spaceExplorer: spaceExplorerStore
        });

        const wrapper = mount(SpaceExplorer, {
            global: {
                plugins: [$store]
            }
        });

        if (awaitLoad) {
            await new Promise(r => setTimeout(r, 0));
        }

        return { wrapper, $store };
    };

    it('should load root directory data on created', async () => {
        const { wrapper } = await doMount();
        
        expect(wrapper.findComponent(FileExplorer).exists()).toBe(true);
        expect(wrapper.findComponent(FileExplorer).props('items')).toEqual(fetchWorkflowGroupContentResponse.items);
        expect(wrapper.findComponent(FileExplorer).props('isRootFolder')).toBe(true);
    });

    it('should load data when navigating to a directory', async () => {
        const { wrapper } = await doMount();

        fetchWorkflowGroupContent.mockReset();

        wrapper.findComponent(FileExplorer).vm.$emit('changeDirectory', '1234');
        expect(fetchWorkflowGroupContent).toHaveBeenCalledWith({ spaceId: 'local', itemId: '1234' });
    });

    describe('Navigate back', () => {
        it('should load data when navigating back to the parent directory', async () => {
            const { wrapper } = await doMount({
                mockResponse: {
                    ...fetchWorkflowGroupContentResponse,
                    path: [
                        { id: 'parentId', name: 'Parent Directory' },
                        { id: 'currentDirectoryId', name: 'Current Directory' }
                    ]
                }
            });
    
            fetchWorkflowGroupContent.mockReset();
            wrapper.findComponent(FileExplorer).vm.$emit('changeDirectory', '..');
            expect(fetchWorkflowGroupContent).toHaveBeenCalledWith({ spaceId: 'local', itemId: 'parentId' });
        });

        it('should navigate to "root" when going back from 1 level below the root directory', async () => {
            const { wrapper } = await doMount({
                mockResponse: {
                    ...fetchWorkflowGroupContentResponse,
                    path: [{ id: 'currentDirectoryId', name: 'Current Directory' }]
                }
            });
    
            fetchWorkflowGroupContent.mockReset();
            wrapper.findComponent(FileExplorer).vm.$emit('changeDirectory', '..');
            expect(fetchWorkflowGroupContent).toHaveBeenCalledWith({ spaceId: 'local', itemId: 'root' });
        });
    });

    it('should navigate via the breadcrumb', async () => {
        const { wrapper } = await doMount({
            mockResponse: {
                ...fetchWorkflowGroupContentResponse,
                path: [
                    { id: 'parentId', name: 'Parent Directory' },
                    { id: 'currentDirectoryId', name: 'Current Directory' }
                ]
            }
        });

        wrapper.findComponent(Breadcrumb).vm.$emit('click-item', { id: 'parentId' });
        expect(fetchWorkflowGroupContent).toHaveBeenCalledWith({ spaceId: 'local', itemId: 'parentId' });
    });

    it('should display the loader only after a specific timeout', async () => {
        fetchWorkflowGroupContent.mockImplementation(() => new Promise(resolve => {
            setTimeout(() => {
                resolve(fetchWorkflowGroupContentResponse);
            }, 600);
        }));

        jest.useFakeTimers();

        const $store = mockVuexStore({
            spaceExplorer: spaceExplorerStore
        });

        const wrapper = mount(SpaceExplorer, {
            global: {
                plugins: [$store]
            }
        });

        const advanceTime = async (timeMs) => {
            jest.advanceTimersByTime(timeMs);
            await wrapper.vm.$nextTick();
            await wrapper.vm.$nextTick();
            await wrapper.vm.$nextTick();
        };

        // total time now: 0ms
        // initially loading should not be yet visible
        expect(wrapper.find('.loading').exists()).toBe(false);
        expect(wrapper.findComponent(FileExplorer).exists()).toBe(false);

        
        // total time now: 100ms
        // after waiting for 100ms it should still not be visible
        await advanceTime(100);
        expect(wrapper.findComponent(FileExplorer).exists()).toBe(false);
        expect(wrapper.find('.loading').exists()).toBe(false);
        
        // total time now: 500ms
        // after waiting for 400ms it should now be displayed since it crossed the threshold
        await advanceTime(400);
        expect(wrapper.findComponent(FileExplorer).exists()).toBe(false);
        expect(wrapper.find('.loading').exists()).toBe(true);
        
        // total time now: 600ms
        // after waiting for 100ms the data should be loaded now, so loading is not visible
        // await advanceTime(100);
        await advanceTime(100);
        expect(wrapper.find('.loading').exists()).toBe(false);
        expect(wrapper.findComponent(FileExplorer).exists()).toBe(true);

        jest.useRealTimers();
    });
});
