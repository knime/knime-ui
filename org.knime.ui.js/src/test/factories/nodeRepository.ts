import { merge } from "lodash-es";

import {
  NativeNodeInvariants,
  type NodePortTemplate,
  type NodeTemplate,
  PortType,
} from "@/api/gateway-api/generated-api";
import type { NodeTemplateWithExtendedPorts } from "@/lib/data-mappers";
import { nodeTemplate } from "@/lib/data-mappers";

import { PORT_TYPE_IDS, type PortTypeId } from "./common";
import { createAvailablePortTypes } from "./ports";

export const createNodePortTemplate = (
  data: Partial<NodePortTemplate & { typeId: PortTypeId }> = {},
): NodePortTemplate => {
  return {
    typeId: PORT_TYPE_IDS.BufferedDataTable,
    name: "Table",
    optional: false,
    ...data,
  };
};

export const createNodeTemplate = (
  data: Partial<NodeTemplate> = {},
): NodeTemplate => {
  return merge(
    {
      inPorts: [createNodePortTemplate()],
      outPorts: [
        createNodePortTemplate(),
        createNodePortTemplate({ typeId: "org.some.otherPorType" }),
      ],
      component: false,
      icon: "data:image/png;base64,xxx",
      nodeFactory: {
        className:
          "org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory",
      },
      name: "Column Filter",
      id: "org.knime.base.node.preproc.filter.column.DataColumnSpecFilterNodeFactory",
      type: NativeNodeInvariants.TypeEnum.Manipulator,
    },
    data,
  );
};

export const createNodeTemplateWithExtendedPorts = (
  data: Partial<NodeTemplateWithExtendedPorts> = {},
): NodeTemplateWithExtendedPorts => {
  const availablePortTypes = createAvailablePortTypes({
    "org.some.otherPorType": {
      kind: PortType.KindEnum.Other,
      name: "some other port",
    },
  });

  const template = createNodeTemplate(data);

  return nodeTemplate.toNodeTemplateWithExtendedPorts(availablePortTypes)(
    template,
  );
};
