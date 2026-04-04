export const DECISION_VISITOR_QUERY_PARAM = 'visitor'
const MAX_DECISION_VISITOR_ID_LENGTH = 120

export function normalizeDecisionVisitorId(value: string | null | undefined) {
  return String(value || '').trim().slice(0, MAX_DECISION_VISITOR_ID_LENGTH)
}
