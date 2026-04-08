export const SHOPPING_TASK_MEMORY_KEY = 'bes3-current-shopping-task'

export type StoredShoppingTask = {
  href: string
  label: string
  description: string
  source?: string
  updatedAt: string
}
