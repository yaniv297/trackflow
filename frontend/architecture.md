# TrackFlow Frontend Architecture - GROUND TRUTH DOCUMENTATION

## System Boundaries & Domain Definition

**TrackFlow IS:**

- A workflow tracker for Rock Band music authors
- A social platform for collaboration, achievements, and discovery
- A metadata viewer for songs (title, artist, album, external links)
- A DLC duplicate checker (read-only UI interface)
- An album series and pack management system

**TrackFlow is NOT:**

- A file uploader or cloud storage system
- An audio/music player application
- A MIDI/chart editor or viewer
- A DAW-like audio editing tool
- A real-time WebSocket application (currently)

## Project Overview

TrackFlow frontend is a React-based single-page application built for Rock Band music workflow management and community collaboration. The system emphasizes component composition, custom hooks, and maintainable architecture without over-engineering.

**CRITICAL API REQUIREMENT: The frontend MUST connect to backend on port 8001, NEVER on 8000.**

## Technical Stack

### Core Framework

- **React 19.1.0**: Modern React with hooks-based architecture
- **React Router DOM 7.6.3**: Client-side routing with protected routes
- **Create React App 5.0.1**: Build toolchain (no custom webpack configuration)
- **JavaScript ES6+**: Modern JavaScript without TypeScript

### Testing & Quality

- **React Testing Library 16.3.0**: Component testing
- **Jest**: Unit testing framework
- **ESLint**: Code linting with React rules
- **Web Vitals**: Performance monitoring

### Deployment

- **Railway**: Docker-based deployment with Express.js static serving
- **Environment Configuration**: Multi-environment API URL handling
- **HTTPS Enforcement**: Production security requirements

## Current Folder Structure (ACTUAL)

```
frontend/src/
├── components/               # UI Components
│   ├── albumSeries/         # Album series (SeriesCard, SongList, StatusLegend)
│   ├── community/           # Community features (7 components)
│   ├── features/            # Feature-specific components
│   │   ├── achievements/    # AchievementBadge only
│   │   ├── collaboration/   # 6 collaboration components
│   │   ├── comments/        # CommentItem, CommentSection
│   │   ├── dlc/            # DLC checking UI (2 components)
│   │   └── workflows/       # Workflow UI (3 components)
│   ├── forms/               # Form components (5 + pack subfolder)
│   ├── home/                # Homepage components (14 components)
│   ├── modals/              # Modal dialogs (13 components, includes PackRandomizerModal, ReleaseModal)
│   ├── music/               # Song filtering (2 components, NO player)
│   ├── navigation/          # Navigation system (6 + dropdowns)
│   ├── notifications/       # Toast notifications (5 components)
│   ├── pages/               # Page-level components + WipSongCard
│   ├── profile/             # ProfileSongsTable only
│   ├── shared/              # Cross-feature components (8 components)
│   ├── stats/               # Statistics display (4 components)
│   ├── tables/              # Data tables (3 components)
│   ├── ui/                  # UI primitives (11 components)
│   └── widgets/             # RandomResourceWidget only
├── contexts/                # React contexts
│   └── AuthContext.js       # ONLY context (no Theme/Toast contexts)
├── hooks/                   # Custom React hooks (47 hooks total)
│   ├── albumSeries/         # 3 hooks
│   ├── app/                 # 5 hooks (achievements, dropdowns, etc.)
│   ├── collaborations/      # 3 hooks
│   ├── forms/               # 2 hooks
│   ├── songs/               # 8 hooks (includes pack randomizer)
│   ├── stats/               # 2 hooks
│   ├── ui/                  # 4 hooks
│   ├── wip/                 # 12 hooks (extensive WIP functionality)
│   └── workflows/           # 4 hooks
├── pages/                   # Route-level pages (18 pages)
├── routes/                  # React Router configuration
├── services/                # API service layer (3 services)
├── utils/                   # Utilities and helpers (8 utilities)
└── data/                    # Static data (resources.js)
```

## Architecture Patterns

### 1. Custom Hooks Pattern

The application heavily uses custom hooks for:

- **Data Fetching**: API calls with caching and loading states
- **UI State Management**: Modal visibility, dropdown states
- **Business Logic**: Song operations, collaboration workflows
- **Cross-Component Communication**: Shared state management

**Key Hook Categories:**

- `hooks/wip/` - 12 hooks for work-in-progress functionality
- `hooks/songs/` - 8 hooks for song management (includes usePackRandomizer)
- `hooks/app/` - 5 hooks for application-level state

### 2. Component Composition

- **Feature-Based Organization**: Components grouped by business domain
- **Modal System**: Unified modal architecture (12 different modals)
- **Form Components**: Specialized forms with validation
- **Table Components**: Sortable, filterable data displays

### 3. State Management

#### Global State (ACTUAL)

- **AuthContext**: ONLY global context - handles authentication, JWT tokens, user state
- **NO Theme Context**: Despite architecture claims, no theming system exists
- **NO Notification Context**: Notifications use local component state

#### Local State

- **Component useState**: UI-specific state management
- **Custom Hooks**: Business logic state encapsulation
- **NotificationManager**: Local state for toast notifications (not global context)

## API Integration

### Configuration

```javascript
// config.js - Multi-environment API URL resolution
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL; // Force HTTPS in production
  }
  if (window.location.hostname === "localhost") {
    return "http://localhost:8001"; // Development port 8001
  }
  return "https://trackflow-api.up.railway.app"; // Production
};
```

### Service Layer

