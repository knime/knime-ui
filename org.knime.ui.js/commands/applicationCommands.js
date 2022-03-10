import { openWorkflow } from '~api';

export default {
    openWorkflow: {
        text: 'Open workflow',
        hotkey: ['Ctrl', 'o'],
        execute:
            () => openWorkflow()
    }
};
