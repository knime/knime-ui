import { clear as clearUserAgent, mockUserAgent } from 'jest-useragent-mock';

describe('Commands Plugin', () => {
    let loadPlugin, $commands, context, userAgent;
    const mockInject = (key, value) => { $commands = value; };

    beforeEach(() => {
        context = {
            store: { /* new object */ }
        };

        loadPlugin = async () => {
            jest.mock('~/commands', () => ({
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
            let { default: commandPlugin } = await import('~/plugins/commands');

            commandPlugin(context, mockInject);
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
            expect($commands.get('crazyHotkey').hotkeyText).toBe('⌘ ⌥ ⇧ ⌫');
        });

        describe('hotkeys', () => {
            test('doesnt find Ctrl-A with [Ctrl-Key]', () => {
                expect(
                    $commands.findByHotkey({
                        ctrlKey: true,
                        key: 'a'
                    })
                ).toBeFalsy();
            });

            test('find Ctrl-A with [Meta-Key]', () => {
                expect(
                    $commands.findByHotkey({
                        metaKey: true,
                        key: 'a'
                    })
                ).toBe('selectAll');
            });
        });
    });

    describe('on other platforms (windows, linux)', () => {
        beforeEach(async () => {
            userAgent = 'not apple';
            await loadPlugin();
        });

        test('hotkeyText formatted', () => {
            expect($commands.get('crazyHotkey').hotkeyText).toBe('Ctrl Alt Shift Delete');
        });

        test('adds name to command', () => {
            expect($commands.get('crazyHotkey').name).toBe('crazyHotkey');
        });

        test.each([true, false])('isEnabled: %s', (value) => {
            let command = $commands.get('crazyHotkey');
            command.condition.mockReturnValue(value);

            expect($commands.isEnabled('crazyHotkey')).toBe(value);
            expect(command.condition).toHaveBeenCalledWith({ $store: context.store });
        });

        test('dispatch name to command', () => {
            let command = $commands.get('crazyHotkey');
            let $args = {};

            $commands.dispatch('crazyHotkey', $args);

            expect(command.execute).toHaveBeenCalledWith({ $store: context.store, $args });
        });

        describe('hotkeys', () => {
            test('find with all modifiers', () => {
                expect($commands.findByHotkey({
                    ctrlKey: true,
                    shiftKey: true,
                    altKey: true,
                    key: 'Delete'
                })).toBe('crazyHotkey');
            });

            test('Delete equals Backspace', () => {
                expect($commands.findByHotkey({
                    ctrlKey: true,
                    shiftKey: true,
                    altKey: true,
                    key: 'Backspace'
                })).toBe('crazyHotkey');
            });

            test('find Ctrl-A with [Ctrl-Key]', () => {
                expect(
                    $commands.findByHotkey({
                        ctrlKey: true,
                        key: 'a'
                    })
                ).toBe('selectAll');
            });

            test('doesnt find Ctrl-A with [Meta-Key]', () => {
                expect(
                    $commands.findByHotkey({
                        metaKey: true,
                        key: 'a'
                    })
                ).toBeFalsy();
            });
        });
    });
});
