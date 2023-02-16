import rpc from './json-rpc-adapter';

/**
 * Get repository nodes grouped by tags via RPC.
 *
 * @param {Number} numNodesPerTag - The number of nodes per tag to be returned.
 * @param {Number} tagsOffset - The number of tags to be skipped (for pagination).
 * @param {Number} tagsLimit - The maximum number of tags to be returned (mainly for pagination).
 * @param {Boolean} fullTemplateInfo - if the results should contain all node info (incl. img data).
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
 * @param {String} query - query for specific matches in the returned nodes or empty string.
 * @param {Array} tags - tags to filter the results of the search.
 * @param {Boolean} allTagsMatch - if the tags are inclusive or exclusive.
 * @param {Number} nodeOffset - the numeric offset of the search (for pagination).
 * @param {Number} nodeLimit - the number of results which should be returned.
 * @param {Boolean} fullTemplateInfo - if the results should contain all node info (incl. img data).
 * @param {Boolean} inCollection - if the results should contain nodes of the active collection or not
 * @returns {Object} the node repository search results.
 */
export const searchNodes = async (
    { query, tags, allTagsMatch, nodeOffset, nodeLimit, fullTemplateInfo, inCollection = null }
) => {
    try {
        const nodes = await rpc(
            'NodeRepositoryService.searchNodes',
            query,
            tags,
            allTagsMatch,
            nodeOffset,
            nodeLimit,
            fullTemplateInfo,
            inCollection
        );
        consola.debug('Loaded node search results', nodes);

        return nodes;
    } catch (e) {
        consola.error(e);
        throw new Error(`Couldn't search nodes "${query}" with tags "${tags}"`);
    }
};


/**
 * Get recommendations of nodes based on a predecessor (nodeId, portIdx) or just the most popular ones
 * (set nodeId and portIdx both to null).
 *
 * @param {String} projectId - ID of the workflow-project
 * @param {String} workflowId - The ID of a workflow which has the same format as a node-id
 * @param {String|null} nodeId - The ID of a node (optional)
 * @param {Number|null} portIdx - The port index of the source node we want recommendations for (optional)
 * @param {Number} nodesLimit - The maximum number of node recommendations to return
 * @param {Boolean} fullTemplateInfo - Whether to return the full template info or just some basic infos
 * @returns {Object} the recommendation results
 */
export const getNodeRecommendations = async ({
    projectId,
    workflowId,
    nodeId,
    portIdx,
    nodesLimit,
    fullTemplateInfo
}) => {
    try {
        const recommendations = await rpc(
            'NodeRepositoryService.getNodeRecommendations',
            projectId,
            workflowId,
            nodeId,
            portIdx,
            nodesLimit,
            fullTemplateInfo
        );

        return recommendations;
    } catch (e) {
        consola.error(e);
        throw new Error('Could not fetch recommended nodes');
    }
};
