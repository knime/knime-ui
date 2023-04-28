import type { SpaceItem } from '@/api/gateway-api/generated-api';

export type FileExplorerItem = SpaceItem & {
    isOpen: boolean;
    canBeRenamed: boolean;
    canBeDeleted: boolean;
};
