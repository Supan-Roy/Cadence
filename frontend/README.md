# Cadence Frontend

A production-quality React frontend for the Cadence music streaming application. Built with React, Vite, Tailwind CSS, and React Router.

## Features

- 🎵 Real-time music streaming with backend integration
- 🎨 Dark theme inspired by Spotify / YouTube Music
- 📱 Fully responsive mobile-first design
- 🔐 JWT-based authentication (Login/Signup)
- 🎧 Advanced music player with progress control
- 📊 Trending, Recommended, and Recently Played sections
- ⚡ Fast development with Vite
- 🎯 Clean, maintainable architecture

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router 6** - Client-side routing
- **Axios** - HTTP client

## Project Structure

```
src/
├── components/
│   ├── TrackCard.jsx       # Individual track display
│   ├── PlayerBar.jsx       # Fixed bottom music player
│   └── Navbar.jsx          # Top navigation
├── pages/
│   ├── Login.jsx           # Authentication page
│   └── Home.jsx            # Main dashboard
├── services/
│   └── api.js              # Backend API integration
├── App.jsx                 # Main app component
├── main.jsx                # React entry point
└── index.css               # Global styles
```

## Prerequisites

Before running this project, ensure:

1. **Node.js 16+** is installed
2. **Backend API** is running on `http://127.0.0.1:8000`
3. Create test accounts using the backend API's signup endpoint

## Installation

1. **Install dependencies:**

```bash
npm install
```

2. **Start the development server:**

```bash
npm run dev
```

The application will open automatically at `http://localhost:3000`

## Development

### Available Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## API Integration

The frontend communicates with the backend at `http://127.0.0.1:8000/api`

### Key Endpoints Used

- `POST /auth/token/` - User login
- `POST /auth/register/` - User signup
- `GET /auth/verify/` - Verify authentication
- `GET /music/tracks/trending/` - Fetch trending tracks
- `GET /music/recommend/` - Fetch recommended tracks
- `GET /music/recent/` - Fetch recently played tracks
- `GET /music/tracks/{id}/` - Track details
- `GET /music/tracks/{id}/stream/` - Audio stream URL

## Authentication

The app uses JWT (JSON Web Tokens) for authentication:

1. User logs in or signs up
2. Backend returns `access` and optionally `refresh` tokens
3. Tokens are stored in `localStorage`
4. All API requests include `Authorization: Bearer {token}` header
5. On 401 response, app redirects to login

## Features in Detail

### Music Player
- Play/Pause functionality
- Next/Previous track navigation
- Progress bar with seek ability
- Volume control
- Time display (current / total duration)
- Real-time progress tracking

### Track Display
- Cover image from backend
- Artist name
- Hover effect with play button overlay
- Smooth animations and transitions

### Dashboard
- Multiple track sections
- Responsive horizontal scroll
- Loading states
- Error handling

## Responsive Design

The application is mobile-first and responsive:
- **Mobile** (< 640px): Optimized touch interactions
- **Tablet** (640px - 1024px): Adjusted spacing
- **Desktop** (> 1024px): Full feature experience

## Dark Theme

The entire UI uses a dark, premium theme:
- Background: `#0f0f0f`
- Secondary: `#1a1a1a`
- Tertiary: `#282828`
- Accent: `#1db954` (green, like Spotify)

## Styling

Uses Tailwind CSS with custom configuration:
- Custom dark color palette
- Smooth transitions and animations
- No bright gradients, depth via shadows and overlays
- Clean spacing and typography

## Error Handling

- Network errors display user-friendly messages
- API errors are caught and logged
- Authentication errors trigger logout
- Loading states prevent duplicate requests

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern mobile browsers

## Performance Optimizations

- Lazy loading of images
- Optimized component re-renders
- Efficient state management
- CSS transitions (GPU-accelerated)

## Known Limitations

- Audio playback depends on backend serving correct CORS headers
- Track stream must be in a browser-compatible format (MP3, OGG, etc.)
- Pagination is basic (no infinite scroll yet)

## Future Enhancements

- [ ] Search functionality
- [ ] Playlists creation and management
- [ ] Favorites/Likes system
- [ ] User following system
- [ ] Advanced filtering and sorting
- [ ] Offline mode with service workers
- [ ] PWA capabilities
- [ ] Dark mode toggle (currently dark only)

## Troubleshooting

### Backend not responding
- Ensure backend is running: `python manage.py runserver`
- Check backend port is 8000
- Verify CORS is enabled on backend

### Audio not playing
- Check browser console for errors
- Verify track stream URL is correct
- Check browser audio permissions
- Ensure backend returns proper CORS headers

### Login fails
- Verify backend is running
- Check internet connection
- Ensure credentials are correct
- Check browser localStorage is enabled

## License

Not specified - Cadence Music Streaming App
