<script>
import { mapGetters } from "vuex";

import CancelIcon from "@knime/styles/img/icons/circle-stop.svg";

import Tooltip from "@/components/ExecutionProgress/Tooltip.vue";
import { formatSemanticTime, formatTime } from "@/util/time";

// this value is needed to determine which interval loop should be stopped
let intervalId;

export default {
  components: {
    Tooltip,
    CancelIcon,
  },
  props: {
    cancel: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      timer: 0,
    };
  },
  computed: {
    ...mapGetters("wizardExecution", ["totalDuration", "totalPercentage"]),
    semanticTime() {
      return this.totalDuration >= 0
        ? this.formatSemanticTime(this.totalDuration)
        : this.formatSemanticTime(this.timer);
    },
    time() {
      return this.totalDuration >= 0
        ? this.formatTime(this.totalDuration)
        : this.formatTime(this.timer);
    },
    progressStyle() {
      return `width:${this.progressPercentage}%;`;
    },
    progressPercentage() {
      const fallbackNeeded = isNaN(this.totalPercentage) || this.totalPercentage < 1;
      return fallbackNeeded ? 1 : this.totalPercentage;
    },
  },
  mounted() {
    if (!this.cancel) {
      this.incrementTimer();
    }
  },
  beforeUnmount() {
    clearInterval(intervalId);
  },
  methods: {
    formatTime,
    formatSemanticTime,
    /**
     * This method acts as a simple seconds counter and as a fallback for the returned totalDuration as this value
     * occasionally returns sub-zero values
     * @returns {undefined}
     */
    incrementTimer() {
      intervalId = setInterval(() => {
        this.timer += 1000;
      }, 1000);
    },
  },
};
</script>

<template>
  <div class="details grid-item-8" :style="progressStyle">
    <p class="percentage">
      <CancelIcon v-if="cancel" class="cancel-icon" />
      <span v-else>{{ Math.round(progressPercentage) }}%</span>
    </p>
    <p class="divider" />
    <p class="time">
      <Tooltip>
        <template #tooltip> Total duration: {{ semanticTime }} </template>
        <abbr>
          {{ time }}
        </abbr>
      </Tooltip>
    </p>
  </div>
</template>

<style lang="postcss" scoped>
.node-names {
  display: none;
}

.details {
  display: flex;
  justify-content: flex-end;
  transition: width 1s;
  position: relative;
  height: 40px;
  width: 0;
  margin-left: 80px;
  margin-right: -80px;
}

.info {
  & .time {
    align-self: flex-end;
    font-size: 16px;
    line-height: 20px;
    margin: 0 0 0 15px;
    font-weight: 700;

    & abbr {
      text-decoration: none;
      border: none;
    }
  }

  & .percentage {
    font-size: 22px;
    line-height: 26px;
    font-weight: 700;
    margin: 0;

    & .cancel-icon {
      width: 24px;
      height: 24px;
      stroke-width: calc(32px / 24);
    }
  }

  & .divider {
    position: absolute;
    right: 70px;
    width: 45px;
    top: 1px;
    height: 30px;
    border-bottom: 1px solid var(--knime-stone-gray);
    transform: translateY(-20px) translateX(5px) rotate(-60deg);
  }

  & .status-executing {
    font-size: 16px;
    line-height: 24px;
    padding: 0;
    margin: 0;
    list-style-type: none;
  }

  & .statuslist-enter-active {
    transition: opacity 0.5s;
  }

  & .statuslist-enter {
    opacity: 0;
  }
}

@media only screen and (width <= 900px) {
  .details {
    margin-right: -10px;
  }
}
</style>
