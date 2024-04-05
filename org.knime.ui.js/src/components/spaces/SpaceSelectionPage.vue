<script>
import { mapState } from "vuex";

import * as knimeColors from "webapps-common/ui/colors/knimeColors.mjs";
import Button from "webapps-common/ui/components/Button.vue";
import PlusIcon from "webapps-common/ui/assets/img/icons/plus-small.svg";

import { APP_ROUTES } from "@/router/appRoutes";
import { SpaceProviderNS } from "@/api/custom-types";
import GridOutbreaker from "@/components/common/GridOutbreaker.vue";
import Card from "@/components/common/Card.vue";
import CardContent from "@/components/common/CardContent.vue";
import SkeletonItem from "@/components/skeleton/SkeletonItem.vue";

import {
  globalSpaceBrowserProjectId,
  cachedLocalSpaceProjectId,
} from "@/store/spaces";

import SpaceCard from "./SpaceCard.vue";

export default {
  components: {
    PlusIcon,
    GridOutbreaker,
    SpaceCard,
    Button,
    Card,
    CardContent,
    SkeletonItem,
  },

  data() {
    return {
      knimeColors,
      isConnectingToProvider: null,
    };
  },

  computed: {
    ...mapState("spaces", [
      "spaceProviders",
      "spaceBrowser",
      "isLoadingProvider",
      "activeSpace",
    ]),
  },

  beforeCreate() {
    // redirect to browsing page if a space was selected
    if (this.$store.state.spaces.projectPath[globalSpaceBrowserProjectId]) {
      this.$router.push({ name: APP_ROUTES.SpaceBrowsingPage });
    }
  },
  async created() {
    // update space providers
    await this.$store.dispatch("spaces/refreshSpaceProviders");
  },

  methods: {
    async onLogin(spaceProviderId) {
      this.isConnectingToProvider = spaceProviderId;
      await this.$store.dispatch("spaces/connectProvider", { spaceProviderId });
      this.isConnectingToProvider = null;
    },

    async onLogout(spaceProviderId) {
      await this.$store.dispatch("spaces/disconnectProvider", {
        spaceProviderId,
      });
    },

    onSpaceCardClick({ space, spaceProvider }) {
      this.$store.commit("spaces/setProjectPath", {
        projectId: globalSpaceBrowserProjectId,
        value: {
          spaceId: space.id,
          spaceProviderId: spaceProvider.id,
          itemId: "root",
        },
      });
      this.$router.push({ name: APP_ROUTES.SpaceBrowsingPage });
    },

    isLocalProvider(spaceProvider) {
      return spaceProvider.type === SpaceProviderNS.TypeEnum.LOCAL;
    },

    isServerProvider(spaceProvider) {
      return spaceProvider.type === SpaceProviderNS.TypeEnum.SERVER;
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
        projectId: cachedLocalSpaceProjectId,
      });

      this.$store.commit("spaces/setCreateWorkflowModalConfig", {
        isOpen: true,
        projectId: cachedLocalSpaceProjectId,
      });
    },
  },
};
</script>

<template>
  <GridOutbreaker :color="knimeColors.Porcelain">
    <template v-if="spaceProviders">
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
              :disabled="isLoadingProvider"
              class="logout"
              @click="onLogout(spaceProvider.id)"
            >
              Logout
            </Button>

            <Button
              v-if="shouldDisplayLoginButton(spaceProvider)"
              primary
              compact
              :disabled="isLoadingProvider"
              class="sign-in"
              @click="onLogin(spaceProvider.id)"
            >
              {{
                spaceProvider.connectionMode === "AUTHENTICATED"
                  ? "Sign&nbsp;in"
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
            :is-local="isLocalProvider(spaceProvider)"
            :is-server="isServerProvider(spaceProvider)"
            @click="onSpaceCardClick({ space: $event, spaceProvider })"
          />
          <Card
            v-if="isLocalProvider(spaceProvider)"
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

          <div
            v-if="
              !isLocalProvider(spaceProvider) &&
              isConnectingToProvider === spaceProvider.id
            "
            class="skeleton-card"
          />
          <div
            v-if="
              !isLocalProvider(spaceProvider) &&
              isConnectingToProvider === spaceProvider.id
            "
            class="skeleton-card"
          />
        </div>
        <div
          v-if="
            !spaceProvider.spaces &&
            isCommunityHub(spaceProvider) &&
            !isLoadingProvider
          "
          class="community-hub-text"
        >
          Connect to the KNIME Community Hub to find workflows, nodes and
          components, and collaborate in spaces.
        </div>
      </section>
    </template>
    <section
      v-if="isLoadingProvider && !isConnectingToProvider"
      class="skeletons"
    >
      <SkeletonItem :height="48" width="fill" />
      <div class="skeleton-cards">
        <SkeletonItem :height="230" width="fill" />
        <SkeletonItem :height="230" width="fill" />
      </div>
    </section>
  </GridOutbreaker>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

section {
  padding-top: 30px;
  padding-bottom: 50px;

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

section.space-provider {
  & .space-provider-name {
    margin-bottom: 20px;
    display: flex;
    align-items: center;

    & h2 {
      word-break: break-word;
    }

    & .connection-btn {
      margin-left: auto;
    }

    & .owner {
      display: flex;
      align-items: center;

      & .owner-name {
        margin-left: 8px;
        margin-right: 8px;
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
}

.skeletons {
  display: flex;
  flex-direction: column;
  gap: 20px 50px;

  & .skeleton-cards {
    display: flex;
    gap: 24px;
  }
}
</style>
