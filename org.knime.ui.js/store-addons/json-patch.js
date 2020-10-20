import Vue from 'vue';

// http://jsonpatch.com/
let resolvePointer = (target, path) => {
    let parts = path.replace(/^\//, '').split('/').map(x => x.replace(/~1/g, '/').replace(/~0/g, '~'));
    let key = parts.pop();
    while (parts.length) {
        target = target[parts.shift()];
    }
    return [target, key];
};

const mutations = {
    add(state, { path, value }) {
        let [target, key] = resolvePointer(state, path);
        if (Array.isArray(target)) {
            if (key === '-') {
                target.push(value);
            } else if (/^[0-9]+$/.test(key)) {
                target.splice(+key, 0, value);
            } else {
                throw new TypeError(`Invalid array index "${key}"`);
            }
        } else {
            Vue.set(target, key, value);
        }
    },

    replace(state, { path, value }) {
        let [target, key] = resolvePointer(state, path);
        target[key] = value;
    },

    remove(state, { path }) {
        let [target, key] = resolvePointer(state, path);
        if (Array.isArray(target)) {
            if (/^[0-9]+$/.test(key)) {
                target.splice(+key, 1);
            } else {
                throw new TypeError(`Invalid array index "${key}"`);
            }
        } else {
            Vue.delete(target, key);
        }
    },

    copy(state, { from, path }) {
        let [target, key] = resolvePointer(state, path);
        let source = resolvePointer(state, `${from}/`)[0];
        let clone = JSON.parse(JSON.stringify(source));
        Vue.set(target, key, clone);
    },

    move(state, { from, path }) {
        mutations.copy(state, { from, path });
        mutations.remove(state, { path: from });
    }
};

const applyPatch = function (ns, patch) {
    let namespacedState;
    let type = '✨';
    if (ns) {
        type = `${ns}/${type}`;
        namespacedState = resolvePointer(this.state, `/${ns}/`)[0];
    } else {
        patch = ns;
        namespacedState = this.state;
    }
    this._withCommit(() => {
        patch.forEach(cmd => {
            let { op, ...payload } = cmd;
            mutations[op](namespacedState, payload);
            if (this._devtoolHook) {
                this._devtoolHook.emit('vuex:mutation', { type: `${type}${op}`, payload }, this.state);
            }
        });
    });
};

export default store => {
    store.applyPatch = applyPatch;
};
