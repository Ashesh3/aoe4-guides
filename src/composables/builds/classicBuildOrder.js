const ALTERNATIVES = "alternatives";

/**
 * Makes both historical flat builds and current sectioned builds consumable by
 * the classic table.
 *
 * @param {Array} steps
 * @return {Array}
 */
export function classicSections(steps) {
  if (!Array.isArray(steps) || !steps.length) return [];
  if (steps[0]?.type) return steps;

  return [{ type: "age", age: 0, gameplan: "", steps }];
}

/**
 * Whether rich text contains something a reader can actually see.
 *
 * @param {*} html
 * @return {boolean}
 */
function hasVisibleContent(html) {
  if (!html || typeof html !== "string") return false;
  if (/<img\b/i.test(html)) return true;

  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim().length > 0;
}

/**
 * Selects one path using the same precedence as the rest of the build reader.
 *
 * @param {Object} block
 * @param {number|undefined} chosen
 * @return {{path:Object|null,index:number}}
 */
function selectedPath(block, chosen) {
  const paths = Array.isArray(block?.paths) ? block.paths : [];
  if (!paths.length) return { path: null, index: 0 };

  if (Number.isInteger(chosen) && paths[chosen]) {
    return { path: paths[chosen], index: chosen };
  }

  const main = paths.findIndex((path) => path?.main);
  const index = main >= 0 ? main : 0;
  return { path: paths[index], index };
}

/**
 * The ordered rows a section contributes to the classic table.
 *
 * Alternative blocks remain visible as a path chooser, but only the selected
 * path's rows are included. Notes are wide rows rather than fake resource
 * assignments, and a historical section note stays at the foot where the old
 * UI drew it.
 *
 * @param {Object} section
 * @param {number} sectionIndex
 * @param {Object} selection
 * @return {Array}
 */
export function visibleClassicEntries(section, sectionIndex, selection = {}) {
  const entries = [];

  (section?.steps ?? []).forEach((item, itemIndex) => {
    if (item?.kind === ALTERNATIVES) {
      const id = `${sectionIndex}:${itemIndex}`;
      const { path, index } = selectedPath(item, selection[id]);

      entries.push({ kind: "paths", id, paths: item.paths ?? [], active: index });
      for (const step of path?.steps ?? []) pushEntry(entries, step);
      entries.push({ kind: "merge", id });
      return;
    }

    //Unknown structural items are not build steps and cannot be represented by
    //the classic resource table. Ignore them rather than drawing a blank row.
    if (item?.kind) return;
    pushEntry(entries, item);
  });

  if (hasVisibleContent(section?.gameplan)) {
    entries.push({ kind: "note", html: section.gameplan });
  }

  return entries;
}

function pushEntry(entries, item) {
  if (item?.gameplan !== undefined && item?.gameplan !== null) {
    if (hasVisibleContent(item.gameplan)) {
      entries.push({ kind: "note", html: item.gameplan });
    }
    return;
  }

  entries.push({ kind: "step", value: item ?? {} });
}
