# Cadence Backend Documentation

## Overview
Cadence is a Django REST Framework backend for a music and podcast streaming platform.

Current backend capabilities include:
- Custom user system with role-based access
- JWT authentication and token refresh
- Track upload and moderation workflow
- Music and podcast listing/discovery APIs
- Authenticated audio streaming with byte-range support
- Track popularity/trending/recommendation endpoints
- Play history tracking

## Tech Stack
- Django 6.0.2
- Django REST Framework 3.16.1
- Simple JWT
- django-filter
- SQLite (current default database)

## Project Apps
- `accounts`: custom user model, registration endpoint
- `music`: genres, tracks, permissions, filters, serializers, APIs
- `interactions`: play history model
- `podcasts`: proxy model/admin for podcast-specific management
- `playlists`: scaffold only (no implemented models/endpoints)
- `moderation`: scaffold only (moderation logic currently in `music` app)
- `core`: scaffold only

## Authentication and Authorization

### Auth mechanism
- JWT is enabled via Simple JWT.
- Auth endpoints:
  - `POST /api/token/`
  - `POST /api/token/refresh/`
  - `POST /api/auth/register/`

### User roles
User roles are defined in `accounts.User`:
- `listener`
- `artist`
- `admin`

### Permission behavior
- Upload endpoint requires authenticated artist/admin (`IsArtist`).
- Moderation endpoints require authenticated admin (`IsAppAdmin`).
- Streaming endpoint requires authenticated user.
- Public read endpoints (catalog/discovery) are explicitly `AllowAny`.

## Data Models

### accounts.User
- UUID primary key
- Email as login identity (`USERNAME_FIELD = "email"`)
- Role field (`listener`, `artist`, `admin`)
- Standard auth flags (`is_active`, `is_staff`)
- Timestamps: `date_joined`, `created_at`

### music.Genre
- UUID primary key
- `name` (unique)
- `category` choices:
  - `music`
  - `podcast`

### music.Track
- UUID primary key
- Relations:
  - `artist -> accounts.User`
  - `genre -> music.Genre` (nullable)
  - `reviewed_by -> accounts.User` (nullable)
- Content fields:
  - `title`, `description`, `release_date`, `language`
  - `is_podcast`, `explicit`
- File fields:
  - `audio_file`
  - `cover_image`
- Technical metadata:
  - `duration`, `bitrate`, `file_size`
- Moderation fields:
  - `status` (`pending`, `approved`, `rejected`)
  - `rejection_reason`
- Timestamps:
  - `created_at`, `updated_at`

### interactions.PlayHistory
- UUID primary key
- `user -> accounts.User`
- `track -> music.Track`
- `played_at`

### podcasts.PodcastTrack
- Proxy model over `music.Track`
- Used for podcast-specific admin behavior

## API Endpoints

Base API prefixes:
- `/api/auth/`
- `/api/music/`

### Accounts
- `POST /api/auth/register/`
  - Registers new user (`role` cannot be `admin` via registration serializer)
  - Returns user payload plus access/refresh tokens

### Music and Podcasts
- `POST /api/music/upload/`
  - Auth required
  - Permission: artist/admin
  - Creates track as `pending`; artist set from authenticated user

- `GET /api/music/genres/`
  - Public
  - Optional query param: `is_podcast=true|1|yes` to filter podcast genres

- `GET /api/music/tracks/`
  - Public
  - Lists approved music tracks (`is_podcast=False`)
  - Supports filtering/search/ordering

- `GET /api/music/tracks/popular/`
  - Public
  - Lists approved tracks ordered by total play count
  - Cached

- `GET /api/music/tracks/trending/`
  - Public
  - Lists approved tracks ordered by plays in last 7 days
  - Cached

- `GET /api/music/tracks/{track_uuid}/`
  - Public
  - Approved track detail

- `GET /api/music/tracks/{track_uuid}/stream/`
  - Auth required
  - Streams approved track audio
  - Supports Range requests (`206 Partial Content`)
  - Uses custom stream throttle scope (`stream`)
  - Logs play history per request

- `GET /api/music/recent/`
  - Auth required
  - User-specific recently played tracks

- `GET /api/music/recommend/`
  - Auth required
  - Recommends approved tracks from user top listened genres
  - Excludes tracks already played by user

- `GET /api/music/podcasts/`
  - Public
  - Lists approved podcast tracks (`is_podcast=True`)
  - Supports filtering/search/ordering

### Moderation (inside music app)
- `GET /api/music/moderation/pending/`
  - Auth required
  - Permission: admin only
  - Lists pending tracks

- `POST /api/music/moderation/{track_uuid}/approve/`
  - Auth required
  - Permission: admin only
  - Sets status to `approved`, sets `reviewed_by`

- `POST /api/music/moderation/{track_uuid}/reject/`
  - Auth required
  - Permission: admin only
  - Requires `reason`, sets status to `rejected`, sets `reviewed_by`

## Filtering, Search, Ordering, Pagination

### Filtering
`music.filters.TrackFilter` currently supports:
- `genre` (exact match by genre name, case-insensitive)
- `language` (case-insensitive)
- `explicit` (boolean)

### Search and ordering
For track and podcast listing endpoints:
- Search fields: `title`, `description`
- Ordering fields: `release_date`
- Default ordering: newest first (`-release_date`)

### Pagination
Global DRF pagination:
- `PageNumberPagination`
- `PAGE_SIZE = 10`

## Throttling
Global DRF throttling is enabled:
- `UserRateThrottle`: `100/minute`
- `AnonRateThrottle`: `20/minute`

Custom stream throttle in `music.throttles.StreamThrottle`:
- Scope: `stream`
- Rate: `30/minute`

## Caching
Default cache backend: local memory (`LocMemCache`).

Cache keys used:
- `popular_tracks`
- `trending_tracks`

Cache behavior:
- Popular and trending querysets are cached for 60 seconds.
- Caches are invalidated when:
  - A stream play is recorded
  - A track is approved
  - A track is rejected

## Admin Configuration
- `music.Track` admin is scoped to `is_podcast=False`
- `podcasts.PodcastTrack` proxy admin is scoped to `is_podcast=True`
- Genre selection is restricted by category in each admin context

## Migrations Summary
Music app migrations include:
- Initial Genre + Track schema
- `Track.is_podcast` field
- Genre `category` field
- Podcast genre seed data

Podcasts app migration includes:
- Proxy model migration for `PodcastTrack`

## Testing Status
Current test coverage is concentrated in `music/tests.py`:
- Role permission checks (`IsArtist`, `IsAppAdmin`)
- Genre filtering behavior
- Upload serializer validation for genre/category mismatch

Other apps currently contain scaffold test files without implemented test cases.

## Development Setup
From repository root:

```powershell
cd backend
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py runserver
```

Run tests:

```powershell
cd backend
.venv\Scripts\python.exe manage.py test
```

## Notes on Current Backend State
- Backend is feature-complete for core auth + content upload + moderation + streaming APIs.
- Some apps are scaffolds (`core`, `moderation`, `playlists`) and have minimal implementation.
- Current settings are development-oriented (for example, SQLite and debug-friendly defaults).
