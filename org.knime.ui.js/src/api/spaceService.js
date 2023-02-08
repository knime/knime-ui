import rpc from './json-rpc-adapter';

export const fetchWorkflowGroupContent = async ({ spaceProviderId, spaceId, itemId }) => {
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


export const fetchSpaceProvider = async ({ spaceProviderId }) => {
    try {
        return await rpc('SpaceService.getSpaceProvider', spaceProviderId);
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not fetch spaces. Error: ${e}`);
    }
};


export const createWorkflow = async ({ spaceProviderId = 'local', spaceId, itemId }) => {
    try {
        return await rpc(
            'SpaceService.createWorkflow',
            spaceId, spaceProviderId, itemId
        );
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not create a new workflow for space ${spaceId}, item ${itemId}. Error: ${e}`);
    }
};

export const renameItem = async ({ spaceProviderId = 'local', spaceId, itemId, newName }) => {
    try {
        return await rpc(
            'SpaceService.renameItem',
            spaceId, spaceProviderId, itemId, newName
        );
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not rename item ${itemId} in space ${spaceId}. Error: ${e}`);
    }
};

export const createFolder = async ({ spaceProviderId = 'local', spaceId, itemId }) => {
    try {
        return await rpc(
            'SpaceService.createWorkflowGroup',
            spaceId, spaceProviderId, itemId
        );
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not create a new folder for space ${spaceId}, item ${itemId}. Error: ${e}`);
    }
};

export const deleteItems = async ({ spaceProviderId = 'local', spaceId, itemIds }) => {
    try {
        return await rpc(
            'SpaceService.deleteItems',
            spaceId, spaceProviderId, itemIds
        );
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not delete the items ${itemIds} from space ${spaceId}. Error: ${e}`);
    }
};
