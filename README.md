# 🎵 Cadence - Music & Podcast

A full-stack music and podcast streaming application built with **Django REST Framework** backend and **React + Vite** frontend.

> **Status**: 🚀 Production Ready | **Version**: 0.1.0 | **Last Updated**: April 2, 2026

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Documentation](#documentation)
7. [Contributing](#contributing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

**Cadence** is a modern music streaming platform that allows users to discover, stream, and manage music and podcasts with a beautiful dark-themed interface.

### Key Highlights
- ✅ Real-time music streaming
- ✅ JWT authentication with auto-refresh
- ✅ Trending & personalized recommendations
- ✅ Professional dark UI (Spotify-inspired)
- ✅ Fully responsive mobile-first design
- ✅ Play history tracking
- ✅ Admin moderation system

---

## ✨ Features

### User Features
- 🔐 Email-based authentication (signup/login)
- 🎵 Browse trending and recommended tracks
- ▶️ Stream audio with full player controls
- 📊 Track play history
- 🎧 Advanced player (pause, skip, seek, volume)
- 📱 Fully responsive design

### Admin Features
- ✅ Track approval/rejection workflow
- 📊 User and track management
- 🔍 Content moderation
- 📈 Track popularity analytics

### Technical Features
- 🔄 JWT token auto-refresh
- 🎯 Genre-based recommendations
- 📄 Pagination support
- 🚀 Rate limiting & throttling
- 🔒 Permission-based access control

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Django 6.0.2 + Django REST Framework
- **Database**: SQLite (development) / Configurable
- **Auth**: Simple JWT
- **Features**: django-filter, CORS support

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **Router**: React Router 6
- **HTTP Client**: Axios

### Tools & Services
- **Version Control**: Git
- **Code Quality**: ESLint
- **Package Management**: npm, pip

---

## 📂 Project Structure

```
Cadence/
├── backend/                    # Django REST API
│   ├── accounts/              # User authentication
│   ├── music/                 # Tracks, genres, streaming
│   ├── interactions/          # Play history
│   ├── podcasts/              # Podcast management
│   ├── moderation/            # Content moderation
│   ├── config/                # Django settings
│   ├── manage.py
│   ├── requirements.txt
│   └── DOCUMENTATION.md
│
├── frontend/                   # React Vite App
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Full-page components
│   │   ├── services/          # API integration
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Helper functions
│   │   ├── config/            # Configuration
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── README.md
│   ├── QUICKSTART.md
│   └── DEVELOPMENT.md
│
├── activate-backend-venv.bat  # Windows venv activation
├── activate-backend-venv.ps1  # PowerShell venv activation
├── .gitignore
└── README.md                  # This file
```

---

## 🚀 Getting Started

### Prerequisites

**System Requirements**
- **Python 3.9+** - For backend
- **Node.js 16+** - For frontend
- **Git** - For version control

### Quick Start (5 Minutes)

#### 1️⃣ Clone & Setup Backend

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows CMD:
venv\Scripts\activate
# Windows PowerShell:
venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser (optional, for admin)
python manage.py createsuperuser

# Start backend server
python manage.py runserver
# Server: http://127.0.0.1:8000
```

#### 2️⃣ Setup Frontend

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Opens: http://localhost:3000
```

#### 3️⃣ Create Account & Play Music

1. Go to http://localhost:3000
2. Click "Sign Up"
3. Create an account with email + password (min 8 chars)
4. Login and browse music!

---

## 📚 Documentation

### Backend Documentation
See [backend/DOCUMENTATION.md](backend/DOCUMENTATION.md) for:
- Complete API endpoint reference
- Authentication flow
- Data models
- Permissions & roles
- Filtering, search, pagination
- Rate limiting

### Frontend Documentation
See [frontend/README.md](frontend/README.md) for:
- Component architecture
- State management
- API integration
- Styling guide
- Performance tips

### Quick Guides
- **Backend Setup**: `backend/DOCUMENTATION.md`
- **Frontend Quick Start**: `frontend/QUICKSTART.md`
- **Frontend Development**: `frontend/DEVELOPMENT.md`
- **Frontend Build Summary**: `frontend/BUILD_SUMMARY.md`

---

## 🔌 API Overview

### Base URL
```
http://127.0.0.1:8000/api
```

### Authentication Endpoints
```
POST   /token/              # Login
POST   /auth/register/      # Register
POST   /token/refresh/      # Refresh token
GET    /token/verify/       # Verify token
```

### Music Endpoints
```
GET    /music/tracks/               # All approved tracks
GET    /music/tracks/trending/      # Trending tracks (cached)
GET    /music/tracks/popular/       # Most played tracks
GET    /music/tracks/{id}/          # Track detail
GET    /music/tracks/{id}/stream/   # Audio stream (auth required)
GET    /music/recommend/            # Personalized recommendations
GET    /music/recent/               # Recently played (auth required)
GET    /music/genres/               # All genres
GET    /music/podcasts/             # All podcasts
```

### Admin Moderation
```
GET    /music/moderation/pending/                  # Pending tracks
POST   /music/moderation/{id}/approve/             # Approve track
POST   /music/moderation/{id}/reject/              # Reject track
```

See [backend/DOCUMENTATION.md](backend/DOCUMENTATION.md) for detailed API documentation.

---

## 🔐 Authentication

### JWT Flow
1. User signup/login → get `access` & `refresh` tokens
2. Tokens stored in `localStorage`
3. All API requests include `Authorization: Bearer {access_token}`
4. On 401 → auto-refresh using `refresh_token`
5. On permanent 401 → logout user

### User Roles
- **listener** - Can play music, see recommendations (default)
- **artist** - Can upload tracks
- **admin** - Full moderation access

---

## 🎨 Design System

### Dark Theme Palette
```
Primary Background:    #0f0f0f
Secondary Background:  #1a1a1a
Tertiary Background:   #282828
Accent Color:          #1db954 (Green)
Text Primary:          #ffffff
Text Secondary:        #b3b3b3
Text Tertiary:         #787878
```

### Typography
- **Headings**: Bold, large sizes (text-2xl to text-5xl)
- **Body**: Regular weight with proper contrast
- **Labels**: Small, muted gray text

### Components
- **Cards**: Rounded corners, subtle shadows
- **Buttons**: Full-width or icon buttons
- **Inputs**: Dark background with light borders
- **Modals**: Center overlay with blur background

---

## 📦 Dependencies

### Backend (`requirements.txt`)
```
Django==6.0.2
djangorestframework==3.16.1
djangorestframework-simplejwt==5.3.2
django-filter==23.5
django-cors-headers==4.3.0
```

### Frontend (`package.json`)
```
react@18.2.0
react-dom@18.2.0
react-router-dom@6.28.0
axios@1.7.4
tailwindcss@3.4.1
vite@5.0.8
```

---

## 🧪 Testing

### Backend Testing
```bash
cd backend
python manage.py test
```

### Frontend Testing
```bash
cd frontend
npm run lint
```

### Manual Testing
1. Signup with new email
2. Login with credentials
3. Browse trending/recommended tracks
4. Click track → play music
5. Use player controls
6. Check console for errors

---

## 🚀 Deployment

### Backend Deployment
1. Install dependencies: `pip install -r requirements.txt`
2. Set `DEBUG = False` in settings
3. Configure database (PostgreSQL recommended)
4. Set `ALLOWED_HOSTS`
5. Collect static files: `python manage.py collectstatic`
6. Run: `gunicorn config.wsgi:application`

### Frontend Deployment
1. Build: `npm run build`
2. Output in `dist/` folder
3. Deploy to Vercel, Netlify, AWS S3, etc.

See platform-specific guides for detailed instructions.

---

## 🐛 Troubleshooting

### Backend Issues

**Port 8000 already in use**
```bash
# Find process using port
netstat -ano | findstr :8000

# Kill process (Windows)
taskkill /PID <PID> /F

# Or use different port
python manage.py runserver 8001
```

**Database errors**
```bash
# Reset database
python manage.py migrate

# Create fresh migrations
python manage.py makemigrations
python manage.py migrate
```

**CORS errors**
- Check `CORS_ALLOWED_ORIGINS` in `settings.py`
- Ensure frontend URL is included

### Frontend Issues

**Can't connect to backend**
- Verify backend is running: `http://127.0.0.1:8000`
- Check browser console for API errors
- Verify backend CORS settings

**Audio not playing**
- Check audio file format (MP3, OGG, WAV)
- Verify CORS headers on audio responses
- Check browser audio permissions

**Login fails**
- Verify backend is running
- Check email/password are correct
- Clear localStorage and try again

**Styling looks wrong**
```bash
cd frontend
npm install
npm run dev
```

---

## 📋 Environment Variables

### Backend (`.env`)
```
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=127.0.0.1,localhost
DATABASE_URL=sqlite:///db.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (`.env`)
```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

---

## 📞 Support & Resources

### Documentation
- Backend: `backend/DOCUMENTATION.md`
- Frontend: `frontend/README.md`, `frontend/DEVELOPMENT.md`

### Useful Links
- [Django REST Framework Docs](https://www.django-rest-framework.org/)
- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)

### Common Commands

**Backend**
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## 🚀 Next Steps

### Features to Implement
- [ ] Search functionality
- [ ] Playlists management
- [ ] User favorites/likes
- [ ] User profiles & following
- [ ] Social sharing
- [ ] Offline mode (PWA)
- [ ] Analytics dashboard
- [ ] Notifications

### Performance Improvements
- [ ] Add caching layer (Redis)
- [ ] Implement CDN for media
- [ ] Database query optimization
- [ ] Frontend code splitting
- [ ] Image optimization

### Infrastructure
- [ ] Docker containerization
- [ ] CI/CD pipeline setup
- [ ] Automated testing
- [ ] Log aggregation
- [ ] Monitoring & alerts

---

## 📄 License

Not specified - Cadence Music Streaming Application

---

## 👥 Contributors

**Built**: April 2, 2026

---

## 📞 Contact & Questions

For issues, questions, or contributions:
1. Check documentation files
2. Review existing issues
3. Check browser console for errors
4. Verify backend is running properly

---

## 🎯 File Quick Reference

| File/Folder | Purpose |
|------------|---------|
| `backend/` | Django REST API & database |
| `frontend/` | React Vite application |
| `backend/DOCUMENTATION.md` | Complete API documentation |
| `frontend/README.md` | Frontend overview |
| `frontend/QUICKSTART.md` | 3-minute frontend setup |
| `frontend/DEVELOPMENT.md` | Developer guide |
| `.gitignore` | Git ignore patterns |
| `activate-backend-venv.bat` | Windows venv activation |
| `activate-backend-venv.ps1` | PowerShell venv activation |

---

**Welcome to Cadence! 🎵 Start streaming amazing music today.**

For quick setup, see [Getting Started](#getting-started) above.

For detailed documentation, see the backend and frontend README files.

**Happy coding!** 🚀
