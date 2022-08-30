import { silentLogger } from '../logger';

describe('logger', () => {
    let originalConsola;

    beforeEach(() => {
        originalConsola = window.consola;
        delete window.consola;
    });

    afterEach(() => {
        window.consola = originalConsola;
    });

    it('defines a logger', () => {
        silentLogger();
        [
            'debug',
            'error',
            'fatal',
            'info',
            'log',
            'ready',
            'silent',
            'start',
            'success',
            'trace',
            'verbose',
            'warn'
        ].forEach(method => {
            expect(window.consola[method]).toBeInstanceOf(Function);
        });
    });
});
