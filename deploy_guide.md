# Firebase Deployment Guide for Har's Portfolio

To properly deploy this application to Firebase Hosting and solve the "Welcome" page and 404 errors:

## 1. Prerequisites
Make sure you have the Firebase CLI installed:
`npm install -g firebase-tools`

## 2. Prepare the Build
Run the build command to generate the production-ready `dist` folder:
`npm run build`

## 3. Verify `firebase.json`
Your `firebase.json` at the root of the project MUST look exactly like this:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

## 4. Deploy
Once built, run the deployment command:
`firebase deploy`

---

### Why you saw the "Welcome" page:
Firebase defaults to a folder named `public`. However, this Modern React app (Vite) builds its files into a folder named `dist`. The instructions above tell Firebase to look in `dist`.

### Why you saw a 404 on /admin-panel:
Single Page Applications (SPAs) like this one need a "Rewrite" rule to tell the server that all URLs should be handled by the main `index.html`. The `rewrites` section in `firebase.json` adds this rule.
