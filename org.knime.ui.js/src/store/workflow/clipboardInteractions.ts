import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import { createAbortablePromise } from "@/api/utils";
import { pastePartsAt, pasteURI } from "@/util/pasteToWorkflow";
import { geometry } from "@/util/geometry";

import type { RootStoreState } from "../types";
import type { WorkflowState } from ".";
import { getProjectAndWorkflowIds } from "./util";

interface State {
  copyPaste: {
    payloadIdentifier?: unknown;
    lastPasteBounds?: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  } | null;
  isClipboardBusy: boolean;
}

let copyCutAbortController: AbortController = new AbortController();

let pasteOperation: () => Promise<unknown> | null = null;
const enqueuePasteOperation = (handler: () => Promise<unknown>) => {
  pasteOperation = handler;
};
const processPasteOperation = () => {
  pasteOperation?.();
  pasteOperation = null;
};

declare module "./index" {
  interface WorkflowState extends State {}
}

export const state = (): State => ({
  copyPaste: null,
  isClipboardBusy: false,
});

export const mutations: MutationTree<WorkflowState> = {
  setCopyPaste(state, copyPasteState) {
    state.copyPaste = copyPasteState;
  },

  setLastPasteBounds(state, bounds) {
    if (!state.copyPaste) {
      state.copyPaste = {};
    }
    state.copyPaste.lastPasteBounds = bounds;
  },

  setIsClipboardBusy(state, value) {
    state.isClipboardBusy = value;
  },
};

export const actions: ActionTree<WorkflowState, RootStoreState> = {
  async copyOrCutWorkflowParts(
    { state, rootGetters, dispatch, commit },
    { command },
  ) {
    if (!["copy", "cut"].includes(command)) {
      throw new Error("command has to be 'copy' or 'cut'");
    }

    const { projectId, workflowId } = getProjectAndWorkflowIds(state);
    const selectedNodes = rootGetters["selection/selectedNodeIds"];
    const selectedAnnotations = rootGetters["selection/selectedAnnotationIds"];
    const connectionBendpoints = rootGetters["selection/selectedBendpoints"];

    if (rootGetters["selection/isSelectionEmpty"]) {
      return;
    }

    const objectBounds = geometry.getWorkflowObjectBounds({
      nodes: rootGetters["selection/selectedNodes"],
      workflowAnnotations: rootGetters["selection/selectedAnnotations"],
    });

    if (command === "cut") {
      await dispatch("selection/deselectAllObjects", null, { root: true });
    }

    const workflowCommand =
      command === "copy" ? API.workflowCommand.Copy : API.workflowCommand.Cut;

    const { abortController, runAbortablePromise } = createAbortablePromise();

    copyCutAbortController.abort();
    copyCutAbortController = abortController;

    try {
      commit("setIsClipboardBusy", true);

      const response = await runAbortablePromise(() =>
        workflowCommand({
          projectId,
          workflowId,
          nodeIds: selectedNodes,
          annotationIds: selectedAnnotations,
          connectionBendpoints,
        }),
      );

      const payload = JSON.parse(response.content);

      const clipboardContent = {
        payloadIdentifier: payload.payloadIdentifier,
        projectId,
        workflowId,
        data: response.content,
        objectBounds,
      };

      await navigator.clipboard.writeText(JSON.stringify(clipboardContent));

      commit("setCopyPaste", {
        payloadIdentifier: clipboardContent.payloadIdentifier,
      });
      commit("setIsClipboardBusy", false);
      processPasteOperation();

      consola.info("Copied workflow parts", clipboardContent);
    } catch (error) {
      // we aborted the call so just return and do nothing
      if (error?.name === "AbortError") {
        consola.info("Aborting first copy/cut request");
        return;
      }

      consola.error("Could not write to clipboard.");
    }
  },

  async pasteWorkflowParts(
    { state, getters: { isWorkflowEmpty }, dispatch, rootGetters, commit },
    { position: customPosition } = { position: null },
  ) {
    if (state.isClipboardBusy) {
      enqueuePasteOperation(() =>
        dispatch("pasteWorkflowParts", { position: customPosition }),
      );
      return;
    }

    const { activeWorkflow } = state;
    let clipboardContent, clipboardText;
    try {
      // TODO: NXT-1168 Put a limit on the clipboard content size
      clipboardText = await navigator.clipboard.readText();
    } catch (e) {
      consola.info(
        "Could not read from clipboard. Maybe the user did not permit it?",
      );
      return;
    }

    try {
      clipboardContent = JSON.parse(clipboardText);
    } catch (e) {
      // try to paste the clipboard content as a URI
      if (
        !pasteURI(
          clipboardText,
          activeWorkflow,
          customPosition,
          rootGetters["canvas/getVisibleFrame"](),
        )
      ) {
        consola.info("Could not parse json or URI from clipboard.");
      }
      return;
    }

    consola.info("Pasted workflow parts");

    // 1. Decide where to paste
    const { position, doAfterPaste } = customPosition
      ? { position: customPosition, doAfterPaste: null }
      : pastePartsAt({
          visibleFrame: rootGetters["canvas/getVisibleFrame"](),
          clipboardContent,
          isWorkflowEmpty,
          dispatch,
        });

    // 2. Remember decision
    commit("setLastPasteBounds", {
      left: position.x,
      top: position.y,
      width: clipboardContent.objectBounds.width,
      height: clipboardContent.objectBounds.height,
    });

    const { projectId, workflowId } = getProjectAndWorkflowIds(state);

    // 3. Do actual pasting
    const { nodeIds, annotationIds } = await API.workflowCommand.Paste({
      projectId,
      workflowId,
      content: clipboardContent.data,
      position,
    });

    // 4. Execute hook and select pasted content
    doAfterPaste?.();
    await dispatch("selection/deselectAllObjects", null, { root: true });
    await dispatch("selection/selectNodes", nodeIds, { root: true });
    await dispatch("selection/selectAnnotations", annotationIds, {
      root: true,
    });
  },
};

export const getters: GetterTree<WorkflowState, RootStoreState> = {};
