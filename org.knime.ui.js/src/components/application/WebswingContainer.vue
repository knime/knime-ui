<!-- eslint-disable func-style -->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { loadScript } from "webapps-common/ui/util/loadComponentLibrary";
import { useStore } from "@/composables/useStore";
import { API } from "@api";

const store = useStore();

// @ts-ignore
const config = computed(() => store.state.workflow.webswingDialogConfig);
const projectId = computed(
  () => store.state.workflow.activeWorkflow?.projectId,
);
const workflowId = computed(
  () => store.state.workflow.activeWorkflow?.info.containerId,
);

const isReady = ref(false);

const baseUrl = document.location.origin; // TODO: Is this correct?

function startSession() {
  debugger;
  API.webswing.startSession();
}

function openDialog(
  projectId: string | undefined,
  workflowId: string | undefined,
  nodeId: string | undefined
) {
  debugger;
  API.webswing.openDialog({ projectId, workflowId, nodeId });
}

function sendMessageToJava(msg: ArrayBuffer) {
  debugger;
  API.webswing.sendBinaryMessage(msg);
}

function registerMessageFromJavaHandler(handler: any) {
  debugger;
  API.webswing.addBinaryEventListener(handler);
}

watch(config, async () => {
  if (config.value) {
    await loadScript({
      window,
      url: "http://localhost:7000/com/knime/ui/webswing/javascript/webswing-embed.js", // TODO: Replace hard coded URL
    });
    isReady.value = true;
  }
});

let instance_id: any; // eslint-disable-line

// @ts-ignore
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
        registerMessageFromJavaHandler((data: ArrayBuffer) => {
          debugger;
          injector.services.socket.receiveEncodedMessage(data);
        });
        startSession();
        startPing();

        // TODO close dialog
      };

      injector.services.socket.instanceId = () => {
        return instance_id; // eslint-disable-line
      };

      injector.services.socket.awaitResponse = (
        callback: any,
        request: any,
        correlationId: any,
        timeout: any,
      ) => {
        // eslint-disable-next-line
        console.log(`callback: ${callback}, request: ${request}, correlationId: ${correlationId}, timeout: ${timeout}`);

        // TODO not supported yet
      };

      injector.services.socket.dispose = () => {
        instance_id = null; // eslint-disable-line

        // TODO remove binary websocket message listener
      };

      injector.services.socket.clearInstanceId = () => {
        instance_id = null; // eslint-disable-line
      };

      injector.services.socket.getConnectionInfo = () => {
        return {
          serverId: "N/A",
          sessionPoolId: "N/A",
          tabId: window.name,
          instanceId: instance_id // eslint-disable-line
        };
      };
      
      injector.services.socket.sendAppFrame = (appFrameProto: any) => {
        const msg = injector.services.socket.encodeAppFrameProto(appFrameProto);
        sendMessageToJava(msg);
      };

      injector.services.base.processMessage = (appFrame: any) => {
        processMessage(appFrame);
        if (appFrame?.startApplication !== null) {
          openDialog(projectId.value, workflowId.value, config.value.nodeId);
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
