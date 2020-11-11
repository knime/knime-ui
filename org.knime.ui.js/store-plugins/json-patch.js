import Vue from 'vue';

/*
* Provides JSON Patch (http://jsonpatch.com/) functionality for Vuex stores.
* Differences to RFC 6902:
*  - Does not support the "test" operation
*  - Patches are not atomic, i.e. operations are applied one-by-one without rollback
*
* It provides the `patch.apply' action.
*
* @example
*
* //embedding
* import { mutations as jsonPatchMutations, actions as jsonPatchActions } from '…/json-patch';
* export const mutations = {
*    ...jsonPatchMutations,
*    // etc.
* };
* export const actions = {
*    ...jsonPatchActions,
*    // etc.
* };
*
* // usage
* state: { foo: { bar: 1 } }
* dispatch('patch.apply', [{ op: 'add', path: '/foo/baz', value: 2 }])
* -> state: { foo: { bar: 1, baz: 2 } }
* dispatch('patch.apply', [{ op: 'remove', path: '/foo/bar' }])
* -> state:  { foo: { baz: 2 } }
*/

let resolvePointer = (target, path) => {
    // unescaping according to RFC 6901
    let parts = path.replace(/^\//, '').split('/').map(x => x.replace(/~1/g, '/').replace(/~0/g, '~'));
    let key = parts.pop();
    while (parts.length) {
        target = target[parts.shift()];
    }
    return [target, key];
};

export const mutations = {
    'patch.add'(state, { path, value }) {
        let [target, key] = resolvePointer(state, path);
        if (Array.isArray(target)) {
            if (key === '-') {
                target.push(value);
            } else if (/^[0-9]+$/.test(key)) {
                target.splice(Number(key), 0, value);
            } else {
                throw new TypeError(`Invalid array index "${key}"`);
            }
        } else {
            Vue.set(target, key, value);
        }
    },

    'patch.replace'(state, { path, value }) {
        let [target, key] = resolvePointer(state, path);
        Vue.set(target, key, value);
    },

    'patch.remove'(state, { path }) {
        let [target, key] = resolvePointer(state, path);
        if (Array.isArray(target)) {
            if (/^[0-9]+$/.test(key)) {
                target.splice(Number(key), 1);
            } else {
                throw new TypeError(`Invalid array index "${key}"`);
            }
        } else {
            Vue.delete(target, key);
        }
    },

    'patch.copy'(state, { from, path }) {
        let [target, key] = resolvePointer(state, path);
        let [source] = resolvePointer(state, `${from}/`);
        let clone = JSON.parse(JSON.stringify(source));
        Vue.set(target, key, clone);
    },

    'patch.move'(state, { from, path }) {
        mutations['patch.copy'](state, { from, path });
        mutations['patch.remove'](state, { path: from });
    }
};

/* eslint-disable no-invalid-this */
export const actions = {
    'patch.apply'({ commit, rootState }, patch) {
        patch.forEach(cmd => {
            let { op, ...payload } = cmd;
            commit(`patch.${op}`, payload);
        });
    }
};
