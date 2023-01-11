<script>
import ForumIcon from 'webapps-common/ui/assets/img/icons/forum.svg';
import ExtensionIcon from 'webapps-common/ui/assets/img/icons/extension.svg';
import PerspectiveSwitchIcon from 'webapps-common/ui/assets/img/icons/perspective-switch.svg';
import KnimeLogo from 'webapps-common/ui/assets/img/KNIME_Logo_gray.svg';
import Button from 'webapps-common/ui/components/Button.vue';

import Page from '@/components/common/Page.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import OpenSourceCreditsModal from './OpenSourceCreditsModal.vue';

export default {
    components: {
        ForumIcon,
        ExtensionIcon,
        PerspectiveSwitchIcon,
        KnimeLogo,
        Button,
        Page,
        PageHeader,
        OpenSourceCreditsModal
    },
    methods: {
        switchToJavaUI() {
            window.switchToJavaUI();
        },

        openAboutDialog() {
            window.openAboutDialog();
        },

        openInstallExtensionsDialog() {
            window.openInstallExtensionsDialog();
        }
    }
};
</script>

<template>
  <Page>
    <PageHeader title="Information" />

    <!-- Forum section -->
    <section>
      <div class="grid-container">
        <div class="grid-item-3 category">
          <ForumIcon />
          <h3>Get help from the<br>KNIME community</h3>
        </div>

        <div class="grid-item-9 body">
          <p>Get answers to your data questions from the active, global community.</p>
          <Button
            with-border
            href="https://forum.knime.com/?src=knimeappmodernui"
          >
            <strong>Visit Forum</strong>
          </Button>
        </div>
      </div>
    </section>

    <!-- Extensions section -->
    <section>
      <div class="grid-container">
        <div class="grid-item-3 category">
          <ExtensionIcon />
          <h3>Install Extensions</h3>
        </div>

        <div class="grid-item-9 body">
          <p>
            Install Extensions to access additional functionality such as the ability to
            process complex data types, as well as to use advanced algorithms.
          </p>
          <Button
            with-border
            @click="openInstallExtensionsDialog"
          >
            <strong>Install Extensions</strong>
          </Button>
        </div>
      </div>
    </section>

    <!-- Perspective switch section -->
    <section>
      <div class="grid-container">
        <div class="grid-item-3 category">
          <PerspectiveSwitchIcon />
          <h3>Switch to<br>classic user interface</h3>
        </div>

        <div class="grid-item-9 body">
          <p>
            Switch to the classic KNIME Analytics Platform user interface. To switch back again,
            click the button “Open KNIME Modern UI Preview” in the top right corner of the classic perspective.
          </p>
          <Button
            with-border
            @click="switchToJavaUI"
          >
            <strong>Switch to classic user interface</strong>
          </Button>
        </div>
      </div>
    </section>

    <!-- About section -->
    <section>
      <div class="grid-container">
        <div class="grid-item-3 category-image">
          <KnimeLogo />
        </div>

        <div class="grid-item-9 body">
          <p>
            Copyright by KNIME AG, Zurich, Switzerland <br>
            <a href="mailto:contact@knime.com">contact@knime.com</a><br>
            <a
              href="https://www.knime.com"
              target="_blank"
              rel="noreferrer"
            >
              https://www.knime.com
            </a>
            <br>
            <br>
            This software is a bundle of multiple modules, each released under its own license.
            Please check the individual licenses by clicking “About KNIME” and the “Credits” button.
          </p>
          <div class="section-buttons">
            <Button
              with-border
              @click="openAboutDialog"
            >
              <strong>About KNIME</strong>
            </Button>
            <OpenSourceCreditsModal
              with-border
              text-bold
              :primary="false"
            />
          </div>
        </div>
      </div>
    </section>
  </Page>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

section {
  background-color: var(--knime-gray-light-semi);

  & .grid-container {
    padding-top: 60px;
    padding-bottom: 60px;
    border-bottom: 1px solid var(--knime-silver-sand);
  }

  &:last-child .grid-container {
    padding-bottom: 200px;
    border-bottom: none;
  }

  & .category-image {
    display: flex;

    & svg {
      max-width: 230px;
      height: min-content;
    }
  }

  & .category {
    display: flex;
    font-size: 22px;

    & h3 {
      margin-block-start: 0;
      align-self: flex-start;
      width: 100%;
      font-weight: 700;
      font-size: 22px;
      line-height: 28px;
    }

    & svg {
      align-self: flex-start;
      margin-right: 10px;

      @mixin svg-icon-size 25;
    }
  }

  & .body {
    & p {
      margin-top: 0;
      margin-bottom: 1.7em;
      font-weight: 300;
      font-size: 18px;
      line-height: 27px;
    }
  }

  & .section-buttons {
    display: flex;

    & button {
      margin-right: 20px;
    }
  }
}
</style>
