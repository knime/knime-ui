import { vi } from 'vitest';
import consola, { LogLevel } from 'consola';
import { config } from '@vue/test-utils';

config.global.renderStubDefaultSlot = true;
config.global.stubs = {
    Portal: true,
    PortalTarget: true,
    PageBuilder: true
};
consola.level = LogLevel.Error;

vi.mock('raf-throttle', () => ({
    default(func) {
        return function (this: any, ...args: any[]) {
            // eslint-disable-next-line no-invalid-this
            return func.apply(this, args);
        };
    }
}));

vi.mock('lodash', async () => {
    const actual = await vi.importActual('lodash');

    const debounce = function (func) {
        return function (...args) {
            // eslint-disable-next-line no-invalid-this
            return func.apply(this, args);
        };
    };

    const throttle = function (func) {
        return function (...args) {
            // eslint-disable-next-line no-invalid-this
            return func.apply(this, args);
        };
    };

    return {
        ...actual,
        debounce,
        throttle
    };
});
