import rpc from './json-rpc-adapter';

export const fetchWorkflowGroupContent =
    async ({ spaceProviderId = 'local', spaceId, itemId }) => {
        try {
            return await rpc(
                'SpaceService.listWorkflowGroup',
                spaceId, spaceProviderId, itemId
            );
        } catch (e) {
            consola.error(e);
            throw new Error(`Could not fetch space items for space ${spaceId}, item ${itemId}. Error: ${e}`);
        }
    };
