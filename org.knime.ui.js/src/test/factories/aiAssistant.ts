import { merge } from "lodash-es";

import type { NodeWithExtensionInfo } from "@/components/kaiSidebar/types";
import type { DeepPartial } from "../utils";

import { NODE_FACTORIES } from "./common";

export const createNodeWithExtensionInfo = (
  data: DeepPartial<NodeWithExtensionInfo> = {},
): NodeWithExtensionInfo => {
  const base: NodeWithExtensionInfo = {
    factoryId: NODE_FACTORIES.ExcelTableReaderNodeFactory,
    factoryName:
      "org.knime.ext.poi3.node.io.filehandling.excel.reader.ExcelTableReaderNodeFactory",
    featureName: "KNIME Excel Support",
    featureSymbolicName: "org.knime.features.ext.poi",
    owner: "knime",
    title: "Excel Reader",
  };

  return merge(base, data);
};
