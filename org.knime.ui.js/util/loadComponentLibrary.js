export const loadComponentLibrary = async (window, resourceLocation, componentName) => {
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
    // This name should match the componentId (this.extensionConfig.resourceInfo.id).
    const Component = window[componentName];
    if (!Component) {
        throw new Error(`Component loading failed. Script invalid.`);
    }
    return Promise.resolve();
};
