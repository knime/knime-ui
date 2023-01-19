<script>
import Button from 'webapps-common/ui/components/Button.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import ComputerDesktopIcon from '@/assets/computer-desktop.svg';
import AddFileIcon from '@/assets/add-file.svg';
import ImportWorkflowIcon from '@/assets/import-workflow.svg';
import SpaceExplorer from './SpaceExplorer.vue';

export default {
    components: {
        SpaceExplorer,
        ComputerDesktopIcon,
        AddFileIcon,
        ImportWorkflowIcon,
        PageHeader,
        Button
    }
};
</script>

<template>
  <main ref="main">
    <PageHeader
      title="Your Local Space"
      subtitle="Local space"
    >
      <template #icon>
        <ComputerDesktopIcon />
      </template>
    </PageHeader>

    <section class="toolbar-wrapper">
      <div class="grid-container">
        <div class="grid-item-12">
          <div class="toolbar">
            <div class="toolbar-buttons">
              <Button
                with-border
                compact
              >
                <ImportWorkflowIcon />
                Import workflow
              </Button>
              <Button
                with-border
                compact
              >
                <AddFileIcon />
                Add files
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="space-explorer-wrapper">
      <div class="grid-container">
        <div class="grid-item-12">
          <SpaceExplorer />
        </div>
      </div>
    </section>
  </main>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

main {
  display: flex;
  flex-direction: column;
  background-color: var(--knime-white);
  overflow-y: scroll;
  height: 100%;
}

.toolbar-wrapper {
  min-height: 60px;
  background: var(--knime-gray-light-semi);

  & .grid-container,
  & .grid-item-12,
  & .toolbar {
    height: 100%;
  }

  & .toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;

    & .toolbar-buttons {
      & .button {
        margin-left: 5px;
        border-color: var(--knime-silver-sand);
        color: var(--knime-masala);

        & svg {
          @mixin svg-icon-size 18;

          stroke: var(--knime-masala);
          margin-right: 4px;
        }

        &:hover {
          cursor: pointer;
          color: var(--knime-white);
          background-color: var(--knime-masala);
          border-color: var(--knime-masala);

          & svg {
            stroke: var(--knime-white);
          }
        }
      }
    }
  }
}

.space-explorer-wrapper {
  background: var(--knime-porcelain);
  padding-top: 50px;
  padding-bottom: 80px;
  flex: 1;
}
</style>
