import type { AvailablePortTypes } from "@/api/custom-types";
import { ports } from "@/util/data-mappers";

/**
 * Checks if two ports are compatible and might be connected
 * @returns whether the ports can be connected
 */
const checkCompatibility = ({
  fromPort,
  toPort,
  availablePortTypes,
}: {
  fromPort: { typeId: string };
  toPort: { typeId: string };
  availablePortTypes: AvailablePortTypes;
}) => {
  const fromPortObjectInfo =
    ports.toExtendedPortObject(availablePortTypes)(fromPort);
  const toPortObjectInfo =
    ports.toExtendedPortObject(availablePortTypes)(toPort);
  const { compatibleTypes } = toPortObjectInfo;
  const { kind: fromPortKind } = fromPortObjectInfo;
  const { kind: toPortKind } = toPortObjectInfo;

  // 'generic' and 'table' port kinds are not compatible, so we check either direction
  if (
    (fromPortKind === "generic" && toPortKind === "table") ||
    (fromPortKind === "table" && toPortKind === "generic")
  ) {
    return false;
  }

  // generic ports accept any type of connection
  if (fromPortKind === "generic" || toPortKind === "generic") {
    return true;
  }

  // if compatible types exist, check if they contain each other
  if (compatibleTypes && compatibleTypes.includes(fromPort.typeId)) {
    return true;
  }

  // lastly, if port types ids don't match then they can't be connected
  return fromPort.typeId === toPort.typeId;
};

export const port = { checkCompatibility };
