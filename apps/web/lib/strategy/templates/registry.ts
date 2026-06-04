import { nsfTemplate } from "./nsf";
import type { TemplateId } from "@/lib/strategy/types";
import type { TemplateDefinition } from "./types";

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  nsf: nsfTemplate,
};

export function getTemplate(id: TemplateId): TemplateDefinition {
  const t = TEMPLATES[id];
  if (!t) throw new Error(`Unknown template: ${id}`);
  return t;
}

export interface ColumnConfig {
  id: string;
  bgClass: string;
  nextColumn: string | null;
}

export function getColumnConfig(
  templateId: TemplateId,
  columnId: string,
): ColumnConfig | undefined {
  const t = getTemplate(templateId);
  const col = t.columns.find((c) => c.id === columnId);
  if (!col) return undefined;
  return { id: col.id, bgClass: col.bgClass, nextColumn: col.nextColumn };
}

export function getColumnOrder(templateId: TemplateId): string[] {
  return getTemplate(templateId).columns.map((c) => c.id);
}

export function getColumnDef(templateId: TemplateId, columnId: string) {
  const t = getTemplate(templateId);
  return t.columns.find((c) => c.id === columnId);
}
