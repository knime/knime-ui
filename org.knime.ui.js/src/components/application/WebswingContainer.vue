<!-- eslint-disable func-style -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { loadScript } from "webapps-common/ui/util/loadComponentLibrary";
import { useStore } from "@/composables/useStore";
import { API } from "@api";

const store = useStore();

const config = computed(() => store.state.workflow.webswingDialogConfig); // TODO: Fix type issue
const projectId = computed( // TODO: Do we actually use it?
  () => store.state.workflow.activeWorkflow?.projectId,
);
const workflowId = computed( // TODO: Do we actually use it?
  () => store.state.workflow.activeWorkflow?.info.containerId,
);

const isReady = ref(false);

const baseUrl = document.location.origin; // TODO: Is this correct?

function startSession() {
  API.webswing.startSession();
}

function openDialog(projectId: any, workflowId: any, nodeId: any) {
  API.webswing.openDialog({ projectId, workflowId, nodeId });
}

function sendMessageToJava(msg: any) {
  API.webswing.sendBinaryMessage(msg);
}

function registerMessageFromJavaHandler(handler: any) {
  API.webswing.addBinaryEventListener(handler);
}

watch(config, async () => {
  if (config.value) {
    await loadScript({
      window,
      url: "http://localhost:7000/com/knime/ui/webswing/javascript/webswing-embed.js",
    });
    isReady.value = true;
  }
});

// let instanceId;

window.webswingInstance0 = {
  options: {
    autoStart: true,
    connectionUrl: baseUrl,
    disableLogin: true,
    pingParams: {
      count: 5,
      interval: 4,
      maxLatency: 499,
      notifyIf: 2,
      url: "http://localhost:6999/custom_ping",
    },
    customization(injector: any) {
      const processMessage = injector.services.base.processMessage;
      const startPing = injector.services.ping.start;

      injector.services.socket.connect = () => {
        registerMessageFromJavaHandler((data: any) =>
          injector.services.socket.receiveEncodedMessage(data),
        );
        startSession();
        startPing();

        // TODO close dialog
      };

      injector.services.socket.instanceId = () => {
        // return instanceId;
      };
      injector.services.socket.awaitResponse = (
        callback,
        request,
        correlationId,
        timeout,
      ) => {
        // not supported
      };
      injector.services.socket.dispose = () => {
        // instanceId = null;
        // TODO remove binary websocket message listener
      };
      injector.services.socket.clearInstanceId = () => {
        // instanceId = null;
      };
      injector.services.socket.getConnectionInfo = () => {
        return {
          serverId: "N/A",
          sessionPoolId: "N/A",
          tabId: window.name,
          //   instanceId,
        };
      };
      injector.services.socket.sendAppFrame = (appFrameProto: any) => {
        const msg = injector.services.socket.encodeAppFrameProto(appFrameProto); // Uint7Array
        sendMessageToJava(msg);
      };

      injector.services.base.processMessage = (appFrame: any) => {
        processMessage(appFrame);

        if (appFrame?.startApplication !== null) {
          openDialog(projectId.value, workflowId.value, config.value.nodeId); // When do we call this?
        }
      };

      injector.services.webswing.configureFetchTimeout = () => {
        return Promise.resolve(6);
      };
    },
  },
};
</script>

<template>
  <div v-if="config" v-show="isReady" class="webswing">
    <div class="webswing-element" data-webswing-instance="webswingInstance0">
      <div id="loading" class="ws-modal-container">
        <div class="ws-login">
          <div  class="ws-login-content">
            <div class="ws-spinner">
              <div class="ws-spinner-dot-1"/> 
              <div class="ws-spinner-dot-2"/>
            </div>
          </div>
        </div>
      </div>
	  </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url('http://localhost:7000/com/knime/ui/webswing/css/style.css');
.webswing {
  position: fixed;
  z-index: 10; 
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: lightgray;
  opacity: 0.75;
}
</style>
