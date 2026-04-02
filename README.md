# 🎵 Cadence - Music & Podcast Streaming Platform
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)]()
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)]()
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)]()
[![Django](https://img.shields.io/badge/Django-6.0.2-darkgreen.svg)]()
[![React](https://img.shields.io/badge/React-18-blue.svg)]()
[![Status](https://img.shields.io/badge/Status-Under%20Development-orange.svg)]()

A modern, full-stack music and podcast streaming application. Stream unlimited music tracks and podcasts with a beautiful dark-themed interface. Built with **Django REST Framework** backend and **React + Vite** frontend.

> **Version**: 1.0.0 | **Last Updated**: April 2, 2026 | **Status**: Under Development

---

## 🎯 Overview

**Cadence** is a comprehensive music and podcast streaming platform that lets users discover, stream, and manage their audio content with a professional dark-themed interface. Designed for both casual listeners and content creators.

### Platform Capabilities
- Stream millions of music tracks across all genres
- Access thousands of podcasts from creators worldwide
- Personalized recommendations based on listening habits
- Full playback control with advanced player features
- Play history tracking and listening statistics
- Admin content moderation system
- JWT-based authentication with secure token management
- Fully responsive mobile-first design

---

## ✨ Features

### For Listeners
- 🎵 Browse and stream music tracks from various genres
- 🎙️ Discover and listen to podcasts
- 🔐 Email-based signup and login
- ⭐ View trending and recommended content
- 📊 Track listening history and statistics
- ▶️ Advanced player controls (play, pause, skip, seek, volume)
- 📱 Fully responsive interface (desktop, tablet, mobile)
- 🎨 Beautiful dark theme with intuitive navigation

### For Artists/Creators
- 📤 Upload music tracks with metadata
- 📢 Upload podcast episodes
- 📈 Track upload status and moderation feedback
- 👥 Audience insights and play statistics

### For Administrators
- ✅ Approve/reject uploaded tracks and podcasts
- 🔍 Content moderation and quality control
- 📊 User and content management
- 📈 Analytics and popularity metrics
- 🔒 Permissions-based access control

### Technical Features
- 🔄 JWT token auto-refresh mechanism
- 🎯 Smart recommendation algorithm
- 📄 Pagination and filtering support
- 🚀 Rate limiting and throttling
- 🔒 Role-based permission system
- 📡 RESTful API architecture
- 🌐 CORS support for cross-origin requests
- 💾 Play history and metadata caching

---

## 🛠️ Tech Stack

### Backend
- **Django 6.0.2** - Web framework
- **Django REST Framework 3.16.1** - API development
- **Simple JWT 5.5.1** - JSON Web Token authentication
- **django-cors-headers 4.3.0** - CORS support
- **django-filter 25.2** - Advanced filtering
- **SQLite** - Development database (PostgreSQL for production)

### Frontend
- **React 18** - UI library
- **Vite 5** - Build tool and dev server
- **Tailwind CSS 3** - Utility-first styling
- **React Router 6** - Client-side routing
- **Axios** - HTTP client with interceptors

### Infrastructure
- **Python 3.9+** - Backend runtime
- **Node.js 16+** - Frontend runtime
- **Git** - Version control

---

## 📂 Project Structure

```
Cadence/
├── backend/
│   ├── accounts/              # User authentication & profiles
│   ├── music/                 # Music tracks, genres, streaming
│   ├── podcasts/              # Podcast content management
│   ├── interactions/          # Play history & engagement
│   ├── moderation/            # Content review & approval
│   ├── config/                # Django project settings
│   ├── manage.py
│   ├── requirements.txt
│   ├── db.sqlite3
│   ├── DOCUMENTATION.md       # API Documentation
│   └── media/                 # Uploaded music and podcast files
│       ├── tracks/
│       └── covers/
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── PlayerBar.jsx
│   │   │   ├── TrackCard.jsx
│   │   │   └── ...
│   │   ├── pages/             # Page-level components
│   │   │   ├── Login.jsx
│   │   │   ├── Home.jsx
│   │   │   └── ...
│   │   ├── services/          # API integration
│   │   │   └── api.js
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Helper functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   │   ├── logo.svg
│   │   └── favicon.svg
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── README.md
│   └── BUILD_SUMMARY.md
│
├── .gitignore
└── README.md                  # This file
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:
- **Python 3.9+** installed on your system
- **Node.js 16+** and npm installed
- **Git** for version control
- **Visual Studio Code** or any text editor (optional)

### Backend Setup (Django + REST API)

#### Step 1: Navigate to backend directory
```bash
cd backend
```

#### Step 2: Create and activate virtual environment

**Windows (Command Prompt):**
```bash
python -m venv .venv
.venv\Scripts\activate
```

**Windows (PowerShell):**
```bash
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

#### Step 3: Install dependencies
```bash
pip install -r requirements.txt
```

#### Step 4: Run database migrations
```bash
python manage.py migrate
```

#### Step 5: Create a superuser (optional, for admin access)
```bash
python manage.py createsuperuser
```

#### Step 6: Start the backend server
```bash
python manage.py runserver
```

Backend will be available at: **http://127.0.0.1:8000**

### Frontend Setup (React + Vite)

#### Step 1: Navigate to frontend directory
```bash
cd frontend
```

#### Step 2: Install dependencies
```bash
npm install
```

#### Step 3: Start development server
```bash
npm run dev
```

Frontend will open at: **http://localhost:3000** or **http://localhost:5173**

### First Time Usage

1. Open your browser to the frontend URL
2. Click **"Sign Up"** button
3. Enter your email and password (minimum 8 characters)
4. Click **"Create Account"**
5. Login with your credentials
6. Browse music and podcasts
7. Click on any track or podcast to play it
8. Use the player controls to manage playback

---

## 🔌 API Reference

### Base URL
```
http://127.0.0.1:8000/api
```

### Authentication Endpoints
```
POST   /token/              Login (get access & refresh tokens)
POST   /auth/register/      Register new user
POST   /token/refresh/      Refresh expired access token
GET    /token/verify/       Verify token validity
```

### Music Endpoints
```
GET    /music/tracks/               List all approved music tracks
GET    /music/tracks/trending/      Get trending tracks (cached, 24h)
GET    /music/tracks/popular/       Get most-played tracks
GET    /music/tracks/<id>/          Get track details
GET    /music/tracks/<id>/stream/   Stream track audio (supports seeking)
POST   /music/upload/               Upload new track (requires auth)
GET    /music/recommend/            Get personalized recommendations
GET    /music/recent/               Get user's recently played tracks
GET    /music/genres/               List all music genres
```

### Podcast Endpoints
```
GET    /music/podcasts/             List all approved podcasts
GET    /music/podcasts/<id>/        Get podcast details
GET    /music/podcasts/<id>/stream/ Stream podcast audio
POST   /music/podcasts/upload/      Upload new podcast episode
```

### Moderation Endpoints (Admin Only)
```
GET    /music/moderation/pending/                View pending content
POST   /music/moderation/<id>/approve/           Approve track/podcast
POST   /music/moderation/<id>/reject/            Reject track/podcast
```

---

## 🔐 Authentication

### JWT Flow
1. User registers with email and password
2. System returns `access_token` and `refresh_token`
3. Tokens stored in browser's `localStorage`
4. All API requests automatically include `Authorization: Bearer {access_token}`
5. When access token expires:
   - Frontend automatically requests new token using `refresh_token`
   - User session continues without interruption
   - If refresh fails, user is logged out

### User Roles
- **listener** - Can stream content, view recommendations (default role)
- **artist** - Can upload music and podcasts, upload limited to 10 items/day
- **admin** - Full access to moderation, user management, analytics

---

## 🎨 Design & Theme

### Color Palette
```
Primary Background:     #0f0f0f     (Almost black)
Secondary Background:   #1a1a1a     (Dark gray)
Tertiary Background:    #282828     (Medium dark gray)
Accent Color:           #ff2020     (Red - Cadence branded)
Text Primary:           #ffffff     (White)
Text Secondary:         #b3b3b3     (Light gray)
Text Muted:             #787878     (Medium gray)
```

### Design Features
- Dark theme optimized for long listening sessions
- High contrast for readability
- Smooth animations and transitions
- Responsive grid layouts
- Touch-friendly controls for mobile

---

## 📦 Environment Configuration

### Backend Environment Variables (`.env`)
```
DEBUG=True
SECRET_KEY=your-django-secret-key
ALLOWED_HOSTS=127.0.0.1,localhost
DATABASE_URL=sqlite:///db.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
MEDIA_ROOT=./media
```

### Frontend Environment Variables (`.env.local`)
```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

---

## 🚀 Deployment Guide

### Backend Deployment
1. Install dependencies: `pip install -r requirements.txt`
2. Configure production database (PostgreSQL recommended)
3. Set `DEBUG = False` in `settings.py`
4. Update `ALLOWED_HOSTS` with your domain
5. Collect static files: `python manage.py collectstatic`
6. Run with production WSGI server: `gunicorn config.wsgi:application`
7. Use Docker, Heroku, AWS EC2, or your preferred platform

### Frontend Deployment
1. Build production bundle: `npm run build`
2. Output files in `dist/` directory
3. Deploy to:
   - Vercel (recommended for Vite apps)
   - Netlify
   - AWS S3 + CloudFront
   - GitHub Pages
   - Any static hosting service

---

## 🐛 Troubleshooting

### Common Backend Issues

**Backend won't start / Port 8000 in use**
```bash
# Windows: Find and kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use different port
python manage.py runserver 8001
```

**Database errors**
```bash
# Reset migrations
python manage.py migrate accounts zero
python manage.py migrate

# Or start fresh
rm db.sqlite3
python manage.py migrate
```

**CORS errors in console**
- Verify frontend URL is in `CORS_ALLOWED_ORIGINS` in `settings.py`
- Restart backend server after changes

**Can't upload files**
- Ensure `media/` directory exists in backend folder
- Check file permissions on `media/` folder
- Verify file size under limit

### Common Frontend Issues

**Backend connection errors**
- Verify backend is running: `http://127.0.0.1:8000`
- Check browser console for specific error messages
- Verify CORS settings on backend

**Audio not playing**
- Verify audio file format (MP3, WAV, OGG supported)
- Check browser's developer console for errors
- Ensure file is successfully uploaded to server
- Try different browser if issue persists

**Login fails**
- Ensure backend server is running
- Verify email and password
- Clear browser `localStorage`: `localStorage.clear()` in console
- Check backend logs for authentication errors

**Styling broken or misaligned**
```bash
# Reinstall and rebuild
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Seek bar in player not working**
- Verify backend audio streaming endpoint is accessible
- Check Range request support in HTTP response headers
- Try different audio file format

---

## 📖 Additional Resources

### Documentation Files
- [Backend API Documentation](backend/DOCUMENTATION.md)
- [Frontend Development Guide](frontend/README.md)
- [Build Summary](frontend/BUILD_SUMMARY.md)

### External Resources
- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [JWT Introduction](https://jwt.io)

---

## 🔄 Development Workflow

### Running in Development

**Terminal 1 - Backend:**
```bash
cd backend
.venv\Scripts\activate
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Making Changes

1. **Backend**: Changes auto-reload with Django's development server
2. **Frontend**: Vite automatically hot-reloads on file save
3. Test changes in browser
4. Run linter if needed: `cd frontend && npm run lint`

### Debugging

**Backend debugging**
- Use Django shell: `python manage.py shell`
- Check server logs in terminal
- Use print statements or breakpoints

**Frontend debugging**
- Use browser DevTools (F12)
- Check Console tab for JavaScript errors
- Use Network tab to inspect API calls
- React DevTools browser extension helpful

---

## 📊 Project Statistics

- **Backend**: ~2,000 lines of Python code
- **Frontend**: ~3,000 lines of JavaScript/React code
- **Components**: 15+ reusable React components
- **API Endpoints**: 20+ RESTful endpoints
- **Supported Audio Formats**: MP3, WAV, OGG, M4A
- **Database Tables**: 10+ models

---

## 🎓 Development Notes

### Important Considerations

1. **Audio Streaming**: Uses HTTP Range requests for efficient seeking
2. **Authentication**: JWT tokens expire after 15 minutes (configurable)
3. **Refresh Tokens**: Expire after 7 days, rotated on use
4. **Play History**: Automatically tracked for authenticated users
5. **Caching**: Trending and popular tracks cached for 24 hours

### Code Quality Standards

- PEP 8 compliant Python code
- ES6+ JavaScript with React best practices
- Responsive design with mobile-first approach
- Accessibility considerations throughout
- CORS and security headers configured

---

## 🤝 Contributing

When contributing to Cadence:

1. Create a feature branch: `git checkout -b feature/feature-name`
2. Make your changes with clear commit messages
3. Test thoroughly before submitting
4. Follow existing code style and conventions
5. Update documentation as needed
6. Submit pull request with description

---

## 📝 License

Cadence Music & Podcast Streaming Platform

---

## 👨‍💻 Developer

**Supan Roy**
