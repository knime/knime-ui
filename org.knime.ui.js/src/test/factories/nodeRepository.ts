import { merge } from "lodash-es";

import {
  NativeNodeInvariants,
  type NodePortTemplate,
  type NodeTemplate,
} from "@/api/gateway-api/generated-api";
import { PORT_TYPE_IDS, type PortTypeId } from "./common";

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
