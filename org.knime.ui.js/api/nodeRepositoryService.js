import rpc from './json-rpc-adapter.js';

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
export const searchNodes = ({ query, tags, allTagsMatch, nodeOffset, nodeLimit, fullTemplateInfo }) => {
    try {
        const nodes = rpc(
            'NodeRepositoryService.searchNodes',
            query,
            tags,
            allTagsMatch,
            nodeOffset,
            nodeLimit,
            fullTemplateInfo
        );
        consola.debug('Loaded nodes', nodes);

        return Promise.resolve(nodes);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(`Couldn't search nodes "${query}" with tags "${tags}"`));
    }
};
