import { loadComponentLibrary } from '~/util/loadComponentLibrary';

const mockComponentId = 'mock-component';
const mockComponent = { template: '<div/>' };
const mockResourceLocation = 'http://example.com/';

describe('loadComponentLibrary', () => {
    afterEach(() => {
        window[mockComponentId] = null;
        jest.clearAllMocks();
    });

    it('Resolves when the component is added to the window object', async () => {
        jest
            .spyOn(HTMLScriptElement.prototype, 'addEventListener')
            .mockImplementation((event, handler) => {
                if (event === 'load') {
                    window[mockComponentId] = mockComponent;
                    handler();
                }
            });
        
        await loadComponentLibrary({
            window,
            resourceLocation: mockResourceLocation,
            componentName: mockComponentId
        });
        
        const scriptEl = window.document.head.querySelector('script');
        expect(scriptEl).not.toBeNull();
        expect(scriptEl.async).toBe(true);
        expect(scriptEl.src).toBe(mockResourceLocation);
    });

    it('Throws if component is not added to window', async () => {
        jest
            .spyOn(HTMLScriptElement.prototype, 'addEventListener')
            .mockImplementation((event, handler) => {
                if (event === 'load') {
                    handler();
                }
            });
        
        await expect(loadComponentLibrary(window, mockResourceLocation, mockComponentId))
            .rejects
            .toThrow('Component loading failed. Script invalid.');
    });

    it('Throws if script load fails', async () => {
        jest
            .spyOn(HTMLScriptElement.prototype, 'addEventListener')
            .mockImplementation((event, handler) => {
                if (event === 'error') {
                    handler();
                }
            });
        
        await expect(loadComponentLibrary({
            window,
            resourceLocation: mockResourceLocation,
            componentName: mockComponentId
        }))
            .rejects
            .toThrow(`Script loading of "${mockResourceLocation}" failed`);
    });
});
