import CreateComponent from "@knime/styles/img/icons/component.svg";
import LayoutIcon from "@knime/styles/img/icons/layout-editor.svg";
import CreateMetanode from "@knime/styles/img/icons/metanode-add.svg";

import type { KnimeNode } from "@/api/custom-types";
import {
  CollapseCommand,
  type ComponentNode,
  type MetaNode,
} from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import { useApplicationStore } from "@/store/application/application";
import { useSelectionStore } from "@/store/selection";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useComponentInteractionsStore } from "@/store/workflow/componentInteractions";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { isNodeComponent, isNodeMetaNode } from "@/util/nodeUtil";
import { isComponentProjectOrWorkflow } from "@/util/projectUtil";

import type { UnionToShortcutRegistry } from "./types";

type ComponentOrMetanodeShortcuts = UnionToShortcutRegistry<
  | "createMetanode"
  | "createComponent"
  | "openComponentOrMetanode"
  | "openParentWorkflow"
  | "expandMetanode"
  | "expandComponent"
  | "editName"
  | "linkComponent"
  | "updateComponent"
  | "unlinkComponent"
  | "changeHubItemVersion"
  | "changeComponentLinkType"
  | "openLayoutEditor"
  | "openLayoutEditorByNodeId"
  | "checkForComponentUpdates"
  | "lockSubnode"
>;

declare module "./index" {
  interface ShortcutsRegistry extends ComponentOrMetanodeShortcuts {}
}

const isComponent = (node?: KnimeNode): node is ComponentNode =>
  Boolean(node && isNodeComponent(node));

const isMetanode = (node?: KnimeNode): node is MetaNode =>
  Boolean(node && isNodeMetaNode(node));

const isLinkedComponent = (node?: KnimeNode) =>
  Boolean(isComponent(node) && node.link);

const canExpand = (kind: "metanode" | "component") => {
  const selectedNode = useSelectionStore().singleSelectedNode;

  if (!selectedNode) {
    return false;
  }

  if (!isComponent(selectedNode) && !isMetanode(selectedNode)) {
    return false;
  }

  if (
    !useWorkflowStore().isWritable ||
    selectedNode?.link ||
    selectedNode?.isLocked
  ) {
    return false;
  }

  return (
    selectedNode?.kind === kind &&
    selectedNode?.allowedActions?.canExpand !== "false"
  );
};

const canOpen = (kind: "metanode" | "component") => {
  const selectedNode = useSelectionStore().singleSelectedNode;

  if (!selectedNode) {
    return false;
  }

  if (!isComponent(selectedNode) && !isMetanode(selectedNode)) {
    return false;
  }

  if (selectedNode?.isLocked) {
    return (
      selectedNode.kind === kind &&
      useUIControlsStore().canLockAndUnlockSubnodes
    );
  }

  return selectedNode?.kind === kind;
};

