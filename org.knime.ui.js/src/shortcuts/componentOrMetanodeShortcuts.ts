import CreateMetanode from "webapps-common/ui/assets/img/icons/metanode-add.svg";
import CreateComponent from "webapps-common/ui/assets/img/icons/component.svg";
import LayoutIcon from "webapps-common/ui/assets/img/icons/layout-editor.svg";
import { APP_ROUTES } from "@/router/appRoutes";

import type {
  ShortcutConditionContext,
  UnionToShortcutRegistry,
} from "./types";
import type { KnimeNode } from "@/api/custom-types";
import { compatibility } from "@/environment";
import { isComponentProject } from "@/util/projectUtil";

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

    if (selectedNode?.isLocked) {
      return (
        selectedNode.kind === kind && compatibility.canLockAndUnlockSubnodes()
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
      if (
        !$store.getters["workflow/isWritable"] ||
        !compatibility.canDoComponentOperations()
      ) {
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
    description: "Open Component or Metanode",
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
    condition: ({ $store }) => $store.getters["workflow/isWritable"],
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
    condition: ({ $store }) => $store.getters["workflow/isWritable"],
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
    condition: ({ $store }) => $store.getters["workflow/isWritable"],
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
      const isHubItemVersionChangeable =
        $store.getters["selection/singleSelectedNode"].link
          ?.isHubItemVersionChangeable;
      return isWritable && isHubItemVersionChangeable;
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
      const isLinkTypeChangeable =
        $store.getters["selection/singleSelectedNode"].link
          ?.isLinkTypeChangeable;
      return isWritable && isLinkTypeChangeable;
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
        compatibility.canDoComponentOperations()
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
      return (
        selectedNode?.kind === "component" &&
        !selectedNode?.isLocked &&
        !selectedNode?.link &&
        compatibility.canDoComponentOperations()
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
      return !selectedNode?.isLocked;
    },
  },
};

export default componentOrMetanodeShortcuts;
