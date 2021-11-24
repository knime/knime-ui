<script>
import { mapState } from 'vuex';
import ActionBreadcrumb from '~/components/ActionBreadcrumb';
import ComponentIcon from '~/webapps-common/ui/assets/img/icons/node-workflow.svg?inline';
import MetaNodeIcon from '~/webapps-common/ui/assets/img/icons/metanode.svg?inline';
import LinkedComponentIcon from '~/webapps-common/ui/assets/img/icons/linked-component.svg?inline';
import LinkedMetanodeIcon from '~/webapps-common/ui/assets/img/icons/linked-metanode.svg?inline';

/**
 * A breadcrumb for navigating through the component / metanode hierarchy inside a workflow
 */
export default {
    components: {
        ActionBreadcrumb
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
                id: containerId
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
        onClick({ id }) {
            this.$store.dispatch(
                'openedProjects/switchWorkflow',
                {
                    projectId: this.workflow.projectId,
                    workflowId: id
                }
            );
        }
    }
};
</script>

<template>
  <ActionBreadcrumb
    :items="items"
    @click="onClick"
  />
</template>

<style lang="postcss" scoped>
>>> ul {
  user-select: none;
}

nav {
  overflow: hidden;
}
</style>
