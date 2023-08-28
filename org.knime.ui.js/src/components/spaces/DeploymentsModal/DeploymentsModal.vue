<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from "vuex";

import Modal from "webapps-common/ui/components/Modal.vue";
import CirclePlayIcon from "webapps-common/ui/assets/img/icons/circle-play.svg";

import JobsTable from "./JobsTable.vue";

export default defineComponent({
  components: {
    Modal,
    CirclePlayIcon,
    JobsTable,
  },
  computed: {
    ...mapState("spaces", ["displayDeploymentsModal", "jobs"]),
    isDisplayDeploymentsModalOpen() {
      return this.displayDeploymentsModal.isOpen;
    },
    selectedItemName() {
      return `Deployments and jobs of "${this.displayDeploymentsModal.name}"`;
    },
  },
  methods: {
    closeModal() {
      this.$store.commit("spaces/setDisplayDeploymentsModal", {
        isOpen: false,
        name: null,
      });
    },
  },
});
</script>

<template>
  <Modal
    v-show="isDisplayDeploymentsModalOpen"
    ref="modalRef"
    :active="isDisplayDeploymentsModalOpen"
    :title="selectedItemName"
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #icon><CirclePlayIcon /></template>
    <template #confirmation>
      <JobsTable />
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 80%;
}

:deep() {
  & .confirmation,
  & .controls {
    background-color: var(--knime-porcelain);
  }

  &.modal-wrapper h2 {
    color: var(--knime-masala);
    font-family: "Roboto Condensed", sans-serif;
  }

  & .state {
    display: inline-block;
    padding-left: 20px;
    margin-left: -20px;

    &::before {
      content: "●";
      font-size: 10px;
      position: static;
      top: -1px;
      margin-right: 8px;
    }
  }

  & .execution-finished {
    color: var(--theme-color-success);
  }

  & .failed {
    color: var(--theme-color-error);
  }

  & .running {
    color: var(--theme-color-running);
  }

  & .interaction-required {
    color: var(--theme-color-action-required);
  }
}
</style>
