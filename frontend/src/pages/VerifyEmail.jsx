import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../services/api'

function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(location.state?.email || '')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const handleVerify = async (event) => {
    event?.preventDefault?.()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!email || !otp) {
        setError('Please enter both email and OTP')
        setLoading(false)
        return
      }

      const response = await authAPI.verifyEmail(email, otp)
      const { access, refresh, user } = response.data || {}

      if (access) {
        localStorage.setItem('access_token', access)
      }
      if (refresh) {
        localStorage.setItem('refresh_token', refresh)
      }
      if (user) {
        localStorage.setItem('user_email', user.email || '')
        localStorage.setItem('user_role', user.role || 'listener')
        localStorage.setItem('user_name', user.name || '')
        localStorage.setItem('user_profile_image', user.profile_image || '')
      }

      setSuccess('Email verified successfully. Redirecting...')
      setTimeout(() => {
        window.location.href = '/'
      }, 1200)
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to verify email'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (email && otp.length === 6 && !loading && !resending) {
      handleVerify()
    }
  }, [otp, email, loading, resending])

  const handleResendOTP = async () => {
    setError('')
    setSuccess('')
    setResending(true)

    try {
      if (!email) {
        setError('Please enter your email')
        setResending(false)
        return
      }

      await authAPI.resendVerificationEmail(email)
      setSuccess('Verification code sent! Check your email.')
      setResendCooldown(120)

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
        'Failed to resend verification code'
      setError(errorMsg)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <img src="/logo.svg" alt="Cadence Logo" draggable={false} className="brand-lock h-12 w-12 rounded-full" />
        <h1 className="brand-lock text-3xl font-bold text-white">Cadence</h1>
      </div>

      <div className="w-full max-w-sm rounded-lg border border-dark-tertiary bg-dark-secondary/70 p-8 shadow-xl">
        <h2 className="mb-1 text-center text-2xl font-semibold text-white">Verify Email</h2>
        <p className="mb-4 text-center text-sm text-gray-400">
          Enter the verification code sent to your email
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

        <form onSubmit={handleVerify} className="space-y-3">
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
              disabled={loading || resending}
            />
          </div>

          <div>
            <label htmlFor="otp" className="mb-1 block text-xs font-medium text-gray-300">
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="------"
              maxLength="6"
              className="w-full rounded bg-dark-tertiary border border-gray-700 px-4 py-4 text-center text-4xl font-bold tracking-[0.45em] text-white placeholder-gray-500 focus:outline-none focus:border-white"
              disabled={loading || resending}
            />
          </div>

          <button
            type="submit"
            disabled={loading || resending}
            className="w-full bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:bg-white/50 disabled:text-black/50"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="mb-2 text-sm text-gray-400">Didn't receive a code?</p>
          <button
            onClick={handleResendOTP}
            disabled={resending || resendCooldown > 0}
            className="text-sm font-medium text-white hover:text-gray-200 disabled:text-gray-500"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Code'}
          </button>
        </div>

        <div className="mt-5 text-center">
          <p className="text-sm text-gray-400">
            Have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-medium text-white hover:text-gray-200"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
