import type { AvailablePortTypes } from "@/api/custom-types";

import type { ExtendedPortType } from "./common";

/**
 * Maps a port `typeId` string or a object with a `typeId` property to a port object with all the properties of the
 * PortObject schema from the API
 * @param availablePortTypes Dictionary of all available port types and their information
 * @param includeType whether to include a `type` property holding the value of the port kind.
 * This is necessary when the data will injected (down the line) into the PortIcon component from webapps-common
 * which uses a `type` prop instead of a `kind`
 * @returns mapping function that takes either a string that represents the port type id, or an object
 * with a `typeId` property. This mapping function will return the whole port object with information about color, kind,
 * etc
 */
const toExtendedPortObject =
  (availablePortTypes: AvailablePortTypes, includeType = true) =>
  (input: string | { typeId: string }): ExtendedPortType => {
    const isStringInput = typeof input === "string";
    const fullPortObject = isStringInput
      ? availablePortTypes[input]
      : availablePortTypes[input.typeId];

    const result: ExtendedPortType = {
      ...fullPortObject,
      description: "No description available",
      typeId: isStringInput ? input : input?.typeId,
    };

    return includeType
      ? {
          ...result,
          // NodePreview component in webapps-common uses a `type` prop instead of kind.
          // See: WorkflowMetadata.vue or NodeTemplate.vue
          type: fullPortObject.kind,
          ...(typeof input === "string" ? {} : input),
        }
      : result;
  };

export const ports = { toExtendedPortObject };
