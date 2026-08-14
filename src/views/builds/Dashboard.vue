<template>
  <v-container>
    <v-row>
      <!-- main content -->
      <v-col cols="12" md="8">
        <v-row>
          <v-col cols="12"
            ><v-card rounded="lg" flat>
              <v-row no-gutters class="fill-height">
                <v-col cols="3" class="pa-0 ma-0 d-flex flex-column">
                  <v-img
                    :min-height="height"
                    :src="
                      civs.find((item) => {
                        return item.shortName === civ;
                      })?.flagLarge
                    "
                    :lazy-src="
                      civs.find((item) => {
                        return item.shortName === civ;
                      })?.flagSmall
                    "
                    :gradient="'to right, transparent, ' + $vuetify.theme.current.colors.surface"
                    alt="{{civ}}"
                    cover
                  >
                    <template v-slot:placeholder>
                      <v-row class="fill-height ma-0" align="center" justify="center">
                        <v-progress-circular
                          indeterminate
                          color="grey lighten-5"
                        ></v-progress-circular>
                      </v-row>
                    </template>
                  </v-img>
                </v-col>
                <v-col cols="9" align-self="center">
                  <v-card-title>
                    {{
                      civs.find((item) => {
                        return item.shortName === civ;
                      })?.title
                    }}
                  </v-card-title>
                  <v-card-text>
                    {{
                      civs.find((item) => {
                        return item.shortName === civ;
                      })?.tagLine
                    }}
                  </v-card-text>
                </v-col>
              </v-row>
            </v-card></v-col
          >
          <v-col cols="12" class="hidden-md-and-up"
            ><span
              ><FilterConfig
                @configChanged="configChanged"
                context="civ-locked"
                :civName="civDisplayName"
                :countFn="getLiveDashboardCount"
              ></FilterConfig></span
          ></v-col>

          <v-col cols="12">
            <NoFilterResults v-if="count !== null && count === 0" @cleared="handleCleared" />
            <BuildLaneTabs
              v-else
              :popular-builds="popularBuildsList"
              :all-time-classics="allTimeClassicsList"
              :recent-builds="recentBuildsList"
              :extra-query="civ ? { civ } : {}"
              :context="civ ? 'civ-locked' : 'default'"
            />
          </v-col>
        </v-row>
      </v-col>
      <!-- sidebar -->
      <v-col cols="8" md="4" class="hidden-sm-and-down"
        ><v-row no-gutters>
          <v-col cols="12"
            ><FilterConfig
              @configChanged="configChanged"
              context="civ-locked"
              :civName="civDisplayName"
              :countFn="getLiveDashboardCount"
            ></FilterConfig
          ></v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
//External
import { useStore } from "vuex";
import { computed, ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useDisplay } from "vuetify";

//Components
import FilterConfig from "@/components/filter/FilterConfig.vue";
import BuildLaneTabs from "@/components/home/BuildLaneTabs.vue";
import NoFilterResults from "@/components/notifications/NoFilterResults.vue";

//Composables
import { civs as allCivs } from "@/composables/filter/civDefaultProvider";
import { getDefaultConfig } from "@/composables/filter/configDefaultProvider";
import {
  getLiveDashboard,
  getLiveDashboardCount,
} from "@/composables/data/liveBuildService.js";

export default {
  name: "Dashboard",
  components: {
    FilterConfig,
    BuildLaneTabs,
    NoFilterResults,
  },
  setup() {
    const allTimeClassicsList = ref(Array(10).fill({ loading: true }));
    const popularBuildsList = ref(Array(10).fill({ loading: true }));
    const recentBuildsList = ref(Array(10).fill({ loading: true }));
    const trendingCount = ref(null);
    const route = useRoute();
    const store = useStore();
    const count = computed(() => store.state.resultsCount);
    const user = computed(() => store.state.user);
    const filterConfig = computed(() => store.state.filterConfig);
    const { name } = useDisplay();
    const civs = allCivs.value;
    const civ = ref(null);
    const civDisplayName = computed(() =>
      civs.find((c) => c.shortName === civ.value)?.title ?? civ.value
    );

    const initQueryParameters = async () => {
      //pply query parameters if they are set
      if (route.query.civ) {
        store.commit("setCivs", route.query.civ);
        civ.value = route.query.civ;
      }
    };

    const configChanged = () => {
      initData();
    };

    const handleCleared = () => {
      if (route.query.civ) store.commit("setCivs", route.query.civ);
      initData();
    };

    onMounted(() => {
      store.commit("setFilterConfig", getDefaultConfig());
      initQueryParameters();
      initData();
      window.scrollTo(0, 0);
    });

    const height = computed(() => {
      switch (name.value) {
        case "xs":
          return 90;
        case "sm":
          return 125;
        case "md":
          return 90;
        case "lg":
          return 112;
        case "xl":
          return 125;
        case "xxl":
          return 125;
      }
    });

    // Monotonic token identifying the latest initData run, so responses from
    // a superseded run never overwrite the current one.
    let initDataRun = 0;

    const initData = async () => {
      const runId = ++initDataRun;
      allTimeClassicsList.value = Array(10).fill({ loading: true });
      popularBuildsList.value = Array(10).fill({ loading: true });
      recentBuildsList.value = Array(10).fill({ loading: true });

      civ.value = filterConfig.value.civs;

      //reset results count
      store.commit("setResultsCount", null);

      //The personal viewer cannot mint the production site's domain-restricted
      //App Check token. Read the same public production data through the API
      //instead of issuing four Firestore requests that are guaranteed to 403.
      const dashboard = await getLiveDashboard(filterConfig.value);

      // A newer initData run (filter change mid-flight) supersedes this one.
      if (runId !== initDataRun) return;

      popularBuildsList.value = dashboard.popular;
      allTimeClassicsList.value = dashboard.classics;
      recentBuildsList.value = dashboard.recent;
      //The public API has no total-count endpoint. Zero is authoritative when
      //all three result sets are empty; otherwise leave the count unknown rather
      //than label a capped union as the total number of builds.
      trendingCount.value = dashboard.hasResults ? null : 0;
      store.commit("setResultsCount", dashboard.hasResults ? null : 0);
    };

    return {
      user,
      authIsReady: computed(() => store.state.authIsReady),
      count,
      recentBuildsList,
      popularBuildsList,
      allTimeClassicsList,
      height,
      configChanged,
      handleCleared,
      civs,
      civ,
      civDisplayName,
      getLiveDashboardCount,
    };
  },
};
</script>

