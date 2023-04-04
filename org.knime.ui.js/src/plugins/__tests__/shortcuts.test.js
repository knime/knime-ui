import { expect, describe, beforeEach, afterEach, it, vi } from 'vitest';
import { clear as clearUserAgent, mockUserAgent } from 'jest-useragent-mock';

describe('Shortcuts Plugin', () => {
    let loadPlugin, $shortcuts, userAgent;

    const mockApp = { config: { globalProperties: {} } };
    const mockStore = { isDummy: true };
    const mockRouter = {
        push: vi.fn()
    };

    beforeEach(() => {
        loadPlugin = async () => {
            vi.mock('@/shortcuts', () => ({
                default: {
                    crazyHotkey: {
                        hotkey: ['Ctrl', 'Alt', 'Shift', 'Delete'],
                        execute: vi.fn(),
                        condition: vi.fn()
                    },
                    selectAll: {
                        hotkey: ['Ctrl', 'A']
                    },
                    copy: {
                        hotkey: ['Ctrl', 'C'],
                        allowEventDefault: true
                    }
                }
            }));
            mockUserAgent(userAgent);
            const { default: shortcutPlugin } = await import('@/plugins/shortcuts');

            shortcutPlugin({ app: mockApp, $store: mockStore, $router: mockRouter });
            $shortcuts = mockApp.config.globalProperties.$shortcuts;
        };
    });

    afterEach(() => {
        clearUserAgent();
        vi.resetModules();
    });

    describe('on apple', () => {
        beforeEach(async () => {
            userAgent = 'mac';
            await loadPlugin();
        });

        it('hotkeyText on mac', () => {
            expect($shortcuts.get('crazyHotkey').hotkeyText).toBe('⌘ ⌥ ⇧ ⌫');
        });

        describe('hotkeys', () => {
            it('doesnt find Ctrl-A with [Ctrl-Key]', () => {
                expect(
                    $shortcuts.findByHotkey({
                        ctrlKey: true,
                        key: 'a'
                    })
                ).toBeFalsy();
            });

            it('find Ctrl-A with [Meta-Key]', () => {
                expect(
                    $shortcuts.findByHotkey({
                        metaKey: true,
                        key: 'a'
                    })
                ).toBe('selectAll');
            });

            it('delete equals Backspace', () => {
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

        it('hotkeyText formatted', () => {
            expect($shortcuts.get('crazyHotkey').hotkeyText).toBe('Ctrl Alt Shift Delete');
        });

        it('adds name to shortcut', () => {
            expect($shortcuts.get('crazyHotkey').name).toBe('crazyHotkey');
        });

        it.each([true, false])('isEnabled: %s', (value) => {
            let shortcut = $shortcuts.get('crazyHotkey');
            shortcut.condition.mockReturnValue(value);

            expect($shortcuts.isEnabled('crazyHotkey')).toBe(value);
            expect(shortcut.condition).toHaveBeenCalledWith({ $store: mockStore });
        });

        it('shortcut without condition is enabled', () => {
            expect($shortcuts.isEnabled('selectAll')).toBe(true);
        });

        it('dispatch name to shortcut', () => {
            let shortcut = $shortcuts.get('crazyHotkey');

            $shortcuts.dispatch('crazyHotkey', { event: { mockExtraPayload: true } });

            expect(shortcut.execute).toHaveBeenCalledWith({
                $store: mockStore,
                payload: { event: { mockExtraPayload: true } },
                $router: mockRouter
            });
        });

        it('preventDefault by default', () => {
            expect($shortcuts.preventDefault('crazyHotkey')).toBe(true);
        });

        it('no preventDefault if allowEventDefault is true', () => {
            expect($shortcuts.preventDefault('copy')).toBe(false);
        });

        it('dispatch, isEnabled and preventDefault throw for unknown shortcut', () => {
            expect(() => $shortcuts.isEnabled('unknown')).toThrow();
            expect(() => $shortcuts.dispatch('unknown')).toThrow();
            expect(() => $shortcuts.preventDefault('unknown')).toThrow();
        });

        describe('hotkeys', () => {
            it('find with all modifiers', () => {
                expect($shortcuts.findByHotkey({
                    ctrlKey: true,
                    shiftKey: true,
                    altKey: true,
                    key: 'Delete'
                })).toBe('crazyHotkey');
            });

            it('find Ctrl-A with [Ctrl-Key]', () => {
                expect(
                    $shortcuts.findByHotkey({
                        ctrlKey: true,
                        key: 'a'
                    })
                ).toBe('selectAll');
            });

            it('doesnt find Ctrl-A with [Meta-Key]', () => {
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
