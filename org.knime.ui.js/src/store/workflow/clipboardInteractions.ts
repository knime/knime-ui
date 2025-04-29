import { shallowRef } from "vue";
import { API } from "@api";
import { uniqueId } from "lodash-es";
import { defineStore } from "pinia";

import CopyIcon from "@knime/styles/img/icons/copy.svg";

import type { XY } from "@/api/gateway-api/generated-api";
import { createAbortablePromise } from "@/api/utils";
import { getToastsProvider } from "@/plugins/toasts";
import { useSelectionStore } from "@/store/selection";
import { geometry } from "@/util/geometry";
import { pastePartsAt, pasteURI } from "@/util/pasteToWorkflow";
import { useCurrentCanvasStore } from "../canvas/useCurrentCanvasStore";

import { useWorkflowStore } from "./workflow";

const $toast = getToastsProvider();

const showFallbackToast = (clipboardContent: string) => {
  const fallbackToast = $toast.show({
    id: "COPY_FALLBACK",
    headline: "Data copied to clipboard",
    message:
      "If you want to paste the data into a different Analytics Platform you need to copy the data in JSON format.",
    buttons: [
      {
        // @ts-expect-error (please add error description)
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

let copyCutAbortController: AbortController = new AbortController();

let pasteOperation: (() => Promise<unknown>) | null = null;
const enqueuePasteOperation = (handler: () => Promise<unknown>) => {
  pasteOperation = handler;
};
const processPasteOperation = () => {
  pasteOperation?.();
  pasteOperation = null;
};

type PasteBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export interface ClipboardInteractionsState {
  copyPaste: {
    payloadIdentifier?: unknown;
    lastPasteBounds?: PasteBounds;
  } | null;
  cacheClipboardContent: Record<string, string>;
  isClipboardBusy: boolean;
}

export const useClipboardInteractionsStore = defineStore(
  "clipboardInteractions",
  {
    state: (): ClipboardInteractionsState => ({
      copyPaste: null,
      cacheClipboardContent: {},
      isClipboardBusy: false,
    }),
    actions: {
      setCopyPaste(copyPasteState: ClipboardInteractionsState["copyPaste"]) {
        this.copyPaste = copyPasteState;
      },

      setClipboardContentCache({
        cacheClipboardContentId,
        clipboardContent,
      }: {
        cacheClipboardContentId: string;
        clipboardContent: string;
      }) {
        this.cacheClipboardContent = {
          [cacheClipboardContentId]: clipboardContent,
        };
      },

      setLastPasteBounds(bounds: PasteBounds) {
        if (!this.copyPaste) {
          this.copyPaste = {};
        }
        this.copyPaste.lastPasteBounds = bounds;
      },

      setIsClipboardBusy(isClipboardBusy: boolean) {
        this.isClipboardBusy = isClipboardBusy;
      },

      async copyOrCutWorkflowParts({ command }: { command: "cut" | "copy" }) {
        const selectionStore = useSelectionStore();

        if (!["copy", "cut"].includes(command)) {
          throw new Error("command has to be 'copy' or 'cut'");
        }

        const { projectId, workflowId } =
          useWorkflowStore().getProjectAndWorkflowIds;
        const selectedNodes = selectionStore.selectedNodeIds;
        const selectedAnnotations = selectionStore.selectedAnnotationIds;
        const connectionBendpoints = selectionStore.getSelectedBendpoints;

        if (selectionStore.isSelectionEmpty) {
          return;
        }

        const objectBounds = geometry.getWorkflowObjectBounds({
          nodes: selectionStore.getSelectedNodes,
          workflowAnnotations: selectionStore.getSelectedAnnotations,
        });

        if (command === "cut") {
          selectionStore.deselectAllObjects();
        }

        const workflowCommand =
          command === "copy"
            ? API.workflowCommand.Copy
            : API.workflowCommand.Cut;

        const { abortController, runAbortablePromise } =
          createAbortablePromise();

        copyCutAbortController.abort();
        copyCutAbortController = abortController;

        try {
          this.setIsClipboardBusy(true);

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

          this.setCopyPaste({
            payloadIdentifier: clipboardContent.payloadIdentifier,
          });

          const clipboardContentSerialized = JSON.stringify(clipboardContent);

          // remember the data for non chromium browsers
          this.setClipboardContentCache({
            cacheClipboardContentId,
            clipboardContent: clipboardContentSerialized,
          });

          await writeToClipboardWithFallback(clipboardContentSerialized);

          this.setIsClipboardBusy(false);
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
        { position: customPosition }: { position?: XY | null } = {
          position: null,
        },
      ) {
        if (this.isClipboardBusy) {
          enqueuePasteOperation(() =>
            this.pasteWorkflowParts({ position: customPosition }),
          );
          return;
        }

        const canvasStore = useCurrentCanvasStore();
        const workflowStore = useWorkflowStore();
        const selectionStore = useSelectionStore();

        let clipboardContent, clipboardText;
        try {
          // TODO: NXT-1168 Put a limit on the clipboard content size
          clipboardText = await navigator.clipboard.readText();
        } catch (_e) {
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
            this.cacheClipboardContent[clipboardContent.cacheClipboardContentId]
          ) {
            clipboardContent = JSON.parse(
              this.cacheClipboardContent[
                clipboardContent.cacheClipboardContentId
              ],
            );
          }
        } catch (_e) {
          // try to paste the clipboard content as a URI
          pasteURI(
            clipboardText,
            workflowStore.activeWorkflow!,
            customPosition ?? { x: 0, y: 0 },
            canvasStore.value.getVisibleFrame,
          );
          return;
        }

        consola.info("Pasted workflow parts");

        // 1. Decide where to paste
        const { position, fillScreenAfterPaste } = customPosition
          ? { position: customPosition, fillScreenAfterPaste: false }
          : pastePartsAt({
              visibleFrame: canvasStore.value.getVisibleFrame,
              clipboardContent,
              isWorkflowEmpty: workflowStore.isWorkflowEmpty,
            });

        // 2. Remember decision
        this.setLastPasteBounds({
          left: position.x,
          top: position.y,
          width: clipboardContent.objectBounds.width,
          height: clipboardContent.objectBounds.height,
        });

        const { projectId, workflowId } =
          workflowStore.getProjectAndWorkflowIds;

        // 3. Do actual pasting
        const { nodeIds, annotationIds } = await API.workflowCommand.Paste({
          projectId,
          workflowId,
          content: clipboardContent.data,
          position,
        });

        // 4. Execute hook and select pasted content
        if (fillScreenAfterPaste) {
          canvasStore.value.fillScreen();
        }

        selectionStore.deselectAllObjects();
        selectionStore.selectNodes(nodeIds!);
        selectionStore.selectAnnotations(annotationIds!);
      },
    },
  },
);
