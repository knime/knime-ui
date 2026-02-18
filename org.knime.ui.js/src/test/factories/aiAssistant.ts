import { merge } from "lodash-es";

import { KaiInquiry, KaiInquiryOption } from "@/api/gateway-api/generated-api";
import type { NodeWithExtensionInfo } from "@/store/ai/types";
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

export const createKaiInquiry = (
  data: Partial<KaiInquiry> = {},
): KaiInquiry => ({
  inquiryId: "inq-1",
  inquiryType: KaiInquiry.InquiryTypeEnum.Permission,
  title: "Allow data sampling?",
  description: "K-AI wants to sample data.",
  options: [
    { id: "deny", label: "Deny", style: KaiInquiryOption.StyleEnum.Secondary },
    { id: "allow", label: "Allow", style: KaiInquiryOption.StyleEnum.Primary },
  ],
  metadata: { actionId: "sample-data" },
  timeoutSeconds: 0,
  defaultOptionId: "",
  ...data,
});
