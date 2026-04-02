import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

function Login({ onLogin }) {
  const navigate = useNavigate()
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
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
      const errorMsg = err.response?.data?.detail || err.response?.data?.email?.[0] || 'Login failed. Please check your credentials.'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      const response = await authAPI.signup(
        formData.email,
        formData.password,
        'listener' // Default role
      )
      localStorage.setItem('access_token', response.data.access)
      if (response.data.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh)
      }
      // Store user info from response
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

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      {/* Auth Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-dark-secondary border border-dark-tertiary rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src="/logo.svg" alt="Cadence Logo" className="w-20 h-20" />
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-bold text-white text-center mb-2">
            {isSignup ? 'Join Cadence' : 'Welcome Back'}
          </h2>
          <p className="text-gray-400 text-center mb-8">
            {isSignup
              ? 'Create an account to start streaming'
              : 'Sign in to your account'}
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-dark-tertiary border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                placeholder="your@email.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-dark-tertiary border border-gray-700 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-opacity-90 disabled:bg-opacity-50 text-dark-bg font-semibold py-3 rounded-lg transition-all mt-6"
            >
              {loading ? 'Processing...' : isSignup ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-8 pt-8 border-t border-dark-tertiary">
            <p className="text-gray-400 text-center">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => {
                  setIsSignup(!isSignup)
                  setError('')
                  setFormData({ email: '', password: '' })
                }}
                className="ml-2 text-accent hover:text-opacity-80 font-semibold transition-colors"
              >
                {isSignup ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>

        {/* Demo Credentials Hint */}
        <p className="text-gray-500 text-center text-xs mt-6">
          Make sure the backend is running on http://192.168.0.102:8000
        </p>
      </div>
    </div>
  )
}

export default Login
