import { shallowMount } from '@vue/test-utils';

import PortViewLoader from '@/components/embeddedViews/PortViewLoader.vue';
import PortViewTabOutput from '../PortViewTabOutput.vue';

describe('PortViewTabOutput.vue', () => {
    const dummyNode = {
        id: 'node1',
        selected: true,
        outPorts: [{ typeId: 'flowVariable' }, { typeId: 'table' }],
        isLoaded: false,
        state: {
            executionState: 'UNSET'
        },
        allowedActions: {
            canExecute: false
        }
    };

    const defaultProps = {
        projectId: 'project-1',
        workflowId: 'workflow-1',
        selectedNode: dummyNode,
        selectedPortIndex: 0,
        availablePortTypes: {
            table: {
                kind: 'table',
                name: 'Data',
                hasView: true
            },
            flowVariable: {
                kind: 'flowVariable',
                name: 'Flow Variable',
                hasView: true
            }
        }
    };
    const doShallowMount = (customProps) => shallowMount(PortViewTabOutput, {
        props: {
            ...defaultProps,
            ...customProps
        }
    });

    describe('Node problems', () => {
        it('validates that output port are present', () => {
            const wrapper = doShallowMount({
                selectedNode: { ...dummyNode, outPorts: [] }
            });

            expect(wrapper.emitted('outputStateChange')[0][0]).toEqual(expect.objectContaining({
                message: 'The selected node has no output ports.'
            }));
        });

        it('validates that ports are supported', () => {
            const wrapper = doShallowMount({
                selectedNode: { ...dummyNode, outPorts: [{ typeId: 'something-unsupported' }] }
            });

            expect(wrapper.emitted('outputStateChange')[0][0]).toEqual(expect.objectContaining({
                message: 'The selected node has no supported output port.'
            }));
        });

        it('validates whether node needs to be configured', () => {
            const wrapper = doShallowMount({
                selectedNode: { ...dummyNode, state: { executionState: 'IDLE' } }
            });

            expect(wrapper.emitted('outputStateChange')[0][0]).toEqual(expect.objectContaining({
                message: 'Please first configure the selected node.'
            }));
        });

        it('validates that node is not executing', () => {
            const wrapper = doShallowMount({
                selectedNode: { ...dummyNode, state: { executionState: 'EXECUTING' } },
                selectedPortIndex: 1
            });

            expect(wrapper.emitted('outputStateChange')[0][0]).toEqual(expect.objectContaining({
                message: 'Output is available after execution.',
                loading: true
            }));
        });
    });

    describe('Port problems', () => {
        it('validates that selected port is supported', () => {
            const selectedNode = {
                ...dummyNode,
                outPorts: [...dummyNode.outPorts, { typeId: 'something-unsupported' }]
            };
            const selectedPortIndex = selectedNode.outPorts.length - 1;
            const wrapper = doShallowMount({ selectedNode, selectedPortIndex });

            expect(wrapper.emitted('outputStateChange')[0][0]).toEqual(expect.objectContaining({
                message: 'The data at the output port is not supported by any viewer.'
            }));
        });

        it('validates that selected port is active', () => {
            const selectedNode = {
                ...dummyNode,
                outPorts: dummyNode.outPorts.map(port => ({ ...port, inactive: true }))
            };
            const wrapper = doShallowMount({ selectedNode, selectedPortIndex: 0 });

            expect(wrapper.emitted('outputStateChange')[0][0]).toEqual(expect.objectContaining({
                message: 'This output port is inactive and therefore no output data is available for display.'
            }));
        });

        it.each([
            ['NODE_UNEXECUTED'],
            ['EXECUTING'],
            ['QUEUED']
        ])('validates that flowVariable ports can still be shown even when Node\'s state is %s ', (executionState) => {
            const wrapper = doShallowMount({
                selectedNode: {
                    ...dummyNode,
                    state: { executionState },
                    allowedActions: { canExecute: true }
                },
                selectedPortIndex: 0
            });

            expect(wrapper.emitted('outputStateChange')).toBeUndefined();
        });

        it('validates that non-default flowVariables cannot be shown if node is not executed', () => {
            const outPorts = [...dummyNode.outPorts, { typeId: 'flowVariable' }];
            const wrapper = doShallowMount({
                selectedNode: {
                    ...dummyNode,
                    outPorts,
                    state: { executionState: 'NODE_UNEXECUTED' },
                    allowedActions: { canExecute: true }
                },
                selectedPortIndex: 2
            });

            expect(wrapper.emitted('output-state-change')[0][0]).toEqual(expect.objectContaining({
                message: 'To show the output, please execute the selected node.'
            }));
        });
    });

    it('should emit outputStateChange events when the PortViewLoader state changes', () => {
        const wrapper = doShallowMount({
            selectedPortIndex: 1
        });

        wrapper.findComponent(PortViewLoader).vm.$emit('state-change', { state: 'loading' });
        expect(wrapper.emitted('outputStateChange')[0][0]).toEqual(expect.objectContaining({
            loading: true
        }));

        wrapper.findComponent(PortViewLoader).vm.$emit('state-change', { state: 'error', message: 'Error message' });
        expect(wrapper.emitted('outputStateChange')[1][0]).toEqual(expect.objectContaining({
            message: 'Error message'
        }));
    });
});