const componentOrMetanodeShortcuts: ComponentOrMetanodeShortcuts = {
  createMetanode: {
    text: "Create metanode",
    title: "Create metanode",
    hotkey: ["CtrlOrCmd", "G"],
    group: "componentAndMetanode",
    icon: CreateMetanode,
    execute: () =>
      useWorkflowStore().collapseToContainer({
        containerType: CollapseCommand.ContainerTypeEnum.Metanode,
      }),
    condition: () => {
      const selectedNodes = useSelectionStore().getSelectedNodes.length;
      const canCollapseSelectedNodes =
        useSelectionStore().getSelectedNodes.every(
          (node: KnimeNode) => node.allowedActions?.canCollapse !== "false",
        );
      const isWritable = useWorkflowStore().isWritable;

      return isWritable && canCollapseSelectedNodes && Boolean(selectedNodes);
    },
  },
  createComponent: {
    text: "Create component",
    title: "Create component",
    hotkey: ["CtrlOrCmd", "J"],
    group: "componentAndMetanode",
    icon: CreateComponent,
    execute: () =>
      useWorkflowStore().collapseToContainer({
        containerType: CollapseCommand.ContainerTypeEnum.Component,
      }),
    condition: () => {
      const selectedNodes = useSelectionStore().getSelectedNodes.length;
      const canCollapseSelectedNodes =
        useSelectionStore().getSelectedNodes.every(
          (node: KnimeNode) => node.allowedActions?.canCollapse !== "false",
        );
      const isWritable = useWorkflowStore().isWritable;

      return isWritable && canCollapseSelectedNodes && Boolean(selectedNodes);
    },
  },
  openComponentOrMetanode: {
    text: () => `Open ${useSelectionStore().singleSelectedNode?.kind}`,
    hotkey: ["CtrlOrCmd", "Alt", "Enter"],
    group: "componentAndMetanode",
    description: "Open component or metanode",
    execute: async ({ $router }) => {
      const projectId = useApplicationStore().activeProjectId;
      const selectedNode = useSelectionStore().singleSelectedNode;

      if (!selectedNode) {
        return;
      }

      if (!isComponent(selectedNode) && !isMetanode(selectedNode)) {
        return;
      }

      const { isLocked, id } = selectedNode;

      if (isLocked) {
        const isUnlocked = await useComponentInteractionsStore().unlockSubnode({
          nodeId: id,
        });

        if (!isUnlocked) {
          return;
        }
      }

      $router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId, workflowId: id },
      });
    },
    condition: () => {
      return canOpen("component") || canOpen("metanode");
    },
  },
  openParentWorkflow: {
    hotkey: ["CtrlOrCmd", "Alt", "Shift", "Enter"],
    text: "Open parent workflow",
    group: "componentAndMetanode",
    execute: ({ $router }) => {
      const projectId = useApplicationStore().activeProjectId;
      const activeWorkflowParents =
        useWorkflowStore().activeWorkflow?.parents ?? [];

      const id = activeWorkflowParents.at(-1)?.containerId;

      $router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId, workflowId: id },
        force: true,
        replace: true,
      });
    },
    condition: () => {
      const activeWorkflowParents = useWorkflowStore().activeWorkflow?.parents;

      return (activeWorkflowParents ?? []).length > 0;
    },
  },
  expandMetanode: {
    text: "Expand metanode",
    title: "Expand metanode",
    hotkey: ["CtrlOrCmd", "Shift", "G"],
    group: "componentAndMetanode",
    execute: () => useWorkflowStore().expandContainerNode(),
    condition: () => canExpand("metanode"),
  },
  expandComponent: {
    text: "Expand component",
    title: "Expand component",
    hotkey: ["CtrlOrCmd", "Shift", "J"],
    group: "componentAndMetanode",
    execute: () => useWorkflowStore().expandContainerNode(),
    condition: () => canExpand("component"),
  },
  editName: {
    text: () => `Rename ${useSelectionStore().singleSelectedNode?.kind}`,
    hotkey: ["Shift", "F2"],
    group: "componentAndMetanode",
    description: "Rename component or metanode",
    execute: () =>
      useNodeInteractionsStore().openNameEditor(
        useSelectionStore().singleSelectedNode!.id,
      ),
    condition: () => {
      const selectedNode = useSelectionStore().singleSelectedNode;
      const isWritable = useWorkflowStore().isWritable;

      if (!selectedNode) {
        return false;
      }

      return (
        isWritable &&
        (isComponent(selectedNode) || isMetanode(selectedNode)) &&
        !isLinkedComponent(selectedNode)
      );
    },
  },
  linkComponent: {
    text: "Share",
    title: "Share component",
    execute: ({ payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId || useSelectionStore().singleSelectedNode?.id;

      useComponentInteractionsStore().linkComponent({ nodeId: selectedNodeId });
    },
    condition: () => {
      const selectedNode = useSelectionStore().singleSelectedNode;

      if (!selectedNode) {
        return false;
      }

      return (
        useWorkflowStore().isWritable &&
        isComponent(selectedNode) &&
        !isLinkedComponent(selectedNode) &&
        useUIControlsStore().canDoComponentSharingOperations
      );
    },
  },
  updateComponent: {
    text: "Update component",
    title: "Update component",
    execute: ({ payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId || useSelectionStore().singleSelectedNode?.id;

      useComponentInteractionsStore().updateComponents({
        nodeIds: [selectedNodeId],
      });
    },
    condition: () => {
      const selectedNode = useSelectionStore().singleSelectedNode;

      if (!selectedNode) {
        return false;
      }

      return (
        useWorkflowStore().isWritable &&
        isLinkedComponent(selectedNode) &&
        useUIControlsStore().canDoComponentSharingOperations
      );
    },
  },
  unlinkComponent: {
    text: "Disconnect link",
    title: "Unlink component",
    execute: ({ payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId || useSelectionStore().singleSelectedNode?.id;

      useComponentInteractionsStore().unlinkComponent({
        nodeId: selectedNodeId,
      });
    },
    condition: () => {
      const selectedNode = useSelectionStore().singleSelectedNode;

      if (!selectedNode) {
        return false;
      }

      return (
        useWorkflowStore().isWritable &&
        isLinkedComponent(selectedNode) &&
        useUIControlsStore().canDoComponentSharingOperations
      );
    },
  },
  changeHubItemVersion: {
    text: "Change KNIME Hub item version",
    title: "Change KNIME Hub item version",
    execute: ({ payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId || useSelectionStore().singleSelectedNode?.id;

      useComponentInteractionsStore().changeHubItemVersion({
        nodeId: selectedNodeId,
      });
    },
    condition: () => {
      const isWritable = useWorkflowStore().isWritable;
      const selectedNode = useSelectionStore().singleSelectedNode;

      if (!selectedNode) {
        return false;
      }

      const isHubItemVersionChangeable =
        isComponent(selectedNode) &&
        isLinkedComponent(selectedNode) &&
        selectedNode.link?.isHubItemVersionChangeable;

      return (
        isWritable &&
        useUIControlsStore().canDoComponentSharingOperations &&
        isHubItemVersionChangeable
      );
    },
  },
  changeComponentLinkType: {
    text: "Change link type",
    title: "Change component link type",
    execute: ({ payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId || useSelectionStore().singleSelectedNode?.id;

      useComponentInteractionsStore().changeComponentLinkType({
        nodeId: selectedNodeId,
      });
    },
    condition: () => {
      const isWritable = useWorkflowStore().isWritable;
      const selectedNode = useSelectionStore().singleSelectedNode;

      if (!selectedNode) {
        return false;
      }

      const isLinkTypeChangeable =
        isComponent(selectedNode) &&
        isLinkedComponent(selectedNode) &&
        selectedNode.link?.isLinkTypeChangeable;

      return (
        isWritable &&
        Boolean(isLinkTypeChangeable) &&
        useUIControlsStore().canDoComponentSharingOperations
      );
    },
  },
  openLayoutEditor: {
    text: "Open layout editor",
    title: "Open layout editor",
    hotkey: ["CtrlOrCmd", "D"],
    group: "componentAndMetanode",
    icon: LayoutIcon,
    execute: () => useDesktopInteractionsStore().openLayoutEditor(),
    condition: () => {
      const workflow = useWorkflowStore().activeWorkflow!;
      const isWritable = useWorkflowStore().isWritable;

      return (
        isWritable &&
        Boolean(isComponentProjectOrWorkflow(workflow)) &&
        useUIControlsStore().canOpenComponentLayoutEditor
      );
    },
  },
  openLayoutEditorByNodeId: {
    text: "Open layout editor",
    title: "Open layout editor",
    description: "Open layout editor of selected component",
    hotkey: ["CtrlOrCmd", "Shift", "D"],
    group: "componentAndMetanode",
    icon: LayoutIcon,
    execute: () => {
      const nodeId = useSelectionStore().singleSelectedNode?.id ?? "";

      useDesktopInteractionsStore().openLayoutEditorByNodeId({ nodeId });
    },
    condition: () => {
      const selectedNode = useSelectionStore().singleSelectedNode;
      const isWritable = useWorkflowStore().isWritable;

      if (!selectedNode) {
        return false;
      }

      return (
        isWritable &&
        isComponent(selectedNode) &&
        !selectedNode?.isLocked &&
        !isLinkedComponent(selectedNode) &&
        useUIControlsStore().canOpenComponentLayoutEditor
      );
    },
  },
  checkForComponentUpdates: {
    text: "Check for linked component updates",
    title: "Check for linked component updates",
    execute: async () => {
      // Get available updates
      await useComponentInteractionsStore().checkForLinkedComponentUpdates();
    },
    condition: () => {
      const { containsLinkedComponents } =
        useWorkflowStore().activeWorkflow!.info;
      const isWritable = useWorkflowStore().isWritable;

      return Boolean(containsLinkedComponents) && isWritable;
    },
  },
  lockSubnode: {
    text: "Lock",
    title: "Set password protection",
    execute: () => {
      const nodeId = useSelectionStore().singleSelectedNode!.id;

      useComponentInteractionsStore().lockSubnode({ nodeId });
    },
    condition: () => {
      const selectedNode = useSelectionStore().singleSelectedNode;

      if (!selectedNode) {
        return false;
      }

      if (!isComponent(selectedNode) || !isMetanode(selectedNode)) {
        return false;
      }

      return (
        selectedNode &&
        !selectedNode.isLocked &&
        useUIControlsStore().canLockAndUnlockSubnodes
      );
    },
  },
};

export default componentOrMetanodeShortcuts;
