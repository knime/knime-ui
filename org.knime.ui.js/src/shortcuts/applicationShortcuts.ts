import type { UnionToShortcutRegistry } from './types';

type ApplicationShortcuts = UnionToShortcutRegistry<'closeWorkflow' | 'createWorkflow'>;

declare module './index' {
    interface ShortcutsRegistry extends ApplicationShortcuts {}
}

const applicationShortcuts: ApplicationShortcuts = {
    closeWorkflow: {
        text: 'Close workflow',
        hotkey: ['Ctrl', 'W'],
        execute:
            ({ $store }) => $store.dispatch('workflow/closeWorkflow', $store.state.workflow.activeWorkflow?.projectId),
        condition:
            ({ $store }) => $store.state.workflow.activeWorkflow?.projectId !== null
    },
    createWorkflow: {
        text: 'Create workflow',
        hotkey: ['Ctrl', 'N'],
        execute: ({ $store }) => $store.commit('spaces/setIsCreateWorkflowModalOpen', true)
    }
};

export default applicationShortcuts;
