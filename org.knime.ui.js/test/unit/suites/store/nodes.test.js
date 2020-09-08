import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils';
import Vuex from 'vuex';

import * as nodeStoreConfig from '~/store/nodes';
import * as nodeTemplateStoreConfig from '~/store/nodeTemplates';

describe('node store', () => {

    let store, localVue;

    let nodes = [{
        id: 'foo',
        templateId: 'bla'
    }, {
        id: 'ownData',
        icon: 'ownIcon',
        name: 'ownName',
        type: 'ownType'
    }];

    let templateData = {
        icon: 'exampleIcon',
        name: 'exampleName',
        type: 'exampleType'
    };

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        store = mockVuexStore({
            nodes: nodeStoreConfig,
            nodeTemplates: nodeTemplateStoreConfig
        });
        store.commit('nodeTemplates/add', { templateId: 'bla', templateData });
    });

    it('creates an empty store', () => {
        expect(Object.keys(store.state.nodes)).toHaveLength(0);
    });

    describe('mutation', () => {
        it('adds templates', () => {
            store.commit('nodes/add', {
                workflowId: 'aWorkflowId',
                nodeData: nodes[0]
            });

            expect(store.state.nodes.aWorkflowId.foo).toStrictEqual(nodes[0]);
        });

        it('removes all nodes of one workflow', () => {
            store.commit('nodes/add', {
                workflowId: 'wf0',
                nodeData: nodes[0]
            });
            store.commit('nodes/add', {
                workflowId: 'wf0',
                nodeData: nodes[1]
            });
            store.commit('nodes/add', {
                workflowId: 'wf1',
                nodeData: nodes[0]
            });

            store.commit('nodes/removeWorkflow', 'wf0');

            // remove non-existent workflow
            store.commit('nodes/removeWorkflow', 'wf99');

            expect(store.state.nodes.wf0).toBeFalsy();
            expect(store.state.nodes.wf1).toStrictEqual({
                foo: nodes[0]
            });
        });
    });

    describe('getters', () => {
        beforeEach(() => {
            store.commit('nodes/add', {
                workflowId: 'aWorkflowId',
                nodeData: nodes[0]
            });
            store.commit('nodes/add', {
                workflowId: 'aWorkflowId',
                nodeData: nodes[1]
            });
        });

        it('gets name', () => {
            expect(store.getters['nodes/name']({ workflowId: 'aWorkflowId', nodeId: 'foo' })).toBe('exampleName');
            expect(store.getters['nodes/name']({ workflowId: 'aWorkflowId', nodeId: 'ownData' })).toBe('ownName');
        });
        it('gets icon', () => {
            expect(store.getters['nodes/icon']({ workflowId: 'aWorkflowId', nodeId: 'foo' })).toBe('exampleIcon');
            expect(store.getters['nodes/icon']({ workflowId: 'aWorkflowId', nodeId: 'ownData' })).toBe('ownIcon');
        });
        it('gets type', () => {
            expect(store.getters['nodes/type']({ workflowId: 'aWorkflowId', nodeId: 'foo' })).toBe('exampleType');
            expect(store.getters['nodes/type']({ workflowId: 'aWorkflowId', nodeId: 'ownData' })).toBe('ownType');
        });
    });
});
