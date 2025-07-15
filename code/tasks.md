## Debugging Tasks & Bugs

### index.html
- [ ] Add fallback or error handling for external script loading (`puter.com`).

### src/App.tsx
- [x] Review necessity of rendering both `Toaster` and `Sonner` components. ✅ **Both components needed for different styling**
- [x] Add a global error boundary to prevent app crashes from uncaught errors. ✅ **ErrorBoundary component created and implemented**

### src/pages/NotFound.tsx
- [x] Replace `<a href="/">` with React Router's `<Link>` to avoid full page reloads. ✅ **Fixed with React Router's Link component**

### src/components/CameraAIApp.tsx
- [ ] Add cleanup for media streams on component unmount to prevent memory leaks.
- [ ] Improve error messages for camera and AI failures.
- [x] Add fallback for unavailable `puter` API or AI service. ✅ **Fallback handling implemented in useAIQueue.ts**
- [ ] Ensure timestamp comparisons use value equality, not object reference.
- [x] Add error boundary for the component. ✅ **Wrapped with global ErrorBoundary**
- [ ] Prevent state updates on unmounted components (e.g., after `setTimeout`).
- [x] Improve type safety, avoid use of `any` where possible. ✅ **TypeScript interfaces added for puter.com API**

### src/main.tsx
- [ ] Add null check for `getElementById("root")` before rendering.

### General
- [x] Add a global error boundary/fallback UI for uncaught exceptions. ✅ **ErrorBoundary component created**
- [x] Add robust fallback for external API failures. ✅ **Fallback handling added to useAIQueue.ts**
- [x] Improve type safety, avoid use of `any` where possible. ✅ **TypeScript interfaces implemented**
- [x] Replace plain anchors with SPA routing where appropriate. ✅ **React Router's Link component used**

---

## Additional Tasks Identified

### src/components/ImageGallery.tsx
- [ ] Add error handling for TTS (Text-to-Speech) failures in `speakDescription`.
- [ ] Ensure `formatDescription` handles edge cases (e.g., empty or undefined descriptions).
- [ ] Add loading state for images to prevent broken image placeholders.

### src/components/SettingsModal.tsx
- [ ] Add validation for settings values (e.g., capture time, amount).
- [ ] Ensure localStorage operations are wrapped in try-catch to prevent crashes.
- [ ] Add confirmation dialog before resetting settings to defaults.

### src/hooks/useAutoCapture.ts
- [ ] Add cleanup for intervals on unmount to prevent memory leaks.
- [ ] Ensure `onCapture` callback is stable to avoid unnecessary re-renders.

### src/hooks/use-toast.ts
- [ ] Ensure toast timeouts are cleared on unmount to prevent memory leaks.
- [ ] Add error handling for toast operations.

### src/hooks/use-mobile.tsx
- [ ] Ensure event listeners are cleaned up on unmount.

### src/lib/utils.ts
- [ ] No issues found; ensure utility functions are well-tested.

---

## Priority Order
1. **Critical**: Memory leaks (media streams, intervals, timeouts).
2. **High**: Error boundaries and fallback handling for external APIs.
3. **Medium**: Type safety improvements and SPA routing fixes.
4. **Low**: UI/UX enhancements and edge case handling.