import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

const getNodesGroupedByTagsResponse = {
    selections: [{
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

describe('nodeRepository store', () => {
    let store, localVue, searchNodesMock, getNodesGroupedByTagsMock, commitSpy, dispatchSpy;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);

        searchNodesMock = jest.fn().mockReturnValue(searchNodesResponse);
        getNodesGroupedByTagsMock = jest.fn().mockReturnValue(getNodesGroupedByTagsResponse);
    });

    beforeEach(async () => {
        jest.clearAllMocks();

        jest.doMock('~api', () => ({
            __esModule: true,
            searchNodes: searchNodesMock,
            getNodesGroupedByTags: getNodesGroupedByTagsMock
        }), { virtual: true });

        store = mockVuexStore({
            nodeRepository: await import('~/store/nodeRepository')
        });
        commitSpy = jest.spyOn(store, 'commit');
        dispatchSpy = jest.spyOn(store, 'dispatch');
    });

    it('creates an empty store', () => {
        expect(store.state.nodeRepository).toStrictEqual({
            nodes: [],
            nodesPerCategory: [],
            totalNumCategories: null,
            totalNumNodes: 0,
            selectedTags: [],
            tags: [],
            query: '',
            nodeSearchPage: 0,
            categoryPage: 0,
            scrollPosition: 0
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
            store.commit('nodeRepository/addNodes', nodes);
            expect(store.state.nodeRepository.nodes).toEqual(nodes);

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

        it('adds tag (and skips duplicates)', () => {
            store.commit('nodeRepository/addTag', 'myTag');
            expect(store.state.nodeRepository.tags).toEqual(['myTag']);
            store.commit('nodeRepository/addTag', 'myTag');
            store.commit('nodeRepository/addTag', 'myTag2');
            expect(store.state.nodeRepository.tags).toEqual(['myTag', 'myTag2']);
        });

        it('sets tags', () => {
            store.commit('nodeRepository/setTags', ['myTag', 'myTag2']);
            expect(store.state.nodeRepository.tags).toEqual(['myTag', 'myTag2']);
        });

        it('adds selectedTag (and skips duplicates)', () => {
            store.commit('nodeRepository/addSelectedTag', 'myTag');
            store.commit('nodeRepository/addSelectedTag', 'myTag2');
            store.commit('nodeRepository/addSelectedTag', 'myTag');
            expect(store.state.nodeRepository.selectedTags).toEqual(['myTag', 'myTag2']);
        });

        it('removes selectedTag', () => {
            store.state.nodeRepository.selectedTags = ['myTag'];
            store.commit('nodeRepository/removeSelectedTag', 'myTag');
            expect(store.state.nodeRepository.selectedTags).toEqual([]);
        });

        it('sets selectedTags', () => {
            store.commit('nodeRepository/setSelectedTags', ['myTag', 'myTag2']);
            expect(store.state.nodeRepository.selectedTags).toEqual(['myTag', 'myTag2']);
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
            store.commit('nodeRepository/setQuery', 'some value');
            expect(store.state.nodeRepository.query).toBe('some value');
        });

        it('sets totalNumCategories', () => {
            store.commit('nodeRepository/setTotalNumCategories', 2);
            expect(store.state.nodeRepository.totalNumCategories).toEqual(2);
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
                    'nodeRepository/setNodesPerCategories', getNodesGroupedByTagsResponse.selections, undefined
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
                    'nodeRepository/addNodesPerCategories', getNodesGroupedByTagsResponse.selections, undefined
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

        it('clears search results on empty parameters (tags and query)', async () => {
            await store.dispatch('nodeRepository/searchNodes');
            expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setNodes', [], undefined);
            expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setTags', [], undefined);
        });

        it('searches for nodes', async () => {
            store.commit('nodeRepository/setQuery', 'lookup');
            await store.dispatch('nodeRepository/searchNodes');
            expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setNodeSearchPage', 0, undefined);
            expect(searchNodesMock).toHaveBeenCalledWith({
                allTagsMatch: true,
                fullTemplateInfo: true,
                nodeLimit: 21,
                nodeOffset: 0,
                query: 'lookup',
                tags: []
            });
            expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setTotalNumNodes',
                searchNodesResponse.totalNumNodes, undefined);
            expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setNodes',
                searchNodesResponse.nodes, undefined);
            expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setTags', searchNodesResponse.tags, undefined);
        });

        it('searches for nodes with append=true', async () => {
            store.commit('nodeRepository/setQuery', 'lookup');
            await store.dispatch('nodeRepository/searchNodes', true);
            expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setNodeSearchPage', 1, undefined);
            expect(searchNodesMock).toHaveBeenCalledWith({
                allTagsMatch: true,
                fullTemplateInfo: true,
                nodeLimit: 21,
                nodeOffset: 21,
                query: 'lookup',
                tags: []
            });
            expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setTotalNumNodes',
                searchNodesResponse.totalNumNodes, undefined);
            expect(commitSpy).toHaveBeenCalledWith('nodeRepository/addNodes', searchNodesResponse.nodes, undefined);
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

        it('selects tag', () => {
            store.dispatch('nodeRepository/selectTag', 'myTag');
            expect(commitSpy).toHaveBeenCalledWith('nodeRepository/addSelectedTag', 'myTag', undefined);
            expect(dispatchSpy).toHaveBeenCalledWith('nodeRepository/searchNodes', undefined);
        });

        it('deselects tag', () => {
            store.dispatch('nodeRepository/deselectTag', 'myTag');
            expect(commitSpy).toHaveBeenCalledWith('nodeRepository/removeSelectedTag', 'myTag', undefined);
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
            expect(commitSpy).toHaveBeenCalledWith('nodeRepository/setNodes', [], undefined);
        });
    });
});
