export const state = () => ({
    items: []
});

export const mutations = {
    setItems(state, payload) {
        state.items = payload;
    },
    addItem(state, item) {
        state.items.push(item);
    }
};


export const getters = {
    isFoo(state, getters, rootState, rootGetters) {
        // return getters.isBar;
        // return rootGetters['qux/bla'].baz;
    }
};

/*
import { mapState, mapActions, mapGetters, mapMutations } from 'vuex';

// The first parameter is optional for all mappers

    computed: {
        ...mapState('foo', ['bar']),
        ...mapState('foo', {
            bla: 'bar',
            bla2: state => state.bar
        }),

        ...mapGetters('foo', ['bar']),
        ...mapGetters('foo', {
            bar: 'bla'
        })
    },

    methods: {
        ...mapActions('foo', ['baz']),
        ...mapActions('foo', {
            bar: 'baz',
            foo: (dispatch, ...args) => dispatch('something', args, { root: true })
        }),

        ...mapMutations('foo', ['baz']),
        ...mapMutations('foo', {
            bar: 'baz',
            foo: (commit, ...args) => commit('something', args, { root: true })
        }),
    }
 */
