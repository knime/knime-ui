export const fetchFirst = method => async (component, context, options) => {
    if (!component.fetch) {
        return method(component, options);
    }

    // clone original config object to avoid pollution
    component = { ...component };

    // call fetch
    component.fetch = component.fetch.bind({
        // the "this"-object inside of the fetch-method
        $nuxt: {
            context
        }
    });
    await component.fetch();

    return method(component, options);
};
