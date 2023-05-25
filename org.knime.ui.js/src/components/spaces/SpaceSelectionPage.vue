<script>
import { mapState } from "vuex";

import * as knimeColors from "webapps-common/ui/colors/knimeColors.mjs";
import Button from "webapps-common/ui/components/Button.vue";
import PlusIcon from "webapps-common/ui/assets/img/icons/plus-small.svg";

import { APP_ROUTES } from "@/router/appRoutes";
import GridOutbreaker from "@/components/common/GridOutbreaker.vue";
import Card from "@/components/common/Card.vue";
import CardContent from "@/components/common/CardContent.vue";

import SpaceCard from "./SpaceCard.vue";

export default {
  components: {
    PlusIcon,
    GridOutbreaker,
    SpaceCard,
    Button,
    Card,
    CardContent,
  },

  data() {
    return {
      knimeColors,
    };
  },

  computed: {
    ...mapState("spaces", [
      "spaceProviders",
      "spaceBrowser",
      "isLoading",
      "activeSpace",
    ]),
  },
  beforeCreate() {
    // redirect to browsing page if a space was selected
    if (this.$store.state.spaces.spaceBrowser.spaceId) {
      this.$router.push({ name: APP_ROUTES.SpaceBrowsingPage });
    }
  },
  async created() {
    await this.$store.dispatch("spaces/fetchAllSpaceProviders");

    // load local space if no activeWorkflowGroup is set
    if (!this.activeSpace.activeWorkflowGroup) {
      await this.$store.dispatch("spaces/fetchWorkflowGroupContent", {
        itemId: "root",
      });
    }
  },

  methods: {
    onLogin(spaceProviderId) {
      this.$store.dispatch("spaces/connectProvider", { spaceProviderId });
    },

    async onLogout(spaceProviderId) {
      await this.$store.dispatch("spaces/disconnectProvider", {
        spaceProviderId,
      });
    },

    async onSpaceCardClick({ space, spaceProvider }) {
      this.$store.commit("spaces/setActiveSpaceProviderById", spaceProvider.id);
      this.$store.commit("spaces/setActiveSpaceId", space.id);
      await this.$store.dispatch("spaces/saveSpaceBrowserState");
      this.$router.push({ name: APP_ROUTES.SpaceBrowsingPage });
    },

    isLocalSpace(spaceProvider) {
      return (
        spaceProvider.connectionMode === "AUTOMATIC" &&
        spaceProvider.id === "local"
      );
    },

    isCommunityHub(spaceProvider) {
      // this is the official community hub that is automatically created
      return spaceProvider.id === "My-KNIME-Hub";
    },

    communityHubLink(spaceProvider) {
      const base = "https://hub.knime.com";
      if (spaceProvider?.user?.name) {
        return `${base}/${spaceProvider?.user?.name}`;
      }
      return base;
    },

    shouldDisplayAvatar(spaceProvider) {
      return (
        spaceProvider.connectionMode !== "AUTOMATIC" && spaceProvider.connected
      );
    },

    shouldDisplayLoginButton(spaceProvider) {
      return (
        spaceProvider.connectionMode !== "AUTOMATIC" && !spaceProvider.connected
      );
    },

    shouldDisplayLogoutButton(spaceProvider) {
      return (
        spaceProvider.connectionMode === "AUTHENTICATED" &&
        spaceProvider.connected
      );
    },

    async createWorkflowLocally() {
      await this.$store.dispatch("spaces/fetchWorkflowGroupContent", {
        itemId: "root",
      });
      this.$store.commit("spaces/setActiveSpaceProviderById", "local");
      this.$store.commit("spaces/setActiveSpaceId", "local");
      await this.$store.dispatch("spaces/fetchWorkflowGroupContent", {
        itemId: "root",
      });

      this.$store.commit("spaces/setIsCreateWorkflowModalOpen", true);
    },
  },
};
</script>

<template>
  <GridOutbreaker v-if="spaceProviders" :color="knimeColors.Porcelain">
    <section
      v-for="spaceProvider of spaceProviders"
      :key="spaceProvider.id"
      class="space-provider"
    >
      <div class="space-provider-name">
        <h2>
          {{
            isCommunityHub(spaceProvider)
              ? "KNIME Community Hub"
              : spaceProvider.name
          }}
          <span v-if="isCommunityHub(spaceProvider)">
            (<a :href="communityHubLink(spaceProvider)">hub.knime.com</a>)
          </span>
        </h2>
        <div
          v-if="shouldDisplayAvatar(spaceProvider) && spaceProvider.user"
          class="owner"
        >
          <span class="owner-name">{{ spaceProvider.user.name }}</span>
        </div>

        <div class="connection-btn">
          <Button
            v-if="shouldDisplayLogoutButton(spaceProvider)"
            with-border
            compact
            :disabled="isLoading"
            class="logout"
            @click="onLogout(spaceProvider.id)"
          >
            Logout
          </Button>

          <Button
            v-if="shouldDisplayLoginButton(spaceProvider)"
            primary
            compact
            :disabled="isLoading"
            class="sign-in"
            @click="onLogin(spaceProvider.id)"
          >
            {{
              spaceProvider.connectionMode === "AUTHENTICATED"
                ? "Sign in"
                : "Connect"
            }}
          </Button>
        </div>
      </div>

      <div class="cards">
        <SpaceCard
          v-for="(space, id) of spaceProvider.spaces"
          :key="id"
          :space="space"
          :is-local="isLocalSpace(spaceProvider)"
          @click="onSpaceCardClick({ space: $event, spaceProvider })"
        />
        <Card
          v-if="isLocalSpace(spaceProvider)"
          class="create-workflow-local"
          @click="createWorkflowLocally"
        >
          <CardContent padded>
            <div class="icon-wrapper">
              <PlusIcon />
            </div>
            <span
              >Create workflow <br />
              in your local space.</span
            >
          </CardContent>
        </Card>
      </div>
      <div
        v-if="!spaceProvider.spaces && isCommunityHub(spaceProvider)"
        class="community-hub-text"
      >
        Connect to the KNIME Community Hub to find workflows, nodes and
        components, and collaborate in spaces.
      </div>
    </section>
  </GridOutbreaker>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

section.space-provider {
  padding-top: 30px;
  padding-bottom: 50px;

  & .space-provider-name {
    margin-bottom: 20px;
    display: flex;
    align-items: center;

    & .connection-btn {
      margin-left: auto;
    }

    & .owner {
      display: flex;
      align-items: center;

      & .owner-name {
        margin-left: 8px;
      }
    }
  }

  & .create-workflow-local {
    display: flex;
    align-items: center;
    justify-content: center;

    & .icon-wrapper {
      background: var(--knime-yellow);
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    & svg {
      @mixin svg-icon-size 60;
    }

    & span {
      text-align: center;
      font-size: 16px;
      margin-top: 15px;
    }
  }

  & .cards {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media only screen and (max-width: 900px) {
    & .cards {
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }
  }
}
</style>
