import RedoIcon from "webapps-common/ui/assets/img/icons/redo.svg";
import UndoIcon from "webapps-common/ui/assets/img/icons/undo.svg";
import DeleteIcon from "@/assets/delete.svg";
import OpenDialogIcon from "@/assets/configure-node.svg";
import SaveIcon from "webapps-common/ui/assets/img/icons/save.svg";
import CreateMetanode from "webapps-common/ui/assets/img/icons/metanode-add.svg";
import CreateComponent from "webapps-common/ui/assets/img/icons/component.svg";
import LayoutIcon from "webapps-common/ui/assets/img/icons/layout-editor.svg";

import type {
  ShortcutConditionContext,
  UnionToShortcutRegistry,
} from "./types";
import { ReorderWorkflowAnnotationsCommand } from "@/api/gateway-api/generated-api";
import { portPositions } from "@/util/portShift";
import { nodeSize } from "@/style/shapes.mjs";
import type { XY } from "@/api/gateway-api/generated-api";
import { geometry } from "@/util/geometry";
import { APP_ROUTES } from "@/router/appRoutes";

type WorkflowShortcuts = UnionToShortcutRegistry<
  | "save"
  | "undo"
  | "redo"
  | "configureNode"
  | "configureFlowVariables"
  | "editName"
  | "editNodeLabel"
  | "deleteSelected"
  | "createMetanode"
  | "createComponent"
  | "openComponentOrMetanode"
  | "openParentWorkflow"
  | "expandMetanode"
  | "expandComponent"
  | "openLayoutEditor"
  | "copy"
  | "cut"
  | "paste"
  | "addWorkflowAnnotation"
  | "toggleAnnotationMode"
  | "togglePanMode"
  | "switchToSelectionMode"
  | "bringAnnotationToFront"
  | "bringAnnotationForward"
  | "sendAnnotationBackward"
  | "sendAnnotationToBack"
  | "quickAddNode"
>;

declare module "./index" {
  interface ShortcutsRegistry extends WorkflowShortcuts {}
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

    return selectedNode?.kind === kind && !selectedNode?.isLocked;
  };

