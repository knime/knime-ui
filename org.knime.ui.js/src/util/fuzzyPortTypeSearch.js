import Fuse from "fuse.js";

import { toExtendedPortObject } from "@/util/portDataMapper";

const fuseOptions = {
  shouldSort: true,
  isCaseSensitive: false,
  minMatchCharLength: 0,
};

/**
 * Remove duplicate objects in an array by a given key's value
 * @param {Array} array the input array of objects
 * @param {String} compareKey the object property to use for comparison. Repeated values will be removed
 * @returns {Array}
 */
const removeDuplicates = (array, compareKey = "name") => {
  const uniqueIds = [];
  const out = array.filter((item) => {
    const isDuplicate = uniqueIds.includes(item[compareKey]);

    if (isDuplicate) {
      return false;
    }

    uniqueIds.push(item[compareKey]);

    return true;
  });

  return out;
};

/**
 * Creates a port search function from the given criteria
 * @param {Object} options
 * @param {Record<string, Object>} options.availablePortTypes A dictionary object containing all the possible port types
 * @param {Array<String>} options.suggestedTypeIds A dictionary object containing all the possible port types
 * @param {Array<String>} options.typeIds A list of port type ids that will be used for the search
 * @param {Boolean} [options.showHidden] Whether hidden ports should be included in the search
 */
export const makeTypeSearch = ({
  availablePortTypes,
  typeIds,
  suggestedTypeIds = [],
  showHidden = false,
}) => {
  const includeType = false;
  const suggestedPorts = suggestedTypeIds.map(
    toExtendedPortObject(availablePortTypes, includeType),
  );

  const otherPorts = typeIds
    .map(toExtendedPortObject(availablePortTypes, includeType))
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
  return function search(input = "", options) {
    const results =
      input === ""
        ? allPortTypes
        : searchEngine.search(input, options).map((result) => result.item);

    return results;
  };
};
