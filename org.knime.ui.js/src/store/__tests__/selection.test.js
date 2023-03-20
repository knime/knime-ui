import { expect, describe, beforeEach, it } from 'vitest';
import { mockVuexStore } from '@/test/utils';

import * as selectionStoreConfig from '../selection';

describe('workflow store', () => {
    let $store, storeConfig;

    beforeEach(() => {
        storeConfig = {
            selection: {
                ...selectionStoreConfig
            },
            workflow: {
                state: {
                    activeWorkflow: {
                        nodes: {
                            'root:1': { id: 'root:1' },
                            'root:2': { id: 'root:2' }
                        },
                        connections: {
                            'root:2_1': { allowedActions: { canDelete: true }, id: 'root:2_1' },
                            'root:2_2': { allowedActions: { canDelete: true }, id: 'root:2_2' }
                        }
                    }
                }
            }
        };

        $store = mockVuexStore(storeConfig);
    });

    describe('mutations', () => {
        it('adding nodes to selection', () => {
            expect(Object.keys($store.state.selection.selectedNodes).length).toBe(0);
            $store.commit('selection/addNodesToSelection', ['root:1']);
            expect(Object.keys($store.state.selection.selectedNodes).length).toBe(1);
        });

        it('removes nodes from selection', () => {
            $store.commit('selection/addNodesToSelection', ['root:1']);
            expect(Object.keys($store.state.selection.selectedNodes).length).toBe(1);
            $store.commit('selection/removeNodesFromSelection', ['root:1']);
            expect(Object.keys($store.state.selection.selectedNodes).length).toBe(0);
        });

        it('adding connections to selection', () => {
            expect(Object.keys($store.state.selection.selectedConnections).length).toBe(0);
            $store.commit('selection/addConnectionsToSelection', ['root:1']);
            expect(Object.keys($store.state.selection.selectedConnections).length).toBe(1);
        });

        it('removes connections from selection', () => {
            $store.commit('selection/addConnectionsToSelection', ['root:1']);
            expect(Object.keys($store.state.selection.selectedConnections).length).toBe(1);
            $store.commit('selection/removeConnectionsFromSelection', ['root:1']);
            expect(Object.keys($store.state.selection.selectedConnections).length).toBe(0);
        });

        it('clear selection doesnt override state, if nothing to clear', () => {
            let selectedNodes = $store.state.selection.selectedNodes;
            let selectedConnections = $store.state.selection.selectedConnections;

            $store.commit('selection/clearSelection');

            expect($store.state.selection.selectedNodes).toBe(selectedNodes);
            expect($store.state.selection.selectedConnections).toBe(selectedConnections);
        });
    });

    describe('actions', () => {
        beforeEach(() => {
            storeConfig = {
                selection: {
                    ...selectionStoreConfig,
                    state: {
                        selectedNodes: {
                            'root:1': true
                        },
                        selectedConnections: {
                            'root:1_1': true
                        }
                    }
                },
                workflow: {
                    state: {
                        activeWorkflow: {
                            nodes: {
                                'root:1': { id: 'root:1' },
                                'root:2': { id: 'root:2' }
                            }
                        }
                    }
                }
            };

            $store = mockVuexStore(storeConfig);
        });

        it('deselects all selected Objects', () => {
            $store.dispatch('selection/deselectAllObjects');
            expect(Object.keys($store.state.selection.selectedNodes).length).toBe(0);
            expect(Object.keys($store.state.selection.selectedConnections).length).toBe(0);
        });

        it('selects all nodes', () => {
            $store.dispatch('selection/selectAllNodes');
            expect(Object.keys($store.state.selection.selectedNodes).length).toBe(2);
            expect(Object.keys($store.state.selection.selectedConnections).length).toBe(1);
        });

        it('selects a specific node', () => {
            $store.dispatch('selection/deselectAllObjects');
            $store.dispatch('selection/selectNode', 'root:1');
            expect(Object.keys($store.state.selection.selectedNodes).length).toBe(1);
            expect(Object.keys($store.state.selection.selectedConnections).length).toBe(0);
        });

        it('selects multiple nodes', () => {
            $store.dispatch('selection/deselectAllObjects');
            $store.dispatch('selection/selectNodes', ['root:1', 'root:2']);
            expect(Object.keys($store.state.selection.selectedNodes).length).toBe(2);
            expect(Object.keys($store.state.selection.selectedConnections).length).toBe(0);
        });

        it('deselects a specific node', () => {
            $store.dispatch('selection/deselectNode', 'root:1');
            expect(Object.keys($store.state.selection.selectedNodes).length).toBe(0);
            expect(Object.keys($store.state.selection.selectedConnections).length).toBe(1);
        });

        it('deselects multiple nodes', () => {
            storeConfig.selection.state.selectedNodes['root:2'] = true;
            $store = mockVuexStore(storeConfig);
            $store.dispatch('selection/deselectNodes', ['root:1', 'root:2']);
            expect(Object.keys($store.state.selection.selectedNodes).length).toBe(0);
            expect(Object.keys($store.state.selection.selectedConnections).length).toBe(1);
        });

        it('selects a specific connection', () => {
            $store.dispatch('selection/deselectAllObjects');
            $store.dispatch('selection/selectConnection', 'root:1_1');
            expect(Object.keys($store.state.selection.selectedNodes).length).toBe(0);
            expect(Object.keys($store.state.selection.selectedConnections).length).toBe(1);
        });

        it('deselects a specific connection', () => {
            $store.dispatch('selection/deselectConnection', 'root:1_1');
            expect(Object.keys($store.state.selection.selectedNodes).length).toBe(1);
            expect(Object.keys($store.state.selection.selectedConnections).length).toBe(0);
        });
    });

    describe('getters', () => {
        beforeEach(() => {
            $store.commit('selection/addNodesToSelection', ['root:1', 'root:2']);
            $store.commit('selection/addConnectionsToSelection', ['root:2_1', 'root:2_2']);

            $store.commit('selection/addNodesToSelection', ['unknown node']);
            $store.commit('selection/addConnectionsToSelection', ['unknown connection']);
        });

        it('get all selected node ids, for that nodes exist', () => {
            expect($store.getters['selection/selectedNodeIds']).toStrictEqual(['root:1', 'root:2']);
        });

        it('get multiple selected nodes', () => {
            expect($store.getters['selection/selectedNodes']).toStrictEqual(expect.objectContaining([
                { id: 'root:1' },
                { id: 'root:2' }
            ]));
            expect($store.getters['selection/singleSelectedNode']).toBeNull();
        });

        it('get single selected node', () => {
            $store.commit('selection/clearSelection');
            $store.commit('selection/addNodesToSelection', ['root:1']);

            expect($store.getters['selection/singleSelectedNode']).toStrictEqual({ id: 'root:1' });
        });

        it('test if node is selected', () => {
            expect($store.getters['selection/isNodeSelected']('root:1')).toBe(true);
            expect($store.getters['selection/isNodeSelected']('root:3')).toBe(false);
        });

        it('get multiple selected nodes without a active workflow', () => {
            storeConfig.workflow.state.activeWorkflow = null;
            $store = mockVuexStore(storeConfig);
            expect($store.getters['selection/selectedNodes']).toStrictEqual([]);
        });

        it('get all selected connections', () => {
            expect($store.getters['selection/selectedConnections']).toStrictEqual([
                { allowedActions: { canDelete: true }, id: 'root:2_1' },
                { allowedActions: { canDelete: true }, id: 'root:2_2' }
            ]);
        });

        it('get all selected connections without a active workflow', () => {
            storeConfig.workflow.state.activeWorkflow = null;
            $store = mockVuexStore(storeConfig);
            expect($store.getters['selection/selectedConnections']).toStrictEqual([]);
        });

        it('test if connection is selected', () => {
            expect($store.getters['selection/isConnectionSelected']('root:2_2')).toBe(true);
            expect($store.getters['selection/isConnectionSelected']('root:2_3')).toBe(false);
        });

        it('selection is empty', () => {
            expect($store.getters['selection/isSelectionEmpty']).toBe(false);

            $store.commit('selection/clearSelection');

            expect($store.getters['selection/isSelectionEmpty']).toBe(true);
        });
    });
});
