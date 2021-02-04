<script>
import { mapState } from 'vuex';
import Breadcrumb from '~/webapps-common/ui/components/Breadcrumb';
import ComponentIcon from '~/webapps-common/ui/assets/img/icons/node-workflow.svg?inline';
import MetaNodeIcon from '~/webapps-common/ui/assets/img/icons/metanode.svg?inline';
import LinkedComponentIcon from '~/webapps-common/ui/assets/img/icons/linked-component.svg?inline';
import LinkedMetanodeIcon from '~/webapps-common/ui/assets/img/icons/linked-metanode.svg?inline';

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
            let items = parents.map(({ containerType, name, containerId = 'root', linked }) => ({
                icon: this.getIcon(containerType, linked),
                text: name,
                href: `#${encodeURIComponent(containerId)}`
            }));

            const { containerType, linked } = this.workflow.info;
            items.push({
                text: this.workflow.info.name,
                icon: this.getIcon(containerType, linked)
            });
            return items;
        }
    },
    methods: {
        getIcon(type, linked) {
            if (linked && type === 'component') {
                return LinkedComponentIcon;
            } else if (linked && type === 'metanode') {
                return LinkedMetanodeIcon;
            } else if (type === 'component') {
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
            
            this.$store.dispatch('openedProjects/switchWorkflow',
                {
                    projectId: this.workflow.projectId,
                    workflowId
                });
        }
    }
};
</script>

<template>
  <Breadcrumb
    :items="items"
    @click.capture.prevent.stop.native="onClick"
  />
</template>

<style lang="postcss" scoped>
>>> ul {
  user-select: none;
}
</style>
