export const getters = {
    uiExtResourceLocation: () => ({ resourceInfo }) => resourceInfo.baseUrl + resourceInfo.path
};
