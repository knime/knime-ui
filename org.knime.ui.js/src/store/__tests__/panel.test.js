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

        store.commit('panel/toggleExpanded');

        expect(store.state.panel.expanded).toBe(true);
    });

    it('sets activeTab', () => {
        store.state.panel.activeTab = 'somethingElse';
        expect(store.state.panel.expanded).toBe(false);
        expect(store.state.panel.activeTab).not.toBe('workflowMetadata');

        store.commit('panel/setActiveTab', panelStoreConfig.TABS.WORKFLOW_METADATA);
        expect(store.state.panel.expanded).toBe(true);
        expect(store.state.panel.activeTab).toBe('workflowMetadata');

        store.commit('panel/setActiveTab', panelStoreConfig.TABS.NODE_REPOSITORY);
        expect(store.state.panel.expanded).toBe(true);
        expect(store.state.panel.activeTab).toBe('nodeRepository');
    });

    it('closes the panel', () => {
        store.state.panel.expanded = true;
        store.commit('panel/closePanel');

        expect(store.state.panel.expanded).toBe(false);
    });
});
