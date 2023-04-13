import { describe, expect, it, vi, type Mock } from 'vitest';
import { mount } from '@vue/test-utils';

import FunctionButton from 'webapps-common/ui/components/FunctionButton.vue';
import RichTextEditorToolbar from '../RichTextEditorToolbar.vue';

const createMockEditor = () => {
    const actionNames = [
        'toggleBold',
        'toggleItalic',
        'toggleUnderline',
        'toggleBulletList',
        'toggleOrderedList',
        'setTextAlign',
        'setTextAlign',
        'setTextAlign'
    ] as const;

    type Actions = Record<
        typeof actionNames[number],
        Mock<any[], { run: () => void }>
    >;

    const actions: Actions = actionNames.reduce((acc, action) => {
        acc[action] = vi.fn(() => ({ run: () => {} }));
        return acc;
    }, {} as Actions);

    return {
        isActive: vi.fn(),
        chain: () => ({
            focus: () => actions
        })
    };
};

const mockEditor = createMockEditor();

describe('RichTextEditorToolbar.vue', () => {
    const doMount = () => {
        const wrapper = mount(RichTextEditorToolbar, {
            props: { editor: mockEditor }
        });

        return { wrapper };
    };

    it('should render all options', () => {
        const { wrapper } = doMount();

        expect(wrapper.findAll('.toolbar-button').length).toBe(8);
    });

    it('should set the active state correctly', () => {
        mockEditor.isActive.mockImplementationOnce((name) => name === 'bold');
        const { wrapper } = doMount();

        expect(wrapper.findAllComponents(FunctionButton).at(0).props('active')).toBe(true);
        expect(wrapper.findAllComponents(FunctionButton).at(1).props('active')).toBe(false);
    });

    it('should execute the toolbar action', () => {
        const { wrapper } = doMount();

        wrapper.findAllComponents(FunctionButton).at(0).vm.$emit('click');
        expect(mockEditor.chain().focus().toggleBold).toHaveBeenCalled();
        expect(mockEditor.chain().focus().toggleBulletList).not.toHaveBeenCalled();
    });
});
