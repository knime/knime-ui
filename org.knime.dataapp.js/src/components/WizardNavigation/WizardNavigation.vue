<script>
import { mapGetters } from "vuex";

import { Button, FunctionButton, SplitButton, SubMenu } from "@knime/components";
import DropdownIcon from "@knime/styles/img/icons/arrow-dropdown.svg";
import ArrowLeftIcon from "@knime/styles/img/icons/arrow-left.svg";
import DownloadIcon from "@knime/styles/img/icons/cloud-download.svg";
import DOCXIcon from "@knime/styles/img/icons/file-docx.svg";
import HTMLIcon from "@knime/styles/img/icons/file-html.svg";
import ODPIcon from "@knime/styles/img/icons/file-odp.svg";
import ODSIcon from "@knime/styles/img/icons/file-ods.svg";
import ODTIcon from "@knime/styles/img/icons/file-odt.svg";
import PDFIcon from "@knime/styles/img/icons/file-pdf.svg";
import PPTXIcon from "@knime/styles/img/icons/file-pptx.svg";
import PSIcon from "@knime/styles/img/icons/file-ps.svg";
import XLSXIcon from "@knime/styles/img/icons/file-xlsx.svg";

import ProgressBar from "@/components/ExecutionProgress/ProgressBar.vue";
import { defaultReportFormats, reportFormats } from "@/config";

import ControlBar from "./ControlBar.vue";

const icons = {
  PDF: PDFIcon,
  XLSX: XLSXIcon,
  PPTX: PPTXIcon,
  DOCX: DOCXIcon,
  ODP: ODPIcon,
  ODS: ODSIcon,
  ODT: ODTIcon,
  PS: PSIcon,
  HTML: HTMLIcon,
};

/**
 * Navigation controls for job page (job-exec).
 *
 * Redirect behavior:
 * {next/prev page success} none, store updates
 * {next/prev page failure} redirect to the workflow page
 * {close} redirect to the workflow page if exists, else index page
 * {close & discard} redirect to the workflow page if exists, else index page
 */
export default {
  components: {
    ControlBar,
    ProgressBar,
    Button,
    FunctionButton,
    ArrowLeftIcon,
    DownloadIcon,
    DropdownIcon,
    SubMenu,
    SplitButton,
  },
  data() {
    return {
      /* Disables next page button. Separately disabled b/c we want to allow navigation,
            closing and discarding during execution and while next page is loading */
      loadingNextPage: false,
      /* Disables all buttons */
      navigating: false,
    };
  },
  computed: {
    page() {
      return this.$store.state.wizardExecution.page;
    },
    showNextButton() {
      return this.hasNextPage && !this.isExecuting;
    },
    allButtonsDisabled() {
      return this.navigating || this.isStopping || this.isMissing;
    },
    jobId() {
      return this.$store.state.wizardExecution.job.id;
    },
    linkItems() {
      const userFormats = defaultReportFormats;
      const formatsWithDescription = reportFormats.filter(([format]) =>
        userFormats.some((settingFormat) => new RegExp(settingFormat, "i").test(format)),
      );
      return formatsWithDescription.map(([id, description]) => ({
        href: this.$store.getters["api/reportDownloadLink"]({ format: id }),
        text: description,
        icon: icons[id],
      }));
    },
    ...mapGetters("wizardExecution", [
      "isReExecuting",
      "isWebNodesLoading",
      "reExecutionUpdates",
      "reExecutionPercent",
      "hasPreviousPage",
      "hasNextPage",
      "isMissing",
      "isExecuting",
      "isStopping",
      "isCancelled",
      "isFinished",
      "hasReport",
    ]),
  },
  methods: {
    async previousPage() {
      this.navigating = true;
      await this.$store.dispatch("wizardExecution/fetchPreviousPage", {
        jobId: this.jobId,
      });
      this.navigating = false;
    },
    async nextPage() {
      this.loadingNextPage = true;
      await this.$store.dispatch("wizardExecution/fetchNextPage", {
        jobId: this.jobId,
      });
      this.loadingNextPage = false;
    },
    cancelJob() {
      consola.debug("Cancel job.");
      this.navigating = true;
      this.$store.dispatch("wizardExecution/cancelJob", { jobId: this.jobId });
      this.navigating = false;
    },
  },
};
</script>

<template>
  <ControlBar>
    <template #leftItem>
      <FunctionButton
        v-if="hasPreviousPage"
        compact
        :disabled="allButtonsDisabled || loadingNextPage"
        @click="previousPage"
      >
        <ArrowLeftIcon /><span>Back</span>
      </FunctionButton>
    </template>
    <template #centerItem>
      <transition v-if="reExecutionUpdates >= 10" appear name="fade">
        <ProgressBar :percentage="reExecutionPercent" />
      </transition>
    </template>
    <template #rightItem>
      <SplitButton v-if="hasReport" class="report-download">
        <Button primary :disabled="allButtonsDisabled" :href="linkItems[0].href">
          <DownloadIcon class="download-icon" /> Download report
        </Button>
        <SubMenu orientation="top" :items="linkItems" :disabled="allButtonsDisabled">
          <DropdownIcon />
        </SubMenu>
      </SplitButton>
      <div class="right-button-subcontainer">
        <!-- Button "!isFinished" comes first by design  -->
        <Button
          v-if="!isFinished"
          with-border
          :prevent-default="true"
          :disabled="allButtonsDisabled"
          @click="cancelJob"
        >
          Cancel
        </Button>
        <template v-if="showNextButton">
          <div class="next-separator" />
          <Button
            primary
            :prevent-default="true"
            :disabled="allButtonsDisabled || isWebNodesLoading || loadingNextPage || isReExecuting"
            @click="nextPage"
          >
            Next
          </Button>
        </template>
      </div>
    </template>
  </ControlBar>
</template>

<style lang="postcss" scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity linear 0.5s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

:deep(.submenu) {
  background-color: var(--theme-button-split-background-color);

  & .submenu-toggle {
    & svg {
      transition: transform 0.2s ease-in-out;
    }

    &.expanded {
      & svg {
        transform: scaleY(-1);
      }
    }
  }

  &:hover {
    background-color: var(--theme-button-split-background-color-hover);

    & .submenu-toggle svg {
      stroke: var(--theme-button-split-foreground-color-hover);
    }
  }

  &:focus-within {
    background-color: var(--theme-button-split-background-color-focus);

    & .submenu-toggle svg {
      stroke: var(--theme-button-split-foreground-color-focus);
    }
  }
}

.right-button-subcontainer {
  display: inline-flex;

  & .next-separator {
    height: 44px;
    width: 30px;
    margin-left: 30px;
    border-left: 1px solid var(--knime-silver-sand);
  }

  & .delete-checkbox {
    vertical-align: sub;
    margin-right: 30px;
  }
}

@media only screen and (width <= 900px) {
  .report-download {
    margin-right: 15px;

    & .download-icon {
      display: none;
    }
  }

  .right-button-subcontainer .vertical-separator {
    width: 15px;

    &.next-separator {
      margin-left: 15px;
    }
  }
}
</style>
