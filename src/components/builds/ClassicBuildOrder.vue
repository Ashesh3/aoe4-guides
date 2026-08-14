<template>
  <v-card
    data-testid="classic-build-order"
    rounded="lg"
    class="classic-build-order mt-4"
    flat
  >
    <div class="build-card-section-header d-flex align-center px-4 ga-2">
      <v-icon size="16" color="accent">mdi-format-list-numbered</v-icon>
      <span class="text-caption text-uppercase font-weight-bold">Build Order</span>
      <v-spacer></v-spacer>
      <v-btn
        color="accent"
        variant="text"
        size="small"
        prepend-icon="mdi-play"
        @click="$emit('activateFocusMode', 'here')"
      >
        Play
      </v-btn>
    </div>

    <div v-if="sections.length" class="classic-sections">
      <section
        v-for="(section, sectionIndex) in sections"
        :key="sectionIndex"
        class="classic-section"
      >
        <div v-if="sectionTitle(section)" class="classic-age-heading">
          <img
            v-if="sectionAgeIcon(section)"
            :src="sectionAgeIcon(section)"
            alt=""
            class="classic-age-icon"
          />
          <v-icon v-if="section.type === 'ageUp'" size="20" color="accent">
            mdi-arrow-up-bold
          </v-icon>
          <span>{{ sectionTitle(section) }}</span>
        </div>

        <div class="classic-table-scroll">
          <table class="classic-table">
            <colgroup>
              <col class="classic-col-time" />
              <col class="classic-col-total" />
              <col class="classic-col-resource" />
              <col class="classic-col-resource" />
              <col class="classic-col-resource" />
              <col class="classic-col-resource" />
              <col class="classic-col-resource" />
              <col />
            </colgroup>
            <thead v-if="sectionIndex === 0">
              <tr>
                <th><img src="/assets/resources/time.webp" alt="Time" /></th>
                <th><img src="/assets/resources/villager.webp" alt="Villager count" /></th>
                <th><img src="/assets/resources/repair.webp" alt="Builders" /></th>
                <th><img src="/assets/resources/food.webp" alt="Food" /></th>
                <th><img src="/assets/resources/wood.webp" alt="Wood" /></th>
                <th><img src="/assets/resources/gold.webp" alt="Gold" /></th>
                <th><img src="/assets/resources/stone.webp" alt="Stone" /></th>
                <th class="classic-description-heading">Description</th>
              </tr>
            </thead>
            <tbody>
              <template
                v-for="(entry, entryIndex) in entriesFor(section, sectionIndex)"
                :key="`${sectionIndex}:${entryIndex}:${entry.kind}`"
              >
                <tr v-if="entry.kind === 'paths'" class="classic-path-row">
                  <td colspan="8">
                    <span class="classic-path-label">Choose a path</span>
                    <button
                      v-for="(path, pathIndex) in entry.paths"
                      :key="pathIndex"
                      type="button"
                      :class="['classic-path', pathIndex === entry.active && 'classic-path--active']"
                      :aria-pressed="pathIndex === entry.active"
                      @click="selectPath(entry.id, pathIndex)"
                    >
                      {{ path.title || `Path ${pathIndex + 1}` }}
                    </button>
                  </td>
                </tr>

                <tr v-else-if="entry.kind === 'merge'" class="classic-merge-row">
                  <td colspan="8">
                    <v-icon size="15">mdi-call-merge</v-icon>
                    <span>Paths rejoin</span>
                  </td>
                </tr>

                <tr v-else-if="entry.kind === 'note'" class="classic-note-row">
                  <td class="classic-note-icon">
                    <v-icon size="16" color="accent">mdi-information-outline</v-icon>
                  </td>
                  <td colspan="7" v-html="entry.html"></td>
                </tr>

                <tr v-else class="classic-step-row">
                  <td class="classic-time">{{ entry.value.time || "" }}</td>
                  <td
                    class="classic-total"
                    aria-label="Villager count"
                  >{{ aggregateVillagers(entry.value) || "" }}</td>
                  <td data-resource="builders">{{ resource(entry.value, "builders") }}</td>
                  <td data-resource="food">{{ resource(entry.value, "food") }}</td>
                  <td data-resource="wood">{{ resource(entry.value, "wood") }}</td>
                  <td data-resource="gold">{{ resource(entry.value, "gold") }}</td>
                  <td data-resource="stone">{{ resource(entry.value, "stone") }}</td>
                  <td class="classic-description" v-html="entry.value.description || ''"></td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div v-else class="text-center py-6 text-medium-emphasis text-body-2">
      No steps yet
    </div>
  </v-card>
</template>

<script>
import { computed, inject, ref } from "vue";

import {
  classicSections,
  visibleClassicEntries,
} from "@/composables/builds/classicBuildOrder.js";
import {
  aggregateVillagers,
  hasResourceValue,
} from "@/composables/builds/villagerAggregator.js";
import { convertSectionImagePaths } from "@/composables/builds/legacyImagePaths.js";
import { ACTIVE_PATH } from "@/composables/builds/useActivePath.js";

const AGE_NAMES = {
  1: "Dark Age",
  2: "Feudal Age",
  3: "Castle Age",
  4: "Imperial Age",
};

