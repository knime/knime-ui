import { gateway } from './gateway-api';
import { desktop } from './desktop-api';

export const API = {
    ...gateway,
    desktop
};

export * from './applicationService';
export * from './nodeRepositoryService';
export * from './nodeService';
export * from './portService';
export * from './workflowService';
export * from './desktopApi';
export * from './spaceService';
