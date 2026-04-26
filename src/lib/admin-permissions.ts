import type { UserRole } from '@/lib/types'

export type AdminPermission =
  | 'dashboard:read'
  | 'products:write'
  | 'evidence:write'
  | 'taxonomy:write'
  | 'price-value:write'
  | 'pipeline:write'
  | 'risk:write'
  | 'articles:write'
  | 'prompts:write'
  | 'seo-ops:write'
  | 'data:write'
  | 'settings:write'
  | 'users:write'

export const ADMIN_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  evidence_ops: 'Evidence Ops',
  content_seo_editor: 'Content/SEO Editor',
  commerce_ops: 'Commerce Ops',
  viewer: 'Viewer'
}

export const ADMIN_ROLE_PERMISSIONS: Record<UserRole, AdminPermission[]> = {
  admin: [
    'dashboard:read',
    'products:write',
    'evidence:write',
    'taxonomy:write',
    'price-value:write',
    'pipeline:write',
    'risk:write',
    'articles:write',
    'prompts:write',
    'seo-ops:write',
    'data:write',
    'settings:write',
    'users:write'
  ],
  evidence_ops: ['dashboard:read', 'products:write', 'evidence:write', 'pipeline:write', 'risk:write'],
  content_seo_editor: ['dashboard:read', 'taxonomy:write', 'articles:write', 'seo-ops:write', 'pipeline:write', 'risk:write'],
  commerce_ops: ['dashboard:read', 'products:write', 'price-value:write', 'pipeline:write', 'risk:write'],
  viewer: ['dashboard:read']
}

export function isAdminRole(value: unknown): value is UserRole {
  return typeof value === 'string' && value in ADMIN_ROLE_PERMISSIONS
}

export function hasAdminPermission(role: UserRole, permission: AdminPermission): boolean {
  return ADMIN_ROLE_PERMISSIONS[role]?.includes(permission) || false
}
