import { clear as clearUserAgent, mockUserAgent } from 'jest-useragent-mock';

describe('Shortcuts Plugin', () => {
    let loadPlugin, $shortcuts, context, userAgent;
    const mockInject = (key, value) => {
        $shortcuts = value;
    };

    beforeEach(() => {
        context = {
            store: { /* new object */ }
        };

        loadPlugin = async () => {
            jest.mock('@/shortcuts', () => ({
                crazyHotkey: {
                    hotkey: ['Ctrl', 'Alt', 'Shift', 'Delete'],
                    execute: jest.fn(),
                    condition: jest.fn()
                },
                selectAll: {
                    hotkey: ['Ctrl', 'A']
                }
            }));
            mockUserAgent(userAgent);
            const { default: shortcutPlugin } = await import('@/plugins/shortcuts');

            shortcutPlugin(context, mockInject);
        };
    });

    afterEach(() => {
        clearUserAgent();
        jest.resetModules();
    });

    describe('on apple', () => {
        beforeEach(async () => {
            userAgent = 'mac';
            await loadPlugin();
        });

        test('hotkeyText on mac', () => {
            expect($shortcuts.get('crazyHotkey').hotkeyText).toBe('⌘ ⌥ ⇧ ⌫');
        });

        describe('hotkeys', () => {
            test('doesnt find Ctrl-A with [Ctrl-Key]', () => {
                expect(
                    $shortcuts.findByHotkey({
                        ctrlKey: true,
                        key: 'a'
                    })
                ).toBeFalsy();
            });

            test('find Ctrl-A with [Meta-Key]', () => {
                expect(
                    $shortcuts.findByHotkey({
                        metaKey: true,
                        key: 'a'
                    })
                ).toBe('selectAll');
            });

            test('Delete equals Backspace', () => {
                expect($shortcuts.findByHotkey({
                    metaKey: true,
                    shiftKey: true,
                    altKey: true,
                    key: 'Backspace'
                })).toBe('crazyHotkey');
            });
        });
    });

    describe('on other platforms (windows, linux)', () => {
        beforeEach(async () => {
            userAgent = 'not apple';
            await loadPlugin();
        });

        test('hotkeyText formatted', () => {
            expect($shortcuts.get('crazyHotkey').hotkeyText).toBe('Ctrl Alt Shift Delete');
        });

        test('adds name to shortcut', () => {
            expect($shortcuts.get('crazyHotkey').name).toBe('crazyHotkey');
        });

        test.each([true, false])('isEnabled: %s', (value) => {
            let shortcut = $shortcuts.get('crazyHotkey');
            shortcut.condition.mockReturnValue(value);

            expect($shortcuts.isEnabled('crazyHotkey')).toBe(value);
            expect(shortcut.condition).toHaveBeenCalledWith({ $store: context.store });
        });

        test('shortcut without condition is enabled', () => {
            expect($shortcuts.isEnabled('selectAll')).toBe(true);
        });

        test('dispatch name to shortcut', () => {
            let shortcut = $shortcuts.get('crazyHotkey');

            $shortcuts.dispatch('crazyHotkey', { mockExtraPayload: true });

            expect(shortcut.execute).toHaveBeenCalledWith({
                $store: context.store,
                eventDetail: { mockExtraPayload: true }
            });
        });

        test('dispatch and isEnabled throw for unknown shortcut', () => {
            expect(() => $shortcuts.isEnabled('unknown')).toThrow();
            expect(() => $shortcuts.dispatch('unknown')).toThrow();
        });

        describe('hotkeys', () => {
            test('find with all modifiers', () => {
                expect($shortcuts.findByHotkey({
                    ctrlKey: true,
                    shiftKey: true,
                    altKey: true,
                    key: 'Delete'
                })).toBe('crazyHotkey');
            });

            test('find Ctrl-A with [Ctrl-Key]', () => {
                expect(
                    $shortcuts.findByHotkey({
                        ctrlKey: true,
                        key: 'a'
                    })
                ).toBe('selectAll');
            });

            test('doesnt find Ctrl-A with [Meta-Key]', () => {
                expect(
                    $shortcuts.findByHotkey({
                        metaKey: true,
                        key: 'a'
                    })
                ).toBeFalsy();
            });
        });
    });
});