export default {
  name: "ClassicBuildOrder",
  props: {
    steps: { type: Array, default: () => [] },
  },
  emits: ["activateFocusMode"],
  setup(props) {
    const activePath = inject(ACTIVE_PATH, null);
    const localSelection = ref({});
    const selection = computed(() => activePath?.paths.value ?? localSelection.value);
    const sections = computed(() => {
      const copy = JSON.parse(JSON.stringify(props.steps ?? []));
      return classicSections(convertSectionImagePaths(copy));
    });

    const entriesFor = (section, sectionIndex) =>
      visibleClassicEntries(section, sectionIndex, selection.value);

    const selectPath = (id, pathIndex) => {
      if (activePath) activePath.select(id, pathIndex);
      else localSelection.value = { ...localSelection.value, [id]: pathIndex };
    };

    const targetAge = (section) => (section?.type === "ageUp" ? Number(section.age) + 1 : null);

    const sectionTitle = (section) => {
      if (section?.type === "ageUp") {
        const name = AGE_NAMES[targetAge(section)];
        return name ? `Age up to ${name}` : "";
      }

      //The opening Dark Age table did not carry a heading in the old viewer;
      //later age headings separated the otherwise identical resource tables.
      return Number(section?.age) > 1 ? AGE_NAMES[section.age] ?? "" : "";
    };

    const sectionAgeIcon = (section) => {
      const age = section?.type === "ageUp" ? targetAge(section) : Number(section?.age);
      return age >= 2 && age <= 4 ? `/assets/pictures/age/age_${age}.webp` : "";
    };

    const resource = (step, key) => (hasResourceValue(step?.[key]) ? step[key] : "");

    return {
      aggregateVillagers,
      entriesFor,
      resource,
      sections,
      sectionAgeIcon,
      sectionTitle,
      selectPath,
    };
  },
};
</script>

<style scoped>
.build-card-section-header {
  height: 36px;
  letter-spacing: 0.05em;
}

.classic-sections {
  padding-bottom: 16px;
}

.classic-section + .classic-section {
  margin-top: 8px;
}

.classic-age-heading {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 16px;
  font-size: 1.05rem;
  font-weight: 500;
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.classic-age-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.classic-table-scroll {
  overflow-x: auto;
  margin: 0 16px;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.classic-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  table-layout: fixed;
  background: rgb(var(--v-theme-surface));
}

.classic-col-time,
.classic-col-total,
.classic-col-resource {
  width: 50px;
}

.classic-table th {
  height: 48px;
  padding: 0;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}

.classic-table th img {
  display: block;
  width: 32px;
  height: 32px;
  margin: auto;
  object-fit: contain;
}

.classic-table .classic-description-heading {
  padding-left: 16px;
  text-align: left;
}

.classic-table td {
  min-height: 52px;
  padding: 8px;
  border-bottom: thin solid rgba(var(--v-border-color), 0.12);
  text-align: center;
  vertical-align: middle;
}

.classic-step-row:last-child td {
  border-bottom: 0;
}

.classic-time,
.classic-total {
  white-space: nowrap;
}

.classic-total {
  color: #828282;
  font-weight: 700;
}

/* The old viewer made the assignment columns scannable through full-height
   resource bands. Keep those exact tints instead of the newer compact pills. */
.classic-table td[data-resource="food"] {
  background: #ff000034;
}

.classic-table td[data-resource="wood"] {
  background: #75400c5b;
}

.classic-table td[data-resource="gold"] {
  background: #edbe003e;
}

.classic-table td[data-resource="stone"] {
  background: #7a7a7b69;
}

.classic-description {
  padding-right: 12px !important;
  padding-left: 12px !important;
  text-align: left !important;
  white-space: pre-wrap;
}

.classic-note-row td,
.classic-path-row td,
.classic-merge-row td {
  text-align: left;
}

.classic-note-icon {
  width: 50px;
  text-align: center !important;
}

.classic-path-row td {
  padding: 10px 12px;
  background: rgba(var(--v-theme-alternative), 0.08);
}

.classic-path-label {
  margin-right: 10px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.classic-path {
  min-height: 32px;
  margin: 2px 6px 2px 0;
  padding: 4px 10px;
  border: 1px solid rgba(var(--v-theme-alternative), 0.45);
  border-radius: 4px;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
}

.classic-path--active {
  background: rgb(var(--v-theme-alternative));
  color: rgb(var(--v-theme-background));
}

.classic-merge-row td {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
}

.classic-merge-row .v-icon {
  margin-right: 6px;
}

:deep(.classic-description img),
:deep(.classic-note-row img),
:deep(.classic-path-row img) {
  width: 48px;
  height: 48px;
  margin: 2px 2px 2px 0;
  border-radius: 4px;
  object-fit: contain;
  vertical-align: middle;
}

:deep(img.icon-ability) {
  background: radial-gradient(circle at top center, #5c457b, #4d366e);
}

:deep(img.icon-tech) {
  background: radial-gradient(circle at top center, #469586, #266d5b);
}

:deep(img.icon-military) {
  background: radial-gradient(circle at top center, #8b5d44, #683a22);
}

:deep(img.icon-default) {
  background: radial-gradient(circle at top center, #4b6382, #1d2432);
}

:deep(img.icon-none) {
  width: auto;
  background: radial-gradient(
    circle at top center,
    rgb(var(--v-theme-icon-background-highlight)),
    rgb(var(--v-theme-icon-background))
  );
}

@media (max-width: 599px) {
  .classic-table-scroll {
    margin: 0;
  }

  .classic-table {
    min-width: 680px;
  }

  .classic-sections {
    padding-bottom: 0;
  }
}
</style>
