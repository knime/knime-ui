import CreateMetanode from "webapps-common/ui/assets/img/icons/metanode-add.svg";
import CreateComponent from "webapps-common/ui/assets/img/icons/component.svg";
import LayoutIcon from "webapps-common/ui/assets/img/icons/layout-editor.svg";
import { APP_ROUTES } from "@/router/appRoutes";

import type {
  ShortcutConditionContext,
  UnionToShortcutRegistry,
} from "../types";
import type { KnimeNode } from "@/api/custom-types";
import { compatibility } from "@/environment";
import { conditionGroup } from "../util";
import { WorkflowInfo } from "@/api/gateway-api/generated-api";

type CommonShortcuts = UnionToShortcutRegistry<
  "openComponentOrMetanode" | "openParentWorkflow" | "editName"
>;

type ComponentShortcuts = UnionToShortcutRegistry<
  | "createComponent"
  | "expandComponent"
  | "linkComponent"
  | "updateComponent"
  | "unlinkComponent"
  | "changeHubItemVersion"
  | "changeComponentLinkType"
  | "openLayoutEditor"
  | "openLayoutEditorByNodeId"
  | "checkForComponentUpdates"
>;

type MetanodeShortcuts = UnionToShortcutRegistry<
  "createMetanode" | "expandMetanode"
>;

export type ComponentOrMetanodeShortcuts = CommonShortcuts &
  ComponentShortcuts &
  MetanodeShortcuts;

const canExpand =
  (kind: "metanode" | "component") =>
  ({ $store }: ShortcutConditionContext) => {
    const selectedNode = $store.getters["selection/singleSelectedNode"];

    if (selectedNode?.link || selectedNode?.isLocked) {
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

    return selectedNode?.kind === kind && !selectedNode?.isLocked;
  };

const commonShortcuts: CommonShortcuts = {
  openComponentOrMetanode: {
    text: ({ $store }) =>
      `Open ${$store.getters["selection/singleSelectedNode"]?.kind}`,
    hotkey: ["Ctrl", "Alt", "Enter"],
    execute: ({ $store, $router }) => {
      const projectId = $store.state.application.activeProjectId;
      const id = $store.getters["selection/singleSelectedNode"].id;
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
    hotkey: ["Ctrl", "Alt", "Shift", "Enter"],
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
  editName: {
    text: ({ $store }) =>
      `Rename ${$store.getters["selection/singleSelectedNode"]?.kind}`,
    hotkey: ["Shift", "F2"],
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
};

const componentShortcuts: ComponentShortcuts = {
  ...conditionGroup<ComponentShortcuts>(
    ({ $store }) =>
      $store.getters["workflow/isWritable"] &&
      compatibility.canDoComponentOperations(),
    {
      createComponent: {
        text: "Create component",
        title: "Create component",
        hotkey: ["Ctrl", "J"],
        icon: CreateComponent,
        execute: ({ $store }) =>
          $store.dispatch("workflow/collapseToContainer", {
            containerType: "component",
          }),
        condition({ $store }) {
          if (!$store.getters["selection/selectedNodes"].length) {
            return false;
          }

          return $store.getters["selection/selectedNodes"].every(
            (node: KnimeNode) => node.allowedActions?.canCollapse !== "false",
          );
        },
      },
      expandComponent: {
        text: "Expand component",
        title: "Expand component",
        hotkey: ["Ctrl", "Shift", "J"],
        execute: ({ $store }) =>
          $store.dispatch("workflow/expandContainerNode"),
        condition: canExpand("component"),
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
      },
      unlinkComponent: {
        text: "Disconnect link",
        title: "Unlink component",
        execute: ({ $store, payload = null }) => {
          const selectedNodeId =
            payload?.metadata?.nodeId ||
            $store.getters["selection/singleSelectedNode"].id;
          $store.dispatch("workflow/unlinkComponent", {
            nodeId: selectedNodeId,
          });
        },
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
          const isHubItemVersionChangeable =
            $store.getters["selection/singleSelectedNode"].link
              ?.isHubItemVersionChangeable;

          return isHubItemVersionChangeable;
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
          const isLinkTypeChangeable =
            $store.getters["selection/singleSelectedNode"].link
              ?.isLinkTypeChangeable;

          return isLinkTypeChangeable;
        },
      },
      openLayoutEditor: {
        text: "Open layout editor",
        title: "Open layout editor",
        hotkey: ["Ctrl", "D"],
        icon: LayoutIcon,
        execute: ({ $store }) => $store.dispatch("workflow/openLayoutEditor"),
        condition: ({ $store }) => {
          const containerType =
            $store.state.workflow.activeWorkflow?.info.containerType;

          return containerType === WorkflowInfo.ContainerTypeEnum.Component;
        },
      },
      openLayoutEditorByNodeId: {
        text: "Open layout editor",
        title: "Open layout editor",
        hotkey: ["Ctrl", "Shift", "D"],
        icon: LayoutIcon,
        execute: ({ $store }) => {
          const nodeId = $store.getters["selection/singleSelectedNode"]?.id;
          $store.dispatch("workflow/openLayoutEditorByNodeId", { nodeId });
        },
        condition: ({ $store }) => {
          const selectedNode = $store.getters["selection/singleSelectedNode"];
          return selectedNode?.kind === "component" && !selectedNode?.link;
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

          return Boolean(containsLinkedComponents);
        },
      },
    },
  ),
};

const metanodeShortcuts: MetanodeShortcuts = {
  createMetanode: {
    text: "Create metanode",
    title: "Create metanode",
    hotkey: ["Ctrl", "G"],
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
  expandMetanode: {
    text: "Expand metanode",
    title: "Expand metanode",
    hotkey: ["Ctrl", "Shift", "G"],
    execute: ({ $store }) => $store.dispatch("workflow/expandContainerNode"),
    condition: canExpand("metanode"),
  },
};

export const componentOrMetanodeShortcuts: ComponentOrMetanodeShortcuts = {
  ...commonShortcuts,
  ...componentShortcuts,
  ...metanodeShortcuts,
};
