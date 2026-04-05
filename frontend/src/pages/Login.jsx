import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

function Login({ onLogin }) {
  const navigate = useNavigate()
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    let finalValue = value
    if (name === 'password' || name === 'confirmPassword') {
      finalValue = value.slice(0, 32)
    }
    if (name === 'name') {
      finalValue = value.slice(0, 25)
    }
    setFormData(prev => ({
      ...prev,
      [name]: finalValue,
    }))
    setError('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await authAPI.login(formData.email, formData.password)
      localStorage.setItem('access_token', response.data.access)
      if (response.data.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh)
      }
      if (response.data.user) {
        localStorage.setItem('user_email', response.data.user.email)
        localStorage.setItem('user_role', response.data.user.role || 'listener')
        localStorage.setItem('user_name', response.data.user.name || '')
        onLogin?.(response.data.user)
      } else {
        localStorage.setItem('user_email', formData.email)
        localStorage.setItem('user_role', 'listener')
        onLogin?.({ email: formData.email, role: 'listener' })
      }
      navigate('/')
    } catch (err) {
      console.error('Login error:', err)
      console.error('Response:', err.response?.data)
      const responseData = err.response?.data || {}
      const errorMsg = responseData?.detail || responseData?.email?.[0] || 'Login failed. Please check your credentials.'

      if (responseData?.code === 'account_not_found') {
        setIsSignup(true)
        setFormData((prev) => ({
          ...prev,
          password: '',
          confirmPassword: '',
        }))
        setShowPassword(false)
        setShowConfirmPassword(false)
        setError('Account does not exist. Create a new account below.')
      } else {
        setError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const trimmedName = formData.name.trim()
    if (!trimmedName) {
      setError('Name is required')
      setLoading(false)
      return
    }

    if (formData.password.length < 8 || formData.password.length > 32) {
      setError('Password must be 8-32 characters long')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const response = await authAPI.signup(
        formData.email,
        formData.password,
        'listener', // Default role
        trimmedName
      )
      // Don't auto-login, redirect to email verification instead
      navigate('/auth/verify-email', { state: { email: formData.email } })
    } catch (err) {
      console.error('Signup error:', err)
      console.error('Response:', err.response?.data)
      const errors = err.response?.data
      if (typeof errors === 'object') {
        const errorMessages = Object.entries(errors)
          .map(([key, value]) => {
            const message = Array.isArray(value) ? value.join(', ') : value
            return `${key}: ${message}`
          })
          .join(' | ')
        setError(errorMessages)
      } else {
        setError(errors || 'Signup failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = isSignup ? handleSignup : handleLogin

  const handleGoogleLogin = async () => {
    try {
      setError('')
      const response = await authAPI.getGoogleOAuthUrl()
      const { auth_url, state } = response.data

      // Store state in localStorage for validation on callback
      localStorage.setItem('oauth_state', state)

      // Redirect to Google
      window.location.href = auth_url
    } catch (err) {
      console.error('Google OAuth error:', err)
      setError(err.response?.data?.detail || 'Failed to initiate Google login. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center px-4 py-8">
      {/* Header with Logo and Title */}
      <div className="mb-6 flex items-center gap-3">
        <img src="/logo.svg" alt="Cadence Logo" draggable={false} className="brand-lock w-12 h-12 rounded-full" />
        <h1 className="brand-lock text-3xl font-bold text-white">Cadence</h1>
      </div>

      {/* Auth Container */}
      <div className="w-full max-w-sm">
        {/* Heading */}
        <h2 className="text-2xl font-semibold text-white text-center mb-1">
          {isSignup ? 'Create Account' : 'Sign In'}
        </h2>
        <p className="text-gray-400 text-sm text-center mb-4">
          {isSignup
            ? 'Start streaming music today'
            : 'Welcome back'}
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800/50 rounded">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name (Signup only) */}
          {isSignup && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                maxLength={25}
                required
                className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-white text-sm focus:outline-none focus:border-accent transition-colors rounded"
                placeholder="First and last name"
              />
              <p className="mt-0.5 text-xs text-gray-400">{formData.name.length}/25</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-white text-sm focus:outline-none focus:border-accent transition-colors rounded"
              placeholder="your@email.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                maxLength={32}
                required
                className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-white text-sm focus:outline-none focus:border-accent transition-colors pr-10 rounded"
                placeholder={isSignup ? '8-32 characters' : 'Your password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm5.31-7.78l3.15 3.15.02-.02c-.34-.27-.73-.5-1.15-.66l-2.02 2.02z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-0.5 text-xs text-gray-400">{formData.password.length}/32</p>
          </div>

          {/* Confirm Password (Signup only) */}
          {isSignup && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  maxLength={32}
                  required
                  className="w-full px-3 py-2 bg-dark-tertiary border border-gray-700 text-white text-sm focus:outline-none focus:border-accent transition-colors pr-10 rounded"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm5.31-7.78l3.15 3.15.02-.02c-.34-.27-.73-.5-1.15-.66l-2.02 2.02z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Terms (Signup only) */}
          {isSignup && (
            <p className="text-xs text-gray-300 text-center pt-1 font-semibold">
              By continuing, I agree to Cadence's{' '}
              <span className="font-bold text-white cursor-pointer">terms</span>,{' '}
              <span className="font-bold text-white cursor-pointer">privacy policy</span>, and{' '}
              <span className="font-bold text-white cursor-pointer">cookie policy</span>.
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black text-sm font-semibold py-2 transition-all hover:bg-gray-100 disabled:bg-white/70 mt-4"
          >
            {loading ? 'Processing...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-[#1f1f1f] text-sm font-medium py-2.5 px-3 rounded border border-[#dadce0] shadow-sm transition-all hover:bg-[#f8f9fa] hover:shadow disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.23 3.62l6.9-6.9C35.95 2.35 30.39 0 24 0 14.64 0 6.58 5.38 2.66 13.22l8.04 6.24C12.53 13.65 17.82 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.55c0-1.57-.14-3.07-.39-4.5H24v8.51h12.66c-.55 2.96-2.23 5.47-4.74 7.16l7.3 5.66C43.49 37.43 46.5 31.6 46.5 24.55z" />
              <path fill="#FBBC05" d="M10.69 28.54a14.47 14.47 0 010-9.08l-8.04-6.24A24.02 24.02 0 000 24c0 3.89.93 7.56 2.65 10.78l8.04-6.24z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.91-2.13 15.88-5.8l-7.3-5.66c-2.03 1.37-4.64 2.18-8.58 2.18-6.18 0-11.47-4.15-13.31-9.96l-8.04 6.24C6.58 42.62 14.64 48 24 48z" />
            </svg>
            Sign in with Google
          </button>
        </form>

        {/* Toggle */}
        <div className="mt-4 text-center space-y-2">
          <p className="text-gray-400 text-sm">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => {
                setIsSignup(!isSignup)
                setError('')
                setFormData({ email: '', password: '', name: '', confirmPassword: '' })
                setShowPassword(false)
                setShowConfirmPassword(false)
              }}
              className="ml-1 font-bold text-white hover:text-gray-200"
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
          {!isSignup && (
            <div className="space-y-1 text-xs">
              <p>
                <button
                  onClick={() => navigate('/auth/password-reset')}
                  className="font-medium text-gray-200 hover:text-white"
                >
                  Forgot password?
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
