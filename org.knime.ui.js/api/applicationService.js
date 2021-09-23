import rpc from './json-rpc-adapter.js';

/**
 * Fetch "application state", that is: opened tabs etc.
 * This is designed to be called on application startup.
 * @return {Promise} A promise containing the application state as defined in the API
 */
export const fetchApplicationState = () => {
    try {
        const state = rpc('ApplicationService.getState');
        consola.debug('Current app state', state);

        return Promise.resolve(state);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error('Could not load application state'));
    }
};
