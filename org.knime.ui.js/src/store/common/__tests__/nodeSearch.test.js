import { expect, describe, it, vi, afterEach } from 'vitest';
/* eslint-disable max-lines */
import { deepMocked, mockVuexStore, withPorts } from '@/test/utils';
import { API } from '@api';

export const searchNodesResponse = {
    tags: [
        'Analytics',
        'Integrations',
        'KNIME Labs'
    ],
    totalNumNodes: 1355,
    nodes: [
        {
            component: false,
            icon: 'data:image/png;base64,xxx',
            name: 'GroupBy Bar Chart (JFreeChart)',
            id: 'org.knime.ext.jfc.node.groupbarchart.JfcGroupBarChartNodeFactory',
            type: 'Visualizer',
            nodeFactory: { className: 'org.knime.ext.jfc.node.groupbarchart.JfcGroupBarChartNodeFactory' },
            inPorts: [
                { typeId: 'org.knime.core.node.BufferedDataTable' }
            ],
            outPorts: []
        },
        {
            component: false,
            icon: 'data:image/png;base64,xxx',
            name: 'Decision Tree Learner',
            id: 'org.knime.base.node.mine.decisiontree2.learner2.DecisionTreeLearnerNodeFactory3',
            nodeFactory: {
                className: 'org.knime.base.node.mine.decisiontree2.learner2.DecisionTreeLearnerNodeFactory3'
            },
            type: 'Learner',
            inPorts: [],
            outPorts: [
                { typeId: 'org.some.otherPorType' }
            ]
        }
    ]
};

const searchBottomNodesResponse = {
    tags: ['H2O Machine Learning', 'R'],
    totalNumNodes: 122,
    nodes: [
        {
            name: 'H2O to Table',
            id: 'org.knime.ext.h2o.nodes.frametotable.H2OFrameToTableNodeFactory',
            type: 'Manipulator',
            component: false,
            icon: 'data:image/png;base64,xxx',
            inPorts: [
                {
                    optional: false,
                    typeId: 'org.knime.ext.h2o.ports.H2OFramePortObject'
                }
            ],
            outPorts: [
                {
                    optional: false,
                    typeId: 'org.knime.core.node.BufferedDataTable'
                }
            ],
            nodeFactory: {
                className: 'org.knime.ext.h2o.nodes.frametotable.H2OFrameToTableNodeFactory'
            }
        },
        {
            name: 'R Source (Table)',
            id: 'org.knime.r.RReaderTableNodeFactory',
            type: 'Source',
            component: false,
            icon: 'data:image/png;base64,xxx',
            inPorts: [],
            outPorts: [
                {
                    optional: false,
                    typeId: 'org.knime.core.node.BufferedDataTable'
                }
            ],
            nodeFactory: {
                className: 'org.knime.r.RReaderTableNodeFactory'
            }
        }
    ]
};

const mockedAPI = deepMocked(API);

