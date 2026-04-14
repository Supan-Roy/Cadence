import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authAPI } from '../services/api'
import CadenceLoader from '../components/CadenceLoader'
import { redirectToBlocked, extractBlockedReason } from '../utils/banState'

function GoogleCallback({ onLogin }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const gError = searchParams.get('error')

        // Check for Google error
        if (gError) {
          setError(`Google OAuth error: ${gError}`)
          setLoading(false)
          setTimeout(() => navigate('/login'), 2000)
          return
        }

        // Validate code and state
        if (!code || !state) {
          setError('Missing authentication code or state parameter.')
          setLoading(false)
          setTimeout(() => navigate('/login'), 2000)
          return
        }

        // Validate state against localStorage
        const storedState = localStorage.getItem('oauth_state')
        if (storedState !== state) {
          setError('Invalid state parameter. Session mismatch.')
          setLoading(false)
          setTimeout(() => navigate('/login'), 2000)
          return
        }

        // Exchange code for tokens
        const response = await authAPI.handleGoogleOAuthCallback(code, state)
        const { access, refresh, user } = response.data

        // Store tokens and user info
        localStorage.setItem('access_token', access)
        if (refresh) {
          localStorage.setItem('refresh_token', refresh)
        }
        localStorage.setItem('user_email', user.email)
        localStorage.setItem('user_role', user.role || 'listener')
        localStorage.setItem('user_name', user.name || '')
        localStorage.setItem('user_profile_image', user.profile_image || '')

        // Notify parent component
        onLogin?.(user)

        // Redirect to dashboard
        navigate('/')
      } catch (err) {
        console.error('Google OAuth callback error:', err)
        const bannedDetail = extractBlockedReason(err.response?.data)
        if (bannedDetail) {
          redirectToBlocked(bannedDetail)
          return
        }
        const errorMsg =
          err.response?.data?.detail ||
          err.message ||
          'Failed to complete Google login. Please try again.'
        setError(errorMsg)
        setTimeout(() => navigate('/login'), 2000)
      } finally {
        // Always clear oauth_state after callback attempt
        localStorage.removeItem('oauth_state')
        setLoading(false)
      }
    }

    handleCallback()
  }, [searchParams, navigate, onLogin])

  if (loading) {
    return <CadenceLoader message="Completing your Google login..." fullScreen size="sm" />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-4 p-4 bg-red-900/20 border border-red-800/50 rounded">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-white text-black text-sm font-semibold py-2 transition-all hover:bg-gray-100 rounded"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default GoogleCallback
