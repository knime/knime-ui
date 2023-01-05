import { mount } from '@vue/test-utils';

import WorkflowGroupIcon from 'webapps-common/ui/assets/img/icons/folder.svg';
import WorkflowIcon from 'webapps-common/ui/assets/img/icons/workflow.svg';
import ComponentIcon from 'webapps-common/ui/assets/img/icons/node-workflow.svg';
import DataIcon from 'webapps-common/ui/assets/img/icons/file-text.svg';
import MetaNodeIcon from 'webapps-common/ui/assets/img/icons/workflow-node-stack.svg';

import FileExplorer from '../FileExplorer.vue';

describe('FileExplorer.vue', () => {
    const MOCK_DATA = [
        {
            id: '1',
            name: 'Folder 1',
            type: 'WorkflowGroup',
            icon: WorkflowGroupIcon
        },
        {
            id: '2',
            name: 'Folder 2',
            type: 'WorkflowGroup',
            icon: WorkflowGroupIcon
        },
        {
            id: '3',
            name: 'File 1',
            type: 'Data',
            icon: DataIcon
        },
        {
            id: '4',
            name: 'File 2',
            type: 'Workflow',
            icon: WorkflowIcon
        },
        {
            id: '5',
            name: 'File 3',
            type: 'Component',
            icon: ComponentIcon
        },
        {
            id: '6',
            name: 'File 3',
            type: 'WorkflowTemplate',
            icon: MetaNodeIcon
        }
    ];

    const doMount = ({ props = {} } = { }) => {
        const defaultProps = {
            items: MOCK_DATA,
            isRootFolder: true,
            mode: 'normal'
        };

        const wrapper = mount(FileExplorer, {
            propsData: { ...defaultProps, ...props }
        });

        return { wrapper };
    };

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
});
