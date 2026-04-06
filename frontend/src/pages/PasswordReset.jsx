import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

function PasswordReset() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const handleRequestReset = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!email) {
        setError('Please enter your email')
        setLoading(false)
        return
      }

      await authAPI.requestPasswordReset(email)
      setSuccess('Password reset link sent to your email. Check your inbox.')
      setResendCooldown(120)
      setEmail('')

      // Countdown timer
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to request password reset'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="brand-lock mb-6 flex select-none items-center gap-3">
        <img src="/logo.svg" alt="Cadence Logo" draggable={false} className="brand-lock h-12 w-12 rounded-full" />
        <h1 className="brand-lock text-3xl font-bold text-white">Cadence</h1>
      </div>

      <div className="w-full max-w-sm rounded-lg border border-dark-tertiary bg-dark-secondary/70 p-8 shadow-xl">
        <h2 className="mb-1 text-center text-2xl font-semibold text-white">Reset Password</h2>
        <p className="mb-4 text-center text-sm text-gray-400">
          Enter your email to receive a password reset link
        </p>

        {error && (
          <div className="mb-4 rounded border border-red-800/50 bg-red-900/20 px-3 py-2 text-sm text-white">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white">
            {success}
          </div>
        )}

        <form onSubmit={handleRequestReset} className="space-y-3">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-gray-300">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded bg-dark-tertiary border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white"
              disabled={loading || resendCooldown > 0}
            />
          </div>

          <button
            type="submit"
            disabled={loading || resendCooldown > 0}
            className="w-full bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:bg-white/50 disabled:text-black/50"
          >
            {loading ? 'Sending...' : resendCooldown > 0 ? `Wait ${resendCooldown}s` : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-5 space-y-2 text-center text-sm text-gray-400">
          <p>
            Remember your password?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-medium text-white hover:text-gray-200"
            >
              Login
            </button>
          </p>
          <p>
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-medium text-white hover:text-gray-200"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default PasswordReset
