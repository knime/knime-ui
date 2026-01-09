/* eslint-disable no-undefined */
import { API } from "@api";
import { defineStore } from "pinia";

import {
  type Bounds,
  type ReorderWorkflowAnnotationsCommand,
  TypedText,
  type WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import { geometry } from "@/lib/geometry";
import { useSelectionStore } from "@/store/selection";
import * as colors from "@/style/colors";
import * as $shapes from "@/style/shapes";

import { useWorkflowStore } from "./workflow";

export interface AnnotationInteractionsState {
  editableAnnotationId: string | null;
  activeTransform:
    | {
        annotationId: string;
        bounds: Bounds;
      }
    | undefined;
}

export const useAnnotationInteractionsStore = defineStore(
  "annotationInteractions",
  {
    state: (): AnnotationInteractionsState => ({
      editableAnnotationId: null,
      activeTransform: undefined,
    }),
    actions: {
      setAnnotation({
        annotationId,
        text,
        borderColor,
      }: {
        annotationId: string;
        text: TypedText;
        borderColor: string;
      }) {
        const { workflowAnnotations } = useWorkflowStore().activeWorkflow!;

        const mapped = workflowAnnotations.map<WorkflowAnnotation>(
          (annotation) =>
            annotation.id === annotationId
              ? { ...annotation, text, borderColor }
              : annotation,
        );

        useWorkflowStore().activeWorkflow!.workflowAnnotations = mapped;
      },

      setEditableAnnotationId(annotationId: string | null) {
        this.editableAnnotationId = annotationId;
      },

      async addWorkflowAnnotation({ bounds }: { bounds: Bounds }) {
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;

        const { newAnnotationId } =
          await API.workflowCommand.AddWorkflowAnnotation({
            projectId,
            workflowId,
            bounds,
            borderColor: colors.defaultAnnotationBorderColor,
          });

        const { wasAborted } = await useSelectionStore().tryClearSelection();
        if (wasAborted) {
          return;
        }
        useSelectionStore().selectAnnotations([newAnnotationId]);
        this.setEditableAnnotationId(newAnnotationId);
      },

      async addWorkflowAnnotationWithContent({
        bounds,
        content,
        setSelected = false,
        setEditable = false,
      }: {
        bounds: Bounds;
        content: string;
        setSelected?: boolean;
        setEditable?: boolean;
      }) {
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;

        const borderColor = colors.defaultAnnotationBorderColor;

        const { newAnnotationId } =
          await API.workflowCommand.AddWorkflowAnnotation({
            projectId,
            workflowId,
            bounds,
            borderColor,
          });

        await this.updateAnnotation({
          annotationId: newAnnotationId,
          text: content,
          borderColor,
        });

        const { wasAborted } = await useSelectionStore().tryClearSelection();
        if (wasAborted) {
          return;
        }

        if (setSelected) {
          useSelectionStore().selectAnnotations([newAnnotationId]);
        }

        if (setEditable) {
          this.setEditableAnnotationId(newAnnotationId);
        }
      },

      previewWorkflowAnnotationTransform({
        bounds,
        annotationId,
      }: {
        bounds: Bounds;
        annotationId: string;
      }) {
        // optimistic update
        const annotation =
          useWorkflowStore().activeWorkflow!.workflowAnnotations.find(
            (annotationCandidate) => annotationCandidate.id === annotationId,
          )!;
        if (annotation) {
          annotation.bounds = bounds;
        }
      },

      transformWorkflowAnnotation({
        bounds,
        annotationId,
      }: {
        bounds: Bounds;
        annotationId: string;
      }) {
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;

        return API.workflowCommand.TransformWorkflowAnnotation({
          projectId,
          workflowId,
          annotationId,
          bounds,
        });
      },

      reorderWorkflowAnnotation({
        action,
      }: {
        action: ReorderWorkflowAnnotationsCommand.ActionEnum;
      }) {
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;
        const annotationIds = useSelectionStore().selectedAnnotationIds;

        return API.workflowCommand.ReorderWorkflowAnnotations({
          projectId,
          workflowId,
          action,
          annotationIds,
        });
      },

      async updateAnnotation({
        annotationId,
        text,
        borderColor,
      }: {
        annotationId: string;
        text: string;
        borderColor: string;
      }) {
        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;

        const { text: originalText, borderColor: originalBorderColor } =
          useWorkflowStore().activeWorkflow!.workflowAnnotations.find(
            (annotation) => annotation.id === annotationId,
          )!;

        try {
          // do small optimistic update to prevent annotation from flashing between legacy and new
          this.setAnnotation({
            annotationId,
            text: { value: text, contentType: TypedText.ContentTypeEnum.Html },
            borderColor,
          });

          return await API.workflowCommand.UpdateWorkflowAnnotation({
            projectId,
            workflowId,
            annotationId,
            text,
            borderColor,
          });
        } catch (error) {
          this.setAnnotation({
            annotationId,
            text: originalText,
            borderColor: originalBorderColor,
          });

          throw error;
        }
      },
    },
    getters: {
      getAnnotationById: () => (annotationId: string) => {
        const workflowStore = useWorkflowStore();
        if (!workflowStore.activeWorkflow) {
          return undefined;
        }

        return workflowStore.activeWorkflow.workflowAnnotations.find(
          ({ id }) => id === annotationId,
        );
      },

      getAnnotationBoundsForSelectedNodes: (): Bounds => {
        const nodeSize = $shapes.nodeSize;

        // padding around the selection for visual spacing
        const xOffset = 2 * nodeSize;
        const yOffset = 6 * nodeSize;
        const widthPadding = 3 * nodeSize;
        const heightPadding = 4 * nodeSize;

        const selectedNodes = useSelectionStore().getSelectedNodes;
        if (selectedNodes.length === 0) {
          return {
            x: 0,
            y: 0,
            width: 80,
            height: 80,
          };
        }

        const { minX, minY, maxX, maxY } = selectedNodes.reduce(
          // reducer (determine min and max coordinates over all selected nodes)
          // Note: node positions represent the top-left corner, so we add nodeSize
          // to get the right and bottom edges
          (bounds, { position }) => ({
            minX: Math.min(bounds.minX, position.x),
            minY: Math.min(bounds.minY, position.y),
            maxX: Math.max(bounds.maxX, position.x),
            maxY: Math.max(bounds.maxY, position.y),
          }),
          // accumulator (starts with Infinities to be replaced with the first node's values)
          {
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity,
          },
        );

        // translate annotation origin
        const annotationX = minX - xOffset;
        const annotationY = minY - yOffset;

        const annotationWidth = maxX - annotationX + widthPadding;
        const annotationHeight = maxY - annotationY + heightPadding;

        return {
          x: annotationX,
          y: annotationY,
          width: annotationWidth,
          height: annotationHeight,
        };
      },

      getContainedNodesForAnnotation:
        () =>
        (annotationId: string): string[] => {
          const { activeWorkflow } = useWorkflowStore();
          if (!activeWorkflow) {
            return [];
          }

          const annotation = activeWorkflow.workflowAnnotations.find(
            ({ id }) => id === annotationId,
          );
          if (!annotation) {
            return [];
          }

          const nodes = Object.values(activeWorkflow.nodes);
          return nodes
            .filter((node) => {
              return geometry.isPointInsideBounds(
                node.position,
                annotation.bounds,
              );
            })
            .map((node) => node.id);
        },
    },
  },
);
