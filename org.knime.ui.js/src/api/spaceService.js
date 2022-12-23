import rpc from './json-rpc-adapter';

export const fetchWorkflowGroupContent =
    async ({ spaceId, itemId }) => {
        try {
            return await rpc(
                'SpaceService.listWorkflowGroup',
                spaceId, itemId
            );
        } catch (e) {
            consola.error(e);
            throw new Error(`Could not fetch space items for space ${spaceId}, item ${itemId}. Error: ${e}`);
        }
    };


export const fetchSpaceProvider =
    async ({ spaceProviderId }) => {
        try {
            return await rpc('SpaceService.getSpaceProvider', spaceProviderId);
        } catch (e) {
            consola.error(e);
            throw new Error(`Could not fetch spaces. Error: ${e}`);
        }
    };
