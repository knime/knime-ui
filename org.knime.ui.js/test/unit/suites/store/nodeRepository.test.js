/* eslint-disable no-magic-numbers */
import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

const getNodesGroupedByTagsResponse = {
    groups: [{
        nodes: [
            {
                component: false,
                icon: 'data:image/png;base64,xxx',
                name: 'GroupBy Bar Chart (JFreeChart)',
                id: 'org.knime.ext.jfc.node.groupbarchart.JfcGroupBarChartNodeFactory',
                type: 'Visualizer'
            },
            {
                component: false,
                icon: 'data:image/png;base64,xxx',
                name: 'Decision Tree Learner',
                id: 'org.knime.base.node.mine.decisiontree2.learner2.DecisionTreeLearnerNodeFactory3',
                type: 'Learner'
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
            type: 'Visualizer'
        },
        {
            component: false,
            icon: 'data:image/png;base64,xxx',
            name: 'Decision Tree Learner',
            id: 'org.knime.base.node.mine.decisiontree2.learner2.DecisionTreeLearnerNodeFactory3',
            type: 'Learner'
        }
    ]
};

const getNodeDescriptionResponse = {
    id: 1,
    description: 'This is a node.'
};

describe('Node Repository store', () => {
    let store, localVue, searchNodesMock, getNodesGroupedByTagsMock, getNodeDescriptionMock, commitSpy, dispatchSpy;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);

        searchNodesMock = jest.fn().mockReturnValue(searchNodesResponse);
        getNodesGroupedByTagsMock = jest.fn().mockReturnValue(getNodesGroupedByTagsResponse);
        getNodeDescriptionMock = jest.fn().mockReturnValue(getNodeDescriptionResponse);
    });

    beforeEach(async () => {
        jest.clearAllMocks();

        jest.doMock('~api', () => ({
            __esModule: true,
            searchNodes: searchNodesMock,
            getNodesGroupedByTags: getNodesGroupedByTagsMock,
            getNodeDescription: getNodeDescriptionMock
        }), { virtual: true });

        store = mockVuexStore({
            nodeRepository: await import('~/store/nodeRepository'),
            application: { availablePortTypes: {} }
        });
        commitSpy = jest.spyOn(store, 'commit');
        dispatchSpy = jest.spyOn(store, 'dispatch');
    });

    it('creates an empty store', () => {
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
            nodeDescriptionObject: null,
            isDraggingNode: false
        });
    });

    describe('getters', () => {
        it('returns proper values for hasSearchParams', () => {
            expect(store.getters['nodeRepository/hasSearchParams']).toBe(false);
            store.state.nodeRepository.query = 'value';
            expect(store.getters['nodeRepository/hasSearchParams']).toBe(true);
            store.state.nodeRepository.selectedTags = ['myTag1'];
            expect(store.getters['nodeRepository/hasSearchParams']).toBe(true);
            store.state.nodeRepository.query = '';
            expect(store.getters['nodeRepository/hasSearchParams']).toBe(true);
        });

        it('returns proper value for searchIsActive', () => {
            expect(store.getters['nodeRepository/searchIsActive']).toBe(false);
            store.state.nodeRepository.nodes = [{ id: 1, name: 'Node' }];
            expect(store.getters['nodeRepository/searchIsActive']).toBe(false);
            store.state.nodeRepository.query = 'value';
            expect(store.getters['nodeRepository/searchIsActive']).toBe(true);
        });

        it('returns proper value for searchResultsContainSelectedNode', () => {
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(false);
            store.state.nodeRepository.nodes = [{ id: 1, name: 'Node' }];
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(false);
            store.state.nodeRepository.selectedNode = { id: 1, name: 'Node' };
            expect(store.getters['nodeRepository/searchResultsContainSelectedNode']).toBe(true);
        });

        it('returns proper value for nodesPerCategoryContainSelectedNode', () => {
            expect(store.getters['nodeRepository/nodesPerCategoryContainSelectedNode']).toBe(false);
            store.state.nodeRepository.nodesPerCategory = [{ tag: 'tag:1', nodes: [{ id: 1 }, { id: 2 }] }];
            expect(store.getters['nodeRepository/nodesPerCategoryContainSelectedNode']).toBe(false);
            store.state.nodeRepository.selectedNode = { id: 1, name: 'Node' };
            expect(store.getters['nodeRepository/nodesPerCategoryContainSelectedNode']).toBe(true);
        });

        it('returns proper value for selectedNodeIsVisible for searches', () => {
            // searchIsActive = true
            store.state.nodeRepository.nodes = [{ id: 1, name: 'Node' }];
            store.state.nodeRepository.query = 'value';
            store.state.nodeRepository.selectedNode = { id: 3, name: 'Node 3' };
            expect(store.getters['nodeRepository/selectedNodeIsVisible']).toBe(false);
            store.state.nodeRepository.selectedNode = { id: 1, name: 'Node' };
            expect(store.getters['nodeRepository/selectedNodeIsVisible']).toBe(true);
        });

        it('returns proper value for selectedNodeIsVisible for categories', () => {
            // searchIsActive = false
            expect(store.getters['nodeRepository/selectedNodeIsVisible']).toBe(false);
            store.state.nodeRepository.nodesPerCategory = [{ tag: 'tag:1', nodes: [{ id: 1 }, { id: 2 }] }];
            store.state.nodeRepository.selectedNode = { id: 2, name: 'Node' };
            expect(store.getters['nodeRepository/selectedNodeIsVisible']).toBe(true);
        });
    });

    describe('mutations', () => {
        it('sets nodeSearchPage', () => {
            store.commit('nodeRepository/setNodeSearchPage', 2);
            expect(store.state.nodeRepository.nodeSearchPage).toBe(2);
        });

        it('sets totalNumNodes', () => {
            store.commit('nodeRepository/setTotalNumNodes', 2);
            expect(store.state.nodeRepository.totalNumNodes).toBe(2);
        });

        it('adds nodes (and skips duplicates)', () => {
            const nodes = [{
                id: 'node1'
            }, {
                id: 'node2'
            }];
            store.commit('nodeRepository/setNodes', nodes);

            const moreNodes = [...nodes, {
                id: 'node3'
            }];
            store.commit('nodeRepository/addNodes', moreNodes);
            expect(store.state.nodeRepository.nodes).toEqual(moreNodes);
        });

        it('sets nodes', () => {
            const nodes = [{ id: 'node1' }];
            store.commit('nodeRepository/setNodes', [{ id: 'node1' }]);
            expect(store.state.nodeRepository.nodes).toEqual(nodes);
        });

        it('sets tags', () => {
            store.commit('nodeRepository/setTags', ['myTag', 'myTag2']);
            expect(store.state.nodeRepository.tags).toEqual(['myTag', 'myTag2']);
        });

        it('sets selectedTags', () => {
            store.commit('nodeRepository/setSearchScrollPosition', 100);

            store.commit('nodeRepository/setSelectedTags', ['myTag', 'myTag2']);
            expect(store.state.nodeRepository.selectedTags).toEqual(['myTag', 'myTag2']);
            expect(store.state.nodeRepository.searchScrollPosition).toBe(0);
        });

        it('sets categoryPage', () => {
            store.commit('nodeRepository/setCategoryPage', 1);
            expect(store.state.nodeRepository.categoryPage).toBe(1);
        });

        it('sets nodesPerCategory', () => {
            const categories = [{ tag: 'MyTag1', nodes: [{ id: 'node1' }] }];
            store.commit('nodeRepository/setNodesPerCategories', [{ tag: 'MyTag1', nodes: [{ id: 'node1' }] }]);
            expect(store.state.nodeRepository.nodesPerCategory).toStrictEqual(categories);
        });

        it('adds nodesPerCategory', () => {
            store.commit('nodeRepository/setNodesPerCategories', [{ tag: 'MyTag1', nodes: [{ id: 'node1' }] }]);
            const categories = store.state.nodeRepository.nodesPerCategory;
            const category = { tag: 'MyTag2', nodes: [{ id: 'node2' }] };
            store.commit('nodeRepository/addNodesPerCategories', [category]);
            categories.push(category);

            expect(store.state.nodeRepository.nodesPerCategory).toStrictEqual(categories);
        });

        it('sets query', () => {
            store.commit('nodeRepository/setSearchScrollPosition', 100);

            store.commit('nodeRepository/setQuery', 'some value');
            expect(store.state.nodeRepository.query).toBe('some value');
            expect(store.state.nodeRepository.searchScrollPosition).toBe(0);
        });

        it('sets totalNumCategories', () => {
            store.commit('nodeRepository/setTotalNumCategories', 2);
            expect(store.state.nodeRepository.totalNumCategories).toEqual(2);
        });

        it('sets search scroll position', () => {
            store.commit('nodeRepository/setSearchScrollPosition', 22);
            expect(store.state.nodeRepository.searchScrollPosition).toEqual(22);
        });

        it('sets category scroll position', () => {
            store.commit('nodeRepository/setCategoryScrollPosition', 22);
            expect(store.state.nodeRepository.categoryScrollPosition).toEqual(22);
        });

        it('sets selected node', () => {
            const node = { id: 'node1' };
            store.commit('nodeRepository/setSelectedNode', { id: 'node1' });
            expect(store.state.nodeRepository.selectedNode).toEqual(node);
        });

        it('sets node description object', () => {
            const node = { id: 'node1' };
            store.commit('nodeRepository/setNodeDescription', { id: 'node1' });
            expect(store.state.nodeRepository.nodeDescriptionObject).toEqual(node);
        });

        it('sets isDraggingNode', () => {
            expect(store.state.nodeRepository.isDraggingNode).toBe(false);
            store.commit('nodeRepository/setDraggingNode', true);
            expect(store.state.nodeRepository.isDraggingNode).toBe(true);
        });
    });

    describe('actions', () => {
        describe('getAllNodes', () => {
            it('gets all nodes without append and with a bigger tagsLimits', async () => {
                await store.dispatch('nodeRepository/getAllNodes', false);
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setCategoryPage', 0, undefined);
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setNodeSearchPage', 0, undefined);
                expect(getNodesGroupedByTagsMock).toHaveBeenCalledWith({
                    numNodesPerTag: 6,
                    tagsOffset: 0,
                    tagsLimit: 6,
                    fullTemplateInfo: true
                });
                expect(commitSpy).toHaveBeenCalledWith(
                    'nodeRepository/setNodesPerCategories', getNodesGroupedByTagsResponse.groups, undefined
                );
            });

            it('gets all nodes', async () => {
                await store.dispatch('nodeRepository/getAllNodes', true);
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setCategoryPage', 1, undefined);
                expect(getNodesGroupedByTagsMock).toHaveBeenCalledWith({
                    numNodesPerTag: 6,
                    tagsOffset: 6,
                    tagsLimit: 3,
                    fullTemplateInfo: true
                });
                expect(commitSpy).toHaveBeenCalledWith(
                    'nodeRepository/addNodesPerCategories', getNodesGroupedByTagsResponse.groups, undefined
                );
            });

            it('skips getting nodes when all categories were loaded', async () => {
                const categories = [{}, {}, {}];
                store.commit('nodeRepository/setNodesPerCategories', categories);
                store.commit('nodeRepository/setTotalNumCategories', categories.length);

                await store.dispatch('nodeRepository/getAllNodes', true);
                expect(getNodesGroupedByTagsMock).not.toHaveBeenCalled();
            });
        });

        describe('search', () => {
            const withPorts = searchNodesResponse.nodes.map(node => ({ ...node, inPorts: [], outPorts: [] }));

            it('clears search results on empty parameters (tags and query)', async () => {
                await store.dispatch('nodeRepository/searchNodes');
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setNodes', null, undefined);
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setTags', [], undefined);
            });
    
            it('searches for nodes', async () => {
                store.commit('nodeRepository/setQuery', 'lookup');
                await store.dispatch('nodeRepository/searchNodes');
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setNodeSearchPage', 0, undefined);
                expect(searchNodesMock).toHaveBeenCalledWith({
                    allTagsMatch: true,
                    fullTemplateInfo: true,
                    nodeLimit: 100,
                    nodeOffset: 0,
                    query: 'lookup',
                    tags: []
                });
                expect(commitSpy).toHaveBeenCalledWith(
                    'nodeRepository/setTotalNumNodes',
                    searchNodesResponse.totalNumNodes,
                    undefined
                );
                
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setNodes', withPorts, undefined);
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setTags', searchNodesResponse.tags, undefined);
            });

            it('adds the port type and color from the global state to the search results', async () => {
                const mockFullyQualifiedPortName = 'mock-port-id';
                const mockPortMetadata = {
                    kind: 'MOCK-KIND',
                    color: 'MOCK-COLOR'
                };
                // add port metadata to global state
                store.state.application.availablePortTypes = {
                    [mockFullyQualifiedPortName]: mockPortMetadata
                };
                
                /* eslint-disable max-nested-callbacks */
                // add `typeId` property to ports returned in the search response
                searchNodesMock.mockReturnValueOnce({
                    ...searchNodesResponse,
                    nodes: searchNodesResponse.nodes.map(node => ({
                        ...node,
                        inPorts: [{ typeId: mockFullyQualifiedPortName }],
                        outPorts: [{ typeId: mockFullyQualifiedPortName }]
                    }))
                });

                const expectedNodes = searchNodesResponse.nodes.map(node => ({
                    ...node,
                    inPorts: [{
                        typeId: mockFullyQualifiedPortName,
                        type: mockPortMetadata.kind,
                        color: mockPortMetadata.color
                    }],
                    outPorts: [{
                        typeId: mockFullyQualifiedPortName,
                        type: mockPortMetadata.kind,
                        color: mockPortMetadata.color
                    }]
                }));
                /* eslint-enable max-nested-callbacks */

                store.commit('nodeRepository/setQuery', 'lookup');
                await store.dispatch('nodeRepository/searchNodes');
                                
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setNodes', expectedNodes, undefined);
            });
    
            it('searches for nodes with append=true', async () => {
                store.commit('nodeRepository/setNodes', []);
                store.commit('nodeRepository/setQuery', 'lookup');
                await store.dispatch('nodeRepository/searchNodes', true);
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setNodeSearchPage', 1, undefined);
                expect(searchNodesMock).toHaveBeenCalledWith({
                    allTagsMatch: true,
                    fullTemplateInfo: true,
                    nodeLimit: 100,
                    nodeOffset: 100,
                    query: 'lookup',
                    tags: []
                });
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setTotalNumNodes',
                    searchNodesResponse.totalNumNodes, undefined);
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/addNodes', withPorts, undefined);
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setTags', searchNodesResponse.tags, undefined);
            });

            it('updates query', async () => {
                await store.dispatch('nodeRepository/updateQuery', 'some value');
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setQuery', 'some value', undefined);
                expect(dispatchSpy).toHaveBeenCalledWith(
                    'nodeRepository/searchNodes', undefined
                );
            });
    
            it('searches for nodes next page', async () => {
                await store.dispatch('nodeRepository/searchNodesNextPage');
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchNodes', true);
            });
    
            it('set selected Tags', () => {
                store.dispatch('nodeRepository/setSelectedTags', ['myTag', 'myTag2']);
                expect(commitSpy).toHaveBeenCalledWith(
                    'nodeRepository/setSelectedTags',
                    ['myTag', 'myTag2'],
                    undefined
                );
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchNodes', undefined);
            });
    
            it('clears search params (tags and query)', () => {
                store.dispatch('nodeRepository/clearSearchParams');
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setSelectedTags', [], undefined);
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setQuery', '', undefined);
                expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/clearSearchResults', undefined);
            });
    
            it('clears search results', () => {
                store.dispatch('nodeRepository/clearSearchResults');
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setTags', [], undefined);
                expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setNodes', null, undefined);
            });
        });

        describe('node description', () => {
            it('fetches node description', async () => {
                const node = {
                    id: 'node1',
                    nodeFactory: {
                        className: 'test',
                        settings: 'test1'
                    }
                };

                store.commit('nodeRepository/setSelectedNode', node);
                await store.dispatch('nodeRepository/getNodeDescription');
                
                expect(getNodeDescriptionMock).toHaveBeenCalled();
                expect(commitSpy).toHaveBeenCalledWith(
                    'nodeRepository/setNodeDescription',
                    expect.objectContaining(getNodeDescriptionResponse),
                    undefined
                );
            });

            it('adds the port metadata to the description object', async () => {
                const mockFullyQualifiedPortName = 'mock-port-id';
                const mockPortMetadata = {
                    kind: 'MOCK-KIND',
                    color: 'MOCK-COLOR'
                };

                // add port metadata to global state
                store.state.application.availablePortTypes = {
                    [mockFullyQualifiedPortName]: mockPortMetadata
                };

                getNodeDescriptionMock.mockReturnValueOnce({
                    ...getNodeDescriptionResponse,
                    // add a port to the node returned by the description endpoint
                    inPorts: [{ typeId: mockFullyQualifiedPortName }]
                });

                const node = {
                    id: 'node1',
                    nodeFactory: {
                        className: 'test',
                        settings: 'test1'
                    }
                };

                store.commit('nodeRepository/setSelectedNode', node);
                await store.dispatch('nodeRepository/getNodeDescription');
                
                expect(getNodeDescriptionMock).toHaveBeenCalled();
                expect(commitSpy).toHaveBeenCalledWith(
                    'nodeRepository/setNodeDescription',
                    expect.objectContaining({
                        ...getNodeDescriptionResponse,
                        inPorts: [{
                            typeId: mockFullyQualifiedPortName,
                            type: mockPortMetadata.kind,
                            color: mockPortMetadata.color
                        }]
                    }),
                    undefined
                );
            });
        });
    });
});
