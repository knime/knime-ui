import { merge } from "lodash-es";

import type { KnimeNode } from "@/api/custom-types";
import {
  AllowedNodeActions,
  Annotation,
  type ComponentNode,
  ComponentPlaceholder,
  type MetaNode,
  MetaNodeState,
  type NativeNode,
  Node,
  NodeState,
  TypedText,
  type WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import type { WorkflowObject } from "@/util/workflow-canvas";
import type { DeepPartial } from "../utils";

import { createNodeAnnotation } from "./annotations";
import { createXY } from "./common";
import { createPort } from "./ports";
import { randomValue } from "./util";

const TEMPLATE_IDS = [
  "org.knime.base.node.preproc.filter.row.RowFilterNodeFactory",
  "org.knime.base.node.preproc.table.splitter.TableSplitterNodeFactory",
  "org.knime.base.node.preproc.table.cropper.TableCropperNodeFactory",
  "org.knime.base.node.preproc.joiner3.Joiner3NodeFactory",
  "org.knime.base.node.preproc.rowtocolumnheader.RowToColumnHeaderNodeFactory",
  "org.knime.base.node.preproc.rowtocolumnheader.RowToColumnHeaderNodeFactory",
  "org.knime.base.node.preproc.append.row.AppendedRowsNodeFactory",
  "org.knime.base.node.preproc.groupby.GroupByNodeFactory",
  "org.knime.base.node.preproc.stringmanipulation.StringManipulationNodeFactory",
  "org.knime.base.node.preproc.partition.PartitionNodeFactory",
  "org.knime.base.node.rules.engine.RuleEngineFilterNodeFactory",
  "org.knime.ext.poi3.node.io.filehandling.excel.writer.ExcelTableWriterNodeFactory",
] as const;

const createBaseNode = (
  kind: Node.KindEnum,
  data: DeepPartial<Node> = {},
): Node => {
  const defaultVariablePort = createPort({
    index: 0,
    typeId: "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
  });

  const node: Node = {
    id: "root:1",
    kind,
    position: createXY({ x: 0, y: 0 }),
    allowedActions: {
      canExecute: false,
      canCancel: false,
      canReset: false,
      canDelete: true,
      canCollapse: AllowedNodeActions.CanCollapseEnum.ResetRequired,
      canExpand: AllowedNodeActions.CanExpandEnum.False,
    },
    annotation: createNodeAnnotation({
      text: {
        value: "",
        contentType: TypedText.ContentTypeEnum.Plain,
      },
      styleRanges: [],
      textAlign: Annotation.TextAlignEnum.Left,
      backgroundColor: "",
      defaultFontSize: 12,
    }),

    dialogType: Node.DialogTypeEnum.Swing,

    inPorts: [defaultVariablePort],
    outPorts: [defaultVariablePort],
    hasView: true,
  };

  return merge(node, data);
};

type NodeTemplateIds =
  | (typeof TEMPLATE_IDS)[number]
  | Omit<string, (typeof TEMPLATE_IDS)[number]>;

export const createNativeNode = (
  data: DeepPartial<NativeNode & { templateId: NodeTemplateIds }> = {},
): NativeNode => {
  const baseNode = createBaseNode(Node.KindEnum.Node, data);

  const nativeNode: NativeNode = {
    ...baseNode,

    templateId: randomValue(TEMPLATE_IDS),
    hasView: false,
    isReexecutable: true,
    portGroups: {},
    state: {
      executionState: NodeState.ExecutionStateEnum.CONFIGURED,
    },
  };

  return merge(nativeNode, data);
};

export const createComponentNode = (
  data: DeepPartial<ComponentNode> = {},
): ComponentNode => {
  const baseNode = createBaseNode(Node.KindEnum.Component, data);

  const component: ComponentNode = {
    ...baseNode,
    isLocked: false,
    state: {
      executionState: NodeState.ExecutionStateEnum.CONFIGURED,
    },
    hasView: false,
  };

  return merge(component, data);
};

export const createMetanode = (data: DeepPartial<MetaNode> = {}): MetaNode => {
  const baseNode = createBaseNode(Node.KindEnum.Metanode, data);

  const metanode: MetaNode = {
    ...baseNode,

    name: "",
    state: {
      executionState: MetaNodeState.ExecutionStateEnum.EXECUTED,
    },
    dialogType: undefined,
  };

  return merge(metanode, data);
};

export const createWorkflowObject = (
  data?: KnimeNode | WorkflowAnnotation,
): WorkflowObject => {
  const base: WorkflowObject = {
    id: "some-obj",
    type: "node",
    x: 0,
    y: 0,
    width: 32,
    height: 32,
  };

  if (!data) {
    return base;
  }

  if ("bounds" in data) {
    return {
      ...base,
      id: data.id,
      type: "annotation",
      ...data.bounds,
    };
  } else {
    return {
      ...base,
      id: data.id,
      type: "node",
      x: data.position.x,
      y: data.position.y,
    };
  }
};

export const createComponentPlaceholder = (
  data: DeepPartial<ComponentPlaceholder> = {},
): ComponentPlaceholder => {
  const componentPlaceholder: ComponentPlaceholder = {
    id: "placeholder:1",
    name: "Component Placeholder",
    position: createXY({ x: 0, y: 0 }),
    progress: 0,
    state: ComponentPlaceholder.StateEnum.LOADING,
  };

  return merge(componentPlaceholder, data);
};
