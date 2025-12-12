# Scary Movie Rankings

A simplified Letterboxd for your family's horror movie marathons.

## Features
- **Rankings**: Rate movies on 9 dimensions (Jump Scares, Dread, Atmosphere, etc.).
- **Fear Fingerprint**: Radar charts showing the "scare profile" of each movie.
- **History**: Track what you've watched.
- **Mobile Friendly**: Designed for phone usage during movie nights.

## Technology
- React (Vite)
- Tailwind CSS + shadcn/ui
- Firebase (Auth, Firestore)
- TMDB API

## Setup

1. **Clone & Install**:
   ```bash
   npm installs
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in your keys:
   - Firebase config (from Firebase Console).
   - TMDB API Key.

3. **Run Locally**:
   ```bash
   npm run dev
   ```

## Security Rules
Firestore rules are defined in `firestore.rules`.
- **Read**: Public.
- **Write**: Authenticated users only. Users can only edit their own viewings.

## Deployment
Build via `npm run build`. Deploy the `dist` folder to GitHub Pages or Firebase Hosting.
