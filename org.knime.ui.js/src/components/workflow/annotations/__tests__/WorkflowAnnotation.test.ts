import { expect, describe, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import { mockVuexStore } from '@/test/utils';
import * as $shapes from '@/style/shapes.mjs';
import { API } from '@api';
import { type WorkflowAnnotation, Annotation } from '@/api/gateway-api/generated-api';

import WorkflowAnnotationComp from '../WorkflowAnnotation.vue';
import LegacyAnnotationText from '../LegacyAnnotationText.vue';
import TransformControls from '../TransformControls.vue';

describe('Workflow Annotation', () => {
    const defaultProps: {
        annotation: WorkflowAnnotation
    } = {
        annotation: {
            id: '',
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
        isAnnotationSelectedMock = vi.fn().mockReturnValue(() => false)
    } = {}) => {
        const defaultMocks = { $shapes };

        const $store = mockVuexStore({
            workflow: {
                state: {
                    activeWorkflow: {
                        projectId: 'project1',
                        info: { containerId: 'root' }
                    }
                }
            },
            selection: {
                getters: {
                    isAnnotationSelected: isAnnotationSelectedMock
                }
            }
        });

        const wrapper = mount(WorkflowAnnotationComp, {
            props: { ...defaultProps, ...props },
            global: {
                mocks: { ...defaultMocks, ...mocks },
                plugins: [$store]
            }
        });

        return { wrapper, $store };
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
            id: defaultProps.annotation.id
        });
    });
});
