import DOMPurify from "dompurify";

import type { ComponentNodeDescription } from "@/api/custom-types";
import type { ComponentNodeDescriptionWithExtendedPorts } from "@/util/portDataMapper";

export const sanitizeHTML = (input?: string): string => {
  if (!input || typeof input !== "string") {
    return "";
  }
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

export const sanitizeComponentDescription = (
  unsafeDescription: ComponentNodeDescription,
): ComponentNodeDescriptionWithExtendedPorts => {
  const cleaned: ComponentNodeDescription = {
    ...unsafeDescription,
    inPorts: (unsafeDescription.inPorts ?? []).map((port) => ({
      ...port,
      description: sanitizeHTML(port.description),
    })),
    outPorts: (unsafeDescription.outPorts ?? []).map((port) => ({
      ...port,
      description: sanitizeHTML(port.description),
    })),
  };

  return cleaned as unknown as ComponentNodeDescriptionWithExtendedPorts;
};
