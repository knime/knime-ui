<script>
import ForumIcon from 'webapps-common/ui/assets/img/icons/forum.svg';
import PerspectiveSwitchIcon from 'webapps-common/ui/assets/img/icons/perspective-switch.svg';
import KnimeLogo from 'webapps-common/ui/assets/img/KNIME_Logo_gray.svg';
import Button from 'webapps-common/ui/components/Button.vue';
import OpenSourceCreditsModal from './OpenSourceCreditsModal.vue';

export default {
    components: {
        ForumIcon,
        PerspectiveSwitchIcon,
        KnimeLogo,
        Button,
        OpenSourceCreditsModal
    },
    methods: {
        switchToJavaUI() {
            window.switchToJavaUI();
        }
    }
};
</script>

<template>
  <main>
    <section>
      <h1 class="row-container">Information</h1>

      <div class="grid-container row-container">
        <div class="grid-item-3 category">
          <ForumIcon />
          <h3>Get help from the<br>KNIME community</h3>
        </div>

        <div class="grid-item-9 body">
          <p>Get answers to your data questions from the active, global community.</p>
          <Button
            with-border
            href="https://forum.knime.com/?src=knimeapp"
          >
            <strong>Visit Forum</strong>
          </Button>
        </div>
      </div>
      <hr>

      <div class="grid-container row-container">
        <div class="grid-item-3 category">
          <PerspectiveSwitchIcon />
          <h3>Switch back to<br>classic user interface</h3>
        </div>

        <div class="grid-item-9 body">
          <p style="color: red">
            TBD — There should be a nice text that helps users to understands that they are not
            surprised that they see the classic user interface.
          </p>
          <Button
            with-border
            @click="switchToJavaUI"
          >
            <strong>Switch to classic user interface</strong>
          </Button>
        </div>
      </div>
      <hr>

      <div class="grid-container row-container">
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
          <OpenSourceCreditsModal
            with-border
            text-bold
            :primary="false"
          />
        </div>
      </div>
    </section>
  </main>
</template>

<style lang="postcss" scoped>
main {
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--knime-masala);

  & h1 {
    font-size: 36px;
    line-height: 42px;
  }
}

.row-container {
  margin: 60px 0;
}

.category {
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
    width: 25px;
  }
}

.category-image {
  display: flex;

  & svg {
    max-width: 230px;
    height: min-content;
  }
}

.body {
  & p {
    margin-top: 0;
    margin-bottom: 1.7em;
    font-weight: 300;
    font-size: 18px;
  }
}
</style>
