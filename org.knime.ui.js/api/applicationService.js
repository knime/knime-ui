import rpc from './json-rpc-adapter.js';

/**
 * Fetch "application state", that is: opened tabs etc.
 * This is designed to be called on application startup.
 * @return {Promise} A promise containing the application state as defined in the API
 */
export const fetchApplicationState = async () => {
    try {
        const state = await rpc('ApplicationService.getState');
        consola.debug('Current app state', state);

        return state;
    } catch (e) {
        consola.error(e);
        return new Error('Could not load application state');
    }
};
