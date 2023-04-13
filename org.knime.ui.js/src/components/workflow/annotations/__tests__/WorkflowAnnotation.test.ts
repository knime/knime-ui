import { expect, describe, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/utils';
import { mockUserAgent } from 'jest-useragent-mock';

import * as $colors from '@/style/colors.mjs';
import * as $shapes from '@/style/shapes.mjs';
import { API } from '@api';
import * as workflowStore from '@/store/workflow';
import { type WorkflowAnnotation, Annotation } from '@/api/gateway-api/generated-api';

import WorkflowAnnotationComp from '../WorkflowAnnotation.vue';
import LegacyAnnotation from '../LegacyAnnotation.vue';
import RichTextEditor from '../RichTextEditor.vue';
import TransformControls from '../TransformControls.vue';

describe('Workflow Annotation', () => {
    const defaultProps: {
        annotation: WorkflowAnnotation
    } = {
        annotation: {
            id: 'id1',
            textAlign: Annotation.TextAlignEnum.Right,
            borderWidth: 4,
            borderColor: '#000',
            backgroundColor: '#000',
            bounds: { x: 0, y: 0, width: 100, height: 50 },
            text: 'hallo',
            styleRanges: [{ start: 0, length: 2, fontSize: 14 }],
            contentType: Annotation.ContentTypeEnum.Plain
        }
    };

    const doMount = ({
        props = {},
        mocks = {},
        isAnnotationSelectedMock = vi.fn().mockReturnValue(() => false),
        selectedAnnotationIdsMock = vi.fn().mockReturnValue(() => []),
        selectedNodeIdsMock = vi.fn().mockReturnValue(() => []),
        selectedConnectionsMock = vi.fn().mockReturnValue(() => [])
    } = {}) => {
        const defaultMocks = { $shapes, $colors };

        const $store = mockVuexStore({
            workflow: {
                state: {
                    activeWorkflow: {
                        projectId: 'project1',
                        info: { containerId: 'root' }
                    }
                },
                actions: workflowStore.actions
            },
            selection: {
                getters: {
                    isAnnotationSelected: isAnnotationSelectedMock,
                    selectedAnnotationIds: selectedAnnotationIdsMock,
                    selectedNodeIds: selectedNodeIdsMock,
                    selectedConnections: selectedConnectionsMock
                },
                actions: {
                    deselectAllObjects: vi.fn(),
                    selectAnnotation: vi.fn(),
                    deselectAnnotation: vi.fn()
                }
            },
            application: {
                actions: {
                    toggleContextMenu: vi.fn()
                }
            }
        });

        const dispatchSpy = vi.spyOn($store, 'dispatch');

        const wrapper = mount(WorkflowAnnotationComp, {
            props: { ...defaultProps, ...props },
            global: {
                mocks: { ...defaultMocks, ...mocks },
                plugins: [$store],
                stubs: {
                    RichTextEditor: true
                }
            }
        });

        return { wrapper, $store, dispatchSpy };
    };

    it('should render LegacyAnnotation', () => {
        const { wrapper } = doMount();

        expect(wrapper.findComponent(LegacyAnnotation).props('annotation')).toEqual(defaultProps.annotation);
        expect(wrapper.findComponent(RichTextEditor).exists()).toBe(false);
    });

    it('should render RichTextEditor', () => {
        const { wrapper } = doMount({
            props: {
                annotation: { ...defaultProps.annotation, contentType: Annotation.ContentTypeEnum.Html }
            }
        });

        expect(wrapper.findComponent(LegacyAnnotation).exists()).toBe(false);
        expect(wrapper.findComponent(RichTextEditor).props('id')).toEqual(defaultProps.annotation.id);
        expect(wrapper.findComponent(RichTextEditor).props('initialValue')).toEqual(defaultProps.annotation.text);
    });

    describe('transform', () => {
        it('should transform annotation', () => {
            const { wrapper, $store } = doMount();
            const bounds = { x: 15, y: 15, width: 100, height: 100 };

            wrapper.findComponent(TransformControls).vm.$emit('transformEnd', { bounds });
            const projectId = $store.state.workflow.activeWorkflow.projectId;
            const workflowId = $store.state.workflow.activeWorkflow.info.containerId;

            expect(API.workflowCommand.TransformWorkflowAnnotation).toHaveBeenCalledWith({
                projectId,
                workflowId,
                bounds,
                annotationId: defaultProps.annotation.id
            });
        });
    });

    describe('edit', () => {
        it('should emit `toggleEdit` event to start editing (LegacyAnnotation)', () => {
            const { wrapper } = doMount();

            wrapper.findComponent(LegacyAnnotation).trigger('dblclick');
            expect(wrapper.emitted('toggleEdit')[0][0]).toBe(defaultProps.annotation.id);
        });

        it('should emit `toggleEdit` event to start editing (RichTextEditor)', () => {
            const { wrapper } = doMount({
                props: {
                    annotation: { ...defaultProps.annotation, contentType: Annotation.ContentTypeEnum.Html }
                }
            });

            wrapper.findComponent(RichTextEditor).vm.$emit('editStart');
            expect(wrapper.emitted('toggleEdit')[0][0]).toBe(defaultProps.annotation.id);
        });

        it('should render RichTextEditor when annotation is editable', () => {
            const { wrapper } = doMount({
                props: {
                    isEditing: true
                }
            });

            expect(wrapper.findComponent(LegacyAnnotation).exists()).toBe(false);
            expect(wrapper.findComponent(RichTextEditor).exists()).toBe(true);
            expect(wrapper.findComponent(RichTextEditor).props('editable')).toBe(true);
        });
    });

    describe('selection', () => {
        it('should select with left click', async () => {
            const { wrapper, dispatchSpy } = doMount();
            await wrapper.findComponent(TransformControls).trigger('click', { button: 0 });

            expect(dispatchSpy).toHaveBeenCalledWith('selection/selectAnnotation', 'id1');
        });

        it.each(['shift', 'ctrl'])('%ss-click adds to selection', async (mod) => {
            mockUserAgent('windows');
            const { wrapper, dispatchSpy } = doMount();

            await wrapper.findComponent(TransformControls).trigger('click', { button: 0, [`${mod}Key`]: true });

            expect(dispatchSpy).toHaveBeenCalledWith('selection/selectAnnotation', 'id1');
        });

        it('should add to selection with meta + left click', async () => {
            mockUserAgent('mac');
            const { wrapper, dispatchSpy } = doMount();

            await wrapper.findComponent(TransformControls).trigger('click', { button: 0, metaKey: true });

            expect(dispatchSpy).toHaveBeenCalledWith('selection/selectAnnotation', 'id1');
        });

        it.each(['shift', 'ctrl'])('%ss-click removes from selection', async (mod) => {
            mockUserAgent('windows');
            const { wrapper, dispatchSpy } = doMount({
                isAnnotationSelectedMock: vi.fn().mockReturnValue(() => true)
            });

            await wrapper.findComponent(TransformControls).trigger('click', { button: 0, [`${mod}Key`]: true });

            expect(dispatchSpy).toHaveBeenCalledWith('selection/deselectAnnotation', 'id1');
        });

        it('should remove from selection with meta + left click', async () => {
            mockUserAgent('mac');
            const { wrapper, dispatchSpy } = doMount({
                isAnnotationSelectedMock: vi.fn().mockReturnValue(() => true)
            });

            await wrapper.findComponent(TransformControls).trigger('click', { button: 0, metaKey: true });
            expect(dispatchSpy).toHaveBeenCalledWith('selection/deselectAnnotation', 'id1');
        });
    });

    describe('context menu', () => {
        it('click to select clicked annotation and deselect other items', async () => {
            const { wrapper, dispatchSpy } = doMount();
            await wrapper.findComponent(TransformControls).trigger('pointerdown', { button: 2 });

            expect(dispatchSpy).toHaveBeenCalledWith('selection/deselectAllObjects', undefined);
            expect(dispatchSpy).toHaveBeenCalledWith('selection/selectAnnotation', 'id1');
            expect(dispatchSpy).toHaveBeenCalledWith('application/toggleContextMenu', expect.anything());
        });

        it.each(['shift', 'ctrl'])('%ss-click adds to selection', async (mod) => {
            mockUserAgent('windows');
            const { wrapper, dispatchSpy } = doMount();

            await wrapper.findComponent(TransformControls).trigger('pointerdown', { button: 2, [`${mod}Key`]: true });

            expect(dispatchSpy).toHaveBeenCalledWith('selection/selectAnnotation', 'id1');
            expect(dispatchSpy).toHaveBeenCalledWith('application/toggleContextMenu', expect.anything());
        });

        it('meta click adds to selection', async () => {
            mockUserAgent('mac');
            const { wrapper, dispatchSpy } = doMount();

            await wrapper.findComponent(TransformControls).trigger('pointerdown', { button: 2, metaKey: true });

            expect(dispatchSpy).toHaveBeenCalledWith('selection/selectAnnotation', 'id1');
            expect(dispatchSpy).toHaveBeenCalledWith('application/toggleContextMenu', expect.anything());
        });
    });
});
