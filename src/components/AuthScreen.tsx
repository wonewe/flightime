import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

type Tab = 'login' | 'signup'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState<Tab>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const validate = (): string | null => {
    if (!USERNAME_RE.test(username)) {
      return '아이디는 3~20자 영문, 숫자, 밑줄(_)만 사용 가능합니다.'
    }
    if (password.length < 6) {
      return '비밀번호는 6자 이상이어야 합니다.'
    }
    if (tab === 'signup' && password !== confirmPassword) {
      return '비밀번호가 일치하지 않습니다.'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const result = tab === 'login'
        ? await signIn(username, password)
        : await signUp(username, password)

      if (result.error) setError(result.error)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full bg-white/[0.05] border border-white/[0.06] rounded-xl px-4 py-3 text-[14px] font-mono text-white/70 placeholder:text-white/20 outline-none focus:border-sky-400/30 focus:bg-white/[0.07] transition-all duration-200'

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-night-950" />

      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(56,189,248,0.04) 0%, transparent 60%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-[340px] px-6"
      >
        {/* Title */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Plane className="w-5 h-5 text-sky-400/40" />
            <h1 className="text-[28px] font-mono font-bold text-white/40 tracking-[0.4em]">
              FLIGHTIME
            </h1>
          </div>
          <p className="text-[11px] text-white/20 tracking-wider">
            집중의 비행을 시작하세요
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex mb-6 bg-white/[0.03] rounded-xl p-1 border border-white/[0.04]">
          {(['login', 'signup'] as const).map(t => (
            <button
              key={t}
              onClick={() => {
                setTab(t)
                setError('')
              }}
              className={`flex-1 py-2.5 rounded-lg text-[12px] font-mono tracking-wider transition-all duration-200 ${
                tab === t
                  ? 'bg-white/[0.08] text-white/70 border border-white/[0.06]'
                  : 'text-white/25 hover:text-white/40 border border-transparent'
              }`}
            >
              {t === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              placeholder="아이디"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase())}
              className={inputClass}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={inputClass}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {tab === 'signup' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호 확인"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-[11px] text-red-400/80 text-center py-1"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-xl bg-white/[0.07] border border-white/[0.06] text-white/70 font-medium text-[13px] tracking-wide hover:bg-white/[0.12] hover:text-white/90 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
          >
            {submitting
              ? '...'
              : tab === 'login'
                ? '로그인'
                : '가입하기'}
          </motion.button>
        </form>

        {/* Helper text */}
        <p className="text-center text-[10px] text-white/15 mt-6">
          {tab === 'login'
            ? '계정이 없으신가요? 회원가입 탭을 눌러주세요.'
            : '이미 계정이 있으신가요? 로그인 탭을 눌러주세요.'}
        </p>
      </motion.div>
    </div>
  )
}
