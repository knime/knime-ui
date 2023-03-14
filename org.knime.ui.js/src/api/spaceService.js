import { API } from '@api';

/**
 * Fetches the content of a workflow group.
 * @param {String} spaceProviderId
 * @param {String} spaceId
 * @param {String} itemId
 * @returns {Promise<WorkflowGroupContent>}
 */
export const fetchWorkflowGroupContent = async ({ spaceProviderId, spaceId, itemId }) => {
    try {
        return await API.space.listWorkflowGroup({
            spaceId,
            spaceProviderId,
            itemId
        });
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not fetch space items for space ${spaceId}, item ${itemId}. Error: ${e}`);
    }
};

/**
 * Fetches a space provider.
 * @param {String} spaceProviderId
 * @returns {Promice<SpaceProvider>}
 */
export const fetchSpaceProvider = async ({ spaceProviderId }) => {
    try {
        return await API.space.getSpaceProvider({
            spaceProviderId
        });
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not fetch spaces. Error: ${e}`);
    }
};

/**
 * Creates a new workflow within the specified workflow group.
 * @param {String} spaceProviderId
 * @param {String} spaceId
 * @param {String} itemId
 * @param {String} workflowName
 * @returns {Promise<SpaceItem>}
 */
export const createWorkflow = async ({ spaceProviderId = 'local', spaceId, itemId, workflowName }) => {
    try {
        return await API.space.createWorkflow({
            spaceId,
            spaceProviderId,
            itemId,
            itemName: workflowName
        });
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not create a new workflow for space ${spaceId}, item ${itemId}. Error: ${e}`);
    }
};

/**
 * Renames a space item.
 * @param {String} spaceProviderId
 * @param {String} spaceId
 * @param {String} itemId
 * @param {String} newName
 * @returns {Promise<SpaceItem>}
 */
export const renameItem = async ({ spaceProviderId = 'local', spaceId, itemId, newName }) => {
    try {
        return await API.space.renameItem({
            spaceProviderId,
            spaceId,
            itemId,
            itemName: newName
        });
    } catch (e) {
        consola.error(`Could not rename item ${itemId} in space ${spaceId}. Error: ${e}`);
        throw e;
    }
};

/**
 * Creates a new folder aka workflow group.
 * @param {String} spaceProviderId
 * @param {String} spaceId
 * @param {String} itemId
 * @returns {Promise<SpaceItem>}
 */
export const createFolder = async ({ spaceProviderId = 'local', spaceId, itemId }) => {
    try {
        return await API.space.createWorkflowGroup({
            spaceProviderId,
            spaceId,
            itemId
        });
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not create a new folder for space ${spaceId}, item ${itemId}. Error: ${e}`);
    }
};

/**
 * Deletes space items.
 * @param {String} spaceProviderId
 * @param {String} spaceId
 * @param {String[]} itemIds
 * @returns {Promise<Response>}
 */
export const deleteItems = async ({ spaceProviderId = 'local', spaceId, itemIds }) => {
    try {
        return await API.space.deleteItems({
            spaceId,
            spaceProviderId,
            itemIds
        });
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not delete the items ${itemIds} from space ${spaceId}. Error: ${e}`);
    }
};

/**
 * Moves space items to a specified workflow group.
 * @param {String} spaceId
 * @param {String} spaceProviderId
 * @param {String} itemIds
 * @param {String} destWorkflowGroupItemId
 * @param {String} collisionStrategy
 * @returns {Promise<Response>}
 */
export const moveItems = async ({
    spaceProviderId = 'local',
    spaceId,
    itemIds,
    destWorkflowGroupItemId,
    collisionStrategy
}) => {
    try {
        return await API.space.moveItems({
            spaceId,
            spaceProviderId,
            itemIds,
            destWorkflowGroupItemId,
            collisionHandling: collisionStrategy
        });
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not move the items ${itemIds} from space ${spaceId} to ${destWorkflowGroupItemId}.
        Error: ${e}`);
    }
};
