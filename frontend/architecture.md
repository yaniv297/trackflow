# TrackFlow Frontend Architecture

## Overview

TrackFlow frontend is a React-based single-page application for music management and collaboration. It follows modern React patterns with hooks, context API, and component-based architecture.

## Technology Stack

- **Framework**: React 19.1.0 with React Router DOM 7.6.3
- **Build Tool**: Create React App (react-scripts 5.0.1)
- **Deployment**: Railway with Docker and Express.js server
- **State Management**: React Context API + Local State
- **Testing**: React Testing Library + Jest

## Project Structure

```
frontend/src/
├── App.js                    # Main app component with providers
├── index.js                  # React app entry point
├── config.js                 # API configuration and environment handling
├── components/               # Reusable UI components
│   ├── albumSeries/         # Album series specific components
│   ├── community/           # Community features
│   ├── features/            # Feature-specific components  
│   ├── forms/               # Form components
│   ├── home/                # Home page components
│   ├── modals/              # Modal dialogs
│   ├── music/               # Music player components
│   ├── navigation/          # Navigation and header components
│   ├── notifications/       # Notification system
│   ├── pages/               # Page-level components
│   ├── profile/             # User profile components
│   ├── shared/              # Shared/common components
│   ├── stats/               # Statistics and analytics
│   ├── tables/              # Data table components
│   ├── ui/                  # Low-level UI components
│   └── widgets/             # Dashboard widgets
├── contexts/                # React contexts for global state
├── hooks/                   # Custom React hooks
│   ├── app/                 # Application-level hooks
│   ├── albumSeries/         # Album series hooks
│   ├── collaborations/      # Collaboration hooks
│   ├── forms/               # Form-related hooks
│   ├── songs/               # Song management hooks
│   ├── stats/               # Statistics hooks
│   ├── ui/                  # UI interaction hooks
│   ├── wip/                 # Work-in-progress hooks
│   └── workflows/           # Workflow hooks
├── pages/                   # Route-level page components
├── routes/                  # React Router configuration
├── services/                # API service layer
├── utils/                   # Utility functions and helpers
└── data/                    # Static data and constants
```

## Architecture Patterns

### 1. Component Organization

Components are organized by feature and complexity level:

- **Pages**: Top-level route components that orchestrate features
- **Features**: Business logic components for specific domains
- **Shared**: Reusable components across multiple features  
- **UI**: Low-level, generic UI components
- **Widgets**: Small, self-contained functional components

### 2. State Management Strategy

- **Global State**: React Context API for authentication, notifications
- **Local State**: Component-level useState for UI state
- **Server State**: Custom hooks with caching for API data
- **Form State**: Local state with validation helpers

### 3. Custom Hooks Pattern

Extensive use of custom hooks for:
- **Data fetching** with caching and loading states
- **UI interactions** like dropdowns and modals
- **Business logic** separation from components
- **Shared functionality** across multiple components

## Key Architectural Components

### Authentication System

- **AuthContext**: Global authentication state management
- **ProtectedRoute**: Route-level authentication guards
- **Token management**: LocalStorage with automatic refresh
- **User impersonation**: Admin functionality with context switching

### API Integration

- **API Layer**: Centralized API calls with authentication headers
- **Config Management**: Environment-aware API URL handling
- **HTTPS Enforcement**: Production security for mixed content prevention
- **Error Handling**: Consistent error handling across API calls

### Navigation & Routing

- **React Router**: SPA navigation with protected routes
- **App Navigation**: Context-aware navigation with user state
- **Dynamic Routes**: Parameter-based routing for entities
- **Route Protection**: Authentication and role-based access

## Data Flow Patterns

### 1. API Data Flow

```
Page Component → Custom Hook → API Service → Backend
     ↓              ↓              ↓
Local State ← Data Transform ← Response
     ↓
UI Component
```

### 2. User Actions

```
UI Event → Event Handler → API Call → State Update → Re-render
```

### 3. Global State Updates

```
Context Provider → State Update → Context Consumers → Re-render
```

## Component Patterns

### 1. Container/Presentational Pattern

- **Container components**: Handle data fetching and business logic
- **Presentational components**: Focus on UI rendering and user interaction
- **Custom hooks**: Extract data logic from containers

### 2. Compound Components

- **Navigation components**: Multiple related components working together
- **Form components**: Multi-step forms with shared state
- **Modal systems**: Base modal with specialized content components

### 3. Higher-Order Components (rare)

- **ProtectedRoute**: Route protection wrapper
- **Error boundaries**: Error handling wrappers

