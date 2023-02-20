/* eslint-disable max-lines */
import Vuex from 'vuex';
import { createLocalVue } from '@vue/test-utils';

import { mockVuexStore } from '@/test/test-utils';

const getNodesGroupedByTagsResponse = {
    groups: [{
        nodes: [
            {
                component: false,
                icon: 'data:image/png;base64,xxx',
                name: 'GroupBy Bar Chart (JFreeChart)',
                id: 'org.knime.ext.jfc.node.groupbarchart.JfcGroupBarChartNodeFactory',
                type: 'Visualizer',
                inPorts: [
                    { typeId: 'org.knime.core.node.BufferedDataTable' }
                ],
                outPorts: [
                    { typeId: 'org.knime.core.node.BufferedDataTable' }
                ]
            },
            {
                component: false,
                icon: 'data:image/png;base64,xxx',
                name: 'Decision Tree Learner',
                id: 'org.knime.base.node.mine.decisiontree2.learner2.DecisionTreeLearnerNodeFactory3',
                type: 'Learner',
                inPorts: [
                    { typeId: 'org.knime.core.node.BufferedDataTable' }
                ],
                outPorts: [
                    { typeId: 'org.knime.core.node.BufferedDataTable' },
                    { typeId: 'org.knime.core.node.BufferedDataTable' },
                    { typeId: 'org.some.otherPorType' }
                ]
            }
        ],
        tag: 'Analytics'
    }]
};

const searchNodesResponse = {
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
            type: 'Learner',
            inPorts: [],
            outPorts: [
                { typeId: 'org.some.otherPorType' }
            ]
        }
    ]
};

