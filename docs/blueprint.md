# **App Name**: Don't Click

## Core Features:

- Anonymous Authentication: Authenticate the user anonymously using Firebase Authentication to track individual game statistics.
- Game Session Initialization: Automatically create a new game session on page load and record the start time in Firestore.
- Tension-Building Messages: Display and fade out random, psychologically provocative messages at intervals between 5 and 12 seconds. The LLM tool chooses which message to send based on the current state of the game and other parameters.
- Click Detection and Game End: Detect any click on the page, immediately end the game session, and record the end time and duration.
- Failure Message Display: Briefly flash the screen red upon clicking, display the time survived in milliseconds, and show a failure message before automatically reloading the page.
- Session Data Storage: Store each game attempt as a session document in Firestore, including the user ID, start time, end time, duration, and server timestamp.
- Statistic Tracking and Updates: Maintain and update user and global statistics in Firestore, including personal best survival time, total attempts, last played time, daily best survival time, and total plays.

## Style Guidelines:

- Background color: Pure black (#000000) to create a stark, high-contrast environment. 
- Primary color: White (#FFFFFF) for the central text to maximize visibility and tension. 
- Accent color: Intense red (#FF0000) for the flash upon clicking to signal failure. 
- Font: 'Inter' sans-serif for a clean, modern, and easily readable interface. Good for the heading.
- Font: 'PT Sans' sans-serif for displaying messages to the user, for a slightly warmer feel than 'Inter'.
- Minimalist layout with the central 'DON'T CLICK' text prominently displayed in the center of the screen.
- Subtle fade-in and fade-out animations for the tension-building messages to avoid distraction while keeping the user engaged.