'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'verify' | 'newadmin' | 'pin' | 'success'

export default function AdminSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('verify')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [yourPassword, setYourPassword] = useState('')
  const [showYourPassword, setShowYourPassword] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinFocused, setPinFocused] = useState(false)

  // Step 1: Verify admin password (now just moves to next step)
  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (yourPassword.length < 1) {
      setError('Please enter your admin password.')
      return
    }
    setStep('newadmin')
  }

  // Step 2: Validate new admin fields → go to PIN
  const handleNewAdminNext = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setStep('pin')
  }

  // Step 3: Set PIN → create admin (now calls secure API)
  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits.')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.')
      return
    }
    setLoading(true)
    try {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      if (!adminEmail) throw new Error('Admin email not configured in .env.local')

      const response = await fetch('/api/admin/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminEmail,
          adminPassword: yourPassword,
          newEmail,
          newPassword,
          pin
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message)
      }

      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Failed to create admin account.')
    } finally {
      setLoading(false)
    }
  }

  const EyeIcon = ({ show }: { show: boolean }) => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {show
        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      }
    </svg>
  )

  const stepList = [
    { key: 'verify', label: 'Verify' },
    { key: 'newadmin', label: 'New Admin' },
    { key: 'pin', label: 'PIN' },
  ]

  const stepIndex = stepList.findIndex(s => s.key === step)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-yellow-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />

      <div className="relative max-w-md w-full">

        {/* Step indicators */}
        {step !== 'success' && (
          <div className="flex items-center justify-center mb-8">
            {stepList.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    i < stepIndex ? 'bg-green-500 text-white' :
                    i === stepIndex ? 'bg-yellow-500 text-blue-900' :
                    'bg-white/20 text-white/40'
                  }`}>
                    {i < stepIndex ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${i === stepIndex ? 'text-yellow-400' : 'text-white/30'}`}>
                    {s.label}
                  </span>
                </div>
                {i < stepList.length - 1 && (
                  <div className={`w-16 h-px mx-2 mb-4 transition-all duration-300 ${i < stepIndex ? 'bg-green-500' : 'bg-white/20'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-blue-900 px-8 py-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Add New Admin</h1>
              <p className="text-blue-300 text-sm mt-0.5">
                {step === 'verify' && 'Verify your identity first'}
                {step === 'newadmin' && 'Set new admin credentials'}
                {step === 'pin' && 'Set a PIN for quick access'}
                {step === 'success' && 'Admin created successfully!'}
              </p>
            </div>
          </div>

          <div className="px-8 py-8">

            {/* Error */}
            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* STEP 1: Verify password */}
            {step === 'verify' && (
              <form onSubmit={handleVerifyPassword} className="space-y-5">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-yellow-800 text-sm">🔒 Enter your admin password to authorize adding a new admin.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Admin Password</label>
                  <div className="relative">
                    <input
                      type={showYourPassword ? 'text' : 'password'}
                      value={yourPassword}
                      onChange={e => setYourPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Enter your password"
                      required
                    />
                    <button type="button" onClick={() => setShowYourPassword(!showYourPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
                      <EyeIcon show={showYourPassword} />
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-900 text-white py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Verifying...</>
                  ) : 'Verify Password →'}
                </button>
              </form>
            )}

            {/* STEP 2: New Admin Details */}
            {step === 'newadmin' && (
              <form onSubmit={handleNewAdminNext} className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">New Admin Credentials</p>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="boss@sunlife.com.ph"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Min. 6 characters"
                      required minLength={6}
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
                      <EyeIcon show={showNewPassword} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-2.5 pr-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                        confirmPassword && newPassword !== confirmPassword ? 'border-red-400 bg-red-50' :
                        confirmPassword && newPassword === confirmPassword ? 'border-green-400 bg-green-50' :
                        'border-gray-300'
                      }`}
                      placeholder="Re-enter password"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
                      <EyeIcon show={showConfirmPassword} />
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && <p className="text-red-500 text-xs mt-1">Passwords do not match</p>}
                  {confirmPassword && newPassword === confirmPassword && <p className="text-green-500 text-xs mt-1">✓ Passwords match</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setStep('verify'); setError('') }}
                    className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm">
                    ← Back
                  </button>
                  <button type="submit"
                    className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors text-sm">
                    Next: Set PIN →
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: PIN */}
            {step === 'pin' && (
              <form onSubmit={handleSetPin} className="space-y-5">
                <div className="text-center mb-2">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">Set a PIN for <span className="font-semibold text-blue-900">{newEmail}</span></p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">PIN <span className="text-gray-400 font-normal">(4–8 digits)</span></label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    onFocus={() => setPinFocused(true)}
                    onBlur={() => setPinFocused(false)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl font-bold tracking-widest"
                    placeholder="••••"
                    required
                    minLength={4}
                  />
                  {/* PIN dots indicator */}
                  <div className="flex justify-center gap-2 mt-3">
                    {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                      <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                        i < pin.length ? 'bg-blue-900 scale-110' : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl font-bold tracking-widest ${
                      confirmPin && pin !== confirmPin ? 'border-red-400 bg-red-50' :
                      confirmPin && pin === confirmPin ? 'border-green-400 bg-green-50' :
                      'border-gray-300'
                    }`}
                    placeholder="••••"
                    required
                  />
                  {confirmPin && pin !== confirmPin && <p className="text-red-500 text-xs mt-1 text-center">PINs do not match</p>}
                  {confirmPin && pin === confirmPin && <p className="text-green-500 text-xs mt-1 text-center">✓ PINs match</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setStep('newadmin'); setError('') }}
                    className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm">
                    ← Back
                  </button>
                  <button type="submit" disabled={loading || pin.length < 4 || pin !== confirmPin}
                    className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2">
                    {loading ? (
                      <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Creating...</>
                    ) : 'Create Admin ✓'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Success */}
            {step === 'success' && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Admin Created!</h2>
                  <p className="text-gray-500 text-sm mt-1">{newEmail} can now log in as admin.</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left space-y-1.5">
                  <p className="text-sm text-blue-800"><span className="font-semibold">Email:</span> {newEmail}</p>
                  <p className="text-sm text-blue-800"><span className="font-semibold">Role:</span> Admin</p>
                  <p className="text-sm text-blue-800"><span className="font-semibold">PIN:</span> Set ✓</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-left">
                  <p className="text-yellow-800 text-sm font-semibold mb-1">⚠️ Last step!</p>
                  <p className="text-yellow-700 text-sm">Add <span className="font-mono font-bold">{newEmail}</span> to <span className="font-mono">ADMIN_EMAILS</span> in your <span className="font-mono">auth.ts</span>.</p>
                </div>

                <button onClick={() => router.push('/admin')}
                  className="w-full bg-blue-900 text-white py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors">
                  Go to Admin Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-white/30 text-xs mt-6">MRU · Admin Setup · March 02, 2026 🎓</p>
      </div>
    </div>
  )
}