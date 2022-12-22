<script>
import Modal from 'webapps-common/ui/components/Modal.vue';
import Button from 'webapps-common/ui/components/Button.vue';
import OpenSourceCredits from 'webapps-common/ui/components/OpenSourceCredits.vue';

export default {
    components: {
        Modal,
        Button,
        OpenSourceCredits
    },
    props: {
        withBorder: {
            type: Boolean,
            default: false
        },
        primary: {
            type: Boolean,
            default: true
        },
        textBold: {
            type: Boolean,
            default: false
        }
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
      :primary="primary"
      :with-border="withBorder"
      @click="modalActive = true"
    >
      <strong v-if="textBold">Credits</strong>
      <div v-else>Credits</div>
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

