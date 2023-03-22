import { createDeepMock } from '@/test/utils';
import * as realAPI from '../index';

export const API = createDeepMock(realAPI.API);
