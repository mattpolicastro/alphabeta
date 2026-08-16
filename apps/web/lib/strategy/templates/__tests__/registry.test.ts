import { describe, expect, it } from "vitest";
import {
  TEMPLATES,
  TEMPLATE_LIST,
  getTemplate,
  getColumnConfig,
  getColumnOrder,
  getColumnDef,
} from "@/lib/strategy/templates";
import type { TemplateId } from "@/lib/strategy/types";

/**
 * `example-boards-all.test.ts` already covers each template's exampleBoard()
 * fixture. This suite covers the registry accessors and the structural
 * invariants of the column definitions themselves — the connection chain,
 * blankFields factories, and filter configs — which nothing else asserts.
 */

const IDS = Object.keys(TEMPLATES) as TemplateId[];

describe("registry accessors", () => {
  it("exposes every template keyed by its own id", () => {
    for (const id of IDS) {
      expect(TEMPLATES[id].id).toBe(id);
    }
  });

  it("TEMPLATE_LIST matches the values of TEMPLATES", () => {
    expect(TEMPLATE_LIST).toHaveLength(IDS.length);
    expect(new Set(TEMPLATE_LIST)).toEqual(new Set(Object.values(TEMPLATES)));
  });

  it("getTemplate returns the registered template", () => {
    for (const id of IDS) {
      expect(getTemplate(id)).toBe(TEMPLATES[id]);
    }
  });

  it("getTemplate throws a named error for an unknown id", () => {
    expect(() => getTemplate("nope" as TemplateId)).toThrow(
      "Unknown template: nope",
    );
  });

  it("getColumnOrder lists column ids in declaration order", () => {
    for (const id of IDS) {
      expect(getColumnOrder(id)).toEqual(TEMPLATES[id].columns.map((c) => c.id));
    }
  });

  it("getColumnDef returns the matching column definition", () => {
    for (const id of IDS) {
      for (const col of TEMPLATES[id].columns) {
        expect(getColumnDef(id, col.id)).toBe(col);
      }
    }
  });

  it("getColumnDef returns undefined for a column not in the template", () => {
    expect(getColumnDef("nsf", "not-a-column")).toBeUndefined();
  });

  it("getColumnConfig projects id, bgClass and nextColumn", () => {
    for (const id of IDS) {
      for (const col of TEMPLATES[id].columns) {
        expect(getColumnConfig(id, col.id)).toEqual({
          id: col.id,
          bgClass: col.bgClass,
          nextColumn: col.nextColumn,
        });
      }
    }
  });

  it("getColumnConfig returns undefined for a column not in the template", () => {
    expect(getColumnConfig("rice", "northstar")).toBeUndefined();
  });

  it("getColumnConfig propagates the unknown-template error", () => {
    expect(() => getColumnConfig("nope" as TemplateId, "ideas")).toThrow(
      "Unknown template: nope",
    );
  });
});

describe.each(IDS)("template %s — metadata", (id) => {
  const template = TEMPLATES[id];

  it("has non-empty name, shortName and description", () => {
    expect(template.name.trim()).not.toBe("");
    expect(template.shortName.trim()).not.toBe("");
    expect(template.description.trim()).not.toBe("");
  });

  it("declares a valid direction when present", () => {
    if (template.direction !== undefined) {
      expect(["ltr", "rtl"]).toContain(template.direction);
    }
  });

  it("has at least two columns", () => {
    expect(template.columns.length).toBeGreaterThanOrEqual(2);
  });
});

