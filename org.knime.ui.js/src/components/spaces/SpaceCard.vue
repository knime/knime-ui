<script>
import WorkflowIcon from "webapps-common/ui/assets/img/icons/workflow.svg";
import CubeIcon from "webapps-common/ui/assets/img/icons/cube.svg";
import PrivateSpaceIcon from "webapps-common/ui/assets/img/icons/private-space.svg";
import HeartIcon from "webapps-common/ui/assets/img/icons/heart.svg";
import ComputerDesktopIcon from "webapps-common/ui/assets/img/icons/computer-desktop.svg";
import ServerIcon from "webapps-common/ui/assets/img/icons/server-racks.svg";

import Avatar from "@/components/common/Avatar.vue";
import Card from "@/components/common/Card.vue";
import CardHeader from "@/components/common/CardHeader.vue";
import CardContent from "@/components/common/CardContent.vue";
import CardFooter from "@/components/common/CardFooter.vue";

export default {
  components: {
    Avatar,
    Card,
    CardHeader,
    CardContent,
    CardFooter,
    WorkflowIcon,
    CubeIcon,
    PrivateSpaceIcon,
    HeartIcon,
    ServerIcon,
    ComputerDesktopIcon,
  },

  props: {
    space: {
      type: Object,
      required: true,
    },

    isLocal: {
      type: Boolean,
      default: false,
    },
    isServer: {
      type: Boolean,
      default: false,
    },
  },

  emits: ["click"],

  computed: {
    icon() {
      if (this.isLocal) {
        return ComputerDesktopIcon;
      }

      if (this.isServer) {
        return ServerIcon;
      }

      return this.space.private ? PrivateSpaceIcon : CubeIcon;
    },
    spaceDescription() {
      // override local description
      if (this.isLocal) {
        return (
          "The local space is the folder on your computer to store and access " +
          "KNIME workflows and data produced by your workflows."
        );
      }
      return this.space.description;
    },
  },
};
</script>

<template>
  <Card @click="$emit('click', space)">
    <CardHeader :color="isLocal ? 'default' : 'light'">
      <Component :is="icon" />
      <!-- TODO: Add later when kudos are available -->
      <!-- <div
        v-if="!isLocal"
        class="kudos"
      >
        <HeartIcon />
        <span>40</span>
      </div> -->
    </CardHeader>

    <CardContent padded :centered="false" class="space-card-content">
      <h5 v-if="!isLocal">{{ space.name }}</h5>
      <p>{{ spaceDescription }}</p>
      <!-- TODO: add later when lastUpdate is available -->
      <!-- <span>Last Update {{ space.lastUpdate }}</span> -->
    </CardContent>

    <CardFooter class="space-card-footer">
      <span v-if="!isLocal">{{ space.owner }}</span>
    </CardFooter>
  </Card>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.kudos {
  display: flex;
  align-items: center;
  margin-left: auto;

  & span {
    margin-left: 10px;
    color: var(--knime-dove-gray);
    font-weight: 500;
    font-size: 13px;
    line-height: 18px;
  }
}

.space-card-content {
  & h5 {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
    line-height: 24px;
    max-width: 100%;
    text-align: left;

    @mixin multi-line-truncate 2;
  }

  & p {
    font-size: 16px;
    margin: 5px 0;
    font-weight: 300;
    line-height: 24px;
    max-width: 100%;
    text-align: left;

    @mixin multi-line-truncate 4;
  }

  & span {
    font-size: 11px;
    line-height: 16px;
  }
}

.space-card-footer {
  & span {
    font-size: 11px;
    line-height: 16px;
  }
}
</style>
