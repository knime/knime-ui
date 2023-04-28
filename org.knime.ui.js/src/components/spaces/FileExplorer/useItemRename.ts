import { ref, type ComputedRef, type Ref } from 'vue';

import { useWorkflowNameValidator } from '@/composables/useWorkflowNameValidator';
import type { FileExplorerItem } from './types';

type UseItemRenameOptions = {
    items: Array<FileExplorerItem>;
    focusInput?: () => void;
}

export type UseRenameReturn = {
    name: Ref<string>;
    isValid: Ref<boolean>;
    errorMessage: ComputedRef<string>;
    isActiveRenameItem: (item: FileExplorerItem) => boolean;
    setupRenameInput: (id: string, _name: string) => void;
    onRenameSubmit: (keyupEvent: KeyboardEvent, isClickAway?: boolean) => {
        itemId: string;
        newName: string;
    } | null;
    clearRenameState: () => void;
}

export const useItemRename = (options: UseItemRenameOptions): UseRenameReturn => {
    const activeRenameId = ref<string | null>(null);

    const { name, isValid, cleanName, errorMessage } = useWorkflowNameValidator({
        workflowItems: options.items,
        currentItemId: activeRenameId
    });

    const isActiveRenameItem = (item: FileExplorerItem) => item.id === activeRenameId.value;

    const setupRenameInput = (id: string, _name: string) => {
        activeRenameId.value = id;
        name.value = _name;

        options.focusInput?.();
    };

    const clearRenameState = () => {
        activeRenameId.value = null;
        name.value = '';
    };

    const onRenameSubmit = (
        keyupEvent: KeyboardEvent,
        isClickAway = false
    ): { itemId: string; newName: string } | null => {
        if (keyupEvent.key === 'Escape' || keyupEvent.key === 'Esc') {
            clearRenameState();
        }

        if ((keyupEvent.key === 'Enter' || isClickAway) && isValid.value) {
            const newName = cleanName(name.value.trim());

            if (newName === '') {
                clearRenameState();
                return null;
            }

            const id = activeRenameId.value;
            clearRenameState();

            return { itemId: id, newName };
        }

        return null;
    };

    return {
        name,
        isValid,
        errorMessage,
        isActiveRenameItem,
        setupRenameInput,
        onRenameSubmit,
        clearRenameState
    };
};
