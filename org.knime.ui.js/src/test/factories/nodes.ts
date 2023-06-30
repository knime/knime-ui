import merge from "lodash/merge";

import type { KnimeNode } from "@/api/custom-types";
import {
  AllowedNodeActions,
  Annotation,
  type ComponentNode,
  type MetaNode,
  MetaNodeState,
  type NativeNode,
  Node,
  NodeState,
  TypedText,
} from "@/api/gateway-api/generated-api";
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

export const isNativeNode = (node: KnimeNode): node is NativeNode => {
  return node.kind === Node.KindEnum.Node;
};

const createBaseNode = (
  kind: Node.KindEnum,
  data: DeepPartial<Node> = {}
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
      canOpenDialog: true,
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

    hasDialog: false,

    inPorts: [defaultVariablePort],
    outPorts: [defaultVariablePort],
  };

  return merge(node, data);
};

type NodeTemplateIds =
  | (typeof TEMPLATE_IDS)[number]
  | Omit<string, (typeof TEMPLATE_IDS)[number]>;

export const createNativeNode = (
  data: DeepPartial<NativeNode & { templateId: NodeTemplateIds }> = {}
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
  data: DeepPartial<ComponentNode> = {}
): ComponentNode => {
  const baseNode = createBaseNode(Node.KindEnum.Component, data);

  const component: ComponentNode = {
    ...baseNode,
    isLocked: false,
    state: {
      executionState: NodeState.ExecutionStateEnum.CONFIGURED,
    },
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
  };

  return merge(metanode, data);
};
