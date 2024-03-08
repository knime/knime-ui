import { Node } from "@/api/gateway-api/generated-api";
import { isDesktop } from "./index";

/**
 * The purpose of this file is to declare operations that are __temporarily__
 * disabled for the BROWSER environment. This way we can reuse logic and have
 * a more fine-grained "semantic" control of the features we want to disable/enable.
 * Keep in mind that these are meant to be removed at some point, so only put
 * here that which is not enabled due to compatibility reasons (hence the file name).
 * The things which are meant to NEVER be used in the BROWSER environment should simply
 * use the variables exported from the `index` file
 */

export const canConfigureNodes = (nodeKind: Node.KindEnum) => {
  return isDesktop ? true : nodeKind === Node.KindEnum.Node;
};

export const canConfigureFlowVariables = () => isDesktop;

export const canDoComponentOperations = () => isDesktop;

export const canDetachPortViews = () => isDesktop;

export const canDetachNodeViews = () => isDesktop;

export const isSpaceExplorerSupported = () => isDesktop;

export const isLocalSaveSupported = () => isDesktop;

export const canOpenLegacyPortViews = () => isDesktop;
