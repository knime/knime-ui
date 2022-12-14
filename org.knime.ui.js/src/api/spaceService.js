import rpc from './json-rpc-adapter';

export const getSpaceItems =
    async ({ spaceId, itemId }) => {
        try {
            return await rpc(
                'SpaceService.getSpaceItems',
                spaceId, itemId
            );
        } catch (e) {
            consola.error(e);
            throw new Error(`Could not fetch space items for space ${spaceId}, item ${itemId}. Error: ${e}`);
        }
    };
