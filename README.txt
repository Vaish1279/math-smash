MATH SMASH — FINAL TEST BUILD
============================

WHAT THIS BUILD CONTAINS
- 10,000 levels for each of four operations: addition, subtraction, multiplication and division (40,000 operation-level tracks).
- New installations start at Level 1 for every operation. Each operation has independent local progress.
- Five questions per level and three lives per question.
- A level timer: 1 minute for 1-digit levels, 2 minutes for 2- and 3-digit levels, 4 minutes for 4-, 5- and 6-digit levels.
- Number-size progression: 1 digit (1–30), 2 digits (31–180), 3 digits (181–600), 4 digits (601–2,000), 5 digits (2,001–5,500), 6 digits (5,501–10,000).
- Tricky missing-number rounds appear from Level 12. They use inverse operations and show a worked explanation after a correct answer.
- Every correct answer opens a step-by-step explanation before the player can continue.
- Exact division questions (no remainder) in this version.
- Two hints per 24-hour cycle, with a hint removing two wrong answer choices. Hint timing uses the device clock.
- Hammer swing, block smash, wrong-answer shake, falling answer blocks, floating numbers, loading animation, timer pulse, modal transitions and sound effects.
- Three selectable palettes: Classic, Bloom (pink/lavender) and Bolt (blue/lime). Operation accent colours also change when the player changes operation.
- Local progress, score, streak, theme and sound preference are saved on the device/browser.
- Compact level selector displays only the current window of two levels rather than creating 10,000 page elements.
- PWA manifest, app icons, service worker caching and an install prompt where supported.
- No login, signup, analytics or cloud account in this build.

RUN LOCALLY
1. Extract the ZIP.
2. Open the MathSmash folder in VS Code.
3. Install the VS Code Live Server extension if needed.
4. Right-click index.html and choose Open with Live Server.
5. Test all four operations, each theme, hints, timer, wrong answers, retry, explanations and level progression.

IMPORTANT TEST NOTES
- This build generates questions at play time; it is not a hand-written bank of 40,000 individually authored questions.
- Division questions are generated with whole-number answers (no remainder).
- Level 10,000 is the final level for each operation.
- The timer pauses while instructions/explanation/pause popups are open.
- Progress is stored locally. Clearing app/browser storage or uninstalling can remove it. This build does not synchronise one player's progress between separate devices.
- Please test generated question and explanation accuracy before public release. A large number of generated combinations cannot be fully human-verified by a single sample playthrough.

GITHUB + VERCEL / INSTALLABLE APP
This folder is an installable web app (PWA). You can upload it to GitHub and deploy it on Vercel without a build command. On Android Chrome, open the deployed HTTPS address and use the browser menu → Install app (or Add to Home Screen). It opens in an app-like standalone window. After the first successful online load, the service worker caches the core game so it can work offline.

Important distinction: this is an installable PWA, not a native APK file. GitHub + Vercel can host and deliver the PWA. A separate native APK download would require packaging with Capacitor and building/signing it with Android tooling (Android Studio or a configured GitHub Actions Android build). No APK is included in this ZIP. Do not advertise an APK download until a signed APK has actually been built and tested on real Android devices.

SUGGESTED GITHUB / VERCEL STEPS
1. Create a new GitHub repository named math-smash.
2. Extract this ZIP and upload the CONTENTS of the MathSmash folder to the repository root (index.html should be at the root, not inside another nested MathSmash folder).
3. In Vercel, choose Add New Project and import that GitHub repository.
4. Framework preset: Other. Build command: leave blank. Output directory: leave blank / use the repository root. Deploy.
5. Open the HTTPS deployment on Android Chrome. Open the browser menu and choose Install app or Add to Home Screen.
6. After each update, push the changed files to GitHub and let Vercel redeploy. The service worker cache version is already set in sw.js; increment CACHE_NAME when you publish a future code update so installed devices fetch the new version.

ANDROID APK (OPTIONAL FUTURE STEP)
If you later decide you need a standalone APK file for direct download from your own website, we will add Capacitor and configure an Android build. That step needs Android build tooling or a properly configured GitHub Actions workflow, plus release signing. It is separate from the current PWA deployment.

PRIVACY / TERMS
Math Smash is a practice game, not a formal assessment. Timers are game challenges, not a measure of intelligence or academic ability. This build does not require accounts and does not intentionally collect personal information. Progress and settings remain in local browser/app storage. Local data may be lost if the app is uninstalled or storage is cleared. Younger players should use the game with suitable adult guidance. Use the game responsibly and take breaks. The game may be updated or expanded.

Copyright © 2026 Math Smash. All rights reserved. Do not copy, redistribute or commercially reuse the name, branding, artwork or code without permission.
