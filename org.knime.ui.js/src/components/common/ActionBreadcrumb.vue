<script>
import Breadcrumb from 'webapps-common/ui/components/Breadcrumb.vue';

/**
 * Wraps the webapps-common Breadcrumb and works with IDs and click events instead of nuxt-links.
 * Emits @click with the given id prop in items. Does not support `href` in items.
 */
export default {
    components: {
        Breadcrumb
    },
    props: {
        /**
         * items as array with a 'text' and optional properties 'id', 'icon'
         * e.g.
         * [
         *   { text: 'John Doe', id: 'john.doe' },
         *   { text: 'Public Space', id: 'john.doe.space' },
         *   { text: 'Examples', id: 'john.doe.space.examples' },
         *   { text: 'Sentiment Prediction' }
         * ]
         */
        items: {
            type: Array,
            default: () => []
        }
    },
    emits: ['click'],
    computed: {
        breadcrumbItems() {
            return this.items.map(({ text, icon, id }) => {
                let item = {
                    text,
                    icon: icon || null
                };
                if (id) {
                    item.href = `#${encodeURIComponent(id)}`;
                }
                return item;
            });
        }
    },
    methods: {
        onClick({ target }) {
            if (!target || !target.href) {
                return;
            }
            let { hash } = new URL(target.href, 'file://dummy/');
            let id = decodeURIComponent(hash.replace(/^#/, ''));

            this.$emit('click', { id, target });
        }
    }
};
</script>

<template>
  <Breadcrumb
    v-bind="$attrs"
    :items="breadcrumbItems"
    v-on="$attrs"
    @click.capture.prevent.stop="onClick"
  />
</template>
