import consola from 'consola';
import { level } from './jest-logger.config';
import { config } from '@vue/test-utils';

config.global.renderStubDefaultSlot = true;
config.global.stubs = {
    Portal: true,
    PortalTarget: true
};
consola.level = level;
