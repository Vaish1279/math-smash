HAMMATH — COMPLETE UPDATE

Files:
- index.html
- style.css
- game.js
- manifest.json
- sw.js
- icon-192.png
- icon-512.png

INSTALL:
1. Make a backup of your existing project folder.
2. Replace the matching files with these files.
3. Put icon-192.png and icon-512.png in the same root folder as index.html.
4. Keep all files in the same project root (do not put icons in a subfolder).
5. Commit and push to GitHub, then let Vercel deploy.

IMPORTANT:
- The existing localStorage key mathSmash_local_v4 is intentionally unchanged to preserve saved progress on the same browser/device.
- This update changes the visible brand to HAMMATH and the PWA app identity.
- Existing game logic, themes, operations, levels and question flow are retained.
- The game overlay now uses a fixed viewport-sized stage on phones. Browser pinch-zoom accessibility is not disabled.
- PWA install/offline behavior should be tested after deployment; all precache paths in sw.js point to files included in this package.
