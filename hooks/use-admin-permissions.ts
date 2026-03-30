import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export interface UserRole {
  id: string
  user_id: string
  email: string
  role: 'super_admin' | 'admin'
  permissions: {
    dashboard?: boolean
    submissions?: boolean
    news?: boolean
    jobs?: boolean
    applications?: boolean
    newsletters?: boolean
    settings?: boolean
    customer_care?: boolean
    management_profiles?: boolean
    team_members?: boolean
  }
  created_at?: string
  updated_at?: string
}

export const BUSINESS_CARDS_ONLY_ADMIN_EMAIL = 'admin@legendholding.com'

/** Override role so admin@legendholding.com only has Digital Business Cards access */
function applyBusinessCardsOnlyOverride(roleData: UserRole, email: string | undefined): UserRole {
  if (email !== BUSINESS_CARDS_ONLY_ADMIN_EMAIL) return roleData
  if (roleData.role === 'super_admin') return roleData
  return {
    ...roleData,
    permissions: {
      dashboard: false,
      submissions: false,
      news: false,
      jobs: false,
      applications: false,
      newsletters: false,
      settings: false,
      customer_care: false,
      management_profiles: true,
      team_members: false
    }
  }
}

export interface AdminPermissions {
  userRole: UserRole | null
  isLoading: boolean
  isSuperAdmin: boolean
  isBusinessCardsOnlyAdmin: boolean
  isAdmin: boolean
  /** Display label for the current user's role (e.g. "Super Admin", "HR Admin", "Admin") */
  roleLabel: string
  hasPermission: (permission: keyof UserRole['permissions']) => boolean
  canAccess: (path: string) => boolean
}

// Module-level cache: persists across component mounts so tab switches are instant
let _cachedRole: UserRole | null = null
let _cachePromise: Promise<void> | null = null

const SUPER_ADMIN_EMAILS = ['mufeed.rahman@legendholding.com', 'sonam.lama@legendholding.com']

/** Call on sign-out to clear cached permissions */
export function clearPermissionsCache() {
  _cachedRole = null
  _cachePromise = null
}

function buildFallbackRole(user: { id: string; email?: string | null }): UserRole {
  const email = user.email || ''
  const isSA = SUPER_ADMIN_EMAILS.includes(email)
  const isBCOnly = email === BUSINESS_CARDS_ONLY_ADMIN_EMAIL
  return {
    id: 'fallback',
    user_id: user.id,
    email,
    role: isSA ? 'super_admin' : 'admin',
    permissions: isBCOnly
      ? { dashboard: false, submissions: false, news: false, jobs: false, applications: false, newsletters: false, settings: false, customer_care: false, management_profiles: true, team_members: false }
      : isSA
        ? { dashboard: true, submissions: true, news: true, jobs: true, applications: true, newsletters: true, settings: true, customer_care: true, management_profiles: true, team_members: true }
        : { dashboard: true, submissions: false, news: false, jobs: true, applications: true, newsletters: false, settings: false, customer_care: false, management_profiles: false, team_members: false },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

export function useAdminPermissions(): AdminPermissions {
  const [userRole, setUserRole] = useState<UserRole | null>(_cachedRole)
  const [isLoading, setIsLoading] = useState(_cachedRole === null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    // If we already have a cached role, use it immediately — no loading state
    if (_cachedRole) {
      setUserRole(_cachedRole)
      setIsLoading(false)
      return
    }

    // If another instance is already fetching, wait for it
    if (_cachePromise) {
      _cachePromise.then(() => {
        setUserRole(_cachedRole)
        setIsLoading(false)
      })
      return
    }

    // First mount across all instances — fetch and cache
    _cachePromise = fetchUserRole()
    _cachePromise.then(() => {
      setUserRole(_cachedRole)
      setIsLoading(false)
    })
  }, [])

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) { _cachedRole = null; return }
      const user = data.user

      const fallbackRole = buildFallbackRole(user)

      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (roleError) {
          try {
            await supabase.rpc('add_missing_user_roles')
            const { data: retryData, error: retryErr } = await supabase
              .from('user_roles').select('*').eq('user_id', user.id).single()
            _cachedRole = (retryData && !retryErr)
              ? applyBusinessCardsOnlyOverride(retryData, user.email)
              : fallbackRole
          } catch {
            try {
              const { data: insertData, error: insertErr } = await supabase
                .from('user_roles').insert([fallbackRole]).select().single()
              _cachedRole = insertErr ? fallbackRole : applyBusinessCardsOnlyOverride(insertData, user.email)
            } catch { _cachedRole = fallbackRole }
          }
        } else if (roleData) {
          _cachedRole = applyBusinessCardsOnlyOverride(roleData, user.email)
        } else {
          _cachedRole = fallbackRole
        }
      } catch {
        _cachedRole = fallbackRole
      }
    } catch {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        _cachedRole = user ? buildFallbackRole(user) : null
      } catch { _cachedRole = null }
    }
  }

  const isSuperAdmin = userRole?.role === 'super_admin'
  const isBusinessCardsOnlyAdmin = !isSuperAdmin && userRole?.email === BUSINESS_CARDS_ONLY_ADMIN_EMAIL
  const isAdmin = userRole?.role === 'admin' || isSuperAdmin

  // Display label: limited super admins (jobs + applications only) get a different name
  const roleLabel =
    !userRole
      ? 'Admin'
      : userRole.role === 'super_admin' &&
        userRole.permissions?.submissions !== true &&
        userRole.permissions?.news !== true
        ? 'HR Admin'
        : userRole.role === 'super_admin'
          ? 'Super Admin'
          : 'Admin'

  // Super admins have all permissions unless explicitly set to false (supports limited super admins like HR Admin)
  const hasPermission = (permission: keyof UserRole['permissions']): boolean => {
    if (!userRole) return false
    if (isSuperAdmin) return userRole.permissions[permission] !== false
    return userRole.permissions[permission] === true
  }

  const canAccess = (path: string): boolean => {
    if (!userRole) return false

    // Map paths to permissions
    const pathPermissions: Record<string, keyof UserRole['permissions']> = {
      '/admin/dashboard': 'dashboard',
      '/admin/submissions': 'submissions',
      '/admin/news': 'news',
      '/admin/jobs': 'jobs',
      '/admin/applications': 'applications',
      '/admin/newsletters': 'newsletters',
      '/admin/settings': 'settings',
      '/admin/customer-care': 'customer_care',
      '/admin/management-profiles': 'management_profiles',
      '/admin/team-members': 'team_members',
      '/admin/user-management': 'dashboard'
    }

    const permission = pathPermissions[path]
    return permission ? hasPermission(permission) : false
  }

  return {
    userRole,
    isLoading,
    isSuperAdmin,
    isBusinessCardsOnlyAdmin,
    isAdmin,
    roleLabel,
    hasPermission,
    canAccess
  }
} 