describe('Node search partial store', () => {
    const createStore = async () => {
        const availablePortTypes = {
            'org.knime.core.node.BufferedDataTable': {
                kind: 'table',
                color: 'green'
            },
            'org.some.otherPorType': {
                kind: 'other',
                color: 'blue'
            },
            'org.knime.ext.h2o.ports.H2OFramePortObject': {
                kind: 'other',
                color: 'red'
            }
        };

        // search is part of the node repo API
        mockedAPI.noderepository.searchNodes.mockReturnValue(searchNodesResponse);

        const store = mockVuexStore({
            nodeSearch: await import('@/store/common/nodeSearch'),
            application: {
                state: {
                    availablePortTypes
                }
            }
        });

        const dispatchSpy = vi.spyOn(store, 'dispatch');

        return {
            dispatchSpy,
            availablePortTypes,
            store
        };
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('creates an empty store', async () => {
        const { store } = await createStore();
        // this makes sure the test is failing if you add a property and do not adjust the test
        expect(store.state.nodeSearch).toStrictEqual({
            query: '',
            selectedTags: [],
            portTypeId: null,
            isShowingBottomNodes: false,
            searchScrollPosition: 0,
            topNodes: null,
            totalNumTopNodes: 0,
            topNodeSearchPage: 0,
            topNodesTags: [],
            bottomNodes: null,
            totalNumBottomNodes: 0,
            bottomNodeSearchPage: 0,
            bottomNodesTags: []
        });
    });

    describe('getters', () => {
        it('returns proper values for hasSearchParams', async () => {
            const { store } = await createStore();
            expect(store.getters['nodeSearch/hasSearchParams']).toBe(false);
            store.state.nodeSearch.query = 'value';
            expect(store.getters['nodeSearch/hasSearchParams']).toBe(true);
            store.state.nodeSearch.selectedTags = ['myTag1'];
            expect(store.getters['nodeSearch/hasSearchParams']).toBe(true);
            store.state.nodeSearch.query = '';
            expect(store.getters['nodeSearch/hasSearchParams']).toBe(true);
        });

        it('returns proper value for searchIsActive', async () => {
            const { store } = await createStore();
            expect(store.getters['nodeSearch/searchIsActive']).toBe(false);
            store.state.nodeSearch.topNodes = [{ id: 1, name: 'Node' }];
            expect(store.getters['nodeSearch/searchIsActive']).toBe(false);
            store.state.nodeSearch.query = 'value';
            expect(store.getters['nodeSearch/searchIsActive']).toBe(true);
        });

        it('returns proper value for searchResultsContainNodeId', async () => {
            const { store } = await createStore();
            expect(store.getters['nodeSearch/searchResultsContainNodeId'](null)).toBe(false);
            store.state.nodeSearch.topNodes = [{ id: 1, name: 'Node' }];
            expect(store.getters['nodeSearch/searchResultsContainNodeId'](null)).toBe(false);
            const selectedNode = { id: 1, name: 'Node' };
            expect(store.getters['nodeSearch/searchResultsContainNodeId'](selectedNode.id)).toBe(true);
            store.state.nodeSearch.topNodes = [];
            expect(store.getters['nodeSearch/searchResultsContainNodeId'](selectedNode.id)).toBe(false);
            store.state.nodeSearch.bottomNodes = [{ id: 1, name: 'Node' }];
            expect(store.getters['nodeSearch/searchResultsContainNodeId'](selectedNode.id)).toBe(false);
            store.state.nodeSearch.isShowingBottomNodes = true;
            expect(store.getters['nodeSearch/searchResultsContainNodeId'](selectedNode.id)).toBe(true);
        });

        it('returns proper value for tagsOfVisibleNodes', async () => {
            const { store } = await createStore();
            expect(store.getters['nodeSearch/tagsOfVisibleNodes']).toEqual([]);
            store.state.nodeSearch.topNodesTags = ['tag1', 'tag2'];
            expect(store.getters['nodeSearch/tagsOfVisibleNodes']).toEqual(['tag1', 'tag2']);
            store.state.nodeSearch.bottomNodesTags = ['tag3', 'tag1', 'tag4'];
            expect(store.getters['nodeSearch/tagsOfVisibleNodes']).toEqual(['tag1', 'tag2']);
            store.state.nodeSearch.isShowingBottomNodes = true;
            expect(store.getters['nodeSearch/tagsOfVisibleNodes']).toEqual(['tag1', 'tag2', 'tag3', 'tag4']);
            store.state.nodeSearch.topNodesTags = [];
            expect(store.getters['nodeSearch/tagsOfVisibleNodes']).toEqual(['tag3', 'tag1', 'tag4']);
        });
    });

    describe('mutations', () => {
        it('sets topNodeSearchPage', async () => {
            const { store } = await createStore();
            store.commit('nodeSearch/setTopNodeSearchPage', 2);
            expect(store.state.nodeSearch.topNodeSearchPage).toBe(2);
        });

        it('sets portTypeId', async () => {
            const { store } = await createStore();
            store.commit('nodeSearch/setPortTypeId', 'org.some.port.typeId');
            expect(store.state.nodeSearch.portTypeId).toBe('org.some.port.typeId');
        });

        it('sets totalNumTopNodes', async () => {
            const { store } = await createStore();
            store.commit('nodeSearch/setTotalNumTopNodes', 2);
            expect(store.state.nodeSearch.totalNumTopNodes).toBe(2);
        });

        it('adds topNodes (and skips duplicates)', async () => {
            const { store } = await createStore();
            const topNodes = [{ id: 'node1' }, { id: 'node2' }];
            store.commit('nodeSearch/setTopNodes', topNodes);

            const moreNodes = [...topNodes, { id: 'node3' }];
            store.commit('nodeSearch/addTopNodes', moreNodes);
            expect(store.state.nodeSearch.topNodes).toEqual(moreNodes);
        });

        it('sets topNodes', async () => {
            const { store } = await createStore();
            const topNodes = [{ id: 'node1' }];
            store.commit('nodeSearch/setTopNodes', [{ id: 'node1' }]);
            expect(store.state.nodeSearch.topNodes).toEqual(topNodes);
        });

        it('sets topNodesTags', async () => {
            const { store } = await createStore();
            store.commit('nodeSearch/setTopNodesTags', ['myTag', 'myTag2']);
            expect(store.state.nodeSearch.topNodesTags).toEqual(['myTag', 'myTag2']);
        });

        it('sets bottomNodeSearchPage', async () => {
            const { store } = await createStore();
            expect(store.state.nodeSearch.bottomNodeSearchPage).toBe(0);
            store.commit('nodeSearch/setBottomNodeSearchPage', 10);
            expect(store.state.nodeSearch.bottomNodeSearchPage).toBe(10);
        });

        it('sets totalNumBottomNodes', async () => {
            const { store } = await createStore();
            expect(store.state.nodeSearch.totalNumBottomNodes).toBe(0);
            store.commit('nodeSearch/setTotalNumBottomNodes', 20);
            expect(store.state.nodeSearch.totalNumBottomNodes).toBe(20);
        });

        it('adds bottomNodes (and skips duplicates)', async () => {
            const { store } = await createStore();
            const bottomNodes = [{ id: 'node1' }, { id: 'node2' }];
            store.commit('nodeSearch/setBottomNodes', bottomNodes);

            const newMoreNodes = [...bottomNodes, { id: 'node3' }];
            store.commit('nodeSearch/addBottomNodes', newMoreNodes);
            expect(store.state.nodeSearch.bottomNodes).toEqual(newMoreNodes);
        });

        it('sets bottomNodes', async () => {
            const { store } = await createStore();
            expect(store.state.nodeSearch.bottomNodes).toBeNull();
            store.commit('nodeSearch/setBottomNodes', [{ id: 'node1' }]);
            expect(store.state.nodeSearch.bottomNodes).toEqual([{ id: 'node1' }]);
        });

        it('sets bottomNodesTags', async () => {
            const { store } = await createStore();
            store.commit('nodeSearch/setBottomNodesTags', ['tag2', 'tag3']);
            expect(store.state.nodeSearch.bottomNodesTags).toEqual(['tag2', 'tag3']);
        });

        it('sets selectedTags', async () => {
            const { store } = await createStore();
            store.commit('nodeSearch/setSearchScrollPosition', 100);

            store.commit('nodeSearch/setSelectedTags', ['myTag', 'myTag2']);
            expect(store.state.nodeSearch.selectedTags).toEqual(['myTag', 'myTag2']);
            expect(store.state.nodeSearch.searchScrollPosition).toBe(0);
        });

        it('sets query', async () => {
            const { store } = await createStore();
            store.commit('nodeSearch/setSearchScrollPosition', 100);

            store.commit('nodeSearch/setQuery', 'some value');
            expect(store.state.nodeSearch.query).toBe('some value');
            expect(store.state.nodeSearch.searchScrollPosition).toBe(0);
        });

        it('sets search scroll position', async () => {
            const { store } = await createStore();
            store.commit('nodeSearch/setSearchScrollPosition', 22);
            expect(store.state.nodeSearch.searchScrollPosition).toBe(22);
        });

        it('sets isShowingBottomNodes', async () => {
            const { store } = await createStore();
            expect(store.state.nodeSearch.isShowingBottomNodes).toBe(false);
            store.commit('nodeSearch/setShowingBottomNodes', true);
            expect(store.state.nodeSearch.isShowingBottomNodes).toBe(true);
        });
    });

    describe('actions', () => {
        describe('search', () => {
            // eslint-disable-next-line vitest/max-nested-describe
            describe('searchNodes', () => {
                it('clears search results on empty parameters (tags and query)', async () => {
                    const { store } = await createStore();
                    await store.dispatch('nodeSearch/searchNodes');
                    expect(store.state.nodeSearch.topNodes).toBeNull();
                    expect(store.state.nodeSearch.topNodesTags).toEqual([]);
                });

                it('searches for topNodes', async () => {
                    const { store, availablePortTypes } = await createStore();
                    store.commit('nodeSearch/setQuery', 'lookup');
                    await store.dispatch('nodeSearch/searchNodes');

                    expect(store.state.nodeSearch.topNodeSearchPage).toBe(0);
                    expect(mockedAPI.noderepository.searchNodes).toHaveBeenCalledWith({
                        allTagsMatch: true,
                        fullTemplateInfo: true,
                        limit: 100,
                        offset: 0,
                        q: 'lookup',
                        tags: [],
                        portTypeId: null,
                        nodesPartition: 'IN_COLLECTION'
                    });
                    expect(store.state.nodeSearch.totalNumTopNodes).toBe(searchNodesResponse.totalNumNodes);
                    expect(store.state.nodeSearch.topNodes).toEqual(
                        withPorts(searchNodesResponse.nodes, availablePortTypes)
                    );
                    expect(store.state.nodeSearch.topNodesTags).toEqual(searchNodesResponse.tags);
                });

                it('searches for topNodes with append=true', async () => {
                    const { store, availablePortTypes } = await createStore();
                    const dummyNode = { dummy: true };
                    store.commit('nodeSearch/setTopNodes', [dummyNode]);
                    store.commit('nodeSearch/setQuery', 'lookup');
                    await store.dispatch('nodeSearch/searchNodes', { append: true });

                    expect(store.state.nodeSearch.topNodeSearchPage).toBe(1);
                    expect(mockedAPI.noderepository.searchNodes).toHaveBeenCalledWith({
                        allTagsMatch: true,
                        fullTemplateInfo: true,
                        limit: 100,
                        offset: 100,
                        q: 'lookup',
                        tags: [],
                        portTypeId: null,
                        nodesPartition: 'IN_COLLECTION'
                    });
                    expect(store.state.nodeSearch.totalNumTopNodes).toBe(searchNodesResponse.totalNumNodes);
                    expect(store.state.nodeSearch.topNodes).toEqual([
                        dummyNode,
                        ...withPorts(searchNodesResponse.nodes, availablePortTypes)
                    ]);
                    expect(store.state.nodeSearch.topNodesTags).toEqual(searchNodesResponse.tags);
                });

                it('searches for topNodes next page', async () => {
                    const { store, dispatchSpy } = await createStore();
                    await store.dispatch('nodeSearch/searchTopNodesNextPage');
                    expect(dispatchSpy).toHaveBeenCalledWith('nodeSearch/searchNodes', { append: true });
                });

                it('does not search for topNodes next page if all topNodes loaded', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeSearch.topNodes = [{ dummy: true }];
                    store.state.nodeSearch.totalNumTopNodes = 1;
                    await store.dispatch('nodeSearch/searchTopNodesNextPage');
                    expect(dispatchSpy).not.toHaveBeenCalledWith('nodeSearch/searchNodes', expect.anything());
                });
            });

            // eslint-disable-next-line vitest/max-nested-describe
            describe('searchBottomNodes', () => {
                it('clears search results on empty parameters (tags and query)', async () => {
                    const { store, dispatchSpy } = await createStore();
                    await store.dispatch('nodeSearch/searchNodes', { bottom: true });
                    expect(dispatchSpy).toHaveBeenCalledWith(
                        'nodeSearch/clearSearchResultsForBottomNodes', undefined
                    );
                });

                it('searches for bottomNodes', async () => {
                    const { store, availablePortTypes } = await createStore();
                    mockedAPI.noderepository.searchNodes.mockReturnValue(searchBottomNodesResponse);
                    store.commit('nodeSearch/setQuery', 'lookup');
                    await store.dispatch('nodeSearch/searchNodes', { bottom: true });

                    expect(store.state.nodeSearch.bottomNodeSearchPage).toBe(0);
                    expect(mockedAPI.noderepository.searchNodes).toHaveBeenCalledWith({
                        allTagsMatch: true,
                        fullTemplateInfo: true,
                        limit: 100,
                        offset: 0,
                        q: 'lookup',
                        tags: [],
                        portTypeId: null,
                        nodesPartition: 'NOT_IN_COLLECTION'
                    });
                    expect(store.state.nodeSearch.totalNumBottomNodes).toBe(
                        searchBottomNodesResponse.totalNumNodes
                    );
                    expect(store.state.nodeSearch.bottomNodes).toEqual(
                        withPorts(searchBottomNodesResponse.nodes, availablePortTypes)
                    );
                    expect(store.state.nodeSearch.bottomNodesTags).toEqual(searchBottomNodesResponse.tags);
                });

                it('searches for bottomNodes with append=true', async () => {
                    const { store, availablePortTypes } = await createStore();
                    mockedAPI.noderepository.searchNodes.mockReturnValue(searchBottomNodesResponse);
                    const dummyNode = { dummy: true };
                    store.commit('nodeSearch/setBottomNodes', [dummyNode]);
                    store.commit('nodeSearch/setQuery', 'lookup');
                    await store.dispatch('nodeSearch/searchNodes', { append: true, bottom: true });

                    // expect(store.state.nodeSearch.bottomNodeSearchPage).toBe(1);
                    expect(mockedAPI.noderepository.searchNodes).toHaveBeenCalledWith({
                        allTagsMatch: true,
                        fullTemplateInfo: true,
                        limit: 100,
                        offset: 100,
                        q: 'lookup',
                        tags: [],
                        portTypeId: null,
                        nodesPartition: 'NOT_IN_COLLECTION'
                    });
                    expect(store.state.nodeSearch.totalNumBottomNodes).toBe(
                        searchBottomNodesResponse.totalNumNodes
                    );
                    expect(store.state.nodeSearch.bottomNodes).toEqual([
                        dummyNode,
                        ...withPorts(searchBottomNodesResponse.nodes, availablePortTypes)
                    ]);
                    expect(store.state.nodeSearch.bottomNodesTags).toEqual(searchBottomNodesResponse.tags);
                });

                it('searches for bottomNodes next page', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeSearch.isShowingBottomNodes = true;
                    await store.dispatch('nodeSearch/searchBottomNodesNextPage');
                    expect(dispatchSpy).toHaveBeenCalledWith(
                        'nodeSearch/searchNodes',
                        { append: true, bottom: true }
                    );
                });

                it('does not search for bottomNodes next page if hiding bottomNodes', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeSearch.isShowingBottomNodes = false;
                    await store.dispatch('nodeSearch/searchBottomNodesNextPage');
                    expect(dispatchSpy).not.toHaveBeenCalledWith('nodeSearch/searchNodes', expect.anything());
                });

                it('does not search for bottomNodes next page if all nodes loaded', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeSearch.isShowingBottomNodes = true;
                    store.state.nodeSearch.bottomNodes = [{ dummy: true }];
                    store.state.nodeSearch.totalNumBottomNodes = 1;
                    await store.dispatch('nodeSearch/searchBottomNodesNextPage');
                    expect(dispatchSpy).not.toHaveBeenCalledWith('nodeSearch/searchNodes', expect.anything());
                });
            });

            // eslint-disable-next-line vitest/max-nested-describe
            describe('toggleShowingBottomNodes', () => {
                it('does toggle isShowingBottomNodes', async () => {
                    const { store } = await createStore();
                    await store.dispatch('nodeSearch/toggleShowingBottomNodes');
                    expect(store.state.nodeSearch.isShowingBottomNodes).toBe(true);
                    await store.dispatch('nodeSearch/toggleShowingBottomNodes');
                    expect(store.state.nodeSearch.isShowingBottomNodes).toBe(false);
                });

                it('does dispatch searchNodes', async () => {
                    const { store, dispatchSpy } = await createStore();
                    await store.dispatch('nodeSearch/toggleShowingBottomNodes');
                    expect(store.state.nodeSearch.isShowingBottomNodes).toBe(true);
                    expect(dispatchSpy).toHaveBeenCalledWith('nodeSearch/searchNodes', { bottom: true });
                });

                it('does not dispatch searchNodes if there are results already', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeSearch.bottomNodes = [{ dummy: true }];
                    await store.dispatch('nodeSearch/toggleShowingBottomNodes');
                    expect(store.state.nodeSearch.isShowingBottomNodes).toBe(true);
                    expect(dispatchSpy).not.toHaveBeenCalledWith('nodeSearch/searchNodes', expect.anything());
                });
            });

            it('updates query', async () => {
                const { store, dispatchSpy } = await createStore();
                await store.dispatch('nodeSearch/updateQuery', 'some value');

                expect(store.state.nodeSearch.query).toBe('some value');
                expect(dispatchSpy).toHaveBeenCalledWith('nodeSearch/searchTopAndBottomNodes', undefined);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeSearch/searchNodes', undefined);
            });

            it('set selected Tags', async () => {
                const { store, dispatchSpy } = await createStore();
                store.dispatch('nodeSearch/setSelectedTags', ['myTag', 'myTag2']);
                expect(store.state.nodeSearch.selectedTags).toEqual(['myTag', 'myTag2']);

                expect(dispatchSpy).toHaveBeenCalledWith('nodeSearch/searchTopAndBottomNodes', undefined);
            });

            it('set selected tags to empty list', async () => {
                const { store, dispatchSpy } = await createStore();

                // Make sure that searchIsActive will return true
                store.commit('nodeSearch/setQuery', 'test');
                store.commit('nodeSearch/setTopNodes', ['dummy value']);

                await store.dispatch('nodeSearch/setSelectedTags', []);
                expect(store.state.nodeSearch.selectedTags).toEqual([]);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeSearch/searchTopAndBottomNodes', undefined);
            });

            it('clears search params (topNodesTags and query)', async () => {
                const { store, dispatchSpy } = await createStore();
                store.dispatch('nodeSearch/clearSearchParams');

                expect(store.state.nodeSearch.selectedTags).toEqual([]);
                expect(store.state.nodeSearch.query).toBe('');
                expect(store.state.nodeSearch.topNodes).toBeNull();
                expect(store.state.nodeSearch.topNodesTags).toEqual([]);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeSearch/clearSearchResults', undefined);
            });

            it('clears search results', async () => {
                const { store, dispatchSpy } = await createStore();

                store.dispatch('nodeSearch/clearSearchResults');
                expect(store.state.nodeSearch.topNodes).toBeNull();
                expect(store.state.nodeSearch.topNodesTags).toEqual([]);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeSearch/clearSearchResultsForBottomNodes', undefined);
            });

            it('clears search results for bottomNodes', async () => {
                const { store } = await createStore();

                store.dispatch('nodeSearch/clearSearchResultsForBottomNodes');
                expect(store.state.nodeSearch.bottomNodes).toBeNull();
                expect(store.state.nodeSearch.bottomNodesTags).toEqual([]);
                expect(store.state.nodeSearch.totalNumBottomNodes).toBe(0);
            });
        });
    });
});
