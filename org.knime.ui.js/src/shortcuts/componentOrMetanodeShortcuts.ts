import CreateComponent from "@knime/styles/img/icons/component.svg";
import LayoutIcon from "@knime/styles/img/icons/layout-editor.svg";
import CreateMetanode from "@knime/styles/img/icons/metanode-add.svg";

import type { KnimeNode } from "@/api/custom-types";
import type { ComponentNode } from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import { isNodeComponent } from "@/util/nodeUtil";
import { isComponentProject } from "@/util/projectUtil";

import type {
  ShortcutConditionContext,
  UnionToShortcutRegistry,
} from "./types";

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

const isLinkedComponent = (node?: KnimeNode) =>
  Boolean(isComponent(node) && node.link);

const canExpand =
  (kind: "metanode" | "component") =>
  ({ $store }: ShortcutConditionContext) => {
    const selectedNode = $store.getters["selection/singleSelectedNode"];

    if (
      !$store.getters["workflow/isWritable"] ||
      selectedNode?.link ||
      selectedNode?.isLocked
    ) {
      return false;
    }

    return (
      selectedNode?.kind === kind &&
      selectedNode?.allowedActions.canExpand !== "false"
    );
  };

const canOpen =
  (kind: "metanode" | "component") =>
  ({ $store }: ShortcutConditionContext) => {
    const selectedNode = $store.getters["selection/singleSelectedNode"];
    const { uiControls } = $store.state;

    if (selectedNode?.isLocked) {
      return selectedNode.kind === kind && uiControls.canLockAndUnlockSubnodes;
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
    execute: ({ $store }) =>
      $store.dispatch("workflow/collapseToContainer", {
        containerType: "metanode",
      }),
    condition({ $store }) {
      if (!$store.getters["workflow/isWritable"]) {
        return false;
      }

      if (!$store.getters["selection/selectedNodes"].length) {
        return false;
      }

      return $store.getters["selection/selectedNodes"].every(
        (node: KnimeNode) => node.allowedActions?.canCollapse !== "false",
      );
    },
  },
  createComponent: {
    text: "Create component",
    title: "Create component",
    hotkey: ["CtrlOrCmd", "J"],
    group: "componentAndMetanode",
    icon: CreateComponent,
    execute: ({ $store }) =>
      $store.dispatch("workflow/collapseToContainer", {
        containerType: "component",
      }),
    condition({ $store }) {
      if (!$store.getters["workflow/isWritable"]) {
        return false;
      }

      if (!$store.getters["selection/selectedNodes"].length) {
        return false;
      }

      return $store.getters["selection/selectedNodes"].every(
        (node: KnimeNode) => node.allowedActions?.canCollapse !== "false",
      );
    },
  },
  openComponentOrMetanode: {
    text: ({ $store }) =>
      `Open ${$store.getters["selection/singleSelectedNode"]?.kind}`,
    hotkey: ["CtrlOrCmd", "Alt", "Enter"],
    group: "componentAndMetanode",
    description: "Open component or metanode",
    execute: async ({ $store, $router }) => {
      const projectId = $store.state.application.activeProjectId;
      const { isLocked, id } = $store.getters["selection/singleSelectedNode"];

      if (isLocked) {
        const isUnlocked = await $store.dispatch("workflow/unlockSubnode", {
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
    condition: ({ $store }) => {
      return (
        canOpen("component")({ $store }) || canOpen("metanode")({ $store })
      );
    },
  },
  openParentWorkflow: {
    hotkey: ["CtrlOrCmd", "Alt", "Shift", "Enter"],
    text: "Open parent workflow",
    group: "componentAndMetanode",
    execute: ({ $store, $router }) => {
      const projectId = $store.state.application.activeProjectId;
      const activeWorkflowParents =
        $store.state.workflow.activeWorkflow?.parents ?? [];

      const id = activeWorkflowParents.at(-1)?.containerId;

      $router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId, workflowId: id },
        force: true,
        replace: true,
      });
    },
    condition: ({ $store }) => {
      const activeWorkflowParents =
        $store.state.workflow.activeWorkflow?.parents;

      return (activeWorkflowParents ?? []).length > 0;
    },
  },
  expandMetanode: {
    text: "Expand metanode",
    title: "Expand metanode",
    hotkey: ["CtrlOrCmd", "Shift", "G"],
    group: "componentAndMetanode",
    execute: ({ $store }) => $store.dispatch("workflow/expandContainerNode"),
    condition: canExpand("metanode"),
  },
  expandComponent: {
    text: "Expand component",
    title: "Expand component",
    hotkey: ["CtrlOrCmd", "Shift", "J"],
    group: "componentAndMetanode",
    execute: ({ $store }) => $store.dispatch("workflow/expandContainerNode"),
    condition: canExpand("component"),
  },
  editName: {
    text: ({ $store }) =>
      `Rename ${$store.getters["selection/singleSelectedNode"]?.kind}`,
    hotkey: ["Shift", "F2"],
    group: "componentAndMetanode",
    description: "Rename component or metanode",
    execute: ({ $store }) =>
      $store.dispatch(
        "workflow/openNameEditor",
        $store.getters["selection/singleSelectedNode"].id,
      ),
    condition: ({ $store }) =>
      ["metanode", "component"].includes(
        $store.getters["selection/singleSelectedNode"]?.kind,
      ) &&
      !$store.getters["selection/singleSelectedNode"]?.link &&
      $store.getters["workflow/isWritable"],
  },
  linkComponent: {
    text: "Share",
    title: "Share component",
    execute: ({ $store, payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId ||
        $store.getters["selection/singleSelectedNode"].id;

      $store.dispatch("workflow/linkComponent", { nodeId: selectedNodeId });
    },
    condition: ({ $store }) =>
      $store.getters["workflow/isWritable"] &&
      isComponent($store.getters["selection/singleSelectedNode"]) &&
      !isLinkedComponent($store.getters["selection/singleSelectedNode"]) &&
      $store.state.uiControls.canDoComponentSharingOperations,
  },
  updateComponent: {
    text: "Update component",
    title: "Update component",
    execute: ({ $store, payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId ||
        $store.getters["selection/singleSelectedNode"].id;

      $store.dispatch("workflow/updateComponents", {
        nodeIds: [selectedNodeId],
      });
    },
    condition: ({ $store }) =>
      $store.getters["workflow/isWritable"] &&
      isLinkedComponent($store.getters["selection/singleSelectedNode"]) &&
      $store.state.uiControls.canDoComponentSharingOperations,
  },
  unlinkComponent: {
    text: "Disconnect link",
    title: "Unlink component",
    execute: ({ $store, payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId ||
        $store.getters["selection/singleSelectedNode"].id;
      $store.dispatch("workflow/unlinkComponent", { nodeId: selectedNodeId });
    },
    condition: ({ $store }) =>
      $store.getters["workflow/isWritable"] &&
      isLinkedComponent($store.getters["selection/singleSelectedNode"]) &&
      $store.state.uiControls.canDoComponentSharingOperations,
  },
  changeHubItemVersion: {
    text: "Change KNIME Hub item version",
    title: "Change KNIME Hub item version",
    execute: ({ $store, payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId ||
        $store.getters["selection/singleSelectedNode"].id;

      $store.dispatch("workflow/changeHubItemVersion", {
        nodeId: selectedNodeId,
      });
    },
    condition: ({ $store }) => {
      const isWritable = $store.getters["workflow/isWritable"];
      const node = $store.getters["selection/singleSelectedNode"];
      const isHubItemVersionChangeable =
        isComponent(node) &&
        isLinkedComponent(node) &&
        node.link?.isHubItemVersionChangeable;

      return (
        isWritable &&
        $store.state.uiControls.canDoComponentSharingOperations &&
        isHubItemVersionChangeable
      );
    },
  },
  changeComponentLinkType: {
    text: "Change link type",
    title: "Change component link type",
    execute: ({ $store, payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId ||
        $store.getters["selection/singleSelectedNode"].id;

      $store.dispatch("workflow/changeComponentLinkType", {
        nodeId: selectedNodeId,
      });
    },
    condition: ({ $store }) => {
      const isWritable = $store.getters["workflow/isWritable"];

      const node: KnimeNode = $store.getters["selection/singleSelectedNode"];

      const isLinkTypeChangeable =
        isComponent(node) &&
        isLinkedComponent(node) &&
        node.link?.isLinkTypeChangeable;

      return (
        isWritable &&
        isLinkTypeChangeable &&
        $store.state.uiControls.canDoComponentSharingOperations
      );
    },
  },
  openLayoutEditor: {
    text: "Open layout editor",
    title: "Open layout editor",
    hotkey: ["CtrlOrCmd", "D"],
    group: "componentAndMetanode",
    icon: LayoutIcon,
    execute: ({ $store }) => $store.dispatch("workflow/openLayoutEditor"),
    condition: ({ $store }) => {
      const workflow = $store.state.workflow.activeWorkflow!;

      const isWritable = $store.getters["workflow/isWritable"];

      return (
        isWritable &&
        isComponentProject(workflow) &&
        $store.state.uiControls.canOpenComponentLayoutEditor
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
    execute: ({ $store }) => {
      const nodeId = $store.getters["selection/singleSelectedNode"]?.id;
      $store.dispatch("workflow/openLayoutEditorByNodeId", { nodeId });
    },
    condition: ({ $store }) => {
      const selectedNode = $store.getters["selection/singleSelectedNode"];
      const isWritable = $store.getters["workflow/isWritable"];

      return (
        isWritable &&
        isComponent(selectedNode) &&
        !selectedNode?.isLocked &&
        !isLinkedComponent(selectedNode) &&
        $store.state.uiControls.canOpenComponentLayoutEditor
      );
    },
  },
  checkForComponentUpdates: {
    text: "Check for linked component updates",
    title: "Check for linked component updates",
    execute: ({ $store }) => {
      // Get available updates
      $store.dispatch("workflow/checkForLinkedComponentUpdates");
    },
    condition: ({ $store }) => {
      const { containsLinkedComponents } =
        $store.state.workflow.activeWorkflow!.info;

      const isWritable = $store.getters["workflow/isWritable"];
      return containsLinkedComponents && isWritable;
    },
  },
  lockSubnode: {
    text: "Lock",
    title: "Set password protection",
    execute: ({ $store }) => {
      const nodeId = $store.getters["selection/singleSelectedNode"]?.id;
      $store.dispatch("workflow/lockSubnode", { nodeId });
    },
    condition: ({ $store }) => {
      const selectedNode = $store.getters["selection/singleSelectedNode"];

      return (
        selectedNode &&
        !selectedNode.isLocked &&
        $store.state.uiControls.canLockAndUnlockSubnodes
      );
    },
  },
};

export default componentOrMetanodeShortcuts;
