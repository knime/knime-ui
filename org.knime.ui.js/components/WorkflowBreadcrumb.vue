<script>
import Breadcrumb from '~/webapps-common/ui/components/Breadcrumb';
import ComponentIcon from '~/webapps-common/ui/assets/img/icons/node-workflow.svg?inline';
import MetaNodeIcon from '~/webapps-common/ui/assets/img/icons/metanode.svg?inline';

/**
 * A breadcrumb for navigating through the component / metanode hierarchy inside a workflow
 */
export default {
    components: {
        Breadcrumb
    },
    computed: {
        items() {
            // TODO: move to store NXT-288
            return [{
                text: 'Workflow',
                href: '#1'
            }, {
                text: 'Component',
                icon: ComponentIcon,
                href: '#2'
            }, {
                text: 'MetaNode',
                icon: MetaNodeIcon,
                href: '#3'
            }, {
                text: 'Component',
                icon: ComponentIcon,
                href: '#4'
            }, {
                text: 'MetaNode',
                icon: MetaNodeIcon,
                href: '#5'
            }, {
                text: 'Component',
                icon: ComponentIcon,
                href: '#'
            }, {
                text: 'Component',
                icon: ComponentIcon,
                href: '#'
            }, {
                text: 'Component',
                icon: ComponentIcon
            }];
        }
    },
    methods: {
        onClick({ originalTarget }) {
            if (!originalTarget.href) {
                return;
            }
            let targetId = originalTarget.href.replace(/.*#/, '');
            this.$store.dispatch('workflow/navigate', targetId);
        }
    }
};
</script>

<template>
  <div
    class="container"
    @click.capture.prevent="onClick"
  >
    <Breadcrumb
      :items="items"
    />
  </div>
</template>

<style lang="postcss" scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--knime-porcelain);
}
</style>
