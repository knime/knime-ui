import Fuse from 'fuse.js';

const fuseOptions = {
    shouldSort: true,
    isCaseSensitive: false,
    minMatchCharLength: 0
};

/* This is a type search factory
 * @param { Object } entries
 * @param { String } entries.typeId
 * @param { String } entries.name
 * @returns { String -> [Object] } search function
 */
export const makeTypeSearch = ({ typeIds, showHidden = false, installedPortTypes }) => {
    let allPortTypes = typeIds
        .map(typeId => ({ ...installedPortTypes[typeId], typeId }))
        .filter(portType => showHidden || !portType.hidden);

    let searchEngine = new Fuse(allPortTypes, {
        keys: ['name'],
        ...fuseOptions
    });
    
    // displays all items for an empty search
    return function search(input, options) {
        let results = input === ''
            ? allPortTypes
            : searchEngine.search(input, options).map(result => result.item);

        return results;
    };
};
