import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import {
  TypedText,
  type ReorderWorkflowAnnotationsCommand,
  type WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";

import * as colors from "@/style/colors.mjs";

import type { RootStoreState } from "../types";
import type { WorkflowState } from ".";
import { getProjectAndWorkflowIds } from "./util";

interface State {
  editableAnnotationId: string | null;
}

declare module "./index" {
  interface WorkflowState extends State {}
}

export const state = (): State => ({
  editableAnnotationId: null,
});

export const mutations: MutationTree<WorkflowState> = {
  setAnnotation(state, { annotationId, text, borderColor }) {
    const { workflowAnnotations } = state.activeWorkflow!;

    const mapped = workflowAnnotations.map<WorkflowAnnotation>((annotation) =>
      annotation.id === annotationId
        ? { ...annotation, text, borderColor }
        : annotation,
    );

    state.activeWorkflow!.workflowAnnotations = mapped;
  },

  setEditableAnnotationId(state, annotationId) {
    state.editableAnnotationId = annotationId;
  },
};

export const actions: ActionTree<WorkflowState, RootStoreState> = {
  async addWorkflowAnnotation({ state, dispatch }, { bounds }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);

    const { newAnnotationId } = await API.workflowCommand.AddWorkflowAnnotation(
      {
        projectId,
        workflowId,
        bounds,
        borderColor: colors.defaultAnnotationBorderColor,
      },
    );

    await dispatch("selection/deselectAllObjects", null, { root: true });
    await dispatch("selection/selectAnnotations", [newAnnotationId], {
      root: true,
    });
    await dispatch("setEditableAnnotationId", newAnnotationId);
  },

  setEditableAnnotationId({ commit }, annotationId) {
    commit("setEditableAnnotationId", annotationId);
  },

  transformWorkflowAnnotation({ state }, { bounds, annotationId }) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);

    // optimistic update
    const annotation = state.activeWorkflow!.workflowAnnotations.find(
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

  reorderWorkflowAnnotation(
    { state, rootGetters },
    { action }: { action: ReorderWorkflowAnnotationsCommand.ActionEnum },
  ) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    const annotationIds = rootGetters["selection/selectedAnnotationIds"];

    return API.workflowCommand.ReorderWorkflowAnnotations({
      projectId,
      workflowId,
      action,
      annotationIds,
    });
  },

  async updateAnnotation(
    { state, commit },
    { annotationId, text, borderColor },
  ) {
    const { projectId, workflowId } = getProjectAndWorkflowIds(state);

    const { text: originalText, borderColor: originalBorderColor } =
      state.activeWorkflow!.workflowAnnotations.find(
        (annotation) => annotation.id === annotationId,
      )!;

    try {
      // do small optimistic update to prevent annotation from flashing between legacy and new
      commit("setAnnotation", {
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
      commit("setAnnotation", {
        annotationId,
        text: originalText,
        borderColor: originalBorderColor,
      });

      throw error;
    }
  },
};

export const getters: GetterTree<WorkflowState, RootStoreState> = {};
