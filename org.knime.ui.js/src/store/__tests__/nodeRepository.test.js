/* eslint-disable max-lines */
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

const getNodeDescriptionResponse = {
    id: 1,
    description: 'This is a node.',
    inPorts: [{ typeId: 'org.knime.core.node.BufferedDataTable' }],
    outPorts: []
};

const getNodeTemplatesResponse = { 'org.knime.ext.h2o.nodes.frametotable.H2OFrameToTableNodeFactory': {
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
} };

describe('Node Repository store', () => {
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
        const getNodeTemplatesMock = jest.fn().mockReturnValue(getNodeTemplatesResponse);

        // remove any caching on mocks
        jest.resetModules();
        jest.doMock('@api', () => ({
            __esModule: true,
            searchNodes: searchNodesMock,
            getNodesGroupedByTags: getNodesGroupedByTagsMock,
            getNodeDescription: getNodeDescriptionMock,
            getNodeTemplates: getNodeTemplatesMock
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
            getNodeDescriptionMock,
            getNodeTemplatesMock
        };
    };

    it('creates an empty store', async () => {
        const { store } = await createStore();
        expect(store.state.nodeRepository).toStrictEqual({
            topNodes: null,
            nodesPerCategory: [],
            totalNumCategories: null,
            totalNumTopNodes: 0,
            selectedTags: [],
            topNodesTags: [],
            query: '',
            topNodeSearchPage: 0,
            categoryPage: 0,
            searchScrollPosition: 0,
            categoryScrollPosition: 0,
            selectedNode: null,
            isDraggingNode: false,
            isDescriptionPanelOpen: false,
            isShowingBottomNodes: false,
            nodeTemplates: {},
            bottomNodes: null,
            bottomNodeSearchPage: 0,
            bottomNodesTags: [],
            totalNumBottomNodes: 0
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
            store.state.nodeRepository.topNodes = [{ id: 1, name: 'Node' }];
            expect(store.getters['nodeRepository/searchIsActive']).toBe(false);
            store.state.nodeRepository.query = 'value';
            expect(store.getters['nodeRepository/searchIsActive']).toBe(true);
        });

        it('returns proper value for searchResultsContainSelectedNode', async () => {
            const { store } = await createStore();
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(false);
            store.state.nodeRepository.topNodes = [{ id: 1, name: 'Node' }];
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(false);
            store.state.nodeRepository.selectedNode = { id: 1, name: 'Node' };
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(true);
            store.state.nodeRepository.topNodes = [];
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(false);
            store.state.nodeRepository.bottomNodes = [{ id: 1, name: 'Node' }];
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(false);
            store.state.nodeRepository.isShowingBottomNodes = true;
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

        it('returns proper value for isSelectedNodeVisible for searches', async () => {
            const { store } = await createStore();
            store.state.nodeRepository.topNodes = [{ id: 1, name: 'Node' }];
            store.state.nodeRepository.query = 'value';
            store.state.nodeRepository.selectedNode = { id: 3, name: 'Node 3' };
            expect(store.getters['nodeRepository/isSelectedNodeVisible']).toBe(false);
            store.state.nodeRepository.selectedNode = { id: 1, name: 'Node' };
            expect(store.getters['nodeRepository/isSelectedNodeVisible']).toBe(true);
        });

        it('returns proper value for isSelectedNodeVisible for categories', async () => {
            const { store } = await createStore();
            expect(store.getters['nodeRepository/isSelectedNodeVisible']).toBe(false);
            store.state.nodeRepository.nodesPerCategory = [{ tag: 'tag:1', nodes: [{ id: 1 }, { id: 2 }] }];
            store.state.nodeRepository.selectedNode = { id: 2, name: 'Node' };
            expect(store.getters['nodeRepository/isSelectedNodeVisible']).toBe(true);
        });

        it('returns proper value for tagsOfVisibleNodes', async () => {
            const { store } = await createStore();
            expect(store.getters['nodeRepository/tagsOfVisibleNodes']).toEqual([]);
            store.state.nodeRepository.topNodesTags = ['tag1', 'tag2'];
            expect(store.getters['nodeRepository/tagsOfVisibleNodes']).toEqual(['tag1', 'tag2']);
            store.state.nodeRepository.bottomNodesTags = ['tag3', 'tag1', 'tag4'];
            expect(store.getters['nodeRepository/tagsOfVisibleNodes']).toEqual(['tag1', 'tag2']);
            store.state.nodeRepository.isShowingBottomNodes = true;
            expect(store.getters['nodeRepository/tagsOfVisibleNodes']).toEqual(['tag1', 'tag2', 'tag3', 'tag4']);
            store.state.nodeRepository.topNodesTags = [];
            expect(store.getters['nodeRepository/tagsOfVisibleNodes']).toEqual(['tag3', 'tag1', 'tag4']);
        });
    });

    describe('mutations', () => {
        it('sets topNodeSearchPage', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setTopNodeSearchPage', 2);
            expect(store.state.nodeRepository.topNodeSearchPage).toBe(2);
        });

        it('sets totalNumTopNodes', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setTotalNumTopNodes', 2);
            expect(store.state.nodeRepository.totalNumTopNodes).toBe(2);
        });

        it('adds topNodes (and skips duplicates)', async () => {
            const { store } = await createStore();
            const topNodes = [{ id: 'node1' }, { id: 'node2' }];
            store.commit('nodeRepository/setTopNodes', topNodes);

            const moreNodes = [...topNodes, { id: 'node3' }];
            store.commit('nodeRepository/addTopNodes', moreNodes);
            expect(store.state.nodeRepository.topNodes).toEqual(moreNodes);
        });

        it('sets topNodes', async () => {
            const { store } = await createStore();
            const topNodes = [{ id: 'node1' }];
            store.commit('nodeRepository/setTopNodes', [{ id: 'node1' }]);
            expect(store.state.nodeRepository.topNodes).toEqual(topNodes);
        });

        it('sets topNodesTags', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setTopNodesTags', ['myTag', 'myTag2']);
            expect(store.state.nodeRepository.topNodesTags).toEqual(['myTag', 'myTag2']);
        });

        it('sets bottomNodeSearchPage', async () => {
            const { store } = await createStore();
            expect(store.state.nodeRepository.bottomNodeSearchPage).toBe(0);
            store.commit('nodeRepository/setBottomNodeSearchPage', 10);
            expect(store.state.nodeRepository.bottomNodeSearchPage).toBe(10);
        });

        it('sets totalNumBottomNodes', async () => {
            const { store } = await createStore();
            expect(store.state.nodeRepository.totalNumBottomNodes).toBe(0);
            store.commit('nodeRepository/setTotalNumBottomNodes', 20);
            expect(store.state.nodeRepository.totalNumBottomNodes).toBe(20);
        });

        it('sets totalNumBottomNodes', async () => {
            const { store } = await createStore();
            expect(store.state.nodeRepository.totalNumBottomNodes).toBe(0);
            store.commit('nodeRepository/setTotalNumBottomNodes', 20);
            expect(store.state.nodeRepository.totalNumBottomNodes).toBe(20);
        });

        it('adds bottomNodes (and skips duplicates)', async () => {
            const { store } = await createStore();
            const bottomNodes = [{ id: 'node1' }, { id: 'node2' }];
            store.commit('nodeRepository/setBottomNodes', bottomNodes);

            const newMoreNodes = [...bottomNodes, { id: 'node3' }];
            store.commit('nodeRepository/addBottomNodes', newMoreNodes);
            expect(store.state.nodeRepository.bottomNodes).toEqual(newMoreNodes);
        });

        it('sets bottomNodes', async () => {
            const { store } = await createStore();
            expect(store.state.nodeRepository.bottomNodes).toBeNull();
            store.commit('nodeRepository/setBottomNodes', [{ id: 'node1' }]);
            expect(store.state.nodeRepository.bottomNodes).toEqual([{ id: 'node1' }]);
        });

        it('sets bottomNodesTags', async () => {
            const { store } = await createStore();
            store.commit('nodeRepository/setBottomNodesTags', ['tag2', 'tag3']);
            expect(store.state.nodeRepository.bottomNodesTags).toEqual(['tag2', 'tag3']);
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

        it('sets isShowingBottomNodes', async () => {
            const { store } = await createStore();
            expect(store.state.nodeRepository.isShowingBottomNodes).toBe(false);
            store.commit('nodeRepository/setShowingBottomNodes', true);
            expect(store.state.nodeRepository.isShowingBottomNodes).toBe(true);
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
                expect(store.state.nodeRepository.topNodeSearchPage).toBe(0);
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
                    expect(store.state.nodeRepository.topNodes).toBeNull();
                    expect(store.state.nodeRepository.topNodesTags).toEqual([]);
                });

                it('searches for topNodes', async () => {
                    const { store, searchNodesMock, availablePortTypes } = await createStore();
                    store.commit('nodeRepository/setQuery', 'lookup');
                    await store.dispatch('nodeRepository/searchNodes');

                    expect(store.state.nodeRepository.topNodeSearchPage).toBe(0);
                    expect(searchNodesMock).toHaveBeenCalledWith({
                        allTagsMatch: true,
                        fullTemplateInfo: true,
                        nodeLimit: 100,
                        nodeOffset: 0,
                        query: 'lookup',
                        tags: [],
                        additionalNodes: false
                    });
                    expect(store.state.nodeRepository.totalNumTopNodes).toBe(searchNodesResponse.totalNumNodes);
                    expect(store.state.nodeRepository.topNodes).toEqual(
                        withPorts(searchNodesResponse.nodes, availablePortTypes)
                    );
                    expect(store.state.nodeRepository.topNodesTags).toEqual(searchNodesResponse.tags);
                });

                it('searches for topNodes with append=true', async () => {
                    const { store, searchNodesMock, availablePortTypes } = await createStore();
                    const dummyNode = { dummy: true };
                    store.commit('nodeRepository/setTopNodes', [dummyNode]);
                    store.commit('nodeRepository/setQuery', 'lookup');
                    await store.dispatch('nodeRepository/searchNodes', { append: true });

                    expect(store.state.nodeRepository.topNodeSearchPage).toBe(1);
                    expect(searchNodesMock).toHaveBeenCalledWith({
                        allTagsMatch: true,
                        fullTemplateInfo: true,
                        nodeLimit: 100,
                        nodeOffset: 100,
                        query: 'lookup',
                        tags: [],
                        additionalNodes: false
                    });
                    expect(store.state.nodeRepository.totalNumTopNodes).toBe(searchNodesResponse.totalNumNodes);
                    expect(store.state.nodeRepository.topNodes).toEqual([
                        dummyNode,
                        ...withPorts(searchNodesResponse.nodes, availablePortTypes)
                    ]);
                    expect(store.state.nodeRepository.topNodesTags).toEqual(searchNodesResponse.tags);
                });

                it('searches for topNodes next page', async () => {
                    const { store, dispatchSpy } = await createStore();
                    await store.dispatch('nodeRepository/searchTopNodesNextPage');
                    expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchNodes', { append: true });
                });

                it('does not search for topNodes next page if all topNodes loaded', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeRepository.topNodes = [{ dummy: true }];
                    store.state.nodeRepository.totalNumTopNodes = 1;
                    await store.dispatch('nodeRepository/searchTopNodesNextPage');
                    expect(dispatchSpy).not.toHaveBeenCalledWith('nodeRepository/searchNodes', expect.anything());
                });
            });

            describe('searchBottomNodes', () => {
                it('clears search results on empty parameters (tags and query)', async () => {
                    const { store, dispatchSpy } = await createStore();
                    await store.dispatch('nodeRepository/searchNodes', { bottom: true });
                    expect(dispatchSpy).toHaveBeenCalledWith(
                        'nodeRepository/clearSearchResultsForBottomNodes', undefined
                    );
                });

                it('searches for bottomNodes', async () => {
                    const { store, searchNodesMock, availablePortTypes } = await createStore();
                    searchNodesMock.mockReturnValue(searchBottomNodesResponse);
                    store.commit('nodeRepository/setQuery', 'lookup');
                    await store.dispatch('nodeRepository/searchNodes', { bottom: true });

                    expect(store.state.nodeRepository.bottomNodeSearchPage).toBe(0);
                    expect(searchNodesMock).toHaveBeenCalledWith({
                        allTagsMatch: true,
                        fullTemplateInfo: true,
                        nodeLimit: 100,
                        nodeOffset: 0,
                        query: 'lookup',
                        tags: [],
                        additionalNodes: true
                    });
                    expect(store.state.nodeRepository.totalNumBottomNodes).toBe(
                        searchBottomNodesResponse.totalNumNodes
                    );
                    expect(store.state.nodeRepository.bottomNodes).toEqual(
                        withPorts(searchBottomNodesResponse.nodes, availablePortTypes)
                    );
                    expect(store.state.nodeRepository.bottomNodesTags).toEqual(searchBottomNodesResponse.tags);
                });

                it('searches for bottomNodes with append=true', async () => {
                    const { store, searchNodesMock, availablePortTypes } = await createStore();
                    searchNodesMock.mockReturnValue(searchBottomNodesResponse);
                    const dummyNode = { dummy: true };
                    store.commit('nodeRepository/setBottomNodes', [dummyNode]);
                    store.commit('nodeRepository/setQuery', 'lookup');
                    await store.dispatch('nodeRepository/searchNodes', { append: true, bottom: true });

                    // expect(store.state.nodeRepository.bottomNodeSearchPage).toBe(1);
                    expect(searchNodesMock).toHaveBeenCalledWith({
                        allTagsMatch: true,
                        fullTemplateInfo: true,
                        nodeLimit: 100,
                        nodeOffset: 100,
                        query: 'lookup',
                        tags: [],
                        additionalNodes: true
                    });
                    expect(store.state.nodeRepository.totalNumBottomNodes).toBe(
                        searchBottomNodesResponse.totalNumNodes
                    );
                    expect(store.state.nodeRepository.bottomNodes).toEqual([
                        dummyNode,
                        ...withPorts(searchBottomNodesResponse.nodes, availablePortTypes)
                    ]);
                    expect(store.state.nodeRepository.bottomNodesTags).toEqual(searchBottomNodesResponse.tags);
                });

                it('searches for bottomNodes next page', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeRepository.isShowingBottomNodes = true;
                    await store.dispatch('nodeRepository/searchBottomNodesNextPage');
                    expect(dispatchSpy).toHaveBeenCalledWith(
                        'nodeRepository/searchNodes',
                        { append: true, bottom: true }
                    );
                });

                it('does not search for bottomNodes next page if hiding bottomNodes', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeRepository.isShowingBottomNodes = false;
                    await store.dispatch('nodeRepository/searchBottomNodesNextPage');
                    expect(dispatchSpy).not.toHaveBeenCalledWith('nodeRepository/searchNodes', expect.anything());
                });

                it('does not search for bottomNodes next page if all nodes loaded', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeRepository.isShowingBottomNodes = true;
                    store.state.nodeRepository.bottomNodes = [{ dummy: true }];
                    store.state.nodeRepository.totalNumBottomNodes = 1;
                    await store.dispatch('nodeRepository/searchBottomNodesNextPage');
                    expect(dispatchSpy).not.toHaveBeenCalledWith('nodeRepository/searchNodes', expect.anything());
                });
            });

            describe('toggleShowingBottomNodes', () => {
                it('does toggle isShowingBottomNodes', async () => {
                    const { store } = await createStore();
                    await store.dispatch('nodeRepository/toggleShowingBottomNodes');
                    expect(store.state.nodeRepository.isShowingBottomNodes).toBe(true);
                    await store.dispatch('nodeRepository/toggleShowingBottomNodes');
                    expect(store.state.nodeRepository.isShowingBottomNodes).toBe(false);
                });

                it('does dispatch searchNodes', async () => {
                    const { store, dispatchSpy } = await createStore();
                    await store.dispatch('nodeRepository/toggleShowingBottomNodes');
                    expect(store.state.nodeRepository.isShowingBottomNodes).toBe(true);
                    expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchNodes', { bottom: true });
                });

                it('does not dispatch searchNodes if there are results already', async () => {
                    const { store, dispatchSpy } = await createStore();
                    store.state.nodeRepository.bottomNodes = [{ dummy: true }];
                    await store.dispatch('nodeRepository/toggleShowingBottomNodes');
                    expect(store.state.nodeRepository.isShowingBottomNodes).toBe(true);
                    expect(dispatchSpy).not.toHaveBeenCalledWith('nodeRepository/searchNodes', expect.anything());
                });
            });

            it('updates query', async () => {
                const { store, dispatchSpy } = await createStore();
                await store.dispatch('nodeRepository/updateQuery', 'some value');

                expect(store.state.nodeRepository.query).toBe('some value');
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchTopAndBottomNodes', undefined);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchNodes', undefined);
            });

            it('set selected Tags', async () => {
                const { store, dispatchSpy } = await createStore();
                store.dispatch('nodeRepository/setSelectedTags', ['myTag', 'myTag2']);
                expect(store.state.nodeRepository.selectedTags).toEqual(['myTag', 'myTag2']);

                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchTopAndBottomNodes', undefined);
            });

            it('set selected tags to empty list', async () => {
                const { store, dispatchSpy } = await createStore();

                // Make sure that searchIsActive will return true
                store.commit('nodeRepository/setQuery', 'test');
                store.commit('nodeRepository/setTopNodes', ['dummy value']);

                await store.dispatch('nodeRepository/setSelectedTags', []);
                expect(store.state.nodeRepository.selectedTags).toEqual([]);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchTopAndBottomNodes', undefined);
            });

            it('clears search params (topNodesTags and query)', async () => {
                const { store, dispatchSpy } = await createStore();
                store.dispatch('nodeRepository/clearSearchParams');

                expect(store.state.nodeRepository.selectedTags).toEqual([]);
                expect(store.state.nodeRepository.query).toEqual('');
                expect(store.state.nodeRepository.topNodes).toEqual(null);
                expect(store.state.nodeRepository.topNodesTags).toEqual([]);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/clearSearchResults', undefined);
            });

            it('clears search results', async () => {
                const { store, dispatchSpy } = await createStore();

                store.dispatch('nodeRepository/clearSearchResults');
                expect(store.state.nodeRepository.topNodes).toEqual(null);
                expect(store.state.nodeRepository.topNodesTags).toEqual([]);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/clearSearchResultsForBottomNodes', undefined);
            });

            it('clears search results for bottomNodes', async () => {
                const { store } = await createStore();

                store.dispatch('nodeRepository/clearSearchResultsForBottomNodes');
                expect(store.state.nodeRepository.bottomNodes).toEqual(null);
                expect(store.state.nodeRepository.bottomNodesTags).toEqual([]);
                expect(store.state.nodeRepository.totalNumBottomNodes).toEqual(0);
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
                store.state.nodeRepository.topNodes = [{ dummy: true }];
                await store.dispatch('nodeRepository/resetSearchAndCategories');
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/clearSearchResults', undefined);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchTopAndBottomNodes', undefined);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/clearCategoryResults', undefined);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/getAllNodes', { append: false });
            });

            it('resets category results', async () => {
                const { store, dispatchSpy } = await createStore();
                await store.dispatch('nodeRepository/resetSearchAndCategories');
                expect(dispatchSpy).not.toHaveBeenCalledWith('nodeRepository/clearSearchResults', undefined);
                expect(dispatchSpy).not.toHaveBeenCalledWith('nodeRepository/searchTopAndBottomNodes', undefined);
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

        it('fetches and caches nodeTemplates based on id', async () => {
            const { store } = await createStore();
            const nodeTemplate = await store.dispatch('nodeRepository/getNodeTemplate', 'org.knime.ext.h2o.nodes.frametotable.H2OFrameToTableNodeFactory');

            expect(nodeTemplate).toEqual(getNodeTemplatesResponse['org.knime.ext.h2o.nodes.frametotable.H2OFrameToTableNodeFactory']);
            expect(store.state.nodeRepository.nodeTemplates).toEqual(getNodeTemplatesResponse);
        });
    });
});
