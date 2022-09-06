/**
 * Loads a component from an url and registers it
 * Requires the component to be built in library mode
 *
 * @param { Object } param.window window reference
 * @param { String } param.resourceLocation url to load component from
 * @param { String } param.componentName name of component
 * @returns { Promise }
 */
export const loadComponentLibrary = async ({ window, resourceLocation, componentName }) => {
    // resolve, if component has already been loaded
    if (window[componentName]) {
        return Promise.resolve();
    }
    
    // Load and mount component library
    await new Promise((resolve, reject) => {
        const script = window.document.createElement('script');
        script.async = true;
        
        script.addEventListener('load', () => {
            resolve(script);
        });
        
        script.addEventListener('error', () => {
            reject(new Error(`Script loading of "${resourceLocation}" failed`));
            window.document.head.removeChild(script);
        });
        
        script.src = resourceLocation;
        window.document.head.appendChild(script);
    });
    
    // Lib build defines component on `window` using the name defined during build.
    // This name has to match the componentName
    const component = window[componentName];
    if (!component) {
        throw new Error(`Component loading failed. Script invalid.`);
    }

    return Promise.resolve();
};
