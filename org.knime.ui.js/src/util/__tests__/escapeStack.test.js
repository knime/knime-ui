import { expect, describe, it } from 'vitest';
import { escapePressed, escapeStack } from '@/mixins/escapeStack';

describe('Escape Stack', () => {
    const doMount = ({
        component1Settings = { group: null, alwaysActive: false },
        component2Settings = { group: null, alwaysActive: false }
    } = {}) => {
        const valueTracker = () => {
            let innerValue = '';

            return {
                set: (value) => {
                    innerValue += value;
                },
                get: () => innerValue
            };
        };

        const escapeOrder = valueTracker();

        const component1 = escapeStack({
            ...component1Settings,
            onEscape() {
                escapeOrder.set('component1, ');
            }
        });

        const component2 = escapeStack({
            ...component2Settings,
            onEscape() {
                escapeOrder.set('component2, ');
            }
        });

        return { component1, component2, escapeOrder };
    };

    it('doesnt do anything with an empty stack', () => {
        const { escapeOrder } = doMount();
        escapePressed();
        expect(escapeOrder.get()).toBe('');
    });

    it('add and remove components', () => {
        const { component1, component2, escapeOrder } = doMount();
        component1.beforeMount();
        component2.beforeMount();
        component1.beforeUnmount();
        component2.beforeUnmount();

        escapePressed();
        expect(escapeOrder.get()).toBe('');
    });

    it('calls onEscape in stack order', () => {
        const { component1, component2, escapeOrder } = doMount();
        component1.beforeMount();
        component2.beforeMount();

        escapePressed();
        escapePressed();

        expect(escapeOrder.get()).toMatch('component2, component1');
    });

    it('top component is removed before escape is pressed', () => {
        const { component1, component2, escapeOrder } = doMount();
        component1.beforeMount();
        component2.beforeMount();

        component2.beforeUnmount();

        escapePressed();
        escapePressed();

        expect(escapeOrder.get()).toMatch('component1');
    });

    it('calls all handlers of a group stack', () => {
        const { component1, component2, escapeOrder } = doMount({
            component1Settings: { group: 'MY_GROUP' },
            component2Settings: { group: 'MY_GROUP' }
        });
        component1.beforeMount();
        component2.beforeMount();

        escapePressed();

        expect(escapeOrder.get()).toMatch('component2, component1');
    });

    it('retains `alwaysActive` handlers', () => {
        const { component1, component2, escapeOrder } = doMount({
            component1Settings: { group: 'MY_GROUP', alwaysActive: true },
            component2Settings: { group: 'MY_GROUP' }
        });
        component1.beforeMount();
        component2.beforeMount();
        
        // after the first call `component 2` would have had its handler removed
        escapePressed();
        escapePressed();

        expect(escapeOrder.get()).toMatch('component1, component2, component1');
    });
});
