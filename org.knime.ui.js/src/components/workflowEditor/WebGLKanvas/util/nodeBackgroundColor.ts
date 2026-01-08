import { NativeNodeInvariants, Node } from "@/api/gateway-api/generated-api";
import { HibiscusDark, nodeBackgroundColors } from "@/style/colors";

/**
 * Gets the node color based on the type (e.g Source, Manipulator, etc).
 * Defaults to HibiscusDark for unknown types
 */
export const nodeColorFromType = (
  nodeType: NativeNodeInvariants.TypeEnum | null,
): string => {
  return (nodeType && nodeBackgroundColors[nodeType]) ?? HibiscusDark;
};

/**
 * Gets the main background color for a node. In case of native nodes, this is
 * derived from the `type`, in case of components this will be a static value
 * which is the default background color for components
 */
export const nodeBackgroundColor = ({
  kind,
  type,
}: {
  kind: Node.KindEnum;
  type: NativeNodeInvariants.TypeEnum | null;
}): string => {
  if (kind === Node.KindEnum.Component) {
    return nodeBackgroundColors.Component;
  }

  return nodeColorFromType(type);
};
