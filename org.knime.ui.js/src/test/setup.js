import consola from 'consola';
import { level } from './logger.config';
import { config } from '@vue/test-utils';

config.global.renderStubDefaultSlot = true;
config.global.stubs = {
    Portal: true,
    PortalTarget: true,
    PageBuilder: true
};
consola.level = level;

vi.mock('raf-throttle', () => ({
    default(func) {
        return function (...args) {
            // eslint-disable-next-line no-invalid-this
            return func.apply(this, args);
        };
    }
}));
