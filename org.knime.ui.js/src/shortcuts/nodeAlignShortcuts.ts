import { AlignNodesCommand } from "@/api/gateway-api/generated-api";
import type {
  ShortcutExecuteContext,
  UnionToShortcutRegistry,
} from "@/shortcuts";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";

type NodeAlignShortcuts = UnionToShortcutRegistry<
  | "alignTop"
  | "alignBottom"
  | "alignLeft"
  | "alignRight"
  | "alignCenter"
  | "alignMiddle"
>;

declare module "./index" {
  interface ShortcutsRegistry extends NodeAlignShortcuts {}
}

const align =
  (direction: AlignNodesCommand.DirectionEnum) =>
  (ctx: ShortcutExecuteContext) => {
    const referenceNodeId = ctx.payload?.metadata?.contextMenuAnchor?.id;
    return useWorkflowStore().alignSelectedNodes(direction, referenceNodeId);
  };

const condition = () =>
  useSelectionStore().getSelectedNodes.length > 1 &&
  useWorkflowStore().isWritable;

const nodeAlignShortcuts: NodeAlignShortcuts = {
  alignTop: {
    title: "Align selected nodes to top",
    text: "Align top",
    group: "general",
    execute: align(AlignNodesCommand.DirectionEnum.Top),
    condition,
  },
  alignBottom: {
    title: "Align selected nodes",
    text: "Align bottom",
    group: "general",
    execute: align(AlignNodesCommand.DirectionEnum.Bottom),
    condition,
  },
  alignLeft: {
    title: "Align selected nodes",
    text: "Align left",
    group: "general",
    execute: align(AlignNodesCommand.DirectionEnum.Left),
    condition,
  },
  alignRight: {
    title: "Align selected nodes",
    text: "Align right",
    group: "general",
    execute: align(AlignNodesCommand.DirectionEnum.Right),
    condition,
  },
  alignCenter: {
    title: "Align selected nodes",
    text: "Align center",
    group: "general",
    execute: align(AlignNodesCommand.DirectionEnum.HorizontalCenter),
    condition,
  },
  alignMiddle: {
    title: "Align selected nodes",
    text: "Align middle",
    group: "general",
    execute: align(AlignNodesCommand.DirectionEnum.VerticalCenter),
    condition,
  },
};

export default nodeAlignShortcuts;
