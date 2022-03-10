<script>
import CirclePlus from '~/webapps-common/ui/assets/img/icons/circle-plus.svg?inline';
import FolderWorkflow from '~/webapps-common/ui/assets/img/icons/folder-workflow.svg?inline';

export default {
    components: {
        CirclePlus,
        FolderWorkflow
    }
};
</script>

<template>
  <main>
    <div class="buttons">
      <button>
        <CirclePlus class="icon" />
        <div class="primary">
          Create workflow
        </div>
      </button>
      <button @click="$commands.dispatch('openWorkflow')">
        <FolderWorkflow class="icon" />
        <div>
          Open workflow
        </div>
      </button>
    </div>
  </main>
</template>

<style lang="postcss" scoped>
main {
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: "Roboto Condensed", sans-serif;
  background-color: var(--knime-white);
  background-image: url('~assets/entry-page-background.png');
  background-repeat: no-repeat;
  background-position: bottom right;

  & .buttons {
    & button {
      width: 400px;
      height: 340px;
      margin: 0 20px;
      padding: 0;
      background-color: var(--knime-gray-ultra-light);
      border: none;
      box-shadow: 0 1px 14px var(--knime-silver-sand);
      position: relative;

      & .icon {
        width: 50px;
        stroke: var(--knime-masala);
        padding-bottom: 30px;
      }

      & div {
        background-color: var(--knime-masala);
        color: var(--knime-white);
        height: 70px;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 100;
        font-size: 20px;
        position: absolute;
        bottom: 0;
      }

      & .primary {
        background-color: var(--knime-yellow);
        color: var(--knime-masala);
      }
    }

    & :hover {
      cursor: pointer;
    }
  }
}

</style>
