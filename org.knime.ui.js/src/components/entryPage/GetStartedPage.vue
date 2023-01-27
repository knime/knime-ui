<script>
import * as knimeColors from 'webapps-common/ui/colors/knimeColors.mjs';

import LinkExternal from 'webapps-common/ui/assets/img/icons/link-external.svg';

import GridOutbreaker from '@/components/common/GridOutbreaker.vue';
import Card from '@/components/common/Card.vue';
import CardHeader from '@/components/common/CardHeader.vue';
import CardContent from '@/components/common/CardContent.vue';
import { mapState } from 'vuex';
import SpaceSelectionPage from '@/components/spaces/SpaceSelectionPage.vue';

const MAX_NUM_OF_EXAMPLES = 3;

export default {
    components: {
        SpaceSelectionPage,
        LinkExternal,
        GridOutbreaker,
        Card,
        CardHeader,
        CardContent
    },
    data() {
        return {
            knimeColors
        };
    },
    computed: {
        ...mapState('application', ['exampleProjects']),

        displayedExampleProjects() {
            return this.exampleProjects.slice(0, MAX_NUM_OF_EXAMPLES);
        },
        hasExamples() {
            return this.displayedExampleProjects.length > 0;
        }
    },
    methods: {
        async onExampleClick({ origin: { spaceId, providerId: spaceProviderId, itemId: workflowItemId } }) {
            await this.$store.dispatch('spaces/openWorkflow', {
                workflowItemId,
                spaceId,
                spaceProviderId,
                $router: this.$router
            });
        }
    }
};
</script>

<template>
  <GridOutbreaker :color="knimeColors.SilverSandSemi">
    <section
      v-if="hasExamples"
      class="examples"
    >
      <div class="grid-container">
        <div class="grid-item-12">
          <h2>Examples</h2>
        </div>
      </div>

      <div class="grid-container cards">
        <div
          v-for="(example, index) in displayedExampleProjects"
          :key="`example-${index}`"
          class="grid-item-4"
        >
          <Card
            @click="onExampleClick(example)"
          >
            <CardHeader>{{ example.name }}</CardHeader>

            <CardContent padded>
              <img
                class="card-img"
                :src="`data:image/svg+xml;base64,${example.svg}`"
                :alt="`Preview image of ${example.name}`"
              >
            </CardContent>
          </Card>
        </div>
      </div>

      <div class="grid-container more-workflows">
        <a href="https://knime.com/spreadsheet-edition-collection?src=knimeappmodernui">
          <LinkExternal />Find more resources for spreadsheet automation on the KNIME Community Hub
        </a>
      </div>
    </section>
    <SpaceSelectionPage />
  </GridOutbreaker>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

section.examples {
  background: var(--knime-silver-sand-semi);
  padding-bottom: 20px;

  & .cards {
    & [class*="grid-item-"]:not(:first-child, :last-child) {
      margin: 0 15px;
    }

    & .card-img {
      width: 100%;
      max-height: 140px;
      object-fit: contain;
    }
  }


  & .more-workflows {
    padding: 20px 0;
    align-items: center;
    justify-content: flex-start;

    & a {
      text-decoration: none;
      font-size: 16px;
      line-height: 20px;
      color: var(--knime-dove-gray);
    }

    & svg {
      margin-right: 6px;
      stroke: var(--knime-dove-gray);
      vertical-align: middle;

      @mixin svg-icon-size 14;
    }

    & a:hover {
      color: var(--knime-masala);

      & svg {
        stroke: var(--knime-masala);
      }
    }
  }
}

section.recent-workflows {
  background: var(--knime-porcelain);
  height: 100%;
}
</style>
