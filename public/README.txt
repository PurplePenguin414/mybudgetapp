BUDGET DASHBOARD — home screen icon setup
========================================

1. Add these files to your Budget Dashboard repo's static files folder on
   GitHub (wherever the HTML file it serves lives):
   - apple-touch-icon.png
   - icon-192.png
   - icon-512.png
   - manifest.json

2. In the main HTML file, inside <head>, add these lines:

   <link rel="manifest" href="manifest.json">
   <link rel="apple-touch-icon" href="apple-touch-icon.png">
   <meta name="apple-mobile-web-app-capable" content="yes">
   <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
   <meta name="apple-mobile-web-app-title" content="Budget">
   <meta name="theme-color" content="#2f8f5f">

3. git pull on the server, rebuild/restart the budget-dashboard container.

4. On your iPhone: remove the old Budget home screen icon if you already
   added one (long-press -> Remove App), then re-add via Safari Share ->
   Add to Home Screen so it picks up the new icon.
