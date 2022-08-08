<script>
import Modal from '~/webapps-common/ui/components/Modal.vue';
import Button from '~/webapps-common/ui/components/Button.vue';
import OpenSourceCredits from '~/webapps-common/ui/components/OpenSourceCredits.vue';

export default {
    components: {
        Modal,
        Button,
        OpenSourceCredits
    },
    data() {
        return {
            modalActive: false
        };
    }
};
</script>

<template>
  <div>
    <Button
      primary
      @click="modalActive = true"
    >
      Credits
    </Button>
    <Modal
      :active="modalActive"
      title="Open Source Credits"
      class="modal"
      style-type="info"
      @cancel="modalActive = false"
    >
      <template #notice>
        <OpenSourceCredits />
      </template>
    </Modal>
  </div>
</template>

<style lang="postcss" scoped>
.modal {
  --modal-width: 960px;

  & >>> .inner {
    top: 48%;
    height: 85%;
  }

  & >>> .notice {
    overflow-x: hidden;
    overflow-y: auto;
    height: 100%;
  }
}
</style>

