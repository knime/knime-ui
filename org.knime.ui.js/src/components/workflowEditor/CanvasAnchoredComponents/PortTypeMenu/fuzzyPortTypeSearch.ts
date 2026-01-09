import Fuse from "fuse.js";

import type { AvailablePortTypes } from "@/api/custom-types";
import { type ExtendedPortType, ports } from "@/util/data-mappers";

const fuseOptions = {
  shouldSort: true,
  isCaseSensitive: false,
  minMatchCharLength: 0,
};

/**
 * Remove duplicate ports by name
 */
const removeDuplicates = (array: ExtendedPortType[]): ExtendedPortType[] => {
  const uniqueIds: string[] = [];
  const out = array.filter((item) => {
    const isDuplicate = uniqueIds.includes(item.name);

    if (isDuplicate) {
      return false;
    }

    uniqueIds.push(item.name);

    return true;
  });

  return out;
};

/**
 * Creates a port search function from the given criteria
 */
export const makeTypeSearch = ({
  availablePortTypes,
  typeIds,
  suggestedTypeIds = [],
  showHidden = false,
}: {
  availablePortTypes: AvailablePortTypes;
  typeIds: string[];
  suggestedTypeIds?: string[];
  showHidden?: boolean;
}) => {
  const includeType = false;
  const suggestedPorts = suggestedTypeIds.map(
    ports.toExtendedPortObject(availablePortTypes, includeType),
  );

  const otherPorts = typeIds
    .map(ports.toExtendedPortObject(availablePortTypes, includeType))
    // sort non-suggested ports by name
    .sort((a, b) => a.name.localeCompare(b.name));

  const allPortTypes = removeDuplicates(
    suggestedPorts // place suggested ports at the top of the list
      .concat(otherPorts)
      // decide whether to hidden ports
      .filter((portType) => showHidden || !portType.hidden),
  );

  const searchEngine = new Fuse(allPortTypes, {
    keys: ["name"],
    ...fuseOptions,
  });

  // displays all items for an empty search
  return function search(input = "", options?: Fuse.FuseSearchOptions) {
    const results =
      input === ""
        ? allPortTypes
        : searchEngine.search(input, options).map((result) => result.item);

    return results;
  };
};
