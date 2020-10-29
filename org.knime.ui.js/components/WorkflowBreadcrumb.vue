<script>
import { mapState } from 'vuex';
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
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        items() {
            let parents = this.workflow.parents || [];
            let items = parents.map(({ containerType, name, containerId = 'root' }) => ({
                icon: this.getIcon(containerType),
                text: name,
                href: `#${encodeURIComponent(containerId)}`
            }));
            items.push({
                text: this.workflow.info.name,
                icon: this.getIcon(this.workflow.info.containerType)
            });
            return items;
        }
    },
    methods: {
        getIcon(type) {
            if (type === 'component') {
                return ComponentIcon;
            } else if (type === 'metanode') {
                return MetaNodeIcon;
            } else {
                return null;
            }
        },
        onClick({ target }) {
            if (!target || !target.href) {
                return;
            }
            let { hash } = new URL(target.href, 'file://dummy/');
            let workflowId = decodeURIComponent(hash.replace(/^#/, ''));
            this.$store.dispatch('workflow/loadWorkflow', { projectId: this.workflow.projectId, workflowId });
        }
    }
};
</script>

<template>
  <div
    class="container"
    @click.capture.prevent.stop="onClick"
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
