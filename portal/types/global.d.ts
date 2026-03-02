/**
 * portal/types/global.d.ts
 * 
 * Globale Typ-Definitionen für das vit:bikes Partner Portal.
 * Typisiert die window.*-Exports, die durch das Strangler Fig Pattern entstehen.
 * 
 * ZWECK: Gibt KI-Agenten (Claude Code, Windsurf) und IDEs Kontext über
 * verfügbare Funktionen, deren Parameter und Rückgabewerte.
 * Hat KEINEN Einfluss auf Runtime oder Deployment.
 * 
 * PFLEGE: Bei neuen window.*-Exports hier den Typ ergänzen.
 * 
 * Stand: 02.03.2026
 */

// ══════════════════════════════════════════════
// Domain Types
// ══════════════════════════════════════════════

/** Toast-Notification Typen */
type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Lead/Deal Status in der Pipeline */
type DealStatus = 'neu' | 'kontaktiert' | 'angebot' | 'verhandlung' | 'schwebend' | 'gewonnen' | 'verloren' | 'gold';

/** Rollen im System */
type VitRolle = 'hq' | 'inhaber' | 'verkauf' | 'werkstatt' | 'buchhaltung';

/** Modul-Status Werte */
type ModulStatusValue = 'aktiv' | 'demo' | 'in_bearbeitung' | 'deaktiviert';

/** Modul-Ebene */
type ModulEbene = 'partner' | 'hq' | 'beide';

/** User-Status */
type UserStatus = 'aktiv' | 'pending' | 'deaktiviert';

/** Feedback-Kategorien */
type FeedbackKategorie = 'bug' | 'wunsch' | 'ux' | 'performance' | 'idee';

/** BWA-Parser Formate */
type BwaFormat = 'datev' | 'susa' | 'skr03' | 'skr04' | 'lexoffice' | 'custom';

/** Sprachen */
type VitLang = 'de' | 'en';

// ══════════════════════════════════════════════
// Data Interfaces
// ══════════════════════════════════════════════

/** Supabase Client (any bis @supabase/supabase-js Typen verfügbar) */
type SupabaseClient = any;

/** Supabase Auth User */
type SupabaseUser = any;

