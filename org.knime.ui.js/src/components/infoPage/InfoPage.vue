<script>
import ForumIcon from 'webapps-common/ui/assets/img/icons/forum.svg';
import ExtensionIcon from 'webapps-common/ui/assets/img/icons/extension.svg';
import PerspectiveSwitchIcon from 'webapps-common/ui/assets/img/icons/perspective-switch.svg';
import KnimeLogo from 'webapps-common/ui/assets/img/KNIME_Logo_gray.svg';
import Button from 'webapps-common/ui/components/Button.vue';

import OpenSourceCreditsModal from './OpenSourceCreditsModal.vue';

export default {
    components: {
        ForumIcon,
        ExtensionIcon,
        PerspectiveSwitchIcon,
        KnimeLogo,
        Button,
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
  <main>
    <header>
      <div class="grid-container">
        <div class="grid-item-12 page-title">
          <h1>Information</h1>
        </div>
      </div>
    </header>

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
            Extensions provide additional functionality such as access to and processing of complex data types,
            as well as the use of advanced algorithms. Install extensions to add additional functionality.
            The KNIME Extensions page gives you an overview of the extensions available for KNIME Analytics Platform.
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
          <h3>Switch back to<br>classic user interface</h3>
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
            Please check the individual licenses by clicking opening the “About KNIME” inside the
            “Installation Details” → “Properties”; and in addition to that the “Credits” button.
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
  </main>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

main {
  display: flex;
  flex-direction: column;
  color: var(--knime-masala);
  overflow-y: auto;
  height: 100%;
}

header {
  min-height: 150px;

  & .grid-container {
    height: 100%;
  }

  & .page-title {
    display: flex !important;
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    margin-top: 20px;

    & h1 {
      font-size: 36px;
      line-height: 42px;
    }
  }
}

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
