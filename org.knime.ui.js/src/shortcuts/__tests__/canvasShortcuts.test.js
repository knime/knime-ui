import canvasShortcuts from '../canvasShortcuts';

jest.mock('raf-throttle', () => function (func) {
    return function (...args) {
        // eslint-disable-next-line no-invalid-this
        return func.apply(this, args);
    };
});

describe('canvasShortcuts', () => {
    let mockDispatch, $store;

    beforeEach(() => {
        mockDispatch = jest.fn();
        $store = {
            dispatch: mockDispatch
        };
    });

    test('fitToScreen', () => {
        canvasShortcuts.fitToScreen.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/fitToScreen');
    });

    test('fillScreen', () => {
        canvasShortcuts.fillScreen.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/fillScreen');
    });

    test('zoomIn', () => {
        canvasShortcuts.zoomIn.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/zoomCentered', { delta: 1 });
    });

    test('zoomOut', () => {
        canvasShortcuts.zoomOut.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/zoomCentered', { delta: -1 });
    });

    test('zoomTo75', () => {
        canvasShortcuts.zoomTo75.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/zoomCentered', { factor: 0.75 });
    });

    test('zoomTo100', () => {
        canvasShortcuts.zoomTo100.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/zoomCentered', { factor: 1 });
    });

    test('zoomTo125', () => {
        canvasShortcuts.zoomTo125.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/zoomCentered', { factor: 1.25 });
    });

    test('zoomTo150', () => {
        canvasShortcuts.zoomTo150.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/zoomCentered', { factor: 1.5 });
    });
});
