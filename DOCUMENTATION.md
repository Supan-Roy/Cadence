# Cadence Music Streaming Platform - Technical Documentation

## Table of Contents
01. [Project Overview](#project-overview)
02. [Architecture](#architecture)
03. [Technology Stack](#technology-stack)
04. [Project Structure](#project-structure)
05. [Implemented Features](#implemented-features)
06. [Database Schema](#database-schema)
07. [API Endpoints](#api-endpoints)
08. [Authentication & Authorization](#authentication--authorization)
09. [Configuration](#configuration)
10. [Future Enhancements](#future-enhancements)

---

## Project Overview

**Cadence** is a modern music streaming platform built with Django REST Framework, designed to provide a comprehensive solution for music distribution, discovery, and interaction. The platform supports multiple user roles, content moderation workflows, and a scalable architecture for future feature expansion.

### Key Objectives
- Enable artists to upload and manage their music tracks
- Provide listeners with a seamless music discovery experience
- Implement robust content moderation and review processes
- Support multiple user roles with appropriate permissions
- Build a scalable foundation for advanced features

---

## Architecture

Cadence follows a modular Django application architecture with clear separation of concerns:

```
Cadence/
├── accounts/          # User management and authentication
├── music/             # Core music content (tracks, genres)
├── playlists/         # User playlists (prepared for implementation)
├── interactions/      # User interactions (prepared for implementation)
├── moderation/        # Content moderation (prepared for implementation)
├── core/              # Core utilities and shared functionality
└── config/            # Project configuration and settings
```

### Design Principles
- **Modularity**: Each app handles a specific domain of functionality
- **RESTful API**: All endpoints follow REST principles
- **JWT Authentication**: Secure token-based authentication
- **UUID Primary Keys**: Enhanced security and scalability
- **Role-Based Access Control**: Different user roles with appropriate permissions

---

## Technology Stack

### Backend Framework
- **Django 6.0.2**: High-level Python web framework
- **Django REST Framework 3.16.1**: Powerful toolkit for building Web APIs

### Authentication
- **djangorestframework-simplejwt 5.5.1**: JWT authentication for Django REST Framework
- **PyJWT 2.11.0**: Python implementation of JSON Web Token

### Database
- **SQLite3**: Development database (configured for easy migration to PostgreSQL)
- **psycopg2-binary 2.9.11**: PostgreSQL adapter (prepared for production)

### Other Dependencies
- **asgiref 3.11.1**: ASGI reference implementation
- **sqlparse 0.5.5**: SQL parsing library
- **tzdata 2025.3**: Timezone data

---

## Project Structure

### Installed Applications

The project consists of six Django applications:

1. **accounts**: User management, authentication, and registration
2. **music**: Core music content including tracks and genres
3. **playlists**: User playlist management (structure prepared)
4. **interactions**: User interactions like likes, follows (structure prepared)
5. **moderation**: Content moderation workflows (structure prepared)
6. **core**: Shared utilities and core functionality (structure prepared)

---

## Implemented Features

### 1. User Management (`accounts` app)

#### Custom User Model
- **UUID-based primary keys** for enhanced security
- **Email-based authentication** (no username required)
- **Role-based system** with three roles:
  - `listener`: Standard user who can listen to music
  - `artist`: User who can upload and manage tracks
  - `admin`: Administrative user with full access
- **Custom UserManager** with `create_user()` and `create_superuser()` methods
- **Timestamps**: `date_joined` and `created_at` fields

#### User Registration
- RESTful registration endpoint
- Password validation (minimum 8 characters)
- Role assignment (admin role cannot be assigned during registration)
- Automatic JWT token generation upon registration
- Returns user data with access and refresh tokens

#### Authentication
- JWT token-based authentication
- Token refresh mechanism
- Access token lifetime: 15 minutes
- Refresh token lifetime: 7 days
- Token rotation and blacklisting enabled

### 2. Music Content Management (`music` app)

#### Genre Model
- **UUID primary key**
- **Unique name field** (max 100 characters)
- Simple categorization system for music tracks

#### Serializers

**TrackUploadSerializer**:
- Used for track creation/upload
- Excludes: `status`, `reviewed_by`, `rejection_reason`, `duration`, `bitrate`, `file_size`, `created_at`, `updated_at`
- Automatically sets `artist` from authenticated user
- Sets `status` to `"pending"` on creation

**TrackListSerializer**:
- Used for listing approved tracks
- Fields: `id`, `title`, `artist_email`, `genre`, `release_date`, `language`, `explicit`, `cover_image`
- Includes artist email for display purposes
- Optimized for list views

**TrackDetailSerializer**:
- Used for track detail views
- Fields: `id`, `title`, `description`, `artist_email`, `genre_name`, `release_date`, `language`, `explicit`, `cover_image`, `duration`, `bitrate`, `file_size`
- Includes full track information and technical metadata
- `genre_name` uses `SerializerMethodField` to handle nullable genre (returns `None` if no genre)

#### Views

**TrackUploadView** (`generics.CreateAPIView`):
- Handles track uploads
- Requires authentication and artist role
- Uses `TrackUploadSerializer`

**ApprovedTrackListView** (`generics.ListAPIView`):
- Lists all approved tracks
- Public access (no authentication required)
- Filters queryset to only approved tracks
- Uses `select_related` for performance optimization
- Uses `TrackListSerializer`

**TrackDetailView** (`generics.RetrieveAPIView`):
- Retrieves single track details
- Public access (no authentication required)
- Filters queryset to only approved tracks
- Uses `select_related` for performance optimization
- Uses `TrackDetailSerializer`

**TrackStreamView** (`APIView`):
- Streams track audio files
- Requires authentication
- Only streams approved tracks
- Returns `FileResponse` with appropriate content type
- Sets `Content-Disposition` header for inline playback

#### Permissions

**IsArtist** (`music.permissions.IsArtist`):
- Custom permission class
- Checks if user is authenticated and has `role="artist"`
- Used to restrict track uploads to artists only

#### Track Model
Comprehensive track model with the following features:

**Basic Information:**
- UUID primary key
- Title (max 255 characters)
- Description (optional text field)
- Release date
- Language
- Explicit content flag

**Relationships:**
- **Artist**: Foreign key to User model (CASCADE delete)
- **Genre**: Foreign key to Genre model (SET_NULL on delete)
- **Reviewed by**: Foreign key to User model for moderation tracking

**Media Files:**
- Audio file upload (`tracks/` directory)
- Cover image upload (`covers/` directory)

**Technical Metadata:**
- Duration (in seconds, nullable)
- Bitrate (nullable)
- File size (nullable)

**Moderation Workflow:**
- **Status field** with three states:
  - `pending`: Track awaiting review
  - `approved`: Track approved for public access
  - `rejected`: Track rejected with reason
- **Rejection reason**: Text field for moderation feedback
- **Review tracking**: Links to the admin user who reviewed the track

**Timestamps:**
- `created_at`: Automatic timestamp on creation
- `updated_at`: Automatic timestamp on update

#### Admin Interface
- Both Genre and Track models registered in Django admin
- Full CRUD operations available through admin panel

---

## Database Schema

### User Model (`accounts.User`)
```
- id: UUID (Primary Key)
- email: EmailField (Unique)
- password: Hashed password
- role: CharField (choices: listener, artist, admin)
- is_active: Boolean
- is_staff: Boolean
- date_joined: DateTime
- created_at: DateTime
```

### Genre Model (`music.Genre`)
```
- id: UUID (Primary Key)
- name: CharField (max_length=100, unique=True)
```

### Track Model (`music.Track`)
```
- id: UUID (Primary Key)
- artist: ForeignKey → User (CASCADE)
- title: CharField (max_length=255)
- description: TextField (blank=True)
- genre: ForeignKey → Genre (SET_NULL, nullable)
- release_date: DateField
- language: CharField (max_length=100)
- explicit: BooleanField (default=False)
- audio_file: FileField (upload_to="tracks/")
- cover_image: ImageField (upload_to="covers/")
- duration: PositiveBigIntegerField (nullable)
- bitrate: PositiveBigIntegerField (nullable)
- file_size: PositiveBigIntegerField (nullable)
- status: CharField (choices: pending, approved, rejected)
- reviewed_by: ForeignKey → User (SET_NULL, nullable)
- rejection_reason: TextField (blank=True)
- created_at: DateTimeField (auto_now_add)
- updated_at: DateTimeField (auto_now)
```

### Relationships
- **User → Track**: One-to-many (artist can have multiple tracks)
- **User → Track**: One-to-many (admin can review multiple tracks)
- **Genre → Track**: One-to-many (genre can have multiple tracks)

---

## API Endpoints

### Authentication Endpoints

#### 1. User Registration
- **URL**: `/api/auth/register/`
- **Method**: `POST`
- **Authentication**: Not required
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123",
    "role": "listener" | "artist"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "listener"
    },
    "access": "jwt_access_token",
    "refresh": "jwt_refresh_token"
  }
  ```
- **Validation**:
  - Email must be unique
  - Password minimum 8 characters
  - Role cannot be "admin" (admin role assigned manually)

#### 2. Token Obtain Pair
- **URL**: `/api/token/`
- **Method**: `POST`
- **Authentication**: Not required
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "access": "jwt_access_token",
    "refresh": "jwt_refresh_token"
  }
  ```

#### 3. Token Refresh
- **URL**: `/api/token/refresh/`
- **Method**: `POST`
- **Authentication**: Not required (uses refresh token)
- **Request Body**:
  ```json
  {
    "refresh": "jwt_refresh_token"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "access": "new_jwt_access_token"
  }
  ```

### Music Endpoints

#### 1. Track Upload
- **URL**: `/api/music/upload/`
- **Method**: `POST`
- **Authentication**: Required (JWT Token)
- **Permissions**: `IsAuthenticated`, `IsArtist` (user must have artist role)
- **Request Body** (multipart/form-data):
  ```json
  {
    "title": "Track Title",
    "description": "Track description (optional)",
    "genre": "genre-uuid",
    "release_date": "2026-02-08",
    "language": "English",
    "explicit": false,
    "audio_file": "<file>",
    "cover_image": "<file>"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "id": "track-uuid",
    "title": "Track Title",
    "description": "Track description",
    "artist": "artist-uuid",
    "genre": "genre-uuid",
    "release_date": "2026-02-08",
    "language": "English",
    "explicit": false,
    "audio_file": "/media/tracks/audio.mp3",
    "cover_image": "/media/covers/cover.jpg"
  }
  ```
- **Notes**:
  - Automatically sets `artist` to the authenticated user
  - Sets `status` to `"pending"` (requires admin approval)
  - Excludes technical metadata (duration, bitrate, file_size) from input

#### 2. List Approved Tracks
- **URL**: `/api/music/tracks/`
- **Method**: `GET`
- **Authentication**: Not required
- **Permissions**: `AllowAny`
- **Response** (200 OK):
  ```json
  [
    {
      "id": "track-uuid",
      "title": "Track Title",
      "artist_email": "artist@example.com",
      "genre": "genre-uuid",
      "release_date": "2026-02-08",
      "language": "English",
      "explicit": false,
      "cover_image": "/media/covers/cover.jpg"
    }
  ]
  ```
- **Notes**:
  - Only returns tracks with `status="approved"`
  - Uses `select_related` for optimized database queries
  - Returns simplified track information

#### 3. Track Detail
- **URL**: `/api/music/tracks/<uuid:pk>/`
- **Method**: `GET`
- **Authentication**: Not required
- **Permissions**: `AllowAny`
- **Response** (200 OK):
  ```json
  {
    "id": "track-uuid",
    "title": "Track Title",
    "description": "Track description",
    "artist_email": "artist@example.com",
    "genre_name": "Rock",
    "release_date": "2026-02-08",
    "language": "English",
    "explicit": false,
    "cover_image": "/media/covers/cover.jpg",
    "duration": 180,
    "bitrate": 320,
    "file_size": 7200000
  }
  ```
- **Notes**:
  - Only returns tracks with `status="approved"`
  - Includes full track details and technical metadata
  - `genre_name` returns `null` if track has no genre
  - Uses `select_related` for optimized database queries

#### 4. Track Stream
- **URL**: `/api/music/tracks/<uuid:pk>/stream/`
- **Method**: `GET`
- **Authentication**: Required (JWT Token)
- **Permissions**: `IsAuthenticated`
- **Response**: Audio file stream (audio/mpeg)
- **Headers**:
  - `Content-Type: audio/mpeg`
  - `Content-Disposition: inline; filename="Track Title.mp3"`
- **Notes**:
  - Only streams approved tracks
  - Returns 404 if track not found or not approved
  - Requires authentication to prevent unauthorized access

### Admin Endpoints
- **URL**: `/admin/`
- **Method**: GET, POST
- **Authentication**: Django admin authentication
- **Features**: Full CRUD operations for all registered models

---

## Authentication & Authorization

### JWT Token Configuration

**Access Token:**
- Lifetime: 15 minutes
- Used for: API request authentication
- Header format: `Authorization: Bearer <access_token>`

**Refresh Token:**
- Lifetime: 7 days
- Used for: Obtaining new access tokens
- Rotation: Enabled (new refresh token issued on refresh)
- Blacklisting: Enabled (old tokens blacklisted after rotation)

### User Roles

1. **Listener**
   - Default role for new registrations
   - Can listen to approved tracks
   - Cannot upload tracks

2. **Artist**
   - Can upload tracks
   - Can manage own tracks
   - Tracks require moderation before public access

3. **Admin**
   - Full system access
   - Can review and moderate tracks
   - Can manage users and content
   - Cannot be assigned during registration

### Authentication Flow

1. **Registration**: User registers → Receives access + refresh tokens
2. **Login**: User provides credentials → Receives access + refresh tokens
3. **API Requests**: Include access token in Authorization header
4. **Token Refresh**: Use refresh token to obtain new access token
5. **Token Rotation**: Old refresh token blacklisted, new one issued

### Using the Browsable API

Django REST Framework's browsable API includes an "Authorize" button for easy authentication:

1. **Get JWT Token**: First, obtain a token from `/api/token/` endpoint
2. **Click Authorize**: In the browsable API, click the "Authorize" button (top right)
3. **Enter Token**: Enter your token in one of these formats:
   - `Bearer <your-token-here>` (recommended)
   - Or just `<your-token-here>`
4. **Authenticated Requests**: All subsequent requests will include the token automatically

**Note**: Session Authentication is enabled alongside JWT to support the browsable API's Authorize button functionality.

---

## Configuration

### Settings Overview

**Database**: SQLite3 (development)
- Easy to migrate to PostgreSQL for production
- Database adapter already included in requirements

**Media Files**:
- `MEDIA_URL`: `/media/`
- `MEDIA_ROOT`: `BASE_DIR / "media"`
- Upload directories:
  - Audio files: `media/tracks/`
  - Cover images: `media/covers/`

**REST Framework Configuration**:
- Default authentication: 
  - JWT Authentication (`rest_framework_simplejwt.authentication.JWTAuthentication`)
  - Session Authentication (`rest_framework.authentication.SessionAuthentication`)
- Default permissions: `AllowAny` (individual views override as needed)
- Session authentication enables "Authorize" button in DRF browsable API

**Security Settings**:
- `DEBUG`: True (development mode)
- `SECRET_KEY`: Configured (should be changed in production)
- `ALLOWED_HOSTS`: Empty (configure for production)

### URL Configuration

**Root URLs** (`config/urls.py`):
- `/admin/` → Django admin interface
- `/api/token/` → JWT token obtain endpoint
- `/api/token/refresh/` → JWT token refresh endpoint
- `/api/auth/` → Includes accounts app URLs
- `/media/` → Media file serving (development)

**Accounts URLs** (`accounts/urls.py`):
- `/api/auth/register/` → User registration

**Music URLs** (`music/urls.py`):
- `/api/music/upload/` → Track upload (POST)
- `/api/music/tracks/` → List approved tracks (GET)
- `/api/music/tracks/<uuid:pk>/` → Track detail (GET)
- `/api/music/tracks/<uuid:pk>/stream/` → Stream track audio (GET)

---

## Future Enhancements

The following application structures have been created and are ready for implementation:

### 1. Playlists App (`playlists/`)
**Planned Features:**
- User-created playlists
- Public and private playlists
- Collaborative playlists
- Playlist sharing functionality
- Playlist recommendations

### 2. Interactions App (`interactions/`)
**Planned Features:**
- Track likes/favorites
- User follows/followers
- Comments on tracks
- Sharing functionality
- Play history tracking

### 3. Moderation App (`moderation/`)
**Planned Features:**
- Advanced moderation workflows
- Automated content filtering
- Reporting system
- Moderation queue management
- Moderation analytics

### 4. Core App (`core/`)
**Planned Features:**
- Shared utilities and helpers
- Common serializers and views
- API response formatting
- Error handling middleware
- Logging configuration

### Additional Planned Features

**Music App Enhancements:**
- Track search and filtering
- Advanced genre management
- Album/EP support
- Artist profiles
- Track analytics (plays, likes, etc.)

**API Enhancements:**
- Pagination for list endpoints
- Filtering and sorting
- Rate limiting
- API versioning
- Comprehensive API documentation (Swagger/OpenAPI)

**Infrastructure:**
- PostgreSQL database migration
- Redis for caching
- Celery for background tasks
- CDN integration for media files
- Docker containerization
- CI/CD pipeline

---

## Development Notes

### Current Status
- ✅ User authentication and registration system
- ✅ Custom user model with role-based access
- ✅ Music track and genre models
- ✅ Content moderation workflow (model level)
- ✅ JWT authentication integration
- ✅ Session authentication for browsable API
- ✅ Django admin interface configuration
- ✅ Media file handling setup
- ✅ Track upload API endpoint (artist-only)
- ✅ Track listing API endpoint (approved tracks only)
- ✅ Track detail API endpoint (approved tracks only)
- ✅ Track streaming API endpoint (authenticated users)
- ✅ Custom permissions (IsArtist)
- ✅ Serializers for track operations
- ✅ Optimized database queries with select_related
- ⏳ Playlist functionality (structure prepared)
- ⏳ User interactions (structure prepared)
- ⏳ Advanced moderation features (structure prepared)

### Migration Status
- Initial migrations created for `accounts` and `music` apps
- Database schema ready for development

### Next Steps
1. ✅ ~~Implement music API endpoints (CRUD operations)~~ - Completed
2. ✅ ~~Add track upload and file processing~~ - Completed
3. Implement moderation review endpoints (approve/reject tracks)
4. Add track update and delete endpoints for artists
5. Build playlist functionality
6. Add user interaction features
7. Add unit and integration tests
8. Implement audio file metadata extraction (duration, bitrate, file_size)
9. Add pagination to list endpoints
10. Add filtering and search capabilities

---

## Conclusion

Cadence has established a solid foundation with a well-structured authentication system, comprehensive music content models, and a clear architecture for future expansion. The platform is designed with scalability, security, and maintainability in mind, ready for iterative feature development and enhancement.

---

**Document Version**: 1.1  
**Last Updated**: February 8, 2026  
**Project Status**: Active Development

---

## Changelog

### Version 1.1 (February 8, 2026)
- ✅ Added Track Upload API endpoint (`/api/music/upload/`)
- ✅ Added Approved Tracks List API endpoint (`/api/music/tracks/`)
- ✅ Added Track Detail API endpoint (`/api/music/tracks/<uuid:pk>/`)
- ✅ Added Track Stream API endpoint (`/api/music/tracks/<uuid:pk>/stream/`)
- ✅ Implemented custom `IsArtist` permission class
- ✅ Created serializers: `TrackUploadSerializer`, `TrackListSerializer`, `TrackDetailSerializer`
- ✅ Added Session Authentication for DRF browsable API support
- ✅ Optimized database queries with `select_related`
- ✅ Fixed nullable genre handling in `TrackDetailSerializer`
- ✅ Updated URL routing for music endpoints

### Version 1.0 (February 7, 2026)
- Initial documentation
- User authentication and registration system
- Custom user model with role-based access
- Music track and genre models
- Content moderation workflow (model level)
