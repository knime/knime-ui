import { capitalize } from "lodash-es";

import {
  type Alert,
  INTERNAL_ERROR_CODE,
  USER_ERROR_CODE,
} from "@knime/ui-extension-service";

export type NodeInfoParam = {
  nodeId: string;
  isNodeConfig?: boolean;
  nodeName?: string;
};

export const getHeadline = (toastType: string, nodeInfo: NodeInfoParam) => {
  if (nodeInfo.isNodeConfig) {
    return "Invalid node settings";
  }
  const nodeNameOrAlertType = nodeInfo.nodeName || capitalize(toastType); // NOSONAR
  return `${nodeNameOrAlertType} (${nodeInfo.nodeId})`;
};

const combine = (texts: (string | undefined | null)[]) =>
  texts.filter(Boolean).join("\n\n").trim();
const formatStackTrace = (stackTrace: string[]) => stackTrace.join("\n\t");

export const getMessage = (alert: Alert) => {
  if (alert.type === "error") {
    if (alert.code === USER_ERROR_CODE) {
      return combine([alert.message, alert.data.details]);
    }
    if (alert.code === INTERNAL_ERROR_CODE) {
      return combine([
        alert.message,
        alert.data.typeName,
        formatStackTrace(alert.data.stackTrace),
      ]);
    }
    return alert.message;
  } else {
    return combine(
      alert.warnings.flatMap(({ message, details }) => [message, details]),
    );
  }
};
