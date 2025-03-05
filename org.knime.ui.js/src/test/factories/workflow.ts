import { merge } from "lodash-es";

import type { KnimeNode, Workflow } from "@/api/custom-types";
import {
  EditableMetadata,
  MetaNodePort,
  NativeNodeInvariants,
  TypedText,
  WorkflowInfo,
} from "@/api/gateway-api/generated-api";
import type { DeepPartial } from "../utils";

import { createWorkflowAnnotation } from "./annotations";
import { connectMultipleNodes } from "./connections";
import {
  createComponentNode,
  createMetanode,
  createNativeNode,
  isNativeNode,
} from "./nodes";
import { createMetanodePort, createPort } from "./ports";
import { arrayToDictionary } from "./util";

const createAndConnectNodes = () => {
  const node1 = createNativeNode({
    id: "root:1",
    position: { x: 0, y: 10 },
    outPorts: [
      createPort({
        index: 0,
        typeId: "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
      }),
      createPort({
        index: 1,
        typeId: "org.knime.core.node.BufferedDataTable",
      }),
    ],
  });

  const node2 = createComponentNode({
    id: "root:2",
    position: { x: 40, y: 10 },
    inPorts: [
      createPort({
        index: 0,
        typeId: "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
      }),
      createPort({
        index: 1,
        typeId: "org.knime.core.node.BufferedDataTable",
      }),
      createPort({
        index: 2,
        typeId: "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
      }),
    ],
    outPorts: [
      createPort({
        index: 0,
        typeId: "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
      }),
      createPort({
        index: 1,
        typeId: "org.knime.core.node.BufferedDataTable",
      }),
      createPort({
        index: 2,
        typeId: "org.knime.core.node.BufferedDataTable",
      }),
    ],
  });

  const node3 = createMetanode({
    id: "root:3",
    position: { x: 60, y: 10 },
    inPorts: [
      createPort({
        index: 0,
        typeId: "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
      }),
      createMetanodePort({
        index: 1,
        typeId: "org.knime.core.node.BufferedDataTable",
        nodeState: MetaNodePort.NodeStateEnum.CONFIGURED,
      }),
    ],
    outPorts: [
      createPort({
        index: 0,
        typeId: "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
      }),
      createMetanodePort({
        index: 1,
        typeId: "org.knime.core.node.BufferedDataTable",
        nodeState: MetaNodePort.NodeStateEnum.CONFIGURED,
      }),
    ],
  });

  const node4 = createNativeNode({
    id: "root:4",
    position: { x: 80, y: 10 },
    inPorts: [
      createPort({
        index: 0,
        typeId: "org.knime.core.node.port.flowvariable.FlowVariablePortObject",
      }),
      createPort({
        index: 1,
        typeId: "org.knime.core.node.BufferedDataTable",
      }),
    ],
  });

  const connections = connectMultipleNodes([
    // flow variable to flow variable
    { nodes: [node1, node2], ports: [0, 0] },
    // flow table to table
    { nodes: [node1, node2], ports: [1, 1] },
    // flow table to table
    { nodes: [node2, node3], ports: [2, 1] },
    // flow table to table
    { nodes: [node3, node4], ports: [1, 1] },
  ]);

  return {
    connections,
    nodes: arrayToDictionary([node1, node2, node3, node4], "id"),
  };
};

const extractNodeTemplates = (nodes: KnimeNode[]): NativeNodeInvariants[] => {
  const nodeTemplateIds = Object.values(nodes)
    .map((value) => (isNativeNode(value) ? value.templateId : null))
    .filter(Boolean);

  return nodeTemplateIds.map<NativeNodeInvariants>((id) => ({
    name: "Lorem",
    type: NativeNodeInvariants.TypeEnum.Source,
    icon: "data:image/png;base64,iVBORw0KGg",
    nodeFactory: {
      className: id!,
    },
  }));
};

export const createWorkflow = (data: DeepPartial<Workflow> = {}): Workflow => {
  const hasNodes = Object.keys(data?.nodes ?? {}).length > 0;
  const hasConnections = Object.keys(data?.connections ?? {}).length > 0;
  const hasAnnotations = (data.workflowAnnotations ?? []).length > 0;

  const baseWorkflow: Workflow = {
    info: {
      containerId: "root",
      containerType: WorkflowInfo.ContainerTypeEnum.Project,
      name: "KNIME_MockWorkflow",
    },
    metadata: {
      metadataType: EditableMetadata.MetadataTypeEnum.Project,
      description: {
        value: "",
        contentType: TypedText.ContentTypeEnum.Plain,
      },
      links: [],
      tags: [],
      lastEdit: new Date(),
    },
    dirty: false,
    connections: {},
    nodes: {},
    nodeTemplates: {},
    allowedActions: {
      canExecute: true,
      canCancel: false,
      canRedo: false,
      canUndo: true,
      canReset: false,
    },
    workflowAnnotations: [],
    projectId: "project1",
  };

  if (!hasNodes && !hasConnections) {
    const { connections, nodes } = createAndConnectNodes();

    baseWorkflow.nodes = nodes;
    baseWorkflow.connections = connections;

    baseWorkflow.nodeTemplates = arrayToDictionary(
      extractNodeTemplates(Object.values(nodes)),
      "type",
    );
  }

  if (!hasAnnotations) {
    const annotation = createWorkflowAnnotation({
      id: "annotation:1",
      text: {
        value: "Lorem ipsum",
      },
    });

    baseWorkflow.workflowAnnotations = [annotation];
  }

  return merge(baseWorkflow, data);
};
