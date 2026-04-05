import React from 'react'

function CadenceLoader({ message = 'Loading Cadence...', fullScreen = false, size = 'md' }) {
  const isSmall = size === 'sm'

  const containerClass = fullScreen
    ? 'min-h-screen bg-dark-bg flex items-center justify-center px-4'
    : 'flex items-center justify-center py-12'

  const logoWrapClass = isSmall
    ? 'cadence-loader-logo-wrap cadence-loader-logo-wrap--sm'
    : 'cadence-loader-logo-wrap'

  return (
    <div className={containerClass}>
      <div className="text-center brand-lock">
        <div className={logoWrapClass}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            role="img"
            aria-label="Cadence loading logo"
            className="cadence-loader-logo"
          >
            <defs>
              <linearGradient id="cadence-loader-red-bg" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#ff171f" />
                <stop offset="50%" stopColor="#ff101a" />
                <stop offset="100%" stopColor="#f20d1a" />
              </linearGradient>
              <clipPath id="cadence-loader-circle">
                <circle cx="256" cy="256" r="248" />
              </clipPath>
            </defs>

            <g clipPath="url(#cadence-loader-circle)">
              <circle cx="256" cy="256" r="248" fill="url(#cadence-loader-red-bg)" />

              <rect x="103" y="184" width="82" height="164" rx="9" fill="#f2f2f2" />
              <rect x="213" y="126" width="86" height="280" rx="9" fill="#f2f2f2" />
              <rect x="327" y="184" width="82" height="164" rx="9" fill="#f2f2f2" />

              <g fill="#ff2a33" className="cadence-loader-core-wave">
                <rect x="245" y="160" width="22" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0s' }} />
                <rect x="240" y="174" width="32" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.05s' }} />
                <rect x="238" y="188" width="36" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.1s' }} />
                <rect x="228" y="202" width="56" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.15s' }} />
                <rect x="236" y="216" width="40" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.2s' }} />
                <rect x="230" y="230" width="52" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.25s' }} />
                <rect x="234" y="244" width="44" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.3s' }} />
                <rect x="238" y="258" width="36" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.35s' }} />
                <rect x="241" y="272" width="30" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.4s' }} />
                <rect x="237" y="286" width="38" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.45s' }} />
                <rect x="221" y="300" width="70" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.5s' }} />
                <rect x="236" y="314" width="40" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.55s' }} />
                <rect x="238" y="328" width="36" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.6s' }} />
                <rect x="224" y="342" width="64" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.65s' }} />
                <rect x="234" y="356" width="44" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.7s' }} />
                <rect x="241" y="370" width="30" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.75s' }} />
                <rect x="238" y="384" width="36" height="8" rx="4" className="cadence-loader-core-wave-bar" style={{ '--wave-delay': '0.8s' }} />
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  )
}

export default CadenceLoader