- **utils/api.js**: Main API utility with JWT authentication
- **services/** folder\*\*: Domain-specific API services
  - profileService.js - User profile operations
  - publicSongsService.js - Community features
  - collaborationRequestsService.js - Collaboration requests

### Authentication Flow

1. JWT token stored in localStorage
2. Automatic token refresh (23-hour interval)
3. Protected routes using ProtectedRoute component
4. Admin impersonation with token switching
5. Automatic logout on token expiration

## Feature Implementation Status

### ✅ FULLY IMPLEMENTED

- User authentication with JWT
- Song CRUD operations with workflow states
- Pack creation and management with homepage visibility control
- Album series functionality
- Achievement badge display system
- Community features (public songs, discovery)
- Collaboration system (comprehensive, 6 components)
- Comment system (CommentItem, CommentSection)
- DLC duplicate checking (read-only UI)
- Statistics and analytics
- User profiles (public viewing)
- Admin functionality with impersonation
- Registration wizard
- Help system (comprehensive, 11 sections)
- Data tables with sorting/filtering
- Modal system (13 different modals, includes PackRandomizerModal)
- Toast notifications (local state)
- Pack randomizer feature (Future Plans section)

### ❌ NOT IMPLEMENTED (Despite Architecture Claims)

- **File uploads**: Only file links management exists
- **Real-time notifications**: No WebSocket, no real-time features
- **Music/audio player**: No audio functionality
- **Cloudinary integration**: No cloud storage integration
- **Theme system**: No theming context or components
- **AI recommendations**: SmartDiscovery has no AI features
- **Breadcrumb system**: No breadcrumb navigation
- **Code splitting**: No dynamic imports found

### 🔶 PARTIALLY IMPLEMENTED

- **Notifications**: Toast system exists but uses local state, not global context
- **Smart Discovery**: Community feature exists but no AI functionality

## Component Architecture Details

### Navigation System

- **AppNavigation**: Main navigation with dropdown menus
- **Dropdown Components**: 5 dropdown menus (New, Stats, Community, Help, Admin, User)
- **Protected Routes**: Authentication guards for secured areas
- **NO Breadcrumb System**: Despite claims, no breadcrumb components exist

### Form Architecture

- **Controlled Components**: All forms use controlled inputs
- **Form Hooks**: usePackFormState, usePackFormSubmission
- **Validation**: Client-side validation (NewSongForm, NewPackForm, etc.)
- **Registration Wizard**: Multi-step user registration process

### Data Display

- **SongTable**: Primary data table with sorting/filtering
- **Card Components**: Various card layouts for different data types
- **Statistics**: StatCard, YearDistribution components
- **NO Music Player**: Despite architecture claims, no audio player exists

### Community Features

- **Public Songs**: Community browsing with filters
- **User Profiles**: Public profile viewing
- **Smart Discovery**: Song discovery (no AI features despite claims)
- **Collaboration Requests**: Cross-user collaboration system

## Development Guidelines for AI

### System Boundaries (CRITICAL)

**NEVER add these features** (they're outside TrackFlow's scope):

- File upload functionality
- Audio/music player components
- Cloud storage integration (Cloudinary, etc.)
- Real-time WebSocket features
- MIDI/chart editing tools
- DAW-like audio processing

### Adding New Features

1. **Follow Feature Organization**: Group components by business domain in `components/`
2. **Create Custom Hooks First**: Separate data logic from UI in `hooks/`
3. **Use Existing Patterns**: Reference similar features for consistency
4. **Respect Component Structure**: Use existing modal/form/table patterns

### Component Development Best Practices

1. **Data Flow**: Start with custom hook for data fetching/business logic
2. **UI Layer**: Create presentational component that uses the hook
3. **Error Handling**: Implement loading states and error boundaries
4. **API Integration**: Use `utils/api.js` for all API calls
5. **Authentication**: Use `useAuth()` hook for user state

### File Locations

- **New UI Components**: `src/components/[feature]/`
- **Business Logic**: `src/hooks/[feature]/`
- **API Calls**: `src/services/` or `src/utils/api.js`
- **Page Components**: `src/pages/`
- **Utilities**: `src/utils/`

### Pack Randomizer Feature

- **Hook**: `hooks/songs/usePackRandomizer.js` - Handles randomizer logic and pack selection
- **Modal Component**: `components/modals/PackRandomizerModal.js` - UI for pack selection animation
- **Integration**: SongPage component with Future Plans status
- **Functionality**: Slot-machine style animation to randomly select packs from Future Plans and move them to WIP

## Code Quality Standards

### JavaScript/React Practices

- **ES6+ Syntax**: Modern JavaScript with async/await
- **Function Components**: Hooks-based, no class components
- **JSX Patterns**: Clean, readable JSX structure
- **Error Boundaries**: Graceful error handling

### File Naming Conventions

- **Components**: PascalCase (UserProfile.js, SongTable.js)
- **Hooks**: camelCase with 'use' prefix (useUserData.js)
- **Utilities**: camelCase (apiUtils.js, dateHelpers.js)
- **Services**: camelCase with 'Service' suffix (profileService.js)

### Performance Guidelines

- **React.memo**: Strategic use for expensive renders
- **Custom Hooks**: Encapsulate complex logic
- **API Caching**: Intelligent request caching in hooks
- **Loading States**: Consistent loading UI patterns

## Deployment Architecture

### Build Process

1. **React Build**: `npm run build` - static asset generation
2. **Express Server**: `server.js` - production SPA serving
3. **Railway Deployment**: Platform-as-a-service hosting
4. **HTTPS Enforcement**: Production SSL requirements

### Environment Handling

- **Development**: `http://localhost:8001` API connection
- **Production**: `https://trackflow-api.up.railway.app` with HTTPS enforcement
- **Configuration**: Environment-aware API URL resolution

---

**This architecture reflects the ACTUAL implementation as of the codebase analysis. Future AI agents should reference this ground truth documentation and respect the defined system boundaries.**
