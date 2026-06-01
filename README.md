# Expo Calculator (React Native + TypeScript + NativeWind)

This project is a feature-rich calculator built with Expo, TypeScript, and NativeWind. It includes Standard and Scientific calculators and a persistent History panel.

Quick start

1. Install dependencies:

```bash
npm install
```

2. Start development:

```bash
npm run start
```

EAS Build (create Android APK)

1. Install EAS CLI and login:

```bash
npm install -g eas-cli
eas login
```

2. Configure your project: ensure `app.json` has correct slug and metadata.

3. Build an Android APK (managed workflow):

```bash
eas build -p android --profile production
```

4. After the build finishes, download the artifact from the EAS build page.

Notes
- The app uses `@react-native-async-storage/async-storage` for history persistence.
- Haptics are provided by `expo-haptics`.
