import { mount } from '@vue/test-utils';

import WorkflowGroupIcon from 'webapps-common/ui/assets/img/icons/folder.svg';
import WorkflowIcon from 'webapps-common/ui/assets/img/icons/workflow.svg';
import ComponentIcon from 'webapps-common/ui/assets/img/icons/node-workflow.svg';
import DataIcon from 'webapps-common/ui/assets/img/icons/file-text.svg';
import MetaNodeIcon from 'webapps-common/ui/assets/img/icons/workflow-node-stack.svg';
import Vuex from 'vuex';
import Vue from 'vue';
import { mockVuexStore } from '@/test/test-utils';

import FileExplorer from '../FileExplorer.vue';

describe('FileExplorer.vue', () => {
    const MOCK_DATA = [
        {
            id: '0',
            name: 'Folder 1',
            type: 'WorkflowGroup',
            icon: WorkflowGroupIcon
        },
        {
            id: '1',
            name: 'Folder 2',
            type: 'WorkflowGroup',
            icon: WorkflowGroupIcon
        },
        {
            id: '2',
            name: 'File 1',
            type: 'Data',
            icon: DataIcon
        },
        {
            id: '3',
            name: 'File 2',
            type: 'Workflow',
            icon: WorkflowIcon
        },
        {
            id: '4',
            name: 'File 3',
            type: 'Component',
            icon: ComponentIcon
        },
        {
            id: '5',
            name: 'File 3',
            type: 'WorkflowTemplate',
            icon: MetaNodeIcon
        }
    ];

    const storeConfig = {
        workflow: {
            actions: {
                addNode: jest.fn()
            }
        },
        canvas: {
            getters: {
                screenToCanvasCoordinates: jest.fn().mockReturnValue(() => [5, 5]),
                getScrollContainerElement:
                    jest.fn().mockReturnValue(() => ({ contains: jest.fn().mockReturnValue(true) }))
            }
        },
        spaces: {
            state: {
                activeSpaceProvider: { id: 'local' },
                activeSpace: {
                    spaceId: 'local',
                    activeWorkflowGroup: null,
                    startItemId: null
                }
            }
        }
    };

    const doMount = ({ props = {} } = { }) => {
        const $store = mockVuexStore(storeConfig);
        const mocks = { $store, $shapes: { nodeSize: 32 } };
        const defaultProps = {
            items: MOCK_DATA,
            isRootFolder: true,
            mode: 'normal'
        };

        const wrapper = mount(FileExplorer, {
            propsData: { ...defaultProps, ...props },
            mocks
        });

        return { wrapper };
    };

    beforeAll(() => {
        Vue.use(Vuex);
    });

    it('should display all files and directories correctly', () => {
        const { wrapper } = doMount();
        
        const allItems = wrapper.findAll('.file-explorer-item');

        expect(allItems.length).toBe(MOCK_DATA.length);

        allItems.wrappers.forEach((item, index) => {
            expect(item.classes()).toContain(MOCK_DATA.at(index).type);
            expect(wrapper.findComponent(MOCK_DATA.at(index).icon).exists()).toBe(true);
        });
    });

    it('should only allow navigating into directories', () => {
        const { wrapper } = doMount();

        const allItems = wrapper.findAll('.file-explorer-item');
        allItems.at(0).trigger('dblclick');
        
        expect(wrapper.emitted('change-directory')[0][0]).toBe(MOCK_DATA.at(0).id);
        
        allItems.at(3).trigger('dblclick');
        expect(wrapper.emitted('change-directory')[1]).toBeUndefined();
    });

    it('should navigate back to parent', () => {
        const { wrapper } = doMount({ props: { isRootFolder: false } });

        const allItems = wrapper.findAll('.file-explorer-item');

        // includes go back button
        expect(allItems.length).toBe(MOCK_DATA.length + 1);

        allItems.at(0).trigger('dblclick');
        expect(wrapper.emitted('change-directory')[0][0]).toBe('..');
    });

    it('should render placeholder for empty directories', () => {
        const { wrapper } = doMount({ props: { items: [] } });

        expect(wrapper.findAll('.file-explorer-item').length).toBe(0);
        expect(wrapper.find('.empty').exists()).toBe(true);
    });

    it('should apply the right styles for "mini" mode', () => {
        const { wrapper } = doMount({ props: { mode: 'mini' } });
        
        expect(wrapper.find('tbody').classes()).toContain('mini');
    });

    describe('Selection', () => {
        it('should select items and emit selected ones', async () => {
            const { wrapper } = doMount();
            await wrapper.findAll('.file-explorer-item').at(1).trigger('click');
            await wrapper.findAll('.file-explorer-item').at(3).trigger('click', { shiftKey: true });
            await wrapper.findAll('.file-explorer-item').at(5).trigger('click', { ctrlKey: true });
            
            expect(wrapper.findAll('.file-explorer-item').at(1).classes()).toContain('selected');
            expect(wrapper.findAll('.file-explorer-item').at(2).classes()).toContain('selected');
            expect(wrapper.findAll('.file-explorer-item').at(3).classes()).toContain('selected');
            expect(wrapper.findAll('.file-explorer-item').at(5).classes()).toContain('selected');
    
            expect(wrapper.emitted('change-selection')[0][0]).toEqual(['1']);
            expect(wrapper.emitted('change-selection')[1][0]).toEqual(['1', '2', '3']);
            expect(wrapper.emitted('change-selection')[2][0]).toEqual(['1', '2', '3', '5']);
        });
    });

    describe('Drag', () => {
        const dragAndDropItem = async (_srcItemWrapper, _tgtItemWrapper) => {
            const dataTransfer = { setDragImage: jest.fn() };
            await _srcItemWrapper.trigger('dragstart', { dataTransfer });
            await _tgtItemWrapper.trigger('dragenter');
            await _tgtItemWrapper.trigger('drop');
        };

        it('should add the proper classes when handling dragging events', async () => {
            const dataTransfer = { setDragImage: jest.fn() };
            const { wrapper } = doMount();
            const firstItem = wrapper.findAll('.file-explorer-item').at(0);
            const secondItem = wrapper.findAll('.file-explorer-item').at(1);
            const thirdItem = wrapper.findAll('.file-explorer-item').at(2);

            // select items 1 and 2
            await firstItem.trigger('click');
            await secondItem.trigger('click', { ctrlKey: true });

            // start dragging on 1
            await firstItem.trigger('dragstart', { dataTransfer });

            // selecte items (1 & 2) should have the proper class
            expect(firstItem.classes()).toContain('dragging');
            expect(secondItem.classes()).toContain('dragging');
            expect(thirdItem.classes()).not.toContain('dragging');
            
            // dragging over selected items does not add the dragging-over class
            await firstItem.trigger('dragenter');
            expect(firstItem.classes()).not.toContain('dragging-over');
            await secondItem.trigger('dragenter');
            expect(secondItem.classes()).not.toContain('dragging-over');
            
            // dragging over non-selected items adds the dragging-over class
            await thirdItem.trigger('dragenter');
            expect(thirdItem.classes()).toContain('dragging-over');
            
            // leaving drag on non-selected items removes the dragging-over class
            await thirdItem.trigger('dragleave');
            expect(thirdItem.classes()).not.toContain('dragging-over');
        });

        it('should only allow dropping on "WorkflowGroup"s', async () => {
            const { wrapper } = doMount();

            // workflow-group item
            const firstItem = wrapper.findAll('.file-explorer-item').at(0);
            // non workflow-group items
            const thirdItem = wrapper.findAll('.file-explorer-item').at(2);
            const fourthItem = wrapper.findAll('.file-explorer-item').at(3);
            const fifthItem = wrapper.findAll('.file-explorer-item').at(4);

            await dragAndDropItem(firstItem, thirdItem);
            await dragAndDropItem(firstItem, fourthItem);
            await dragAndDropItem(firstItem, fifthItem);
            expect(wrapper.emitted('move-items')).toBeUndefined();
        });
        
        it('should emit a "move" event when dropping on a "WorkflowGroup"', async () => {
            const { wrapper } = doMount();

            // workflow-group item
            const firstItem = wrapper.findAll('.file-explorer-item').at(0);
            // workflow-group item
            const secondItem = wrapper.findAll('.file-explorer-item').at(1);

            await dragAndDropItem(firstItem, secondItem);

            expect(wrapper.emitted('move-items')[0][0]).toEqual({
                sourceItems: ['0'],
                targetItem: '1'
            });
        });
        
        it('should emit a "move" event when dropping on the "Go back" item', async () => {
            const { wrapper } = doMount({ props: { isRootFolder: false } });

            // workflow-group item
            const firstItem = wrapper.findAll('.file-explorer-item').at(0);
            // workflow-group item
            const secondItem = wrapper.findAll('.file-explorer-item').at(1);

            await dragAndDropItem(secondItem, firstItem);

            expect(wrapper.emitted('move-items')[0][0]).toEqual({
                sourceItems: ['0'],
                targetItem: '..'
            });
        });

        it('should call addNode if file is above canvas', async () => {
            document.elementFromPoint = jest.fn().mockReturnValue(null);
            const { wrapper } = doMount();

            // workflow-group item
            const firstItem = wrapper.findAll('.file-explorer-item').at(0);

            await firstItem.trigger('dragend');

            expect(storeConfig.workflow.actions.addNode).toBeCalledWith(
                expect.anything(),
                {
                    position: { x: 5, y: 5 },
                    spaceItemId: { itemId: '0', providerId: 'local', spaceId: 'local' }
                }
            );
        });
    });

    it('should emit an event when opening a file', () => {
        const { wrapper } = doMount();

        // workflow-group
        wrapper.findAll('.file-explorer-item').at(0).trigger('dblclick');
        // component
        wrapper.findAll('.file-explorer-item').at(4).trigger('dblclick');
        
        expect(wrapper.emitted('open-file')).toBeUndefined();
        
        // workflow
        wrapper.findAll('.file-explorer-item').at(3).trigger('dblclick');
        expect(wrapper.emitted('open-file')[0][0]).toEqual(MOCK_DATA[3]);
    });

    it('should show the open indicator for items that specify it', () => {
        const indexOfItemWithIndicator = 3;
        const { wrapper } = doMount({
            props: {
                items: MOCK_DATA.map((item, index) => ({
                    ...item,
                    displayOpenIndicator: index === indexOfItemWithIndicator
                }))
            }
        });

        const items = wrapper.findAll('.file-explorer-item');
        expect(items.at(0).find('.open-indicator').exists()).toBe(false);
        expect(items.at(indexOfItemWithIndicator).find('.open-indicator').exists()).toBe(true);
    });

    describe('options menu', () => {
        const RENAME_OPTION_IDX = 0;
        const DELETE_OPTION_IDX = 1;

        const getOptionsItem = (optionsMenu, index) => optionsMenu.findAll('.clickable-item').at(index);

        const getRenameOption = (wrapper, itemIndex) => {
            const optionsMenu = wrapper.findAll('.submenu').at(itemIndex);
            return getOptionsItem(optionsMenu, RENAME_OPTION_IDX);
        };

        const getDeleteOption = (wrapper, itemIndex) => {
            const optionsMenu = wrapper.findAll('.submenu').at(itemIndex);
            return getOptionsItem(optionsMenu, DELETE_OPTION_IDX);
        };

        it('should show the item option button', () => {
            const { wrapper } = doMount();
            expect(wrapper.find('.submenu').find('.submenu-toggle').exists()).toBe(true);
        });

        it('should have the delete option', () => {
            const { wrapper } = doMount();

            const menuItem = wrapper.find('.submenu').find('.menu-wrapper');
            expect(menuItem.findAll('li').at(DELETE_OPTION_IDX).element.innerHTML).toContain('Delete');
        });

        it('should enable the delete option for items that specify it', () => {
            const indexWithDeletable = 3;
            const { wrapper } = doMount({
                props: {
                    items: MOCK_DATA.map((item, index) => ({
                        ...item,
                        canBeDeleted: index === indexWithDeletable
                    }))
                }
            });

            const items = wrapper.findAll('.submenu');
            const itemDisabledDelete = items.at(0).find('.menu-wrapper').findAll('li').at(DELETE_OPTION_IDX);
            const itemEnabledDelete = items.at(DELETE_OPTION_IDX).find('.menu-wrapper').findAll('li')
                .at(DELETE_OPTION_IDX);
            expect(itemDisabledDelete.find('.disabled').exists()).toBe(true);
            expect(itemDisabledDelete.element.title).toBe('Open workflows cannot be deleted');
            expect(itemEnabledDelete.find('.disabled').exists()).toBe(true);
        });

        it('should emit delete-items on delete option click', async () => {
            const itemIdx = 2;
            const { wrapper } = doMount({
                props: { items: MOCK_DATA.map((item, index) => ({ ...item, canBeDeleted: true })) }
            });

            const deleteButton = getDeleteOption(wrapper, itemIdx);
            await deleteButton.trigger('click');
            expect(wrapper.emitted('delete-items')[0][0]).toMatchObject({ items: [{ id: `${itemIdx}` }] });
        });

        it('should have rename enabled when item is not open', () => {
            const { wrapper } = doMount();

            const menuItem = wrapper.find('.submenu').find('.menu-wrapper');
            expect(menuItem.findAll('li').at(0).element.innerHTML).toContain('Rename');
        });

        it('should have rename disabled when item is open', () => {
            const indexOpenedItem = 0;
            const { wrapper } = doMount({
                props: {
                    items: MOCK_DATA.map((item, index) => ({
                        ...item,
                        displayOpenIndicator: index === indexOpenedItem
                    }))
                }
            });

            const menuItem = wrapper.find('.submenu').find('.menu-wrapper');
            expect(menuItem.findAll('li').at(0).element.outerHTML).toContain('Open workflows cannot be renamed');
        });

        it('should render TextInput when users wants to rename', async () => {
            const { wrapper } = doMount();
            const renameButton = getRenameOption(wrapper, 0);
            await renameButton.trigger('click');
            
            expect(wrapper.vm.activeRenameId).toBe(MOCK_DATA[0].id);
            expect(wrapper.vm.renameValue).toBe(MOCK_DATA[0].name);
            expect(wrapper.findAll('input').at(0).exists()).toBe(true);
        });

        it('should show verification message in case of error during renaming', async () => {
            const { wrapper } = doMount();
            const renameButton = getRenameOption(wrapper, 0);
            await renameButton.trigger('click');
            
            const inputValue = wrapper.findAll('input').at(0);
            inputValue.element.value = 'invalid [*?#:"<>%~|.] string';
            await inputValue.trigger('input');
            expect(wrapper.find('.item-error').exists()).toBe(true);

            inputValue.element.value = 'valid string';
            await inputValue.trigger('input');
            expect(wrapper.find('.item-error').exists()).toBe(false);
        });

        it('should submit renaming event', async () => {
            const { wrapper } = doMount();
            const renameButton = getRenameOption(wrapper, 0);
            await renameButton.trigger('click');
            
            const inputValue = wrapper.findAll('input').at(0);
            const newName = 'New Folder name';
            await wrapper.setData({ renameValue: newName });
            await inputValue.trigger('keyup.enter');

            expect(wrapper.emitted('rename-file')).toBeTruthy();
            expect(wrapper.emitted('rename-file')[0][0].newName).toEqual(newName);
        });
        
        it('should automatically trim new name', async () => {
            const { wrapper } = doMount();
            const renameButton = getRenameOption(wrapper, 0);
            await renameButton.trigger('click');
            
            const inputValue = wrapper.findAll('input').at(0);
            const newName = '    New Folder name    ';
            await wrapper.setData({ renameValue: newName });
            await inputValue.trigger('keyup.enter');

            expect(wrapper.emitted('rename-file')).toBeTruthy();
            expect(wrapper.emitted('rename-file')[0][0].newName).toEqual('New Folder name');
        });

        it('should not save empty names', async () => {
            const { wrapper } = doMount();
            const renameButton = getRenameOption(wrapper, 0);
            await renameButton.trigger('click');
            
            const inputValue = wrapper.findAll('input').at(0);
            const newName = '      ';
            await wrapper.setData({ renameValue: newName });
            await inputValue.trigger('keyup.enter');

            expect(wrapper.emitted('rename-file')).toBeUndefined();
        });

        it('should cancel renaming event', async () => {
            const { wrapper } = doMount();
            const renameButton = getRenameOption(wrapper, 0);
            await renameButton.trigger('click');
            
            const inputValue = wrapper.findAll('input').at(0);
            const newName = 'New Folder name';
            await wrapper.setData({ renameValue: newName });
            await inputValue.trigger('keyup.esc');

            expect(wrapper.vm.activeRenameId).toBe(null);
            expect(wrapper.vm.renameValue).toBe('');
        });
    });
});
