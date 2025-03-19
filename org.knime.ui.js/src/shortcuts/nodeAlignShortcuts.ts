import { AlignNodesCommand } from "@/api/gateway-api/generated-api";
import type { UnionToShortcutRegistry } from "@/shortcuts";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";

type NodeAlignShortcuts = UnionToShortcutRegistry<
  "alignHorizontally" | "alignVertically"
>;

declare module "./index" {
  interface ShortcutsRegistry extends NodeAlignShortcuts {}
}

const nodeAlignShortcuts: NodeAlignShortcuts = {
  alignHorizontally: {
    title: "Align selected nodes horizontally",
    text: "Align horizontally",
    group: "general",
    execute: () => {
      useWorkflowStore().alignSelectedNodes(
        AlignNodesCommand.DirectionEnum.Horizontal,
      );
    },
    condition: () =>
      useSelectionStore().getSelectedNodes.length > 1 &&
      useWorkflowStore().isWritable,
  },
  alignVertically: {
    title: "Align selected nodes vertically",
    text: "Align vertically",
    group: "general",
    execute: () => {
      useWorkflowStore().alignSelectedNodes(
        AlignNodesCommand.DirectionEnum.Vertical,
      );
    },
    condition: () =>
      useSelectionStore().getSelectedNodes.length > 1 &&
      useWorkflowStore().isWritable,
  },
};

export default nodeAlignShortcuts;
