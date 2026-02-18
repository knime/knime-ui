import type {
  ComponentNodeTemplateWithExtendedPorts,
  NodeTemplateWithExtendedPorts,
} from "@/lib/data-mappers";

export const isComponentNodeTemplate = (
  data: NodeTemplateWithExtendedPorts | ComponentNodeTemplateWithExtendedPorts,
): data is ComponentNodeTemplateWithExtendedPorts => Boolean(data.component);

export const shouldShowCommunityIcon = (
  data: NodeTemplateWithExtendedPorts | ComponentNodeTemplateWithExtendedPorts,
): boolean => {
  if (isComponentNodeTemplate(data)) {
    return data.isOwnedByAnotherIdentity;
  }

  return Boolean(data.extension?.vendor && !data.extension.vendor.isKNIME);
};
