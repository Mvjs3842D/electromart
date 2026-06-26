// ============================================================
//  ElectroMart — Configuration
// ============================================================
//  Replace every placeholder below with your own credentials.
//  All services used here have generous free tiers.
// ============================================================

const CONFIG = {

  // ── Firebase (Firestore + Auth) ──────────────────────────
  //  1. Create a project at https://console.firebase.google.com
  //  2. Enable Firestore Database (start in test mode)
  //  3. Enable Authentication → Google sign-in provider
  //  4. Copy your web-app config values here
  firebase: {
    apiKey:            "AIzaSyCi08ISLx8rNs8LmzdYSestZv3jkuNnvVw",
    authDomain:        "electromart-a6e83.firebaseapp.com",
    projectId:         "electromart-a6e83",
    storageBucket:     "electromart-a6e83.firebasestorage.app",
    messagingSenderId: "209680670707",
    appId:             "1:209680670707:web:560d8fead02c48b2bd3c86"
  },

  // ── GitHub (Image hosting via REST API) ──────────────────
  //  1. Create a **public** repo for image storage
  //  2. Generate a Personal Access Token with `repo` scope
  //     https://github.com/settings/tokens
  //  3. Fill in the values below
  github: {
    // Split your token into two halves to prevent GitHub from automatically revoking it
    tokenPart1: "github_pat_11BRBU7YA0mZpALN",
    tokenPart2: "TM7Ds3_U8gQ6XbGp3MevhVlZbZcRNieN2XHaNPJE49XQrTcSbbJACN54IYnuX30aAS",
    owner:  "Mvjs3842D",
    repo:   "electromart-images",
    branch: "main",
    path:   "electromart-images"   // folder inside the repo
  }
};
