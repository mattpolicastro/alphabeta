import { describe, expect, it } from 'vitest'
import { getTemplate, TEMPLATE_LIST } from '@/lib/strategy/templates'
import type { TemplateId } from '@/lib/strategy/types'
import { mintBoard, getBoard } from '@/lib/strategy/queries'

const VALID_COLUMNS: Record<TemplateId, Set<string>> = {
  nsf: new Set(['northstar', 'drivers', 'problems', 'goals', 'work']),
  rice: new Set(['ideas', 'scoring', 'prioritized']),
  gps: new Set(['gps-goals', 'gps-problems', 'solutions']),
  okr: new Set(['objectives', 'key-results', 'initiatives']),
  gist: new Set(['gist-goals', 'gist-ideas', 'steps', 'tasks']),
}

const EXPECTED_COUNTS: Record<TemplateId, { cards: number; connections: number }> = {
  nsf: { cards: 22, connections: 14 },
  rice: { cards: 10, connections: 6 },
  gps: { cards: 10, connections: 8 },
  okr: { cards: 12, connections: 10 },
  gist: { cards: 14, connections: 12 },
}

describe('TEMPLATE_LIST', () => {
  it('contains all 5 frameworks', () => {
    expect(TEMPLATE_LIST).toHaveLength(5)
    const ids = TEMPLATE_LIST.map((t) => t.id).sort()
    expect(ids).toEqual(['gist', 'gps', 'nsf', 'okr', 'rice'])
  })
})

describe.each(
  (['rice', 'gps', 'okr', 'gist'] as const).map((id) => ({
    id,
    template: getTemplate(id),
    example: getTemplate(id).exampleBoard(),
  })),
)('$id example board', ({ id, template, example }) => {
  it('targets the correct template', () => {
    expect(example.templateId).toBe(id)
  })

  it('has the expected card and connection counts', () => {
    const expected = EXPECTED_COUNTS[id]
    expect(example.cards).toHaveLength(expected.cards)
    expect(example.connections).toHaveLength(expected.connections)
  })

  it('places every card in a valid column', () => {
    const valid = VALID_COLUMNS[id]
    for (const card of example.cards) {
      expect(valid.has(card.columnId)).toBe(true)
    }
  })

  it('has matching columnId in card.fields and card.columnId', () => {
    for (const card of example.cards) {
      expect(card.fields.columnId).toBe(card.columnId)
    }
  })

  it('references only existing cards in connections', () => {
    const cardIds = new Set(example.cards.map((c) => c.id))
    for (const conn of example.connections) {
      expect(cardIds.has(conn.fromCardId)).toBe(true)
      expect(cardIds.has(conn.toCardId)).toBe(true)
    }
  })

  it('has unique card IDs', () => {
    const ids = example.cards.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has unique connection IDs', () => {
    const ids = example.connections.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('template columns match VALID_COLUMNS', () => {
    const templateCols = new Set(template.columns.map((c) => c.id))
    expect(templateCols).toEqual(VALID_COLUMNS[id])
  })

  it('round-trips through mintBoard intact', async () => {
    const row = await mintBoard(example)
    const fetched = await getBoard(row.id)
    expect(fetched?.cards).toHaveLength(EXPECTED_COUNTS[id].cards)
    expect(fetched?.connections).toHaveLength(EXPECTED_COUNTS[id].connections)
  })
})
