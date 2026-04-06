import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authAPI } from '../services/api'

function ResetPasswordConfirm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')
  const [validatingToken, setValidatingToken] = useState(true)

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token')
    if (!tokenFromUrl) {
      setError('Invalid reset link. Missing token.')
      setValidatingToken(false)
    } else {
      setToken(tokenFromUrl)
      setValidatingToken(false)
    }
  }, [searchParams])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!password || !confirmPassword) {
      setError('Please enter both password fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      await authAPI.confirmPasswordReset(token, password)
      setSuccess('Password reset successfully! Redirecting to login...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to reset password'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  if (validatingToken) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="brand-lock mb-6 flex select-none items-center gap-3">
        <img src="/logo.svg" alt="Cadence Logo" draggable={false} className="brand-lock h-12 w-12 rounded-full" />
        <h1 className="brand-lock text-3xl font-bold text-white">Cadence</h1>
      </div>

      <div className="w-full max-w-sm rounded-lg border border-dark-tertiary bg-dark-secondary/70 p-8 shadow-xl">
        <h2 className="mb-1 text-center text-2xl font-semibold text-white">Create New Password</h2>
        <p className="mb-4 text-center text-sm text-gray-400">
          Enter your new password below
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

        <form onSubmit={handleResetPassword} className="space-y-3">
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-gray-300">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your new password"
              className="w-full rounded bg-dark-tertiary border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-400">
              Must be at least 8 characters
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-xs font-medium text-gray-300">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              className="w-full rounded bg-dark-tertiary border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:bg-white/50 disabled:text-black/50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-sm text-gray-400">
            Remember your password?{' '}
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

export default ResetPasswordConfirm
