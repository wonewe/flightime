import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signUp: (username: string, password: string) => Promise<{ error: string | null }>
  signIn: (username: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toEmail(username: string) {
  return `${username}@flightime.app`
}

function mapError(msg: string): string {
  if (msg.includes('User already registered')) return '이미 사용 중인 아이디입니다.'
  if (msg.includes('Invalid login credentials')) return '아이디 또는 비밀번호가 올바르지 않습니다.'
  if (msg.includes('Email not confirmed')) return '이메일 인증이 필요합니다. 관리자에게 문의하세요.'
  if (msg.includes('Password should be at least')) return '비밀번호는 6자 이상이어야 합니다.'
  return msg
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async (username: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email: toEmail(username),
      password,
      options: { data: { username } },
    })
    if (error) return { error: mapError(error.message) }
    return { error: null }
  }, [])

  const signIn = useCallback(async (username: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    })
    if (error) return { error: mapError(error.message) }
    return { error: null }
  }, [])

  const signOutFn = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut: signOutFn }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
