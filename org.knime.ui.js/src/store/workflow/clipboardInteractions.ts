import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import { createAbortablePromise } from "@/api/utils";
import { pastePartsAt, pasteURI } from "@/util/pasteToWorkflow";
import { geometry } from "@/util/geometry";

import type { RootStoreState } from "../types";
import type { WorkflowState } from ".";
import { getProjectAndWorkflowIds } from "./util";

import { uniqueId } from "lodash-es";
import { getToastsProvider } from "@/plugins/toasts";
import CopyIcon from "webapps-common/ui/assets/img/icons/copy.svg";
import { shallowRef } from "vue";
const $toast = getToastsProvider();

const showFallbackToast = (clipboardContent: string) => {
  const fallbackToast = $toast.show({
    id: "COPY_FALLBACK",
    headline: "Data copied to clipboard",
    message:
      "If you want to paste the data into a different Analytics Platform you need to copy the data in JSON format.",
    buttons: [
      {
        // @ts-expect-error
        icon: shallowRef(CopyIcon),
        text: " Copy data in JSON format",
        callback: () => {
          navigator.clipboard.writeText(clipboardContent).then(() => {
            $toast.remove(fallbackToast);
          });
        },
      },
    ],
    autoRemove: true,
  });
  return fallbackToast;
};

const writeToClipboardWithFallback = async (clipboardContent: string) => {
  try {
    await navigator.clipboard.writeText(clipboardContent);
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "name" in error &&
      error.name === "NotAllowedError"
    ) {
      // fallback for not allowed as we have a missing user-initiated call (returning from network call)
      showFallbackToast(clipboardContent);
    }
    consola.info("Failed to write to clipboard", error);
  }
};

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
  cacheClipboardContent: Record<string, string>;
  isClipboardBusy: boolean;
}

let copyCutAbortController: AbortController = new AbortController();

let pasteOperation: (() => Promise<unknown>) | null = null;
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
  cacheClipboardContent: {},
  isClipboardBusy: false,
});

export const mutations: MutationTree<WorkflowState> = {
  setCopyPaste(state, copyPasteState) {
    state.copyPaste = copyPasteState;
  },

  setClipboardContentCache(
    state,
    { cacheClipboardContentId, clipboardContent },
  ) {
    state.cacheClipboardContent = {
      [cacheClipboardContentId]: clipboardContent,
    };
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

      // add this placeholder for webkit (safari) browsers to be able to fetch the data from the store later
      const cacheClipboardContentId = `clipboard_cache_${uniqueId()}`;
      await navigator.clipboard.writeText(
        JSON.stringify({ cacheClipboardContentId }),
      );

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

      commit("setCopyPaste", {
        payloadIdentifier: clipboardContent.payloadIdentifier,
      });

      const clipboardContentSerialized = JSON.stringify(clipboardContent);

      // remember the data for non chromium browsers
      commit("setClipboardContentCache", {
        cacheClipboardContentId,
        clipboardContent: clipboardContentSerialized,
      });

      await writeToClipboardWithFallback(clipboardContentSerialized);

      commit("setIsClipboardBusy", false);
      processPasteOperation();

      consola.info("Copied workflow parts", clipboardContent);
    } catch (error) {
      // we aborted the call so just return and do nothing
      if (
        typeof error === "object" &&
        error &&
        "name" in error &&
        error.name === "AbortError"
      ) {
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
      // replace the content with our cache if we have a hit (store cached data is used for non chrome browsers)
      if (
        clipboardContent.cacheClipboardContentId &&
        state.cacheClipboardContent[clipboardContent.cacheClipboardContentId]
      ) {
        clipboardContent = JSON.parse(
          state.cacheClipboardContent[clipboardContent.cacheClipboardContentId],
        );
      }
    } catch (e) {
      // try to paste the clipboard content as a URI
      if (
        !pasteURI(
          clipboardText,
          activeWorkflow!,
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
