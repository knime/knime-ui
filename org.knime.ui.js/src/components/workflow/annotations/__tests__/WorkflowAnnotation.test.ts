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
import LegacyAnnotationText from '../LegacyAnnotationText.vue';
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
            styleRanges: [{ start: 0, length: 2, fontSize: 14 }]
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
                plugins: [$store]
            }
        });

        return { wrapper, $store, dispatchSpy };
    };

    it('should apply styles to legacy annotation', async () => {
        const bounds = {
            height: '0',
            width: '100',
            x: '5',
            y: '5'
        };
        const { wrapper } = doMount({
            props: {
                annotation: { ...defaultProps.annotation, bounds }
            }
        });

        await new Promise(r => setTimeout(r, 0));
        expect(wrapper.find('foreignObject').attributes()).toEqual(expect.objectContaining(bounds));

        const legacyAnnotationStyles = wrapper.findComponent(LegacyAnnotationText).attributes('style');
        expect(legacyAnnotationStyles).toMatch('font-size: 12px;');
        expect(legacyAnnotationStyles).toMatch('border: 4px solid #000;');
        expect(legacyAnnotationStyles).toMatch('background: rgb(0, 0, 0);');
        expect(legacyAnnotationStyles).toMatch('width: 100%;');
        expect(legacyAnnotationStyles).toMatch('height: 100%;');
        expect(legacyAnnotationStyles).toMatch('text-align: right;');
        expect(legacyAnnotationStyles).toMatch('padding: 3px;');
    });

    it('should pass props to LegacyAnnotationText', () => {
        const { wrapper } = doMount();

        expect(wrapper.findComponent(LegacyAnnotationText).props('text')).toBe('hallo');

        expect(wrapper.findComponent(LegacyAnnotationText).props('styleRanges')).toEqual(
            [{ start: 0, length: 2, fontSize: 14 }]
        );
    });

    it('should honor annotationsFontSizePointToPixelFactor', () => {
        const shapes = { ...$shapes, annotationsFontSizePointToPixelFactor: 2 };
        const { wrapper } = doMount({
            props: {
                annotation: { ...defaultProps.annotation, defaultFontSize: 18 }
            },
            mocks: { $shapes: shapes }
        });

        expect(wrapper.findComponent(LegacyAnnotationText).attributes('style')).toMatch(
            'font-size: 36px;'
        );
    });

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

    describe('left click', () => {
        it('click to select', async () => {
            const { wrapper, dispatchSpy } = doMount();
            await wrapper.findComponent(TransformControls).trigger('click', { button: 0 });

            expect(dispatchSpy).toHaveBeenCalledWith('selection/deselectAllObjects', undefined);
            expect(dispatchSpy).toHaveBeenCalledWith('selection/selectAnnotation', 'id1');
        });

        it.each(['shift', 'ctrl'])('%ss-click adds to selection', async (mod) => {
            mockUserAgent('windows');
            const { wrapper, dispatchSpy } = doMount();

            await wrapper.findComponent(TransformControls).trigger('click', { button: 0, [`${mod}Key`]: true });

            expect(dispatchSpy).toHaveBeenCalledWith('selection/selectAnnotation', 'id1');
        });

        it('meta click adds to selection', async () => {
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

        it('meta click removes to selection', async () => {
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
