import type { UnionToShortcutRegistry } from "../types";
import { isUIExtensionFocused } from "@/components/uiExtensions";
import { conditionGroup } from "../util";

export type ClipboardShortcuts = UnionToShortcutRegistry<
  "copy" | "cut" | "paste"
>;

export const clipboardShortcuts: ClipboardShortcuts = {
  ...conditionGroup<ClipboardShortcuts>(
    ({ $store }) => $store.state.application.hasClipboardSupport,
    {
      copy: {
        text: "Copy",
        title: "Copy selection",
        hotkey: ["Ctrl", "C"],
        allowEventDefault: true,
        execute: ({ $store }) =>
          $store.dispatch("workflow/copyOrCutWorkflowParts", {
            command: "copy",
          }),

        condition: ({ $store }) => {
          if (isUIExtensionFocused()) {
            return false;
          }

          const selectedNodes = Object.keys(
            $store.getters["selection/selectedNodes"],
          );
          const selectedAnnotations =
            $store.getters["selection/selectedAnnotations"];

          const kanvas = $store.state.canvas.getScrollContainerElement();
          const kanvasIsActiveElement = document.activeElement === kanvas;
          const textSelectionIsEmpty =
            window?.getSelection()?.toString() === "";
          const isSomethingSelected =
            selectedNodes.length !== 0 || selectedAnnotations.length !== 0;

          return (
            isSomethingSelected &&
            (textSelectionIsEmpty || kanvasIsActiveElement)
          );
        },
      },
      cut: {
        text: "Cut",
        title: "Cut selection",
        hotkey: ["Ctrl", "X"],
        execute: ({ $store }) =>
          $store.dispatch("workflow/copyOrCutWorkflowParts", {
            command: "cut",
          }),
        condition: ({ $store }) => {
          const selectedNodes = Object.keys(
            $store.getters["selection/selectedNodes"],
          );

          const selectedAnnotations =
            $store.getters["selection/selectedAnnotations"];
          const isSomethingSelected =
            selectedNodes.length !== 0 || selectedAnnotations.length !== 0;

          return isSomethingSelected && $store.getters["workflow/isWritable"];
        },
      },
      paste: {
        text: "Paste",
        title: "Paste from clipboard",
        hotkey: ["Ctrl", "V"],
        execute: ({ $store, payload }) =>
          $store.dispatch("workflow/pasteWorkflowParts", {
            position: payload?.metadata?.position,
          }),
        condition: ({ $store }) => $store.getters["workflow/isWritable"],
      },
    },
  ),
};
