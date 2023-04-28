import { ref } from 'vue';

import { useWorkflowNameValidator } from '@/composables/useWorkflowNameValidator';
import type { FileExplorerItem } from './types';

type UseItemRenameOptions = {
    items: Array<FileExplorerItem>;
    focusInput?: () => void;
}

export const useItemRename = (options: UseItemRenameOptions) => {
    const activeRenameId = ref<string | null>(null);

    const { name, isValid, cleanName, errorMessage } = useWorkflowNameValidator({
        workflowItems: options.items,
        currentItemId: activeRenameId
    });

    const isActiveRenameItem = (item: FileExplorerItem) => item.id === activeRenameId.value;

    const setupRenameInput = (id: string, _name: string) => {
        activeRenameId.value = id;
        name.value = _name;

        // await nextTick();
        // // wait to next event loop to properly steal focus
        // await new Promise(r => setTimeout(r, 0));
        // // this.$renameRef[0]?.$refs?.input?.focus();
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

            // emit('renameFile', { itemId: activeRenameId.value, newName });
            clearRenameState();

            return { itemId: activeRenameId.value, newName };
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
