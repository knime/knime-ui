/* eslint-disable no-magic-numbers */
import * as $shapes from '~/style/shapes';
import { createLocalVue, shallowMount } from '@vue/test-utils';
import Vuex from 'vuex';
import Vue from 'vue';
import { mockVuexStore } from '~/test/unit/test-utils';

import NodeNameEditor from '~/components/workflow/NodeNameEditor';
import NodeNameTextarea from '~/components/workflow/NodeNameTextarea';
import NodeNameEditorActionBar from '~/components/workflow/NodeNameEditorActionBar';

describe('NodeNameEditor', () => {
    let propsData, mocks, storeConfig, doShallowMount, wrapper;

    beforeAll(() => {
        const localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        wrapper = null;
        propsData = {
            value: 'test',
            actionBarPosition: { x: 5, y: 3 },
            position: { x: 15, y: 13 },
            nodeId: 'root:1'
        };
        storeConfig = {
            workflow: {
                actions: {
                    updateComponentOrMetanodeName: jest.fn(),
                    closeNameEditor: jest.fn()
                }
            }
        };
        doShallowMount = () => {
            let $store = mockVuexStore(storeConfig);
            mocks = { $shapes, $store };
            wrapper = shallowMount(NodeNameEditor, { propsData, mocks });
        };
    });

    it('renders', () => {
        doShallowMount();
        expect(wrapper.findComponent(NodeNameTextarea)).toBeTruthy();
    });

    it('updates textarea value on value prop change', async () => {
        doShallowMount();
        const textarea = wrapper.findComponent(NodeNameTextarea);
        expect(textarea.props('value')).toBe('test');
        wrapper.setProps({ value: 'newVal' });
        await Vue.nextTick();
        expect(textarea.props('value')).toBe('newVal');
    });

    it('pass props to NodeNameTextarea', () => {
        const passedProps = {
            pattern: /0-9/g,
            startWidth: 343,
            startHeight: 113
        };
        propsData = { ...propsData, ...passedProps };
        doShallowMount();
        const textarea = wrapper.findComponent(NodeNameTextarea);
        expect(textarea.props()).toStrictEqual(expect.objectContaining(passedProps));
    });

    it('passes @width and @height from textarea to parent', async () => {
        doShallowMount();
        const textarea = wrapper.findComponent(NodeNameTextarea);

        expect(wrapper.emitted().width).toBeUndefined();
        expect(wrapper.emitted().height).toBeUndefined();

        textarea.vm.$emit('width', 11);
        textarea.vm.$emit('height', 12);

        await Vue.nextTick();

        expect(wrapper.emitted().width[0][0]).toBe(11);
        expect(wrapper.emitted().height[0][0]).toBe(12);
    });

    it('saves on textarea @save event', () => {
        doShallowMount();
        const textarea = wrapper.findComponent(NodeNameTextarea);
        textarea.vm.$emit('save');
        expect(storeConfig.workflow.actions.updateComponentOrMetanodeName).toHaveBeenCalled();
        expect(storeConfig.workflow.actions.closeNameEditor).toHaveBeenCalled();
    });

    it('prevents empty names on save', () => {
        doShallowMount();
        const textarea = wrapper.findComponent(NodeNameTextarea);
        wrapper.vm.currentName = '';

        textarea.vm.$emit('save');

        expect(storeConfig.workflow.actions.updateComponentOrMetanodeName).toHaveBeenCalledTimes(0);
        expect(storeConfig.workflow.actions.closeNameEditor).toHaveBeenCalled();
        expect(wrapper.vm.currentName).toBe(propsData.value);
    });

    it('saves on action bar save event', () => {
        doShallowMount();
        const actionBar = wrapper.findComponent(NodeNameEditorActionBar);
        actionBar.vm.$emit('save');
        expect(storeConfig.workflow.actions.updateComponentOrMetanodeName).toHaveBeenCalled();
        expect(storeConfig.workflow.actions.closeNameEditor).toHaveBeenCalled();
    });

    it('closes on textarea @close event (e.g. ESC key) and resets internal value', () => {
        doShallowMount();
        const textarea = wrapper.findComponent(NodeNameTextarea);
        wrapper.vm.currentName = 'xxx';
        textarea.vm.$emit('close');
        expect(storeConfig.workflow.actions.closeNameEditor).toHaveBeenCalled();
        expect(wrapper.vm.currentName).toBe(propsData.value);
    });

    it('saves on action bar close event', () => {
        doShallowMount();
        const actionBar = wrapper.findComponent(NodeNameEditorActionBar);
        actionBar.vm.$emit('close');
        expect(storeConfig.workflow.actions.closeNameEditor).toHaveBeenCalled();
    });
});
