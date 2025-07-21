## Project Documentation

### Overview

This project is a sophisticated AI-powered camera application built with React, TypeScript, and Puter.com's API. It provides real-time camera access, image capture, and AI-driven image analysis. The application is designed to be extensible, with features like auto-capture, detailed PDF exports, and customizable AI prompts.

### Core Components

#### `CameraAIApp.tsx`

This is the main component of the application, orchestrating all the functionalities.

**Key Responsibilities:**

-   **State Management:** Manages all application state, including camera status, authentication, captured images, and settings.
-   **Camera Control:** Handles camera permissions, streaming, and capture logic.
-   **AI Integration:** Communicates with the Puter.com AI API to get image descriptions.
-   **Authentication:** Manages user sign-in and sign-out using Puter.com's auth service.
-   **Settings:** Handles loading and saving of user-configurable settings.
-   **UI Rendering:** Renders all the UI elements, including the camera preview, image gallery, and control buttons.

**Props:** None

### Hooks

#### `useAutoCapture.ts`

A custom hook to manage the auto-capture functionality.

**Parameters:**

-   `settings`: An object containing auto-capture settings (`enabled`, `captureTime`, `captureAmount`).
-   `captureImage`: A callback function to be executed for capturing an image.
-   `canCapture`: A boolean indicating if capturing is currently possible.

**Returns:**

-   `isActive`: A boolean indicating if auto-capture is active.
-   `progress`: The progress of the current auto-capture cycle (0-100).
-   `remainingTime`: The time remaining for the next capture.
-   `currentCount`: The number of images captured in the current session.
-   `startAutoCapture`: A function to start the auto-capture process.
-   `stopAutoCapture`: A function to stop the auto-capture process.

#### `useTTSAudio.ts`

A custom hook for text-to-speech (TTS) functionality.

**Parameters:**

-   `text`: The text to be converted to speech.
-   `config`: TTS configuration, including `engine` and `voice`.
-   `onError`: An optional callback for handling errors.

**Returns:**

-   `isReady`: A boolean indicating if the TTS engine is ready.
-   `isPlaying`: A boolean indicating if audio is currently playing.
-   `isError`: A boolean indicating if an error occurred.
-   `play`: A function to start playing the audio.
-   `pause`: A function to pause the audio.
-   `stop`: A function to stop the audio.

### Utilities

#### `errorHandling.ts`

Provides functions for centralized error handling.

-   `handleCameraError`: Specific handler for camera-related errors.
-   `handleConfigurationError`: Specific handler for settings/configuration errors.
-   `errorHandler`: A generic error handler.

#### `fallbacks.ts`

Manages fallback mechanisms for critical operations.

-   `cameraManager`: Provides robust camera access with fallbacks.
-   `configManager`: Handles loading and saving of configurations with fallback strategies.

#### `performanceUtils.ts`

Contains utilities for performance optimization. (Currently a placeholder, can be extended)

#### `utils.ts`

A collection of general utility functions used across the application.

### UI Components

The application uses a variety of UI components, mostly from the `shadcn/ui` library, to create a modern and responsive user interface. Key custom UI components include:

-   **`CameraPreview`**: Displays the live camera feed.
-   **`ImageGallery`**: Shows a gallery of captured images.
-   **`SettingsModal`**: A modal for configuring application settings.
-   **`TTSControls`**: UI controls for the text-to-speech feature.
-   **`AutoCaptureProgress`**: A progress bar for the auto-capture mode.
-   **`LoadingIndicator`**: A reusable loading spinner.
-   **`ErrorBoundary`**: A component to catch and display errors gracefully.

### Directory Structure

-   `src/components`: Contains all React components.
-   `src/hooks`: Houses custom React hooks.
-   `src/lib`: For utility functions and libraries.
-   `src/contexts`: For React context providers.
-   `src/pages`: Contains the main pages of the application.
-   `src/test`: Test configurations and setups.
-   `public`: Static assets like images and icons.