describe.each(IDS)("template %s — columns", (id) => {
  const template = TEMPLATES[id];
  const columnIds = template.columns.map((c) => c.id);

  it("has unique column ids", () => {
    expect(new Set(columnIds).size).toBe(columnIds.length);
  });

  it("gives every column a title, bgClass and card component", () => {
    for (const col of template.columns) {
      expect(col.title.trim()).not.toBe("");
      expect(col.bgClass.trim()).not.toBe("");
      expect(typeof col.cardComponent).toBe("function");
    }
  });

  it("points nextColumn at a real column, or null", () => {
    for (const col of template.columns) {
      if (col.nextColumn !== null) {
        expect(columnIds).toContain(col.nextColumn);
      }
    }
  });

  it("has exactly one terminal column", () => {
    const terminals = template.columns.filter((c) => c.nextColumn === null);
    expect(terminals).toHaveLength(1);
  });

  it("never points a column at itself", () => {
    for (const col of template.columns) {
      expect(col.nextColumn).not.toBe(col.id);
    }
  });

  it("forms a single chain that visits every column exactly once", () => {
    // The head is the only column that is not some other column's nextColumn.
    const targeted = new Set(
      template.columns.map((c) => c.nextColumn).filter((c): c is string => c !== null),
    );
    const heads = columnIds.filter((cid) => !targeted.has(cid));
    expect(heads).toHaveLength(1);

    const visited: string[] = [];
    let cursor: string | null = heads[0];
    while (cursor !== null) {
      expect(visited).not.toContain(cursor); // no cycles
      visited.push(cursor);
      cursor = getColumnDef(id, cursor)?.nextColumn ?? null;
    }
    expect(visited.sort()).toEqual([...columnIds].sort());
  });
});

describe.each(IDS)("template %s — blankFields", (id) => {
  const template = TEMPLATES[id];

  it("stamps each blank card with its own columnId", () => {
    for (const col of template.columns) {
      expect(col.blankFields().columnId).toBe(col.id);
    }
  });

  it("returns a fresh object each call so drafts cannot alias", () => {
    for (const col of template.columns) {
      const a = col.blankFields();
      const b = col.blankFields();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    }
  });

  it("produces blank cards that the column's own filter accepts by default", () => {
    for (const col of template.columns) {
      if (!col.filter) continue;
      expect(col.filter.isVisible(col.blankFields(), col.filter.defaultValue)).toBe(
        true,
      );
    }
  });
});

describe.each(IDS)("template %s — column filters", (id) => {
  const template = TEMPLATES[id];
  const filtered = template.columns.filter((c) => c.filter);

  it("declares a defaultValue that is one of the offered options", () => {
    for (const col of filtered) {
      const values = col.filter!.options.map((o) => o.value);
      expect(values).toContain(col.filter!.defaultValue);
    }
  });

  it("gives every filter option a non-empty label and unique value", () => {
    for (const col of filtered) {
      const values = col.filter!.options.map((o) => o.value);
      expect(new Set(values).size).toBe(values.length);
      for (const opt of col.filter!.options) {
        expect(opt.label.trim()).not.toBe("");
      }
    }
  });

  it("leaves cards from other columns visible", () => {
    for (const col of filtered) {
      const foreign = template.columns.find((c) => c.id !== col.id);
      if (!foreign) continue;
      for (const opt of col.filter!.options) {
        expect(col.filter!.isVisible(foreign.blankFields(), opt.value)).toBe(true);
      }
    }
  });
});

describe("NSF problems filter", () => {
  const problems = getColumnDef("nsf", "problems")!;
  const filter = problems.filter!;

  it("is configured on the problems column", () => {
    expect(filter.defaultValue).toBe("all");
    expect(filter.options.map((o) => o.value)).toEqual([
      "all",
      "active",
      "prospect",
      "pool",
    ]);
  });

  it('shows every card under "all"', () => {
    for (const state of ["active", "prospect", "pool"]) {
      expect(filter.isVisible({ columnId: "problems", state }, "all")).toBe(true);
    }
  });

  it("shows only cards whose state matches the selected filter", () => {
    expect(
      filter.isVisible({ columnId: "problems", state: "prospect" }, "prospect"),
    ).toBe(true);
    expect(
      filter.isVisible({ columnId: "problems", state: "active" }, "prospect"),
    ).toBe(false);
  });

  it('treats a card with no state as "active"', () => {
    expect(filter.isVisible({ columnId: "problems" }, "active")).toBe(true);
    expect(filter.isVisible({ columnId: "problems" }, "pool")).toBe(false);
  });
});
