import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CheckSquare, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      const { data, error } = await signUp(email, password, displayName)
      if (error) setError(error.message)
      else if (data?.user && !data?.session) {
        setInfo('สมัครสำเร็จ! กรุณาเช็คอีเมลเพื่อยืนยันก่อน sign in')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Brand */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-ink-900 text-white">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-white text-ink-900 flex items-center justify-center">
            <CheckSquare size={20} />
          </div>
          <span className="font-display font-bold">Work Tracker</span>
        </div>

        <div className="space-y-6 max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            ติดตามงานของคุณ<br/>
            <span className="text-ink-400">แบบเรียบ ใช้ง่าย</span>
          </h1>
          <p className="text-ink-300 text-sm leading-relaxed">
            จัดการงาน Routine และ Project ของคุณในที่เดียว
            ดู progress, อัพรูป, ลากย้ายสถานะ และมีปฏิทินช่วยวางแผน
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg border border-ink-700 px-3 py-2.5">
              <div className="font-medium text-white">IT Support</div>
              <div className="text-ink-400 mt-0.5">งานช่วยเหลือ</div>
            </div>
            <div className="rounded-lg border border-ink-700 px-3 py-2.5">
              <div className="font-medium text-white">Data Analytic</div>
              <div className="text-ink-400 mt-0.5">วิเคราะห์ข้อมูล</div>
            </div>
            <div className="rounded-lg border border-ink-700 px-3 py-2.5">
              <div className="font-medium text-white">Media & AI</div>
              <div className="text-ink-400 mt-0.5">automation</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-ink-500">
          © 2026 Work Tracker
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-ink-900 text-white flex items-center justify-center">
              <CheckSquare size={20} />
            </div>
            <span className="font-display font-bold">Work Tracker</span>
          </div>

          <h2 className="font-display text-2xl font-bold mb-1">
            {mode === 'signin' ? 'ยินดีต้อนรับกลับมา' : 'สมัครใช้งาน'}
          </h2>
          <p className="text-sm text-ink-500 mb-6">
            {mode === 'signin' ? 'เข้าสู่ระบบเพื่อจัดการงานของคุณ' : 'สร้างบัญชีใหม่เพื่อเริ่มต้น'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">ชื่อแสดง</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="input"
                  placeholder="ชื่อของคุณ"
                  required
                />
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            {info && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                {info}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>

            <div className="text-center text-sm text-ink-500">
              {mode === 'signin' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีแล้ว?'}{' '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo('') }}
                className="text-ink-900 font-medium hover:underline"
              >
                {mode === 'signin' ? 'สมัครเลย' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
