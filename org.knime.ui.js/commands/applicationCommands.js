import { openWorkflow } from '~api';

export default {
    openWorkflow: {
        text: 'Open workflow',
        hotkey: ['Ctrl', 'o'],
        execute:
            () => openWorkflow()
    },
    closeWorkflow: {
        text: 'Close workflow',
        hotkey: ['Ctrl', 'w'],
        execute:
            ({ $store }) => $store.dispatch('workflow/closeWorkflow')
    }
};
