# Implementation Plan

- [x] 1. Create TTS audio management infrastructure





  - Create custom hook `useTTSAudio` for managing audio playback state, progress tracking, and cleanup
  - Implement audio element lifecycle management with proper cleanup to prevent memory leaks
  - Add support for multiple TTS engines (standard, neural, generative) with configuration switching
  - _Requirements: 2.1, 2.2, 4.1, 5.3_

- [x] 2. Build AudioScrubBar component for TTS progress visualization





  - Create `AudioScrubBar` component with interactive seeking functionality and time display
  - Implement real-time progress updates during audio playback with smooth animations
  - Add click-to-seek functionality with proper time calculation and audio synchronization
  - Style the component with responsive design and accessibility features
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Create TTSControls component with play/stop functionality





  - Build `TTSControls` component that wraps play/stop buttons with consistent styling
  - Integrate with `useTTSAudio` hook for state management and audio control
  - Ensure every TTS instance has both play and stop buttons as required
  - Add loading states and error handling for TTS operations
  - _Requirements: 2.4, 2.5_

- [x] 4. Implement TTS engine and voice configuration in settings





  - Add TTS section to SettingsModal with engine selection dropdown (Standard, Neural, Generative)
  - Create voice selection dropdown with predefined voice options and proper language/engine mapping
  - Implement settings persistence for TTS configuration in localStorage
  - Add proper TypeScript interfaces for TTS configuration data
  - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.3, 5.4_

- [x] 5. Fix settings modal layout and scrolling issues





  - Adjust SettingsModal layout to prevent bottom settings from being hidden behind action buttons
  - Add proper padding and margin calculations to ensure all content is accessible
  - Implement proper scrolling behavior within the modal content area
  - Test modal layout across different screen sizes and content lengths
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 6. Enhance camera preview with responsive aspect ratios





  - Modify CameraPreview component to detect device type (desktop vs mobile)
  - Implement aspect ratio switching: 16:9 for desktop landscape, 9:16 for mobile portrait
  - Add CSS media queries and responsive styling for proper camera display
  - Ensure camera feed displays completely without cropping on all device types
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7. Add smooth camera flip animations










  - Implement CSS transitions for camera switching with fade/flip effects
  - Add loading states during camera transitions to provide visual feedback
  - Create animation wrapper utilities for consistent transition behavior
  - Ensure animations are performant and respect user motion preferences
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 8. Integrate TTS components throughout the application





  - Replace existing TTS play buttons with new TTSControls component
  - Add AudioScrubBar to all locations where TTS audio plays
  - Update AI description display to use new TTS controls with progress tracking
  - Ensure consistent TTS behavior across all app features
  - Add a fall back standard TTS function for if the TTS engine or voices fails Example "insufficiant funds". puter.ai.txt2speech()
  - Update the app Version to include all the previous edits. 
  - _Requirements: 2.1, 2.4, 4.4, 5.4_

- [x] 9. Update TTS API calls to use configured engine and voice settings





  - Modify existing `puter.ai.txt2speech` calls to use selected engine and voice configuration but keep it as a fallback.
  - Implement proper parameter mapping from settings to API calls (language, voice name, engine)
  - Add error handling for unsupported engine/voice combinations with fallback options
  - Test TTS functionality with all available voice and engine combinations
  - _Requirements: 4.3, 5.3, 5.4_

- [x] 10. Add comprehensive error handling and user feedback





  - Implement error boundaries for TTS and animation components
  - Add toast notifications for TTS errors, animation failures, and configuration issues
  - Create fallback mechanisms for unsupported features or API failures
  - Add loading indicators and status messages for better user experience
  - _Requirements: 1.3, 2.5, 4.4_

- [x] 11. Implement performance optimizations and cleanup





  - Add proper cleanup for audio elements and event listeners in useEffect hooks
  - Implement React.memo for expensive components to prevent unnecessary re-renders
  - Add debouncing for audio progress updates to improve performance
  - Optimize animation performance with hardware acceleration and reduced motion support
  - _Requirements: 1.3, 2.2, 2.5_

- [x] 12. Create comprehensive tests for new functionality








  - Write unit tests for `useTTSAudio` hook covering all audio states and transitions
  - Test AudioScrubBar component interaction and seeking functionality
  - Create integration tests for TTS engine switching and voice configuration
  - Add tests for responsive camera preview behavior across device types
  - Test settings modal layout and scrolling behavior
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_