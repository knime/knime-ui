<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "vuex";

import Modal from "webapps-common/ui/components/Modal.vue";
import CirclePlayIcon from "webapps-common/ui/assets/img/icons/circle-play.svg";

const store = useStore();

const isDisplayJobModalOpen = computed(
  () => store.state.spaces.displayJobModal.isOpen,
);

const closeModal = () => {
  store.commit("spaces/setDisplayJobModal", {
    isOpen: false,
  });
};
</script>

<template>
  <Modal
    v-show="isDisplayJobModalOpen"
    ref="modalRef"
    :active="isDisplayJobModalOpen"
    title="Deployments and jobs of ..."
    style-type="info"
    class="modal"
    @cancel="closeModal"
  >
    <template #icon><CirclePlayIcon /></template>
    <template #confirmation>
      <h2>Schedules</h2>
    </template>
  </Modal>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 80%;
}
</style>
