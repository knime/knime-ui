<script>
import { mapState } from "vuex";
import * as knimeColors from "webapps-common/ui/colors/knimeColors.mjs";
import LinkExternalIcon from "webapps-common/ui/assets/img/icons/link-external.svg";

import { cachedLocalSpaceProjectId } from "@/store/spaces";

import GridOutbreaker from "@/components/common/GridOutbreaker.vue";
import Card from "@/components/common/Card.vue";
import CardHeader from "@/components/common/CardHeader.vue";
import CardContent from "@/components/common/CardContent.vue";
import SpaceSelectionPage from "@/components/spaces/SpaceSelectionPage.vue";

const MAX_NUM_OF_EXAMPLES = 3;
const MAX_EXAMPLES_PER_ROW = 3;

export default {
  components: {
    SpaceSelectionPage,
    LinkExternalIcon,
    GridOutbreaker,
    Card,
    CardHeader,
    CardContent,
  },
  data() {
    return {
      knimeColors,
    };
  },
  computed: {
    ...mapState("application", ["exampleProjects"]),

    displayedExampleProjects() {
      return this.exampleProjects.slice(0, MAX_NUM_OF_EXAMPLES);
    },
    hasExamples() {
      return this.displayedExampleProjects.length > 0;
    },
    gridColumns() {
      const { length } = this.displayedExampleProjects;
      return length < MAX_EXAMPLES_PER_ROW ? 2 : MAX_EXAMPLES_PER_ROW;
    },
  },
  methods: {
    async onExampleClick({ origin }) {
      await this.$store.dispatch("spaces/openProject", {
        projectId: cachedLocalSpaceProjectId,
        workflowItemId: origin.itemId,
        $router: this.$router,
      });
    },
  },
};
</script>

<template>
  <GridOutbreaker :color="knimeColors.SilverSandSemi">
    <section v-if="hasExamples" class="examples">
      <h2>Examples</h2>
      <div class="cards" :style="`--grid-columns: ${gridColumns}`">
        <Card
          v-for="(example, index) in displayedExampleProjects"
          :key="`example-${index}`"
          class="example-card"
          @click="onExampleClick(example)"
        >
          <CardHeader :title="example.name"
            ><span class="example-title">{{ example.name }}</span></CardHeader
          >

          <CardContent padded>
            <img
              class="card-img"
              :src="`data:image/svg+xml;base64,${example.svg}`"
              :alt="`Preview image of ${example.name}`"
            />
          </CardContent>
        </Card>
      </div>

      <div class="grid-container more-workflows">
        <a
          href="https://knime.com/modern-ui-hub-home-link?src=knimeappmodernui"
        >
          <LinkExternalIcon />Find more resources on the KNIME Community Hub
        </a>
      </div>
    </section>
  </GridOutbreaker>
  <SpaceSelectionPage />
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

section.examples {
  background: var(--knime-silver-sand-semi);
  padding-top: 30px;
  padding-bottom: 50px;

  & h2 {
    margin-top: 20px;
    margin-bottom: 40px;
  }

  & .cards {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(var(--grid-columns, 2), minmax(0, 1fr));

    & .example-card {
      min-width: auto;
    }

    & .card-img {
      width: 100%;
      max-height: 140px;
      object-fit: contain;
    }
  }

  @media only screen and (max-width: 900px) {
    & .cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  & .example-title {
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 100%;
    display: inline-block;
    white-space: nowrap;
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
