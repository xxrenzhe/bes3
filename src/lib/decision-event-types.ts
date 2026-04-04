export const DECISION_EVENT_TYPES = [
  'shortlist_add',
  'shortlist_remove',
  'compare_add',
  'compare_remove',
  'shortlist_compare_load',
  'shared_shortlist_view',
  'shared_shortlist_import',
  'shared_shortlist_replace',
  'shared_shortlist_compare_load',
  'shortlist_share_link_copy',
  'shared_shortlist_brief_copy',
  'merchant_cta_click'
] as const

export type DecisionEventType = typeof DECISION_EVENT_TYPES[number]

export function isDecisionEventType(value: string): value is DecisionEventType {
  return DECISION_EVENT_TYPES.includes(value as DecisionEventType)
}
