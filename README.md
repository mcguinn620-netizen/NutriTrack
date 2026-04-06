# Welcome to OnSpace AI

Onspace AI empowers anyone to turn ideas into powerful AI applications in minutes—no coding required. Our free, no-code platform enables effortless creation of custom AI apps; simply describe your vision and our agentic AI handles the rest. The onspace-app, built with React Native and Expo, demonstrates this capability—integrating popular third-party libraries to deliver seamless cross-platform performance across iOS, Android, and Web environments.

## Getting Started

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Start the Project

- Start the development server (choose your platform):

```bash
npm run start         # Start Expo development server
npm run android       # Launch Android emulator
npm run ios           # Launch iOS simulator
npm run web           # Start the web version
```

- Reset the project (clear cache, etc.):

```bash
npm run reset-project
```

### 3. Lint the Code

```bash
npm run lint
```

## Supabase setup (required for Edge Functions)

1. Copy env template and set your project values:

```bash
cp .env.example .env
```

2. In `.env`, set:

- `EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-or-publishable-key>`

`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is also supported as a fallback if you prefer Supabase's newer key naming.

3. Link and deploy the Edge Function:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy netnutrition --no-verify-jwt
```

> This repo includes `supabase/functions/netnutrition/config.toml` with `verify_jwt = false` so the app can invoke the function without a signed-in user session.

4. Smoke test the deployed function:

```bash
curl -sS -D /tmp/nn_headers.txt \
  -o /tmp/nn_body.json \
  -X POST \
  "https://upjotaeatvessmbrorgx.supabase.co/functions/v1/netnutrition" \
  -H "Content-Type: application/json" \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  --data '{"action":"scrape"}'

# Parse result shape (units -> menus -> items -> traits -> nutrition)
jq '.units[0].menus[0].items[0]' /tmp/nn_body.json
```

## Main Dependencies

- React Native: 0.79.4
- React: 19.0.0
- Expo: ~53.0.12
- Expo Router: ~5.1.0
- Supabase: ^2.50.0
- Other commonly used libraries:  
  - @expo/vector-icons  
  - react-native-paper  
  - react-native-calendars  
  - lottie-react-native  
  - react-native-webview  
  - and more

For a full list of dependencies, see [package.json](./package.json).

## Development Tools

- TypeScript: ~5.8.3
- ESLint: ^9.25.0
- @babel/core: ^7.25.2

## Contributing

1. Fork this repository
2. Create a new branch (`git checkout -b main`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is private ("private": true). For collaboration inquiries, please contact the author.

---

Feel free to add project screenshots, API documentation, feature descriptions, or any other information as needed.
