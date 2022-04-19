import canvasCommands from '~/commands/canvasCommands';

jest.mock('raf-throttle', () => function (func) {
    return function (...args) {
        // eslint-disable-next-line no-invalid-this
        return func.apply(this, args);
    };
});

describe('canvasCommands', () => {
    let mockDispatch, $store;

    beforeEach(() => {
        mockDispatch = jest.fn();
        $store = {
            dispatch: mockDispatch
        };
    });

    test('fitToScreen', () => {
        canvasCommands.fitToScreen.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/fitToScreen');
    });

    test('fillScreen', () => {
        canvasCommands.fillScreen.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/fillScreen');
    });

    test('zoomIn', () => {
        canvasCommands.zoomIn.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/zoomCentered', { delta: 1 });
    });

    test('zoomOut', () => {
        canvasCommands.zoomOut.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/zoomCentered', { delta: -1 });
    });

    test('zoomTo75', () => {
        canvasCommands.zoomTo75.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/zoomCentered', { factor: 0.75 });
    });

    test('zoomTo100', () => {
        canvasCommands.zoomTo100.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/zoomCentered', { factor: 1 });
    });

    test('zoomTo125', () => {
        canvasCommands.zoomTo125.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/zoomCentered', { factor: 1.25 });
    });

    test('zoomTo150', () => {
        canvasCommands.zoomTo150.execute({ $store });
        expect(mockDispatch).toHaveBeenCalledWith('canvas/zoomCentered', { factor: 1.5 });
    });
});
