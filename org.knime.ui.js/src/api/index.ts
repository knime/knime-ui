import { gateway } from './knime-gateway-api';
import { desktop } from './desktop-api';

export const API = {
    ...gateway,
    desktop
};

export * from './applicationService';
export * from './eventService';
export * from './nodeRepositoryService';
export * from './nodeService';
export * from './portService';
export * from './workflowService';
export * from './desktopApi';
export * from './spaceService';
