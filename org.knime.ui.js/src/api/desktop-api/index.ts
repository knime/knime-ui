import { registerNotificationHandler } from '../json-rpc-client';

interface DesktopEventHandlers {
    SaveAndCloseWorkflowsEvent(payload: { projectIds: Array<string>, params: unknown[] }): void;
    ImportURIEvent(payload: { x: number; y: number }): void;
    ProgressEvent(payload: { status: 'STARTED' | 'FINISHED'; text: string }): void;
}

export const desktop = {
    registerEventHandlers: (handlers: DesktopEventHandlers) => {
        Object.entries(handlers).forEach(([eventName, eventHandler]) => {
            registerNotificationHandler(eventName, eventHandler);
        });
    }
};
