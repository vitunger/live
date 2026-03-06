/**
 * core/config.js - Zentrale Konfiguration (Environment-Variablen)
 *
 * Alle konfigurierbaren Werte an einer Stelle.
 * Fuer Staging: Nur diese Datei aendern.
 *
 * @module core/config
 */

var VIT_CONFIG = {
    // Supabase (Prod)
    SUPABASE_URL: 'https://lwwagbkxeofahhwebkab.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3d2FnYmt4ZW9mYWhod2Via2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTM3NDAsImV4cCI6MjA4NjU4OTc0MH0.YBKO7grysp8RHzGWA6xSGpTVi0wG2PmeEWJHI25f7ks',

    // Spiritus (separates Supabase-Projekt)
    SPIRITUS_URL: 'https://rlzkiuxmnouyqxinxchw.supabase.co/functions/v1/spiritus-analyze',

    // VAPID Public Key (Web Push)
    VAPID_PUBLIC_KEY: 'BFjv8qdfhEPXyWvz8Ite8laCH0XMaLtzTXvRBRq7XIa4FELmOz2RA3fUh7me1LIAh0JsKQVd-Pl8Dlxg_8mFc3c',

    // Erlaubte Origins fuer CORS
    ALLOWED_ORIGINS: ['https://cockpit.vitbikes.de', 'http://localhost:3000'],
};

// Global verfuegbar machen
window.VIT_CONFIG = VIT_CONFIG;

// Abwaertskompatibilitaet
window.SUPABASE_URL = VIT_CONFIG.SUPABASE_URL;
window.SUPABASE_ANON_KEY = VIT_CONFIG.SUPABASE_ANON_KEY;

// Helper: Supabase URL (zentralisiert)
window.sbUrl = function() { return VIT_CONFIG.SUPABASE_URL; };
