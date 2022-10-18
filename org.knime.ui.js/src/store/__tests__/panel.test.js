import { mockVuexStore } from '@/test/test-utils';

import * as panelStoreConfig from '../panel';

describe('panel store', () => {
    let store;

    beforeEach(() => {
        store = mockVuexStore({
            panel: panelStoreConfig
        });
    });

    it('creates an empty store', () => {
        expect(store.state.panel).toStrictEqual({
            expanded: false,
            activeTab: 'workflowMetadata'
        });
    });

    it('toggles expanded', () => {
        expect(store.state.panel.expanded).toBe(false);

        store.dispatch('panel/toggleExpanded');

        expect(store.state.panel.expanded).toBe(true);
    });

    it('sets workflow meta active', () => {
        store.state.panel.activeTab = 'somethingElse';
        expect(store.state.panel.expanded).toBe(false);
        expect(store.state.panel.activeTab).not.toBe('workflowMetadata');

        store.dispatch('panel/setWorkflowMetaActive');

        expect(store.state.panel.expanded).toBe(true);
        expect(store.state.panel.activeTab).toBe('workflowMetadata');
    });

    it('sets node repo active', () => {
        expect(store.state.panel.expanded).toBe(false);
        expect(store.state.panel.activeTab).not.toBe('nodeRepository');

        store.dispatch('panel/setNodeRepositoryActive');

        expect(store.state.panel.expanded).toBe(true);
        expect(store.state.panel.activeTab).toBe('nodeRepository');
    });

    it('closes the panel', () => {
        store.state.panel.expanded = true;
        store.dispatch('panel/close');

        expect(store.state.panel.expanded).toBe(false);
    });
});