const searchMoreNodesResponse = {
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

const getNodeDescriptionResponse = {
    id: 1,
    description: 'This is a node.',
    inPorts: [{ typeId: 'org.knime.core.node.BufferedDataTable' }],
    outPorts: []
};

describe('Node Repository store', () => {
    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

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

        const searchNodesMock = jest.fn().mockReturnValue(searchNodesResponse);
        const getNodesGroupedByTagsMock = jest.fn().mockReturnValue(getNodesGroupedByTagsResponse);
        const getNodeDescriptionMock = jest.fn().mockReturnValue(getNodeDescriptionResponse);

        // remove any caching on mocks
        jest.resetModules();
        jest.doMock('@api', () => ({
            __esModule: true,
            searchNodes: searchNodesMock,
            getNodesGroupedByTags: getNodesGroupedByTagsMock,
            getNodeDescription: getNodeDescriptionMock
        }), { virtual: true });

        const store = mockVuexStore({
            nodeRepository: await import('@/store/nodeRepository'),
            application: {
                state: {
                    availablePortTypes
                }
            }
        });

        const dispatchSpy = jest.spyOn(store, 'dispatch');

        return {
            dispatchSpy,
            availablePortTypes,
            store,
            searchNodesMock,
            getNodesGroupedByTagsMock,
            getNodeDescriptionMock
        };
    };

    it('creates an empty store', async () => {
        const { store } = await createStore();
        expect(store.state.nodeRepository).toStrictEqual({
            nodes: null,
            nodesPerCategory: [],
            totalNumCategories: null,
            totalNumNodes: 0,
            selectedTags: [],
            tags: [],
            query: '',
            nodeSearchPage: 0,
            categoryPage: 0,
            searchScrollPosition: 0,
            categoryScrollPosition: 0,
            selectedNode: null,
            isDraggingNode: false,
            isDescriptionPanelOpen: false,
            showingMoreNodes: false,
            moreNodes: null,
            moreNodesSearchPage: 0,
            moreTags: [],
            totalNumMoreNodes: 0
        });
    });

    describe('getters', () => {
        it('returns proper values for hasSearchParams', async () => {
            const { store } = await createStore();
            expect(store.getters['nodeRepository/hasSearchParams']).toBe(false);
            store.state.nodeRepository.query = 'value';
            expect(store.getters['nodeRepository/hasSearchParams']).toBe(true);
            store.state.nodeRepository.selectedTags = ['myTag1'];
            expect(store.getters['nodeRepository/hasSearchParams']).toBe(true);
            store.state.nodeRepository.query = '';
            expect(store.getters['nodeRepository/hasSearchParams']).toBe(true);
        });

        it('returns proper value for searchIsActive', async () => {
            const { store } = await createStore();
            expect(store.getters['nodeRepository/searchIsActive']).toBe(false);
            store.state.nodeRepository.nodes = [{ id: 1, name: 'Node' }];
            expect(store.getters['nodeRepository/searchIsActive']).toBe(false);
            store.state.nodeRepository.query = 'value';
            expect(store.getters['nodeRepository/searchIsActive']).toBe(true);
        });

        it('returns proper value for searchResultsContainSelectedNode', async () => {
            const { store } = await createStore();
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(false);
            store.state.nodeRepository.nodes = [{ id: 1, name: 'Node' }];
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(false);
            store.state.nodeRepository.selectedNode = { id: 1, name: 'Node' };
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(true);
            store.state.nodeRepository.nodes = [];
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(false);
            store.state.nodeRepository.moreNodes = [{ id: 1, name: 'Node' }];
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(false);
            store.state.nodeRepository.showingMoreNodes = true;
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(true);
        });

        it('returns proper value for nodesPerCategoryContainSelectedNode', async () => {
            const { store } = await createStore();
            expect(store.getters['nodeRepository/nodesPerCategoryContainSelectedNode']).toBe(false);
            store.state.nodeRepository.nodesPerCategory = [{ tag: 'tag:1', nodes: [{ id: 1 }, { id: 2 }] }];
            expect(store.getters['nodeRepository/nodesPerCategoryContainSelectedNode']).toBe(false);
            store.state.nodeRepository.selectedNode = { id: 1, name: 'Node' };
            expect(store.getters['nodeRepository/nodesPerCategoryContainSelectedNode']).toBe(true);
        });

        it('returns proper value for selectedNodeIsVisible for searches', async () => {
            const { store } = await createStore();
            store.state.nodeRepository.nodes = [{ id: 1, name: 'Node' }];
            store.state.nodeRepository.query = 'value';
            store.state.nodeRepository.selectedNode = { id: 3, name: 'Node 3' };
            expect(store.getters['nodeRepository/selectedNodeIsVisible']).toBe(false);
            store.state.nodeRepository.selectedNode = { id: 1, name: 'Node' };
            expect(store.getters['nodeRepository/selectedNodeIsVisible']).toBe(true);
        });

        it('returns proper value for selectedNodeIsVisible for categories', async () => {
            const { store } = await createStore();
            expect(store.getters['nodeRepository/selectedNodeIsVisible']).toBe(false);
            store.state.nodeRepository.nodesPerCategory = [{ tag: 'tag:1', nodes: [{ id: 1 }, { id: 2 }] }];
            store.state.nodeRepository.selectedNode = { id: 2, name: 'Node' };
            expect(store.getters['nodeRepository/selectedNodeIsVisible']).toBe(true);
        });

        it('returns proper value for tagsOfVisibleNodes', async () => {
            const { store } = await createStore();
            expect(store.getters['nodeRepository/tagsOfVisibleNodes']).toEqual([]);
            store.state.nodeRepository.tags = ['tag1', 'tag2'];
            expect(store.getters['nodeRepository/tagsOfVisibleNodes']).toEqual(['tag1', 'tag2']);
            store.state.nodeRepository.moreTags = ['tag3', 'tag1', 'tag4'];
            expect(store.getters['nodeRepository/tagsOfVisibleNodes']).toEqual(['tag1', 'tag2']);
            store.state.nodeRepository.showingMoreNodes = true;
            expect(store.getters['nodeRepository/tagsOfVisibleNodes']).toEqual(['tag1', 'tag2', 'tag3', 'tag4']);
            store.state.nodeRepository.tags = [];
            expect(store.getters['nodeRepository/tagsOfVisibleNodes']).toEqual(['tag3', 'tag1', 'tag4']);
        });
    });

    describe('mutations', () => {
        it('sets nodeSearchPage', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setNodeSearchPage', 2);
            expect(store.state.nodeRepository.nodeSearchPage).toBe(2);
        });

        it('sets totalNumNodes', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setTotalNumNodes', 2);
            expect(store.state.nodeRepository.totalNumNodes).toBe(2);
        });

        it('adds nodes (and skips duplicates)', async () => {
            const { store } = await createStore();
            const nodes = [{ id: 'node1' }, { id: 'node2' }];
            store.commit('nodeRepository/setNodes', nodes);

            const moreNodes = [...nodes, { id: 'node3' }];
            store.commit('nodeRepository/addNodes', moreNodes);
            expect(store.state.nodeRepository.nodes).toEqual(moreNodes);
        });

        it('sets nodes', async () => {
            const { store } = await createStore();
            const nodes = [{ id: 'node1' }];
            store.commit('nodeRepository/setNodes', [{ id: 'node1' }]);
            expect(store.state.nodeRepository.nodes).toEqual(nodes);
        });

        it('sets tags', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setTags', ['myTag', 'myTag2']);
            expect(store.state.nodeRepository.tags).toEqual(['myTag', 'myTag2']);
        });

        it('sets moreNodesSearchPage', async () => {
            const { store } = await createStore();
            expect(store.state.nodeRepository.moreNodesSearchPage).toBe(0);
            store.commit('nodeRepository/setMoreNodesSearchPage', 10);
            expect(store.state.nodeRepository.moreNodesSearchPage).toBe(10);
        });

        it('sets totalNumMoreNodes', async () => {
            const { store } = await createStore();
            expect(store.state.nodeRepository.totalNumMoreNodes).toBe(0);
            store.commit('nodeRepository/setTotalNumMoreNodes', 20);
            expect(store.state.nodeRepository.totalNumMoreNodes).toBe(20);
        });

        it('sets totalNumMoreNodes', async () => {
            const { store } = await createStore();
            expect(store.state.nodeRepository.totalNumMoreNodes).toBe(0);
            store.commit('nodeRepository/setTotalNumMoreNodes', 20);
            expect(store.state.nodeRepository.totalNumMoreNodes).toBe(20);
        });

        it('adds moreNodes (and skips duplicates)', async () => {
            const { store } = await createStore();
            const moreNodes = [{ id: 'node1' }, { id: 'node2' }];
            store.commit('nodeRepository/setMoreNodes', moreNodes);

            const newMoreNodes = [...moreNodes, { id: 'node3' }];
            store.commit('nodeRepository/addMoreNodes', newMoreNodes);
            expect(store.state.nodeRepository.moreNodes).toEqual(newMoreNodes);
        });

        it('sets moreNodes', async () => {
            const { store } = await createStore();
            expect(store.state.nodeRepository.moreNodes).toBeNull();
            store.commit('nodeRepository/setMoreNodes', [{ id: 'node1' }]);
            expect(store.state.nodeRepository.moreNodes).toEqual([{ id: 'node1' }]);
        });

        it('sets moreTags', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setMoreTags', ['tag2', 'tag3']);
            expect(store.state.nodeRepository.moreTags).toEqual(['tag2', 'tag3']);
        });

        it('sets selectedTags', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setSearchScrollPosition', 100);

            store.commit('nodeRepository/setSelectedTags', ['myTag', 'myTag2']);
            expect(store.state.nodeRepository.selectedTags).toEqual(['myTag', 'myTag2']);
            expect(store.state.nodeRepository.searchScrollPosition).toBe(0);
        });

        it('sets categoryPage', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setCategoryPage', 1);
            expect(store.state.nodeRepository.categoryPage).toBe(1);
        });

        it('sets nodesPerCategory', async () => {
            const { store } = await createStore();
            const categories = [{ tag: 'MyTag1', nodes: [{ id: 'node1' }] }];
            store.commit('nodeRepository/setNodesPerCategories', {
                groupedNodes: [{ tag: 'MyTag1', nodes: [{ id: 'node1' }] }]
            });
            expect(store.state.nodeRepository.nodesPerCategory).toStrictEqual(categories);
        });

        it('adds nodesPerCategory', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setNodesPerCategories', {
                groupedNodes: [{ tag: 'MyTag1', nodes: [{ id: 'node1' }] }]
            });
            const categories = store.state.nodeRepository.nodesPerCategory;
            const category = { tag: 'MyTag2', nodes: [{ id: 'node2' }] };
            store.commit('nodeRepository/setNodesPerCategories', {
                groupedNodes: [category],
                append: true
            });
            categories.push(category);

            expect(store.state.nodeRepository.nodesPerCategory).toStrictEqual(categories);
        });

        it('sets query', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setSearchScrollPosition', 100);

            store.commit('nodeRepository/setQuery', 'some value');
            expect(store.state.nodeRepository.query).toBe('some value');
            expect(store.state.nodeRepository.searchScrollPosition).toBe(0);
        });

        it('sets totalNumCategories', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setTotalNumCategories', 2);
            expect(store.state.nodeRepository.totalNumCategories).toEqual(2);
        });

        it('sets search scroll position', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setSearchScrollPosition', 22);
            expect(store.state.nodeRepository.searchScrollPosition).toEqual(22);
        });

        it('sets category scroll position', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setCategoryScrollPosition', 22);
            expect(store.state.nodeRepository.categoryScrollPosition).toEqual(22);
        });

        it('sets selected node', async () => {
            const { store } = await createStore();
            const node = { id: 'node1' };
            store.commit('nodeRepository/setSelectedNode', { id: 'node1' });
            expect(store.state.nodeRepository.selectedNode).toEqual(node);
        });

        it('sets isDraggingNode', async () => {
            const { store } = await createStore();
            expect(store.state.nodeRepository.isDraggingNode).toBe(false);
            store.commit('nodeRepository/setDraggingNode', true);
            expect(store.state.nodeRepository.isDraggingNode).toBe(true);
        });

        it('sets showingMoreNodes', async () => {
            const { store } = await createStore();
            expect(store.state.nodeRepository.showingMoreNodes).toBe(false);
            store.commit('nodeRepository/setShowingMoreNodes', true);
            expect(store.state.nodeRepository.showingMoreNodes).toBe(true);
        });
    });

    describe('actions', () => {
        const withPorts = (nodes, availablePortTypes) => nodes.map(node => ({
            ...node,
            inPorts: node.inPorts.map(port => ({
                ...port,
                ...availablePortTypes[port.typeId],
                type: availablePortTypes[port.typeId].kind
            })),
            outPorts: node.outPorts.map(port => ({
                ...port,
                ...availablePortTypes[port.typeId],
                type: availablePortTypes[port.typeId].kind
            }))
        }));

        describe('getAllNodes', () => {
            it('gets all nodes', async () => {
                const { store, getNodesGroupedByTagsMock, availablePortTypes } = await createStore();

                await store.dispatch('nodeRepository/getAllNodes', { append: true });
                expect(store.state.nodeRepository.categoryPage).toBe(1);

                expect(getNodesGroupedByTagsMock).toHaveBeenCalledWith({
                    numNodesPerTag: 6,
                    tagsOffset: 6,
                    tagsLimit: 3,
                    fullTemplateInfo: true
                });

                const { nodes, tag } = getNodesGroupedByTagsResponse.groups[0];

                // make sure the port information is mapped in to every node
                const groupedNodesWithPorts = withPorts(nodes, availablePortTypes);

                expect(store.state.nodeRepository.nodesPerCategory).toEqual([{
                    nodes: groupedNodesWithPorts,
                    tag
                }]);
            });

            it('gets all nodes without append and with a bigger tagsLimits', async () => {
                const { store, getNodesGroupedByTagsMock } = await createStore();

                await store.dispatch('nodeRepository/getAllNodes', { append: false });

                expect(store.state.nodeRepository.categoryPage).toBe(0);
                expect(store.state.nodeRepository.nodeSearchPage).toBe(0);
                expect(getNodesGroupedByTagsMock).toHaveBeenCalledWith({
                    numNodesPerTag: 6,
                    tagsOffset: 0,
                    tagsLimit: 6,
                    fullTemplateInfo: true
                });
            });

            it('skips getting nodes when all categories were loaded', async () => {
                const { store, getNodesGroupedByTagsMock } = await createStore();
                const categories = [{}, {}, {}];
                store.commit('nodeRepository/setNodesPerCategories', { groupedNodes: categories });
                store.commit('nodeRepository/setTotalNumCategories', categories.length);

                await store.dispatch('nodeRepository/getAllNodes', { append: true });
                expect(getNodesGroupedByTagsMock).not.toHaveBeenCalled();
            });
        });

        describe('search', () => {
            describe('searchNodes', () => {
                it('clears search results on empty parameters (tags and query)', async () => {
                    const { store } = await createStore();
                    await store.dispatch('nodeRepository/searchNodes');
                    expect(store.state.nodeRepository.nodes).toBeNull();
                    expect(store.state.nodeRepository.tags).toEqual([]);
                });

                it('searches for nodes', async () => {
                    const { store, searchNodesMock, availablePortTypes } = await createStore();
                    store.commit('nodeRepository/setQuery', 'lookup');
                    await store.dispatch('nodeRepository/searchNodes');

                    expect(store.state.nodeRepository.nodeSearchPage).toBe(0);
                    expect(searchNodesMock).toHaveBeenCalledWith({
                        allTagsMatch: true,
                        fullTemplateInfo: true,
                        nodeLimit: 100,
                        nodeOffset: 0,
                        query: 'lookup',
                        tags: [],
                        inCollection: true
                    });
                    expect(store.state.nodeRepository.totalNumNodes).toBe(searchNodesResponse.totalNumNodes);
                    expect(store.state.nodeRepository.nodes).toEqual(
                        withPorts(searchNodesResponse.nodes, availablePortTypes)
                    );
                    expect(store.state.nodeRepository.tags).toEqual(searchNodesResponse.tags);
                });

                it('searches for nodes with append=true', async () => {
                    const { store, searchNodesMock, availablePortTypes } = await createStore();
                    const dummyNode = { dummy: true };
                    store.commit('nodeRepository/setNodes', [dummyNode]);
                    store.commit('nodeRepository/setQuery', 'lookup');
                    await store.dispatch('nodeRepository/searchNodes', { append: true });

                    expect(store.state.nodeRepository.nodeSearchPage).toBe(1);
                    expect(searchNodesMock).toHaveBeenCalledWith({
                        allTagsMatch: true,
                        fullTemplateInfo: true,
                        nodeLimit: 100,
                        nodeOffset: 100,
                        query: 'lookup',
                        tags: [],
                        inCollection: true
                    });
                    expect(store.state.nodeRepository.totalNumNodes).toBe(searchNodesResponse.totalNumNodes);
                    expect(store.state.nodeRepository.nodes).toEqual([
                        dummyNode,
                        ...withPorts(searchNodesResponse.nodes, availablePortTypes)
                    ]);
                    expect(store.state.nodeRepository.tags).toEqual(searchNodesResponse.tags);
                });

                it('searches for nodes next page', async () => {
                    const { store, dispatchSpy } = await createStore();
                    await store.dispatch('nodeRepository/searchNodesNextPage');
                    expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchNodes', { append: true });
                });

                it('does not search for nodes next page if all nodes loaded', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeRepository.nodes = [{ dummy: true }];
                    store.state.nodeRepository.totalNumNodes = 1;
                    await store.dispatch('nodeRepository/searchNodesNextPage');
                    expect(dispatchSpy).not.toHaveBeenCalledWith('nodeRepository/searchNodes', expect.anything());
                });
            });

            describe('searchMoreNodes', () => {
                it('clears search results on empty parameters (tags and query)', async () => {
                    const { store, dispatchSpy } = await createStore();
                    await store.dispatch('nodeRepository/searchMoreNodes');
                    expect(dispatchSpy).toHaveBeenCalledWith(
                        'nodeRepository/clearSearchResultsForMoreNodes', undefined
                    );
                });

                it('searches for moreNodes', async () => {
                    const { store, searchNodesMock, availablePortTypes } = await createStore();
                    searchNodesMock.mockReturnValue(searchMoreNodesResponse);
                    store.commit('nodeRepository/setQuery', 'lookup');
                    await store.dispatch('nodeRepository/searchMoreNodes');

                    expect(store.state.nodeRepository.moreNodesSearchPage).toBe(0);
                    expect(searchNodesMock).toHaveBeenCalledWith({
                        allTagsMatch: true,
                        fullTemplateInfo: true,
                        nodeLimit: 100,
                        nodeOffset: 0,
                        query: 'lookup',
                        tags: [],
                        inCollection: false
                    });
                    expect(store.state.nodeRepository.totalNumMoreNodes).toBe(searchMoreNodesResponse.totalNumNodes);
                    expect(store.state.nodeRepository.moreNodes).toEqual(
                        withPorts(searchMoreNodesResponse.nodes, availablePortTypes)
                    );
                    expect(store.state.nodeRepository.moreTags).toEqual(searchMoreNodesResponse.tags);
                });

                it('searches for moreNodes with append=true', async () => {
                    const { store, searchNodesMock, availablePortTypes } = await createStore();
                    searchNodesMock.mockReturnValue(searchMoreNodesResponse);
                    const dummyNode = { dummy: true };
                    store.commit('nodeRepository/setMoreNodes', [dummyNode]);
                    store.commit('nodeRepository/setQuery', 'lookup');
                    await store.dispatch('nodeRepository/searchMoreNodes', { append: true });

                    expect(store.state.nodeRepository.moreNodesSearchPage).toBe(1);
                    expect(searchNodesMock).toHaveBeenCalledWith({
                        allTagsMatch: true,
                        fullTemplateInfo: true,
                        nodeLimit: 100,
                        nodeOffset: 100,
                        query: 'lookup',
                        tags: [],
                        inCollection: false
                    });
                    expect(store.state.nodeRepository.totalNumMoreNodes).toBe(searchMoreNodesResponse.totalNumNodes);
                    expect(store.state.nodeRepository.moreNodes).toEqual([
                        dummyNode,
                        ...withPorts(searchMoreNodesResponse.nodes, availablePortTypes)
                    ]);
                    expect(store.state.nodeRepository.moreTags).toEqual(searchMoreNodesResponse.tags);
                });

                it('searches for moreNodes next page', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeRepository.showingMoreNodes = true;
                    await store.dispatch('nodeRepository/searchMoreNodesNextPage');
                    expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchMoreNodes', { append: true });
                });

                it('does not search for moreNodes next page if hiding moreNodes', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeRepository.showingMoreNodes = false;
                    await store.dispatch('nodeRepository/searchMoreNodesNextPage');
                    expect(dispatchSpy).not.toHaveBeenCalledWith('nodeRepository/searchMoreNodes', expect.anything());
                });

                it('does not search for moreNodes next page if all nodes loaded', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeRepository.showingMoreNodes = true;
                    store.state.nodeRepository.moreNodes = [{ dummy: true }];
                    store.state.nodeRepository.totalNumMoreNodes = 1;
                    await store.dispatch('nodeRepository/searchMoreNodesNextPage');
                    expect(dispatchSpy).not.toHaveBeenCalledWith('nodeRepository/searchMoreNodes', expect.anything());
                });
            });

            describe('toggleShowingMoreNodes', () => {
                it('does toggle showingMoreNodes', async () => {
                    const { store } = await createStore();
                    await store.dispatch('nodeRepository/toggleShowingMoreNodes');
                    expect(store.state.nodeRepository.showingMoreNodes).toBe(true);
                    await store.dispatch('nodeRepository/toggleShowingMoreNodes');
                    expect(store.state.nodeRepository.showingMoreNodes).toBe(false);
                });

                it('does dispatch searchMoreNodes', async () => {
                    const { store, dispatchSpy } = await createStore();
                    await store.dispatch('nodeRepository/toggleShowingMoreNodes');
                    expect(store.state.nodeRepository.showingMoreNodes).toBe(true);
                    expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchMoreNodes', undefined);
                });

                it('does not dispatch searchMoreNodes if there are results already', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeRepository.moreNodes = [{ dummy: true }];
                    await store.dispatch('nodeRepository/toggleShowingMoreNodes');
                    expect(store.state.nodeRepository.showingMoreNodes).toBe(true);
                    expect(dispatchSpy).not.toHaveBeenCalledWith('nodeRepository/searchMoreNodes', expect.anything());
                });
            });

            it('updates query', async () => {
                const { store, dispatchSpy } = await createStore();
                await store.dispatch('nodeRepository/updateQuery', 'some value');

                expect(store.state.nodeRepository.query).toBe('some value');
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchNodesAndMoreNodes', undefined);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchNodes', undefined);
            });

            it('set selected Tags', async () => {
                const { store, dispatchSpy } = await createStore();
                store.dispatch('nodeRepository/setSelectedTags', ['myTag', 'myTag2']);
                expect(store.state.nodeRepository.selectedTags).toEqual(['myTag', 'myTag2']);

                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchNodesAndMoreNodes', undefined);
            });

            it('set selected tags to empty list', async () => {
                const { store, dispatchSpy } = await createStore();

                // Make sure that searchIsActive will return true
                store.commit('nodeRepository/setQuery', 'test');
                store.commit('nodeRepository/setNodes', ['dummy value']);

                await store.dispatch('nodeRepository/setSelectedTags', []);
                expect(store.state.nodeRepository.selectedTags).toEqual([]);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchNodesAndMoreNodes', undefined);
            });

            it('clears search params (tags and query)', async () => {
                const { store, dispatchSpy } = await createStore();
                store.dispatch('nodeRepository/clearSearchParams');

                expect(store.state.nodeRepository.selectedTags).toEqual([]);
                expect(store.state.nodeRepository.query).toEqual('');
                expect(store.state.nodeRepository.nodes).toEqual(null);
                expect(store.state.nodeRepository.tags).toEqual([]);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/clearSearchResults', undefined);
            });

            it('clears search results', async () => {
                const { store, dispatchSpy } = await createStore();

                store.dispatch('nodeRepository/clearSearchResults');
                expect(store.state.nodeRepository.nodes).toEqual(null);
                expect(store.state.nodeRepository.tags).toEqual([]);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/clearSearchResultsForMoreNodes', undefined);
            });

            it('clears search results for moreNodes', async () => {
                const { store } = await createStore();

                store.dispatch('nodeRepository/clearSearchResultsForMoreNodes');
                expect(store.state.nodeRepository.moreNodes).toEqual(null);
                expect(store.state.nodeRepository.moreTags).toEqual([]);
                expect(store.state.nodeRepository.totalNumMoreNodes).toEqual(0);
            });
        });

        describe('node description', () => {
            it('fetches node description', async () => {
                const { store, getNodeDescriptionMock, availablePortTypes } = await createStore();
                const selectedNode = {
                    id: 'node1',
                    nodeFactory: {
                        className: 'test',
                        settings: 'test1'
                    }
                };

                const result = await store.dispatch('nodeRepository/getNodeDescription', { selectedNode });

                expect(getNodeDescriptionMock).toHaveBeenCalled();
                expect(result).toEqual(withPorts([getNodeDescriptionResponse], availablePortTypes)[0]);
            });

            it('opens description panel', async () => {
                const { store } = await createStore();

                store.dispatch('nodeRepository/openDescriptionPanel');
                expect(store.state.nodeRepository.isDescriptionPanelOpen).toBe(true);
            });

            it('closes description panel', async () => {
                const { store } = await createStore();
                await store.dispatch('nodeRepository/openDescriptionPanel');

                await store.dispatch('nodeRepository/closeDescriptionPanel');
                expect(store.state.nodeRepository.isDescriptionPanelOpen).toBe(false);
            });
        });

        describe('reset', () => {
            it('resets search results', async () => {
                const { store, dispatchSpy } = await createStore();
                store.state.nodeRepository.query = 'foo';
                store.state.nodeRepository.nodes = [{ dummy: true }];
                await store.dispatch('nodeRepository/resetSearchAndCategories');
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/clearSearchResults', undefined);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchNodesAndMoreNodes', undefined);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/clearCategoryResults', undefined);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/getAllNodes', { append: false });
            });

            it('resets category results', async () => {
                const { store, dispatchSpy } = await createStore();
                await store.dispatch('nodeRepository/resetSearchAndCategories');
                expect(dispatchSpy).not.toHaveBeenCalledWith('nodeRepository/clearSearchResults', undefined);
                expect(dispatchSpy).not.toHaveBeenCalledWith('nodeRepository/searchNodesAndMoreNodes', undefined);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/clearCategoryResults', undefined);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/getAllNodes', { append: false });
            });

            it('clears category results', async () => {
                const { store } = await createStore();
                store.state.nodeRepository.nodesPerCategory = [{ dummy: true }];
                store.state.nodeRepository.totalNumCategories = 100;
                store.state.nodeRepository.categoryPage = 5;
                store.state.nodeRepository.categoryScrollPosition = 10;
                await store.dispatch('nodeRepository/clearCategoryResults');
                expect(store.state.nodeRepository.nodesPerCategory).toEqual([]);
                expect(store.state.nodeRepository.totalNumCategories).toEqual(null);
                expect(store.state.nodeRepository.categoryPage).toEqual(0);
                expect(store.state.nodeRepository.categoryScrollPosition).toEqual(0);
            });
        });
    });
});
