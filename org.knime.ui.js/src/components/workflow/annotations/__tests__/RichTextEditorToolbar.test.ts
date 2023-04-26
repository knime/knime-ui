import { describe, expect, it, vi, type Mock } from 'vitest';
import { mount } from '@vue/test-utils';

import FunctionButton from 'webapps-common/ui/components/FunctionButton.vue';
import RichTextEditorToolbar from '../RichTextEditorToolbar.vue';
import type { Bounds } from '@/api/gateway-api/generated-api';
import { mockVuexStore } from '@/test/utils';

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
    const annotationBounds: Bounds = { x: 0, y: 0, width: 100, height: 50 };
    const doMount = () => {
        const $store = mockVuexStore({
            canvas: {
                state: {
                    zoomFactor: 1
                }
            }
        });

        const wrapper = mount(RichTextEditorToolbar, {
            props: { editor: mockEditor, annotationBounds },
            global: {
                plugins: [$store],
                stubs: { FloatingMenu: true }
            }
        });

        return { wrapper, $store };
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

        wrapper.findAllComponents(FunctionButton).at(0).vm.$emit('click', { stopPropagation: vi.fn() });
        expect(mockEditor.chain().focus().toggleBold).toHaveBeenCalled();
        expect(mockEditor.chain().focus().toggleBulletList).not.toHaveBeenCalled();
    });
});
