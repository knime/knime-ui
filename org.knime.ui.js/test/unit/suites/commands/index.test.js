/* eslint-disable max-nested-callbacks */
jest.mock('~/commands/workflowCommands', () => ({
    __esModule: true,
    default: {
        save: {},
        undo: {}
    }
}));

jest.mock('~/commands/canvasCommands', () => ({
    __esModule: true,
    default: {
        fitToScreen: {},
        zoomTo100: {}
    }
}));

import commands, { conditionGroup } from '~/commands';
import workflowCommandsMock from '~/commands/workflowCommands';
import canvasCommandsMock from '~/commands/canvasCommands';

describe('Commands', () => {
    describe('condition group', () => {
        let commands;

        beforeEach(() => {
            commands = {
                noCondition: { name: 'c1' },
                // eslint-disable-next-line no-magic-numbers
                withCondition: { name: 'c2', condition: jest.fn().mockImplementation(({ age }) => age >= 18) }
            };
        });

        test('group condition true', () => {
            let group = conditionGroup(() => true, commands);
            expect(group.noCondition.condition({ age: 10 })).toBe(true);
            expect(group.withCondition.condition({ age: 10 })).toBe(false);
        });

        test('group condition false', () => {
            let group = conditionGroup(() => false, commands);
            expect(group.noCondition.condition({ age: 10 })).toBe(false);
            expect(group.withCondition.condition({ age: 10 })).toBe(false);
        });
    });

    describe('exported commands with condition groups', () => {
        let $store;

        beforeEach(() => {
            $store = {
                state: {
                    workflow: {
                        activeWorkflow: null
                    },
                    canvas: {
                        interactionsEnabled: null
                    }
                }
            };
        });

        test('adds workflow commands if workflow is present', () => {
            let workflowCommands = Object.keys(workflowCommandsMock).reduce((res, key) => {
                res[key] = commands[key];
                return res;
            }, {});
            let resultWithoutWorkflow = Object.keys(workflowCommands).filter(
                c => workflowCommands[c].condition({ $store })
            );
            expect(resultWithoutWorkflow).not.toStrictEqual(expect.arrayContaining(['save', 'undo']));

            $store.state.workflow.activeWorkflow = {};
            let resultWithWorkflow = Object.keys(workflowCommands).filter(
                c => workflowCommands[c].condition({ $store })
            );
            expect(resultWithWorkflow).toStrictEqual(expect.arrayContaining(['save', 'undo']));
        });

        test('adds canvas commands if interactions are enabled', () => {
            let canvasCommands = Object.keys(canvasCommandsMock).reduce((res, key) => {
                res[key] = commands[key];
                return res;
            }, {});

            // we need workflow and interactions
            $store.state.workflow.activeWorkflow = {};

            let resultNoInteractions = Object.keys(canvasCommands).filter(
                c => canvasCommands[c].condition({ $store })
            );
            expect(resultNoInteractions).not.toStrictEqual(expect.arrayContaining(['fitToScreen', 'zoomTo100']));

            $store.state.canvas.interactionsEnabled = true;

            let resultInteractions = Object.keys(canvasCommands).filter(c => canvasCommands[c].condition({ $store }));
            expect(resultInteractions).toStrictEqual(expect.arrayContaining(['fitToScreen', 'zoomTo100']));
        });
    });
});
