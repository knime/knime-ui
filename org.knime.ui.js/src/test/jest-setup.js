import consola from 'consola';
import { level } from './jest-logger.config';
import { config } from '@vue/test-utils';

config.renderStubDefaultSlot = true;
consola.level = level;
