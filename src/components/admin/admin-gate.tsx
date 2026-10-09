'use client'

/**
 * AdminGate — the shared ADMIN login gate (Task 38), extracted verbatim in
 * spirit from views/admin.tsx so the overview AND the three brand pages
 * guard deep links with the identical door:
 *
 *   dark glass card · glowing gold ShieldCheck medallion · password form
 *   POSTs through the page's useAdminSession().login() (the httpOnly
 *   session cookie lands automatically — same-origin fetch keeps it).
 *
 * Form-local state (password, submitting, inline error) lives here; the
 * session phase machine lives in use-admin-session.ts.
 */

import { useState, type FormEvent } from 'react'
import { AlertTriangle, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Reveal } from '@/components/shared/reveal'
import { useI18n } from '@/lib/i18n'
import type { AdminLoginResult } from '@/components/admin/use-admin-session'

type LoginError = Exclude<AdminLoginResult, 'ok'> | 'empty' | null

export interface AdminGateProps {
  /** From useAdminSession() — resolves 'ok' only for a 200. */
  onLogin: (password: string) => Promise<AdminLoginResult>
  /** True after a 401 mid-session — shows the expiry notice. */
  sessionExpired: boolean
}

export function AdminGate({ onLogin, sessionExpired }: AdminGateProps) {
  const { t } = useI18n()

  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<LoginError>(null)

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    if (!password.trim()) {
      setLoginError('empty')
      return
    }
    setSubmitting(true)
    setLoginError(null)
    try {
      const result = await onLogin(password)
      if (result === 'ok') {
        setPassword('')
        return
      }
      setLoginError(result)
    } catch {
      setLoginError('server')
    } finally {
      setSubmitting(false)
    }
  }

  const loginErrorMessage =
    loginError === 'rate_limited'
      ? t('admin.login.rateLimited')
      : loginError === 'invalid' || loginError === 'empty'
        ? t('admin.login.error')
        : loginError === 'server'
          ? t('admin.login.serverError')
          : null

  return (
    <div className="relative flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
      <Reveal className="w-full max-w-sm">
        <div className="glass-panel flex flex-col gap-6 rounded-2xl p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            {/* Glowing gold medallion */}
            <span className="animate-pulse-ring inline-flex size-16 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
              <ShieldCheck className="size-8 text-primary" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1.5">
              <h1 className="font-display text-2xl text-foreground sm:text-3xl">
                {t('admin.login.title')}
              </h1>
              <p className="text-sm text-muted-foreground">{t('admin.login.hint')}</p>
            </div>
          </div>

          {sessionExpired ? (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              {t('admin.session.expired')}
            </p>
          ) : null}

          <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="admin-password">{t('admin.login.passwordLabel')}</Label>
              <Input
                id="admin-password"
                name="password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                autoFocus
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (loginError) setLoginError(null)
                }}
                aria-invalid={loginError ? true : undefined}
                aria-describedby={loginError ? 'admin-login-error' : undefined}
                placeholder="••••••••"
                className="h-11 min-h-11"
              />
            </div>

            {loginErrorMessage ? (
              <p id="admin-login-error" role="alert" className="text-sm text-destructive">
                {loginErrorMessage}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={submitting}
              className="btn-lux min-h-11 rounded-md px-6 py-2.5 text-base font-semibold"
            >
              {submitting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Lock aria-hidden="true" />
              )}
              {submitting ? t('admin.common.loading') : t('admin.login.submit')}
            </Button>
          </form>
        </div>
      </Reveal>
    </div>
  )
}
