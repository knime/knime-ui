/* eslint-disable max-nested-callbacks */
import { conditionGroup } from '~/commands';

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
});
