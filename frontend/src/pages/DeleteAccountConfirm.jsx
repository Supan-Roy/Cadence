import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { authAPI } from '../services/api'

function DeleteAccountConfirm() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')
  const [validatingToken, setValidatingToken] = useState(true)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token')
    if (!tokenFromUrl) {
      setError('Invalid deletion link. Missing token.')
      setValidatingToken(false)
    } else {
      setToken(tokenFromUrl)
      setValidatingToken(false)
    }
  }, [searchParams])

  const handleDeleteAccount = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!confirmed) {
      setError('Please confirm that you want to delete your account')
      return
    }

    setLoading(true)

    try {
      await authAPI.confirmAccountDeletion(token)
      setSuccess('Account deleted successfully. Signing you out...')
      
      // Clear all auth data
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_email')
      localStorage.removeItem('user_role')
      localStorage.removeItem('user_name')
      localStorage.removeItem('user_profile_image')

      setTimeout(() => {
        window.location.href = '/login'
      }, 1200)
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to delete account'
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
      <div className="mb-6 flex items-center gap-3">
        <img src="/logo.svg" alt="Cadence Logo" draggable={false} className="brand-lock h-12 w-12 rounded-full" />
        <h1 className="brand-lock text-3xl font-bold text-white">Cadence</h1>
      </div>

      <div className="w-full max-w-sm rounded-lg border border-dark-tertiary bg-dark-secondary/70 p-8 shadow-xl">
        <h2 className="mb-1 text-center text-2xl font-semibold text-white">Delete Account</h2>
        <p className="mb-4 text-center text-sm text-gray-400">
          This action cannot be undone. Are you sure?
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

        <form onSubmit={handleDeleteAccount} className="space-y-4">
          <div className="rounded-lg border border-white/15 bg-white/5 p-4">
            <p className="text-sm text-white">
              <span className="font-semibold">Warning:</span> Deleting your account will:
            </p>
            <ul className="mt-2 ml-4 space-y-1 text-sm text-gray-300">
              <li>• Permanently delete your profile</li>
              <li>• Remove all your uploads</li>
              <li>• Delete all playlists and favorites</li>
              <li>• This cannot be reversed</li>
            </ul>
          </div>

          <label className="flex cursor-pointer items-center space-x-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 accent-white"
            />
            <span className="text-sm text-gray-300">
              I understand and want to delete my account permanently
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !confirmed}
            className="w-full bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-gray-100 disabled:bg-white/50 disabled:text-black/50"
          >
            {loading ? 'Deleting...' : 'Delete Account'}
          </button>
        </form>

      </div>
    </div>
  )
}

export default DeleteAccountConfirm
