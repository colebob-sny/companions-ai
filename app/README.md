# Companions AI Expo Frontend

This is a minimal Expo (React Native) frontend that posts user messages to the backend `/chat` endpoint and renders assistant replies.

Quick start

1. Install dependencies (from `app/`):

```bash
cd app
npm install
```

2. Start Expo:

```bash
npm start
```

3. Notes on API host

- iOS simulator: `http://localhost:3000` works.
- Android emulator (default AVD): use `http://10.0.2.2:3000`.
- Physical device: replace API_BASE in `App.js` with your machine IP (e.g., `http://192.168.1.50:3000`).

You can change the API host in `app/app.json` under `expo.extra.apiUrl` or edit `App.js` directly.
