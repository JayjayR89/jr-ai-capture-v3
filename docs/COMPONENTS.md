# Component & API Documentation

## Main Components

### CameraAIApp
Main application logic, state management, and UI composition. Handles camera, AI, TTS, and user settings.

### CameraPreview
Renders the live camera feed with controls for flipping, minimizing, and aspect ratio.

### AutoCaptureProgress
Visualizes countdown and progress for auto-capture mode.

### ImageGallery
Displays captured images, supports selection, export, and TTS playback.

### TTSControls
Play/stop TTS for descriptions, integrates with `useTTSAudio`.

### SettingsModal
UI for configuring all app settings, including AI, TTS, and export options.

### ErrorBoundary
Catches and displays errors in the UI.

### AudioScrubBar
Interactive audio progress bar for TTS playback.

---

## Hooks

### useTTSAudio
Manages TTS playback, state, and controls. Returns playback state and control functions.

### useAutoCapture
Handles auto-capture timing and state. Returns progress, remaining time, and control functions.

### use-toast
Provides toast notification API for user feedback.

### useIsMobile
Detects mobile device usage for responsive UI.

---

## Contexts

### TTSSettingsContext
Provides TTS configuration to components via React context.

---

## Utilities

### errorHandling.ts
Centralized error reporting, categorization, and user notification.

### fallbacks.ts
Fallback logic for TTS, camera, and configuration management.

### performanceUtils.ts
Debounce, throttle, and performance helpers for smooth UI.

### utils.ts
Class name merging utility for Tailwind and clsx.

---

## UI Primitives

- Button, Card, Tooltip, Toaster, Sonner: Reusable UI components styled with Tailwind and shadcn/ui.

---

## Pages

- **Index**: Main entry point, renders `CameraAIApp`.
- **NotFound**: 404 page for undefined routes.

---

For detailed usage and examples, see the README or inline JSDoc comments in each file.