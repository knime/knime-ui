/* eslint-disable no-undefined */
import { API } from "@api";
import { defineStore } from "pinia";

import {
  type Bounds,
  type ReorderWorkflowAnnotationsCommand,
  TypedText,
  type WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
import * as colors from "@/style/colors";

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

        const { wasAborted } = await useSelectionStore().deselectAllObjects();
        if (wasAborted) {
          return;
        }
        useSelectionStore().selectAnnotations([newAnnotationId]);
        this.setEditableAnnotationId(newAnnotationId);
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

        // optimistic update
        const annotation =
          useWorkflowStore().activeWorkflow!.workflowAnnotations.find(
            (annotationCandidate) => annotationCandidate.id === annotationId,
          )!;
        if (annotation) {
          annotation.bounds = bounds;
        }

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
  },
);
