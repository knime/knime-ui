import { createLocalVue } from '@vue/test-utils';
import { mockVuexStore } from '~/test/unit/test-utils/mockVuexStore';
import Vuex from 'vuex';

import { mutations, actions } from '~/store-plugins/json-patch';

describe('json-patch plugin', () => {
    let localVue, store;

    beforeAll(() => {
        localVue = createLocalVue();
        localVue.use(Vuex);
    });

    beforeEach(() => {
        store = mockVuexStore({
            myStore: {
                mutations,
                actions,
                state: {
                    foo: {
                        bar: 1,
                        baz: 2,
                        qux: {
                            bla: ['a', 'b', 'c']
                        }
                    }
                }
            }
        });
    });

    describe('mutations', () => {

        describe('add', () => {
            it('adds to object', () => {
                store.commit('myStore/patch.add', { path: '/foo/qux/x', value: '3' });
                expect(store.state.myStore.foo.qux.x).toBe('3');
            });

            it('adds to array', () => {
                store.commit('myStore/patch.add', { path: '/foo/qux/bla/1', value: 'e' });
                expect(store.state.myStore.foo.qux.bla).toStrictEqual(['a', 'e', 'b', 'c']);
            });

            it('pushes to end of array', () => {
                store.commit('myStore/patch.add', { path: '/foo/qux/bla/-', value: 'e' });
                expect(store.state.myStore.foo.qux.bla).toStrictEqual(['a', 'b', 'c', 'e']);
            });

            it('throws an error for non-numeric array indexes', () => {
                let mutation = () => store.commit('myStore/patch.add', { path: '/foo/qux/bla/x', value: 'e' });
                expect(mutation).toThrow('Invalid array index "x"');
            });
        });

        describe('replace', () => {
            it('replaces object item', () => {
                store.commit('myStore/patch.replace', { path: '/foo/bar', value: '3' });
                expect(store.state.myStore.foo.bar).toBe('3');
            });

            it('replaces array item', () => {
                store.commit('myStore/patch.replace', { path: '/foo/qux/bla/1', value: 'e' });
                expect(store.state.myStore.foo.qux.bla).toStrictEqual(['a', 'e', 'c']);
            });
        });

        describe('remove', () => {
            it('removes object item', () => {
                store.commit('myStore/patch.remove', { path: '/foo/bar' });
                expect(store.state.myStore.foo).toStrictEqual({ baz: 2, qux: { bla: ['a', 'b', 'c'] } });
            });

            it('replaces array item', () => {
                store.commit('myStore/patch.remove', { path: '/foo/qux/bla/1' });
                expect(store.state.myStore.foo.qux.bla).toStrictEqual(['a', 'c']);
            });
            it('throws an error for non-numeric array indexes', () => {
                let mutation = () => store.commit('myStore/patch.remove', { path: '/foo/qux/bla/x' });
                expect(mutation).toThrow('Invalid array index "x"');
            });
        });

        describe('copy', () => {
            it('copies from a to b', () => {
                store.commit('myStore/patch.copy', { from: '/foo/qux', path: '/foo/x' });
                expect(store.state.myStore.foo).toStrictEqual({
                    bar: 1,
                    baz: 2,
                    qux: {
                        bla: ['a', 'b', 'c']
                    },
                    x: {
                        bla: ['a', 'b', 'c']
                    }
                });
            });
        });

        describe('move', () => {
            it('moves from a to b', () => {
                store.commit('myStore/patch.move', { from: '/foo/qux', path: '/foo/x' });
                expect(store.state.myStore.foo).toStrictEqual({
                    bar: 1,
                    baz: 2,
                    x: {
                        bla: ['a', 'b', 'c']
                    }
                });
            });
        });
    });

    describe('actions', () => {
        it('applies patches', () => {
            store.dispatch('myStore/patch.apply', [{
                op: 'move', from: '/foo/qux', path: '/foo/x'
            }, {
                op: 'remove', path: '/foo/bar'
            }, {
                op: 'add', path: '/foo/test', value: 'qux'
            }]);
            expect(store.state.myStore).toStrictEqual({
                foo: {
                    baz: 2,
                    test: 'qux',
                    x: {
                        bla: ['a', 'b', 'c']
                    }
                }
            });
        });
    });
});
