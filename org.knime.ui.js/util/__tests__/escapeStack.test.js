import { escapePressed, escapeStack } from '@/mixins/escapeStack';

describe('Escape Stack', () => {
    let component1, component2, escapeOrder;

    beforeEach(() => {
        escapeOrder = '';

        component1 = escapeStack({
            onEscape() {
                escapeOrder += 'component1, ';
            }
        });

        component2 = escapeStack({
            onEscape() {
                escapeOrder += 'component2, ';
            }
        });
    });

    it('doesnt do anything with an empty stack', () => {
        escapePressed();
        expect(escapeOrder).toBe('');
    });

    test('add and remove components', () => {
        component1.beforeMount();
        component2.beforeMount();
        component1.beforeDestroy();
        component2.beforeDestroy();

        escapePressed();
        expect(escapeOrder).toBe('');
    });

    it('calls onEscape in stack order', () => {
        component1.beforeMount();
        component2.beforeMount();

        escapePressed();
        escapePressed();

        expect(escapeOrder).toBe('component2, component1, ');
    });

    test('top component is removed before escape is pressed', () => {
        component1.beforeMount();
        component2.beforeMount();

        component2.beforeDestroy();

        escapePressed();
        escapePressed();

        expect(escapeOrder).toBe('component1, ');
    });
});
