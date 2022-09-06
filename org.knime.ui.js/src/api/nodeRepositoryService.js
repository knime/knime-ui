import rpc from './json-rpc-adapter';

/**
 * Get repository nodes grouped by tags via RPC.
 *
 * @param {Number} cfg.numNodesPerTag - The number of nodes per tag to be returned.
 * @param {Number} cfg.tagsOffset - The number of tags to be skipped (for pagination).
 * @param {Number} cfg.tagsLimit - The maximum number of tags to be returned (mainly for pagination).
 * @param {Boolean} cfg.fullTemplateInfo - if the results should contain all node info (incl. img data).
 * @returns {Object} the grouped nodes results.
 */
export const getNodesGroupedByTags = async ({ numNodesPerTag, tagsOffset, tagsLimit, fullTemplateInfo }) => {
    try {
        const groupedNodes = await rpc(
            'NodeRepositoryService.getNodesGroupedByTags',
            numNodesPerTag,
            tagsOffset,
            tagsLimit,
            fullTemplateInfo
        );
        consola.debug('Loaded nodes grouped by tags', groupedNodes);

        return groupedNodes;
    } catch (e) {
        consola.error(e);
        throw new Error(`Couldn't get nodes grouped by tags`);
    }
};

/**
 * Search the node repository via RPC.
 *
 * @param {String} cfg.query - query for specific matches in the returned nodes or empty string.
 * @param {Array} cfg.tags - tags to filter the results of the search.
 * @param {Boolean} cfg.allTagsMatch - if the tags are inclusive or exclusive.
 * @param {Number} cfg.nodeOffset - the numeric offset of the search (for pagination).
 * @param {Number} cfg.nodeLimit - the number of results which should be returned.
 * @param {Boolean} cfg.fullTemplateInfo - if the results should contain all node info (incl. img data).
 * @returns {Object} the node repository search results.
 */
export const searchNodes = async ({ query, tags, allTagsMatch, nodeOffset, nodeLimit, fullTemplateInfo }) => {
    try {
        const nodes = await rpc(
            'NodeRepositoryService.searchNodes',
            query,
            tags,
            allTagsMatch,
            nodeOffset,
            nodeLimit,
            fullTemplateInfo
        );
        consola.debug('Loaded node search results', nodes);

        return nodes;
    } catch (e) {
        consola.error(e);
        throw new Error(`Couldn't search nodes "${query}" with tags "${tags}"`);
    }
};
