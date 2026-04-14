import { useEffect, useState } from 'react'

function useDelayedLoader(loading, delayMs = 250) {
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    if (!loading) {
      setShowLoader(false)
      return undefined
    }

    const timeoutId = window.setTimeout(() => setShowLoader(true), delayMs)
    return () => window.clearTimeout(timeoutId)
  }, [loading, delayMs])

  return showLoader
}

export default useDelayedLoader
