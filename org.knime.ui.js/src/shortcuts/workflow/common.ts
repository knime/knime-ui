import RedoIcon from "webapps-common/ui/assets/img/icons/redo.svg";
import UndoIcon from "webapps-common/ui/assets/img/icons/undo.svg";
import DeleteIcon from "@/assets/delete.svg";
import OpenDialogIcon from "@/assets/configure-node.svg";
import SaveIcon from "webapps-common/ui/assets/img/icons/save.svg";
import SaveAsIcon from "webapps-common/ui/assets/img/icons/save-as.svg";

import { portPositions } from "@/util/portShift";
import { nodeSize } from "@/style/shapes.mjs";
import { geometry } from "@/util/geometry";
import { isNodeMetaNode } from "@/util/nodeUtil";
import type { Connection, XY } from "@/api/gateway-api/generated-api";
import { compatibility } from "@/environment";

import type { UnionToShortcutRegistry } from "../types";
import type { KnimeNode } from "@/api/custom-types";
import { conditionGroup } from "../util";

export type CommonWorkflowShortcuts = UnionToShortcutRegistry<
  | "save"
  | "saveAs"
  | "undo"
  | "redo"
  | "configureNode"
  | "configureFlowVariables"
  | "editNodeCommentOrAnnotation"
  | "deleteSelected"
  | "quickAddNode"
>;

export const commonWorkflowShortcuts: CommonWorkflowShortcuts = {
  save: {
    title: "Save workflow",
    text: "Save",
    hotkey: ["Ctrl", "S"],
    icon: SaveIcon,
    execute: ({ $store }) => {
      if ($store.getters["application/activeProjectOrigin"]) {
        $store.dispatch("workflow/saveProject");
      } else {
        $store.dispatch("workflow/saveProjectAs");
      }
    },
    condition: ({ $store }) =>
      compatibility.isLocalSaveSupported() &&
      ($store.getters["application/isDirtyActiveProject"] ||
        !$store.getters["application/activeProjectOrigin"]),
  },
  saveAs: {
    title: "Save workflow as",
    text: "Save as…",
    icon: SaveAsIcon,
    execute: ({ $store }) => $store.dispatch("workflow/saveProjectAs"),
    condition: () => compatibility.isLocalSaveSupported(),
  },

  undo: {
    title: "Undo",
    hotkey: ["Ctrl", "Z"],
    icon: UndoIcon,
    execute: ({ $store }) => $store.dispatch("workflow/undo"),
    condition: ({ $store }) =>
      Boolean($store.state.workflow.activeWorkflow?.allowedActions?.canUndo),
  },
  redo: {
    title: "Redo",
    hotkey: ["Ctrl", "Shift", "Z"],
    icon: RedoIcon,
    execute: ({ $store }) => $store.dispatch("workflow/redo"),
    condition: ({ $store }) =>
      Boolean($store.state.workflow.activeWorkflow?.allowedActions?.canRedo),
  },

  ...conditionGroup(
    ({ $store }) => $store.state.application.permissions.canConfigureNodes,
    {
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
        condition: ({ $store }) => {
          const singleSelectedNode =
            $store.getters["selection/singleSelectedNode"];

          if (singleSelectedNode) {
            const { canOpenDialog } = singleSelectedNode.allowedActions;

            return (
              canOpenDialog &&
              compatibility.canConfigureNodes(singleSelectedNode.kind)
            );
          }

          return false;
        },
      },

      configureFlowVariables: {
        text: "Configure flow variables",
        hotkey: ["Shift", "F6"],
        execute: ({ $store }) =>
          $store.dispatch(
            "workflow/openFlowVariableConfiguration",
            $store.getters["selection/singleSelectedNode"].id,
          ),
        condition: ({ $store }) => {
          const singleSelectedNode =
            $store.getters["selection/singleSelectedNode"];

          if (singleSelectedNode) {
            const { canOpenLegacyFlowVariableDialog } =
              singleSelectedNode.allowedActions;

            return (
              canOpenLegacyFlowVariableDialog &&
              compatibility.canConfigureFlowVariables()
            );
          }

          return false;
        },
      },
    },
  ),

  ...conditionGroup(({ $store }) => $store.getters["workflow/isWritable"], {
    editNodeCommentOrAnnotation: {
      text: ({ $store }) => {
        if ($store.getters["selection/singleSelectedNode"]) {
          return "Edit node comment";
        }

        if ($store.getters["selection/singleSelectedAnnotation"]) {
          return "Edit annotation";
        }

        return "";
      },
      hotkey: ["F2"],
      execute: ({ $store }) => {
        if ($store.getters["selection/singleSelectedNode"]) {
          $store.dispatch(
            "workflow/openLabelEditor",
            $store.getters["selection/singleSelectedNode"].id,
          );
        }

        if ($store.getters["selection/singleSelectedAnnotation"]) {
          $store.dispatch(
            "workflow/setEditableAnnotationId",
            $store.getters["selection/singleSelectedAnnotation"].id,
          );
        }
      },
      condition: ({ $store }) => {
        const singleSelectedObject =
          $store.getters["selection/singleSelectedObject"];

        return singleSelectedObject;
      },
    },
    deleteSelected: {
      text: "Delete",
      title: "Delete selection",
      hotkey: ["Delete"],
      icon: DeleteIcon,
      execute: ({ $store }) =>
        $store.dispatch("workflow/deleteSelectedObjects"),
      condition({ $store }) {
        const selectedNodes: Array<KnimeNode> =
          $store.getters["selection/selectedNodes"];
        const selectedConnections: Array<Connection> =
          $store.getters["selection/selectedConnections"];
        const selectedAnnotations =
          $store.getters["selection/selectedAnnotations"];
        const selectedBendpoints =
          $store.getters["selection/selectedBendpointIds"];

        // disable if nothing selected
        if (
          selectedNodes.length === 0 &&
          selectedConnections.length === 0 &&
          selectedAnnotations.length === 0 &&
          selectedBendpoints.length === 0
        ) {
          return false;
        }

        const allSelectedDeletable =
          selectedNodes.every((node) => node.allowedActions?.canDelete) &&
          selectedConnections.every(
            (connection) => connection.allowedActions?.canDelete,
          );

        // enabled, if all selected objects are deletable
        return allSelectedDeletable;
      },
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
          port,
          position: lastPosition,
        } = props ?? {};
        const lastPortIndex = port?.index ?? -1;

        // use the node of the currently open dialog because the node might not be selected in that case
        const node: KnimeNode = isOpen
          ? $store.getters["workflow/getNodeById"](lastNodeId)
          : $store.getters["selection/singleSelectedNode"];

        // global menu without predecessor node
        if (node === null) {
          const position = geometry.findFreeSpaceAroundCenterWithFallback({
            visibleFrame: $store.getters["canvas/getVisibleFrame"](),
            nodes: $store.state.workflow.activeWorkflow!.nodes,
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
        const calculatePosition = (
          node: KnimeNode,
          portIndex: number,
          portCount: number,
        ) => {
          const outPortPositions = portPositions({
            portCount,
            isMetanode: isNodeMetaNode(node),
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
            nodes: $store.state.workflow.activeWorkflow!.nodes,
          });
        };

        const outputPort = node.outPorts[portIndex];
        const position = isOpen
          ? lastPosition
          : calculatePosition(node, portIndex, outPortCount);

        $store.dispatch("workflow/openQuickAddNodeMenu", {
          props: { nodeId, port: outputPort, position },
        });
      },
    },
  }),
};