## Development Patterns

### Code Organization Rules

1. **Feature-based organization** over type-based (components by domain)
2. **Custom hooks** for all data fetching and complex logic
3. **Prop drilling avoidance** using Context API for shared state
4. **Component composition** over inheritance
5. **Controlled components** for all form inputs

### Component Design Principles

1. **Single Responsibility**: Each component has one clear purpose
2. **Prop Interface**: Clear, typed prop interfaces
3. **State Minimization**: Keep local state minimal and focused
4. **Side Effect Isolation**: Use useEffect appropriately
5. **Memoization**: Use React.memo and useMemo for performance

### File Naming Conventions

1. **PascalCase** for component files (UserProfile.js)
2. **camelCase** for utility files (apiUtils.js)
3. **camelCase** for hook files (useUserData.js)
4. **Descriptive names** that indicate purpose

## Performance Patterns

### 1. Data Fetching Optimization

- **Caching**: Custom hooks implement response caching
- **Loading states**: Consistent loading UI patterns
- **Error states**: Graceful error handling and retry mechanisms
- **Pagination**: Large dataset handling with pagination

### 2. Component Optimization

- **React.memo**: Prevent unnecessary re-renders
- **useMemo**: Expensive calculation memoization
- **useCallback**: Function reference stability
- **Code splitting**: Dynamic imports for large features

### 3. Bundle Optimization

- **Create React App**: Built-in webpack optimization
- **Production builds**: Minification and tree shaking
- **Static assets**: Efficient asset loading

## Testing Architecture

### Testing Strategy

- **Unit tests**: Individual component and hook testing
- **Integration tests**: Component interaction testing
- **API tests**: Service layer testing
- **User interaction tests**: End-to-end user workflows

### Testing Patterns

- **React Testing Library**: User-centric testing approach
- **Custom hook testing**: Isolated hook behavior verification
- **Mock services**: API call mocking for predictable tests
- **Test utilities**: Shared test setup and helpers

## Security Patterns

### Client-Side Security

1. **Token management**: Secure storage and transmission
2. **Input validation**: Client-side validation (not relied upon)
3. **XSS prevention**: Proper output encoding
4. **HTTPS enforcement**: Production security requirements
5. **Environment separation**: Different configs per environment

### Authentication Flow

1. **Login**: JWT token acquisition and storage
2. **Token validation**: Automatic token validation
3. **Protected routes**: Route-level access control
4. **Logout**: Secure token cleanup
5. **Session management**: Token refresh and expiration

## Deployment Architecture

### Build Process

1. **React build**: Static asset generation
2. **Express server**: Production server for SPA routing
3. **Docker containerization**: Consistent deployment environment
4. **Railway deployment**: Platform-as-a-service hosting

### Environment Configuration

- **Development**: localhost API with hot reloading
- **Production**: HTTPS-enforced API with optimized builds
- **Environment variables**: Runtime configuration via .env files

## AI Development Guidelines

### When Adding New Features

1. **Follow feature-based organization** - group related components, hooks, and utilities
2. **Create custom hooks** for data fetching and complex logic
3. **Use Context sparingly** - only for truly global state
4. **Implement proper loading/error states** for all async operations
5. **Follow existing component patterns** - look at similar features for consistency

### Component Development Best Practices

1. **Start with the data flow** - understand what data the component needs
2. **Create the custom hook first** - separate data logic from UI logic
3. **Build presentational component** - focus on UI rendering
4. **Add proper prop types** - ensure clear component interfaces
5. **Implement error boundaries** - handle component failures gracefully

### API Integration Standards

1. **Use the existing API utilities** - don't create new API functions unnecessarily
2. **Implement proper error handling** - consistent error messaging
3. **Cache when appropriate** - avoid unnecessary API calls
4. **Handle loading states** - provide user feedback during operations
5. **Follow REST conventions** - consistent API patterns

### Code Quality Standards

1. **Use ESLint rules** - follow the existing linting configuration
2. **Write descriptive component names** - indicate purpose and scope
3. **Keep components small** - single responsibility principle
4. **Document complex logic** - especially in custom hooks
5. **Test critical functionality** - focus on user-facing features

### Performance Considerations

1. **Avoid premature optimization** - measure before optimizing
2. **Use React DevTools** - profile component performance
3. **Implement proper memoization** - prevent unnecessary re-renders
4. **Optimize bundle size** - dynamic imports for large features
5. **Monitor API performance** - track slow requests and optimize