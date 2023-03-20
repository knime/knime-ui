import { API } from '@api';

/**
 * @deprecated since the introduction of `generated-api.ts`,
 * you better call `API.application` methods directly.
 *
 * Fetch "application state", that is: opened tabs etc.
 * This is designed to be called on application startup.
 * @return {Promise} A promise containing the application state as defined in the API
 */
export const fetchApplicationState = async () => {
    try {
        const state = await API.application.getState();
        consola.debug('Current app state', state);

        return state;
    } catch (e) {
        consola.error(e);
        throw new Error('Could not load application state');
    }
};