const workflowShortcuts: WorkflowShortcuts = {
  save: {
    title: "Save workflow",
    hotkey: ["Ctrl", "S"],
    icon: SaveIcon,
    execute: ({ $store }) => $store.dispatch("workflow/saveWorkflow"),
    condition: ({ $store }) => $store.state.workflow.activeWorkflow?.dirty,
  },
  undo: {
    title: "Undo",
    hotkey: ["Ctrl", "Z"],
    icon: UndoIcon,
    execute: ({ $store }) => $store.dispatch("workflow/undo"),
    condition: ({ $store }) =>
      $store.state.workflow.activeWorkflow?.allowedActions.canUndo,
  },
  redo: {
    title: "Redo",
    hotkey: ["Ctrl", "Shift", "Z"],
    icon: RedoIcon,
    execute: ({ $store }) => $store.dispatch("workflow/redo"),
    condition: ({ $store }) =>
      $store.state.workflow.activeWorkflow?.allowedActions.canRedo,
  },
  configureNode: {
    text: "Configure",
    hotkey: ["F6"],
    icon: OpenDialogIcon,
    execute: ({ $store, payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId ||
        $store.getters["selection/singleSelectedNode"].id;
      $store.dispatch("workflow/openNodeConfiguration", selectedNodeId);
    },
    condition: ({ $store }) =>
      $store.getters["selection/singleSelectedNode"]?.allowedActions
        .canOpenDialog,
  },
  configureFlowVariables: {
    text: "Configure flow variables",
    hotkey: ["Shift", "F6"],
    execute: ({ $store }) =>
      $store.dispatch(
        "workflow/openFlowVariableConfiguration",
        $store.getters["selection/singleSelectedNode"].id
      ),
    condition: ({ $store }) =>
      $store.getters["selection/singleSelectedNode"]?.allowedActions
        .canOpenLegacyFlowVariableDialog,
  },
  editName: {
    text: "Rename",
    hotkey: ["Shift", "F2"],
    execute: ({ $store }) =>
      $store.dispatch(
        "workflow/openNameEditor",
        $store.getters["selection/singleSelectedNode"].id
      ),
    condition: ({ $store }) =>
      ["metanode", "component"].includes(
        $store.getters["selection/singleSelectedNode"]?.kind
      ) &&
      !$store.getters["selection/singleSelectedNode"]?.link &&
      $store.getters["workflow/isWritable"],
  },
  editNodeLabel: {
    text: "Edit node label",
    hotkey: ["F2"],
    execute: ({ $store }) =>
      $store.dispatch(
        "workflow/openLabelEditor",
        $store.getters["selection/singleSelectedNode"].id
      ),
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];

      return (
        singleSelectedNode !== null && $store.getters["workflow/isWritable"]
      );
    },
  },
  deleteSelected: {
    text: "Delete",
    title: "Delete selection",
    hotkey: ["Delete"],
    icon: DeleteIcon,
    execute: ({ $store }) => $store.dispatch("workflow/deleteSelectedObjects"),
    condition({ $store }) {
      if (!$store.getters["workflow/isWritable"]) {
        return false;
      }

      const selectedNodes = $store.getters["selection/selectedNodes"];
      const selectedConnections =
        $store.getters["selection/selectedConnections"];
      const selectedAnnotations =
        $store.getters["selection/selectedAnnotations"];

      // disable if nothing selected
      if (
        selectedNodes.length === 0 &&
        selectedConnections.length === 0 &&
        selectedAnnotations.length === 0
      ) {
        return false;
      }
      const allSelectedDeletable =
        selectedNodes.every((node) => node.allowedActions.canDelete) &&
        selectedConnections.every(
          (connection) => connection.allowedActions.canDelete
        );

      // enabled, if all selected objects are not deletable
      return allSelectedDeletable;
    },
  },
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
        (node) => node.allowedActions.canCollapse !== "false"
      );
    },
  },
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
      if (!$store.getters["workflow/isWritable"]) {
        return false;
      }
      if (!$store.getters["selection/selectedNodes"].length) {
        return false;
      }

      return $store.getters["selection/selectedNodes"].every(
        (node) => node.allowedActions.canCollapse !== "false"
      );
    },
  },
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
        $store.state.workflow.activeWorkflow.parents;
      const id = activeWorkflowParents.at(-1).containerId;

      $router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId, workflowId: id },
        force: true,
        replace: true,
      });
    },
    condition: ({ $store }) => {
      const activeWorkflowParents =
        $store.state.workflow.activeWorkflow.parents;
      return activeWorkflowParents?.length > 0;
    },
  },
  expandMetanode: {
    text: "Expand metanode",
    title: "Expand metanode",
    hotkey: ["Ctrl", "Shift", "G"],
    execute: ({ $store }) => $store.dispatch("workflow/expandContainerNode"),
    condition: canExpand("metanode"),
  },
  expandComponent: {
    text: "Expand component",
    title: "Expand component",
    hotkey: ["Ctrl", "Shift", "J"],
    execute: ({ $store }) => $store.dispatch("workflow/expandContainerNode"),
    condition: canExpand("component"),
  },
  openLayoutEditor: {
    text: "Open layout editor",
    title: "Open layout editor",
    hotkey: ["Ctrl", "D"],
    icon: LayoutIcon,
    execute: ({ $store }) => $store.dispatch("workflow/openLayoutEditor"),
    condition: ({ $store }) =>
      $store.state.workflow.activeWorkflow?.info.containerType ===
        "component" && $store.getters["workflow/isWritable"],
  },
  copy: {
    text: "Copy",
    title: "Copy selection",
    hotkey: ["Ctrl", "C"],
    allowEventDefault: true,
    execute: ({ $store }) =>
      $store.dispatch("workflow/copyOrCutWorkflowParts", { command: "copy" }),
    condition: ({ $store }) => {
      const kanvas = $store.state.canvas.getScrollContainerElement();
      const selectedNodes = Object.keys(
        $store.getters["selection/selectedNodes"]
      );
      const selectedAnnotations =
        $store.getters["selection/selectedAnnotations"];
      const textSelectionIsEmpty = window?.getSelection().toString() === "";
      const kanvasIsActiveElement = document.activeElement === kanvas;
      const isSomethingSelected =
        selectedNodes.length !== 0 || selectedAnnotations.length !== 0;
      return (
        isSomethingSelected &&
        $store.state.application.hasClipboardSupport &&
        (textSelectionIsEmpty || kanvasIsActiveElement)
      );
    },
  },
  cut: {
    text: "Cut",
    title: "Cut selection",
    hotkey: ["Ctrl", "X"],
    execute: ({ $store }) =>
      $store.dispatch("workflow/copyOrCutWorkflowParts", { command: "cut" }),
    condition: ({ $store }) => {
      const selectedNodes = Object.keys(
        $store.getters["selection/selectedNodes"]
      );
      const selectedAnnotations =
        $store.getters["selection/selectedAnnotations"];
      const isSomethingSelected =
        selectedNodes.length !== 0 || selectedAnnotations.length !== 0;
      return (
        isSomethingSelected &&
        $store.getters["workflow/isWritable"] &&
        $store.state.application.hasClipboardSupport
      );
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
    condition: ({ $store }) =>
      $store.getters["workflow/isWritable"] &&
      $store.state.application.hasClipboardSupport,
  },
  addWorkflowAnnotation: {
    text: "New workflow annotation",
    execute: ({ $store, payload }) => {
      const { metadata } = payload;

      if (!metadata?.position) {
        return;
      }

      $store.dispatch("workflow/addWorkflowAnnotation", {
        bounds: {
          x: metadata.position.x,
          y: metadata.position.y,
          width: metadata.width || 80,
          height: metadata.height || 80,
        },
      });
    },
    condition: ({ $store }) => $store.getters["workflow/isWritable"],
  },
  toggleAnnotationMode: {
    hotkey: ["T"],
    execute: ({ $store }) => {
      $store.dispatch("application/toggleAnnotationMode");
    },
  },
  togglePanMode: {
    hotkey: ["P"],
    execute: ({ $store }) => {
      $store.dispatch("application/togglePanMode");
    },
    condition: ({ $store }) =>
      $store.getters["workflow/isWritable"] &&
      !$store.getters["workflow/isWorkflowEmpty"],
  },
  switchToSelectionMode: {
    hotkey: ["V"],
    execute: ({ $store }) => {
      $store.dispatch("application/resetCanvasMode");
    },
    condition: ({ $store }) => $store.getters["workflow/isWritable"],
  },
  bringAnnotationToFront: {
    text: "Bring to front",
    hotkey: ["Ctrl", "Shift", "ArrowUp"],
    execute: ({ $store }) =>
      $store.dispatch("workflow/reorderWorkflowAnnotation", {
        action: ReorderWorkflowAnnotationsCommand.ActionEnum.BringToFront,
      }),
    condition: ({ $store }) =>
      $store.getters["selection/selectedAnnotations"].length > 0 &&
      $store.getters["workflow/isWritable"],
  },
  bringAnnotationForward: {
    hotkey: ["Ctrl", "ArrowUp"],
    text: "Bring forward",
    execute: ({ $store }) =>
      $store.dispatch("workflow/reorderWorkflowAnnotation", {
        action: ReorderWorkflowAnnotationsCommand.ActionEnum.BringForward,
      }),
    condition: ({ $store }) =>
      $store.getters["selection/selectedAnnotations"].length > 0 &&
      $store.getters["workflow/isWritable"],
  },
  sendAnnotationBackward: {
    hotkey: ["Ctrl", "ArrowDown"],
    text: "Send backward",
    execute: ({ $store }) =>
      $store.dispatch("workflow/reorderWorkflowAnnotation", {
        action: ReorderWorkflowAnnotationsCommand.ActionEnum.SendBackward,
      }),
    condition: ({ $store }) =>
      $store.getters["selection/selectedAnnotations"].length > 0 &&
      $store.getters["workflow/isWritable"],
  },
  sendAnnotationToBack: {
    hotkey: ["Ctrl", "Shift", "ArrowDown"],
    text: "Send to back",
    execute: ({ $store }) =>
      $store.dispatch("workflow/reorderWorkflowAnnotation", {
        action: ReorderWorkflowAnnotationsCommand.ActionEnum.SendToBack,
      }),
    condition: ({ $store }) =>
      $store.getters["selection/selectedAnnotations"].length > 0 &&
      $store.getters["workflow/isWritable"],
  },
  quickAddNode: {
    text: "Quick add node",
    title: "Add new node",
    hotkey: ["Ctrl", "."],
    execute: ({ $store }) => {
      // destruct current state
      const { isOpen, props } = $store.state.workflow.quickAddNodeMenu;

      const {
        nodeId: lastNodeId,
        port: { index: lastPortIndex } = { index: -1 },
        position: lastPosition,
      } = props ?? {};

      // use the node of the currently open dialog because the node might not be selected in that case
      const node = isOpen
        ? $store.getters["workflow/getNodeById"](lastNodeId)
        : $store.getters["selection/singleSelectedNode"];

      // global menu without predecessor node
      if (node === null) {
        const position = geometry.findFreeSpaceAroundCenterWithFallback({
          visibleFrame: $store.getters["canvas/getVisibleFrame"](),
          nodes: $store.state.workflow.activeWorkflow.nodes,
        });
        $store.dispatch("workflow/openQuickAddNodeMenu", {
          props: { position },
        });
        return;
      }

      const nodeId = node.id;
      const outPortCount = node.outPorts.length;

      // shuffle between port indices, start with the first non mickey-mouse (flowvar) port
      // if there is one, if not use the mickey-mouse port (index 0)
      const startIndex = outPortCount === 1 ? 0 : 1;
      const nextIndex = (lastPortIndex + 1) % outPortCount;
      const portIndex = lastNodeId === nodeId ? nextIndex : startIndex;

      // if it's not open we need to find a proper position to put the menu
      const calculatePosition = (node, portIndex, portCount, $store) => {
        const outPortPositions = portPositions({
          portCount,
          isMetanode: node.kind === "metanode",
          isOutports: true,
        });

        // eslint-disable-next-line no-magic-numbers
        const xOffset = nodeSize * 3;

        const startPoint: XY = {
          x: node.position.x + outPortPositions[portIndex][0] + xOffset,
          y: node.position.y + outPortPositions[portIndex][1],
        };
        return geometry.findFreeSpaceAroundPointWithFallback({
          startPoint,
          visibleFrame: $store.getters["canvas/getVisibleFrame"](),
          nodes: $store.state.workflow.activeWorkflow.nodes,
        });
      };

      const port = node.outPorts[portIndex];
      const position = isOpen
        ? lastPosition
        : calculatePosition(node, portIndex, outPortCount, $store);

      $store.dispatch("workflow/openQuickAddNodeMenu", {
        props: { nodeId, port, position },
      });
    },
    condition: ({ $store }) => $store.getters["workflow/isWritable"],
  },
};

export default workflowShortcuts;
