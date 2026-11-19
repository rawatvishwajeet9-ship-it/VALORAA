/**
 * VALORA Healthcare Management Platform - Cloud Integrations (Firebase & Supabase)
 * 
 * Provides optional cloud integration bridges for:
 * 1. Firebase Authentication & Firestore / Cloud Storage sync
 * 2. Supabase Storage & Realtime sync
 * 
 * Works out-of-the-box locally, and activates cloud features whenever API keys are provided.
 */

window.VALORA_CLOUD = {
  // Firebase Configuration (Optional)
  firebase: {
    enabled: false,
    config: {
      apiKey: "",
      authDomain: "",
      projectId: "valora-health",
      storageBucket: "valora-health.appspot.com",
      messagingSenderId: "",
      appId: ""
    },
    init: function() {
      if (this.config.apiKey && typeof firebase !== 'undefined') {
        try {
          if (!firebase.apps.length) {
            firebase.initializeApp(this.config);
            this.enabled = true;
            console.log('[VALORA Cloud] Firebase initialized successfully.');
          }
        } catch (e) {
          console.warn('[VALORA Cloud] Firebase initialization error:', e);
        }
      }
    }
  },

  // Supabase Configuration (Optional)
  supabase: {
    enabled: false,
    url: "",
    anonKey: "",
    client: null,
    init: function() {
      if (this.url && this.anonKey && typeof supabase !== 'undefined') {
        try {
          this.client = supabase.createClient(this.url, this.anonKey);
          this.enabled = true;
          console.log('[VALORA Cloud] Supabase initialized successfully.');
        } catch (e) {
          console.warn('[VALORA Cloud] Supabase initialization error:', e);
        }
      }
    }
  }
};
