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
        require('~knime-ui/plugins/logger');
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
