/* eslint-disable max-nested-callbacks */
jest.mock('~/shortcuts/workflowShortcuts', () => ({
    __esModule: true,
    default: {
        save: {},
        undo: {}
    }
}));

jest.mock('~/shortcuts/canvasShortcuts', () => ({
    __esModule: true,
    default: {
        fitToScreen: {},
        zoomTo100: {}
    }
}));

import shortcuts, { conditionGroup } from '@/shortcuts';
import workflowShortcutssMock from '@/shortcuts/workflowShortcuts';
import canvasShortcutsMock from '@/shortcuts/canvasShortcuts';

describe('Shortcuts', () => {
    describe('condition group', () => {
        let shortcuts;

        beforeEach(() => {
            shortcuts = {
                noCondition: { name: 'c1' },
                // eslint-disable-next-line no-magic-numbers
                withCondition: { name: 'c2', condition: jest.fn().mockImplementation(({ age }) => age >= 18) }
            };
        });

        test('group condition true', () => {
            let group = conditionGroup(() => true, shortcuts);
            expect(group.noCondition.condition({ age: 10 })).toBe(true);
            expect(group.withCondition.condition({ age: 10 })).toBe(false);
        });

        test('group condition false', () => {
            let group = conditionGroup(() => false, shortcuts);
            expect(group.noCondition.condition({ age: 10 })).toBe(false);
            expect(group.withCondition.condition({ age: 10 })).toBe(false);
        });
    });

    describe('exported shortcuts with condition groups', () => {
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

        test('adds workflow shortcuts if workflow is present', () => {
            const workflowShortcuts = Object.keys(workflowShortcutssMock).reduce((res, key) => {
                res[key] = shortcuts[key];
                return res;
            }, {});
            const resultWithoutWorkflow = Object.keys(workflowShortcuts).filter(
                c => workflowShortcuts[c].condition({ $store })
            );
            expect(resultWithoutWorkflow).not.toStrictEqual(expect.arrayContaining(['save', 'undo']));

            $store.state.workflow.activeWorkflow = {};
            const resultWithWorkflow = Object.keys(workflowShortcuts).filter(
                c => workflowShortcuts[c].condition({ $store })
            );
            expect(resultWithWorkflow).toStrictEqual(expect.arrayContaining(['save', 'undo']));
        });

        test('adds canvas shortcuts if interactions are enabled', () => {
            const canvasShortcuts = Object.keys(canvasShortcutsMock).reduce((res, key) => {
                res[key] = shortcuts[key];
                return res;
            }, {});

            // we need workflow and interactions
            $store.state.workflow.activeWorkflow = {};

            const resultNoInteractions = Object.keys(canvasShortcuts).filter(
                c => canvasShortcuts[c].condition({ $store })
            );
            expect(resultNoInteractions).not.toStrictEqual(expect.arrayContaining(['fitToScreen', 'zoomTo100']));

            $store.state.canvas.interactionsEnabled = true;

            const resultInteractions = Object
                .keys(canvasShortcuts)
                .filter(c => canvasShortcuts[c].condition({ $store }));
                
            expect(resultInteractions).toStrictEqual(expect.arrayContaining(['fitToScreen', 'zoomTo100']));
        });
    });
});