/** User-Profil aus der `users`-Tabelle */
interface VitUserProfile {
  id: string;
  name: string;
  email: string;
  vorname?: string;
  nachname?: string;
  standort_id: string | null;
  is_hq: boolean;
  status: UserStatus;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

/** Standort-Datensatz aus `standorte`-Tabelle */
interface VitStandort {
  id: string;
  name: string;
  stadt?: string;
  plz?: string;
  strasse?: string;
  bundesland?: string;
  aktiv: boolean;
  etermin_location_id?: string;
  created_at?: string;
}

/** Feature-Flag Konfiguration aus `feature_flags`-Tabelle */
interface VitFeatureFlag {
  enabled: boolean;
  rollout_percent?: number;
  target_roles?: string[];
  target_standorte?: string[];
  target_users?: string[];
  scope?: string;
  metadata?: Record<string, unknown>;
  expires_at?: string;
}

/** Deal/Lead aus der `sales`-Tabelle */
interface VitDeal {
  id: string;
  name: string;
  email?: string;
  telefon?: string;
  status: DealStatus;
  standort_id: string;
  verkaufer_id?: string;
  wert?: number;
  notizen?: string;
  quelle?: string;
  termin_id?: string;
  etermin_uid?: string;
  terminDone?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Kalender-Termin aus `termine`-Tabelle */
interface VitTermin {
  id: string;
  title: string;
  start_zeit: string;
  end_zeit?: string;
  standort_id: string;
  user_id?: string;
  etermin_uid?: string;
  ms365_event_id?: string;
  ganztags?: boolean;
  notizen?: string;
}

/** Todo aus `todos`-Tabelle */
interface VitTodo {
  id: string;
  title: string;
  beschreibung?: string;
  erledigt: boolean;
  prio_sort: number;
  faellig_am?: string;
  standort_id: string;
  zugewiesen_an?: string;
  created_at?: string;
}

/** BWA-Daten aus `bwa_daten`-Tabelle */
interface VitBwaDaten {
  id: string;
  standort_id: string;
  monat: string;
  jahr: number;
  umsatz?: number;
  wareneinsatz?: number;
  rohertrag?: number;
  personalkosten?: number;
  miete?: number;
  sonstige_kosten?: number;
  ergebnis?: number;
  format?: BwaFormat;
  ki_analyse?: string;
  created_at?: string;
}

/** Verkauf-Tracking Tageseintrag */
interface VitVerkaufTracking {
  id: string;
  standort_id: string;
  user_id: string;
  datum: string;
  geplant: number;
  spontan: number;
  online: number;
  ergo: number;
  verkauft: number;
  umsatz: number;
}

/** Netzwerk-Dokument (Kampagnen, Anleitungen) */
interface VitNetzwerkDokument {
  id: string;
  titel: string;
  kategorie: string;
  inhalt?: string;
  datei_url?: string;
  erstellt_von?: string;
  created_at?: string;
}

// ══════════════════════════════════════════════
// Window Interface – Core Exports
// ══════════════════════════════════════════════

declare global {
  interface Window {
    // ── Core: Supabase (core/supabase-init.js) ──
    /** Supabase Client Instance */
    sb: SupabaseClient;
    /** Aktuell eingeloggter Auth-User (null wenn ausgeloggt) */
    sbUser: SupabaseUser | null;
    /** User-Profil aus users-Tabelle (null wenn nicht geladen) */
    sbProfile: VitUserProfile | null;
    /** Rollen-Namen des aktuellen Users (z.B. ['inhaber', 'verkauf']) */
    sbRollen: string[];
    /** Standort-Datensatz des aktuellen Users */
    sbStandort: VitStandort | null;
    /** Modul-Status Map: {modul_key: 'aktiv'|'demo'|...} */
    sbModulStatus: Record<string, ModulStatusValue>;
    /** HQ-Ebene Modul-Status */
    sbHqModulStatus: Record<string, ModulStatusValue>;
    /** HQ-spezifische Tab/Widget-Konfiguration */
    sbHqModulConfig: Record<string, unknown>;
    /** Modul-Ebene: partner, hq, oder beide */
    sbModulEbene: Record<string, ModulEbene>;
    /** Feature-Flags mit Targeting-Konfiguration */
    sbFeatureFlags: Record<string, VitFeatureFlag>;
    /** Supabase Project URL */
    SUPABASE_URL: string;
    /** Supabase Anon Key (public, kein Secret) */
    SUPABASE_ANON_KEY: string;

    // ── Core: Globals (core/globals.js) ──
    /** Toast-Benachrichtigung anzeigen */
    showToast: (message: string, type?: ToastType) => void;
    /** XSS-sicheres HTML-Escaping */
    escH: (s: string | null | undefined) => string;
    /** Zahlenformat de-DE (z.B. 1.234,56) */
    fmtN: (n: number | string | null | undefined) => string;

    // ── Core: Router (core/router.js) ──
    /** View wechseln (z.B. 'homeView', 'verkaufView') */
    showView: (viewName: string) => void;
    /** i18n Translation Key → übersetzter String */
    t: (key: string) => string;
    /** Aktuelle UI-Sprache ('de' | 'en') */
    currentLang: VitLang;
    /** Aktuelle Rolle des Users */
    currentRole: string;
    /** Alle Rollen des Users */
    currentRoles: string[];
    /** Aktueller Standort-Name */
    currentLocation: string;
    /** Aktuelle Standort-ID (null für HQ) */
    currentStandortId: string | null;

    // ── Auth (views/auth-system.js) ──
    /** Session prüfen und bei Bedarf Login anzeigen */
    checkSession: () => Promise<void>;
    /** Login-Formular absenden */
    handleLogin: (event?: Event) => Promise<void>;
    /** User ausloggen */
    handleLogout: () => Promise<void>;
    /** Nach Login: App betreten, Daten laden */
    enterApp: () => void;
    /** Prüft ob User Zugriff auf ein Modul hat */
    hasAccess: (modul: string) => boolean;
    /** Als anderer User einloggen (HQ-only) */
    impersonateUser: (userId: string) => Promise<void>;
    /** Impersonation beenden */
    exitImpersonation: () => void;
    /** Passwort-ändern Modal anzeigen */
    showChangePasswordModal: () => void;
    /** Registrierungs-Formular anzeigen */
    showRegistration: () => void;
    /** Passwort-Reset anzeigen */
    showPasswordReset: () => void;

    // ── Dashboard (views/home.js) ──
    /** Dashboard-Widgets laden */
    loadDashboardWidgets: () => Promise<void>;
    /** Home-Widgets laden */
    loadHomeWidgets: () => Promise<void>;
    /** Widget zum Dashboard hinzufügen */
    addWidget: (widgetKey: string) => void;
    /** Dashboard-Bearbeitungsmodus ein/aus */
    toggleDashboardEdit: () => void;

    // ── Kalender (views/kalender.js) ──
    /** Kalender-Termine aus DB laden */
    loadKalTermine: () => Promise<void>;
    /** Kalender-Termin speichern */
    saveKalTermin: () => Promise<void>;
    /** Kalender-Termin löschen */
    deleteKalTermin: (terminId: string) => Promise<void>;
    /** Kalender: Monat vor/zurück navigieren */
    kalNav: (direction: number) => void;
    /** Kalender: Auf heute springen */
    kalGoToday: () => void;
    /** Tag-Modal öffnen (Neuer Termin) */
    openKalDayModal: (dateStr: string) => void;
    /** Kalender-Ansicht wechseln (Monat/Woche) */
    switchKalView: (view: string) => void;

    // ── Todos (views/todo.js) ──
    /** Todos aus DB laden */
    loadTodos: () => Promise<void>;
    /** Todo-Filter setzen (all/open/done/...) */
    todoSetFilter: (filter: string) => void;
    /** Todo-Ansicht wechseln (list/kanban) */
    todoSetView: (view: string) => void;
    /** Todo-Suche */
    todoSearchChanged: () => void;

    // ── Verkauf / CRM (views/verkauf.js + inline/react-deal-pipeline.jsx) ──
    /** Verkaufstracking speichern */
    saveTracking: () => Promise<void>;
    /** Verkaufs-Tab wechseln */
    showVerkaufTab: (tab: string) => void;
    /** Neues Verkaufs-Entry-Modal öffnen */
    openVerkaufEntryModal: () => void;
    /** React-Pipeline: Neuen Lead öffnen */
    openReactNewLead: () => void;
    /** React-Pipeline: Deal per ID öffnen (Deeplink) */
    openReactDealById: (dealId: string) => Promise<void>;

    // ── Controlling / BWA (views/controlling.js) ──
    /** BWA-Liste aus DB laden */
    loadBwaList: () => Promise<void>;
    /** BWA-Upload-Modal öffnen */
    openBwaUploadModal: () => void;
    /** BWA löschen */
    deleteBwa: (bwaId: string) => Promise<void>;
    /** Controlling-Tab wechseln */
    showControllingTab: (tab: string) => void;
    /** Ausgewählte BWA bearbeiten */
    editSelectedBwa: () => void;
    /** BWA-Parser Modul */
    BwaParser: { parse: (data: any, format?: string) => any };

    // ── Plan/Ist (views/plan-ist.js) ──
    /** Plan-Datei parsen */
    parsePlanFile: (file: File) => Promise<void>;
    /** Geparsten Plan speichern */
    saveParsedPlan: () => Promise<void>;
    /** Plan/Ist Jahr wechseln */
    planIstYear: (year: number) => void;

    // ── Kommunikation (views/kommunikation.js) ──
    /** Kommunikations-Tab wechseln */
    showKommTab: (tab: string) => void;
    /** Chat-Nachricht senden */
    kommSendMessage: () => Promise<void>;
    /** Neuen Chat starten */
    kommStartNewChat: () => void;

    // ── Einkauf (views/einkauf.js) ──
    showEinkaufTab: (tab: string) => void;

    // ── Marketing (inline/react-marketing.jsx) ──
    showMarketingTab: (tab: string) => void;

    // ── Wissen (views/wissen.js) ──
    filterWissenBereich: (bereich: string) => void;
    switchWissenTyp: (typ: string) => void;
    renderWissenTab: (tab: string) => void;
    showKursDetail: (kursId: string) => void;
    enrollKurs: (kursId: string) => Promise<void>;

    // ── Support (views/support.js) ──
    submitTicketForm: () => Promise<void>;
    showSupportTab: (tab: string) => void;
    filterTickets: (filter: string) => void;

    // ── Aktenschrank (views/aktenschrank.js) ──
    loadAktenschrank: () => Promise<void>;
    loadAktenFiles: () => Promise<void>;
    selectAktenOrdner: (ordnerId: string) => void;
    openAktenUpload: () => void;
    filterAkten: (filter: string) => void;
    viewAktenDoc: (docId: string) => void;
    deleteAktenDoc: (docId: string) => Promise<void>;

    // ── Allgemein / Jahresziele (views/allgemein.js) ──
    showAllgemeinTab: (tab: string) => void;
    loadAllgemeinData: () => Promise<void>;
    openJahreszielModal: (zielId?: string) => void;
    saveJahresziel: () => Promise<void>;
    openJournalModal: () => void;
    saveJournalEntry: () => Promise<void>;

    // ══════════════════════════════════════
    // HQ-Module
    // ══════════════════════════════════════

    renderHqCockpit: () => Promise<void>;
    loadHqStandorte: () => Promise<void>;
    hqStandorte: VitStandort[];
    renderHqFinanzen: () => Promise<void>;
    renderHqBwaStatus: () => Promise<void>;
    loadAdsData: () => Promise<void>;
    renderKommandozentrale: () => Promise<void>;
    showKommandoTab: (tab: string) => void;
    renderHqVerkauf: () => Promise<void>;
    showHqVkTab: (tab: string) => void;
    loadAllInvoices: () => Promise<void>;
    showBillingTab: (tab: string) => void;
    finalizeInvoice: (invoiceId: string) => Promise<void>;
    generateMonthlyDrafts: () => Promise<void>;
    showHqFeedbackTab: (tab: string) => void;
    filterHqFb: (filter: string) => void;
    updateFbStatus: (fbId: string, status: string) => Promise<void>;
    showSettingsTab: (tab: string) => void;
    renderModulStatus: () => void;
    filterModulStatus: (filter: string) => void;

    // ══════════════════════════════════════
    // System-Module
    // ══════════════════════════════════════

    renderPartnerMitarbeiter: () => Promise<void>;
    openNeuerMaModal: () => void;
    showMaTab: (tab: string) => void;
    ffFilter: (filter: string) => void;
    ffSave: () => Promise<void>;
    ffShowCreate: () => void;
    devSwitchTab: (tab: string) => void;
    submitDevIdea: () => Promise<void>;
    renderNotifications: () => void;
    filterNotif: (filter: string) => void;
    setupPushNotifications: () => Promise<void>;
    fbOpen: () => void;
    fbClose: () => void;
    fbSubmit: () => Promise<void>;
    fbSetCat: (cat: FeedbackKategorie) => void;

    // ── Globale Suche (inline/global-search.js) ──
    _openMobileSearch: () => void;
    _closeMobileSearch: () => void;
    _searchAction: (type: string, id: string) => void;

    // ── WaWi (views/wawi-integration.js) ──
    loadWawiDashboard: () => Promise<void>;
    loadWawiBelege: () => Promise<void>;
    showWawiSubTab: (tab: string) => void;

    // ── Schnittstellen (views/schnittstellen.js) ──
    renderSchnittstellen: () => void;
    showConnView: (connector: string) => void;
    loadEterminConfig: () => Promise<void>;

    // ── Video Pipeline (views/video-pipeline.js) ──
    vpShowVideoDetail: (videoId: string) => void;
    vpInitUpload: () => void;
    vpShowTagging: (videoId: string) => void;

    // ── Office / vit:space (views/office.js) ──
    _mountVitSpaceOffice: () => void;
    _offCheckIn: () => Promise<void>;
    _offCheckOut: () => Promise<void>;
    _offBookDesk: (deskId: string) => Promise<void>;
    showOfficeTab: (tab: string) => void;

    // ── Billing (views/standort-billing.js) ──
    initStandortBilling: () => Promise<void>;
    loadStandortInvoices: () => Promise<void>;
    showStBillingTab: (tab: string) => void;

    // ── UI Helpers ──
    toggleMobileSidebar: () => void;
    closeMobileSidebar: () => void;
    toggleSidebarCollapse: () => void;
    switchLang: (lang: VitLang) => void;
    installPWA: () => void;
    dismissInstall: () => void;
    getDateStr: (date: Date) => string;
    isPremium: () => boolean;

    // ══════════════════════════════════════
    // Fallback: Alle weiteren window-Exports
    // Erlaubt window.anyFunction() ohne TS-Fehler
    // ══════════════════════════════════════
    [key: string]: any;
  }
}

export {};
