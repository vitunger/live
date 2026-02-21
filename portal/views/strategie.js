/**
 * views/strategie.js - Kommandozentrale Render, Strategie, Onboarding, HQ-Shop
 * @module views/strategie
 */
var PORTAL_VERSION = window.PORTAL_VERSION || '7.2';

function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

export function renderKommandozentrale() {
    renderKzStandorte();
    renderKzMitarbeiter();
}
var currentLang = 'de';
// Restore saved language
(function(){ try { var sl = localStorage.getItem('vit-lang'); if(sl && ['de','en','nl'].indexOf(sl)!==-1) { currentLang = sl; document.documentElement.lang = sl; } } catch(e){} })();
var i18n = {
    de: {
        // Navigation
        nav_home:'Startseite', nav_dashboards:'Dashboards', nav_mainmenu:'Hauptmenü',
        nav_general:'Allgemein', nav_marketing:'Marketing', nav_purchasing:'Einkauf',
        nav_controlling:'Zahlen', nav_sales:'Verkauf', nav_filingcab:'Aktenschrank',
        nav_support:'Support', nav_communication:'Kommunikation', nav_knowledge:'Wissen', nav_shop:'Shop', h_purchasing:'EINKAUF', h_controlling:'ZAHLEN', h_filingcab:'AKTENSCHRANK', h_support:'SUPPORT', h_ideaboard:'IDEENBOARD', h_communication:'KOMMUNIKATION', h_forum:'FORUM', h_chat:'CHAT', h_calendar:'TERMINE', h_todos:'AUFGABEN', h_onboarding:'ONBOARDING', nav_ideaboard:'Ideenboard',
        nav_onboarding:'Onboarding', nav_hq_control:'HQ Steuerung',
        nav_hq_cockpit:'Netzwerk-Cockpit', nav_hq_locations:'Standorte',
        nav_hq_finance:'Finanzen', nav_hq_actions:'Handlungsbedarf', nav_hq_command:'Kommandozentrale', nav_hq_comm:'Kommunikation', nav_hq_campaigns:'Kampagnen', nav_hq_docs:'Dokumente', nav_hq_calendar:'Kalender', nav_hq_tasks:'Aufgaben', nav_hq_analytics:'Nutzung Portal', nav_calendar:'Kalender', nav_todo:'Aufgaben',
        // Headlines
        h_marketing:'MARKETING', h_sales:'VERKAUF', h_dashboards:'DASHBOARDS',
        h_leadreporting:'LEAD REPORTING',
        welcome:'Willkommen zurück, {name}!',
        // Dashboard
        dash_consultations:'Beratungen heute', dash_openoffers:'Offene Angebote',
        dash_opentickets:'Tickets offen',
        // Marketing tabs
        tab_campaigns:'Kampagnen', tab_socialmedia:'Social Media',
        tab_contentlib:'Content Library', tab_analytics:'Analytics',
        tab_strategy:'📋 Strategie', tab_knowledge:'📚 Wissen',
        // Social Media
        sm_channels:'📱 Unsere Kanäle', sm_topics:'🎬 Themen-Aufträge',
        sm_upload:'📤 Video hochladen', sm_ranking:'📊 Netzwerk-Ranking',
        sm_howto:"ℹ️ So funktioniert's",
        filter_all:'Alle', filter_new:'🆕 Neu für dich', filter_done:'✅ Erledigt',
        search_topic:'Thema suchen...',
        // Role
        role_seller:'Verkauf',
        // Buttons & Labels
        btn_shoot:'📤 Drehen', btn_upload_now:'📤 Dieses Thema jetzt drehen & hochladen',
        btn_submit:'🚀 Video einreichen', btn_to_channel:'Zum Kanal →',
        btn_follow:'Folgen', btn_subscribe:'Abonnieren',
        lbl_videos_shot:'Videos gedreht', lbl_topics:'Themen',
        lbl_streak:'🔥 Streak: 2 Wochen', lbl_rank:'🏆 Rang 5 von 21',
        lbl_next_badge:'⭐ Nächstes Badge: 5 Videos',
        lbl_hook:'🎣 Hook / Intro (erste 3 Sekunden)',
        lbl_main:'📋 Hauptteil – Was zeigen/erzählen',
        lbl_outro:'📣 Outro / Call-to-Action',
        lbl_hqtip:'💡 Tipp vom HQ-Marketing',
        lbl_example_video:'Beispielvideo ansehen',
        lbl_example_desc:'Schau dir an wie andere das gemacht haben – dann nachmachen!',
        lbl_watch:'Ansehen →', lbl_done_video:'✅ Du hast dieses Video bereits eingereicht!',
        lbl_difficulty:'Schwierigkeit',
        // Upload form
        upl_title:'Video hochladen', upl_desc:'Wähle ein Thema, lade dein Video hoch – fertig! Wir kümmern uns um Schnitt, Untertitel und Posting.',
        upl_select:'Thema wählen...', upl_own:'0000 – Eigener Vorschlag',
        upl_your_video:'Dein Video', upl_drag:'Video hierhin ziehen',
        upl_click:'oder klicken zum Auswählen', upl_comment:'Kurzer Kommentar',
        upl_comment_ph:"z.B. 'Haben das im Laden gedreht, Lichtsituation war schwierig'",
        upl_footer:'Das HQ schneidet euer Video, packt Untertitel drauf und postet es als Collab-Post auf eurem Profil.',
        // Ranking
        rank_title:'🏆 Content-Ranking – Wer dreht am meisten?',
        rank_badges:'🎖️ Badges', rank_stats:'📊 Netzwerk-Statistik',
        rank_total_vids:'Videos gesamt', rank_topics_covered:'Themen abgedeckt',
        rank_active:'Aktive Standorte', rank_no_video:'Noch ohne Video',
        // Howto
        howto_title:'So funktioniert Local Hero – in 3 Schritten',
        howto_step1:'1. Inspiration', howto_step1d:'Wir stellen Thema + Beispielvideo bereit',
        howto_step2:'2. Drehen & Upload', howto_step2d:'1-3 Min. Video mit dem Handy drehen und hier hochladen',
        howto_step3:'3. Schnitt & Posting', howto_step3d:'Wir schneiden, packen Untertitel drauf und posten als Collab',
        howto_tips:'💡 Tipps für gute Videos', howto_links:'🔗 Hilfreiche Links',
        // Local Hero header
        lh_title:'🎬 Local Hero – Content Strategie',
        lh_desc:'Dreh ein kurzes Video, lade es hoch – wir machen den Rest! Schnitt, Untertitel & Posting übernimmt das HQ.',
        // Channel cards
        ch_followers:'Follower', ch_posts:'Beiträge', ch_engagement:'Engagement',
        ch_subscribers:'Abonnenten', ch_videos:'Videos', ch_views:'Aufrufe',
        ch_likes:'Likes',
        // Badges
        badge_first:'Erster Upload', badge_3:'3 Videos', badge_5:'5 Videos',
        badge_10:'10 Videos', badge_25:'25 Videos', badge_50:'50 Videos',
        badge_reached:'✅ Erreicht', badge_almost:'Noch 1!', badge_locked:'Gesperrt',
        // Content themes
        lbl_content_theme:'Content-Thema w\u00e4hlen',
        // Generic
        optional:'(optional)',
        // === BWA Erinnerungen ===
        bwa_reminder_title:'BWA {monat} {jahr} einreichen',
        bwa_reminder_desc:'Die BWA f\u00fcr {monat} {jahr} muss bis zum {deadline} eingereicht werden. Bitte im Bereich Controlling hochladen.',
        bwa_reminder_urgent:'\u26A0\uFE0F DRINGEND: Die Deadline ist in wenigen Tagen!',
        bwa_reminder_overdue:'\uD83D\uDEA8 \u00dcBERF\u00c4LLIG! Bitte umgehend einreichen. Das HQ wird benachrichtigt.',
        bwa_banner_info:'BWA-Erinnerung: Bitte einreichen.',
        bwa_banner_warn:'BWA-Erinnerung: Deadline naht!',
        bwa_banner_urgent:'BWA dringend einreichen!',
        bwa_banner_overdue:'BWA \u00fcberf\u00e4llig! HQ wird informiert.',
        bwa_banner_missing:'Fehlend',
        bwa_banner_btn:'Jetzt einreichen',
        // === Todos ===
        todo_open:'Offen', todo_today:'Heute', todo_overdue:'\u00dcberf\u00e4llig', todo_done:'Erledigt',
        todo_no_tasks:'Keine Aufgaben', todo_add:'Aufgabe hinzuf\u00fcgen', todo_edit:'Bearbeiten',
        todo_delete:'L\u00f6schen', todo_save:'Speichern', todo_cancel:'Abbrechen',
        todo_title_ph:'Aufgabe eingeben...', todo_due:'F\u00e4llig', todo_prio:'Priorit\u00e4t',
        todo_cat:'Kategorie', todo_system:'System-Aufgabe', todo_manual:'Manuell',
        prio_high:'Hoch', prio_normal:'Normal', prio_low:'Niedrig', prio_urgent:'Dringend',
        cat_sales:'Verkauf', cat_workshop:'Werkstatt', cat_marketing:'Marketing',
        cat_admin:'Admin', cat_other:'Sonstig',
        // === Tickets ===
        ticket_new:'Neues Ticket', ticket_subject:'Betreff', ticket_desc:'Beschreibung',
        ticket_category:'Kategorie', ticket_priority:'Priorit\u00e4t', ticket_create:'Ticket erstellen',
        ticket_status_open:'Offen', ticket_status_progress:'In Bearbeitung',
        ticket_status_waiting:'Wartend', ticket_status_resolved:'Gel\u00f6st',
        ticket_comments:'Kommentare', ticket_comment_ph:'Kommentar schreiben...',
        ticket_comment_send:'Senden', ticket_change_status:'Status \u00e4ndern',
        ticket_mark_resolved:'Als gel\u00f6st markieren', ticket_no_tickets:'Keine Tickets',
        // === Controlling / BWA ===
        ctrl_bwa:'BWA', ctrl_trend:'Trend', ctrl_upload:'BWA hochladen',
        ctrl_month:'Monat', ctrl_year:'Jahr', ctrl_revenue:'Umsatz',
        ctrl_gross_profit:'Rohertrag', ctrl_costs:'Gesamtkosten', ctrl_result:'Ergebnis',
        ctrl_select_bwa:'BWA ausw\u00e4hlen', ctrl_edit:'Bearbeiten', ctrl_delete:'L\u00f6schen',
        // === Verkauf ===
        sales_week:'Wochenansicht', sales_pipeline:'Pipeline', sales_analysis:'Auswertung',
        sales_yearly:'Jahresplan', sales_plan:'Plan', sales_actual:'Ist',
        sales_consultations:'Beratungen', sales_sold:'Verkauft', sales_revenue:'Umsatz',
        sales_quote:'Quote', sales_all_sellers:'Alle Verk\u00e4ufer',
        sales_no_data:'Keine Verkaufsdaten f\u00fcr diese Woche',
        sales_add_entry:'Eintragen',
        // === Kommunikation ===
        comm_announcements:'Ank\u00fcndigungen', comm_board:'Schwarzes Brett',
        comm_forum:'Forum', comm_chat:'Chat',
        comm_new_announcement:'Neue Ank\u00fcndigung', comm_important:'Wichtig',
        comm_edit:'Bearbeiten', comm_delete:'L\u00f6schen', comm_publish:'Ver\u00f6ffentlichen',
        // === Dokumente ===
        doc_upload:'Dokument hochladen', doc_title:'Titel', doc_category:'Kategorie',
        doc_download:'Herunterladen', doc_delete:'L\u00f6schen', doc_select_file:'Datei ausw\u00e4hlen',
        doc_guidelines:'Richtlinien', doc_templates:'Vorlagen', doc_trainings:'Schulungen',
        doc_contracts:'Vertr\u00e4ge', doc_other:'Sonstiges',
        // === Shop ===
        shop_cart:'Warenkorb', shop_empty:'Warenkorb leer', shop_order:'Bestellen',
        shop_total:'Gesamt', shop_per_piece:'pro St\u00fcck', shop_remove:'Entfernen',
        // === Allgemein ===
        btn_save:'Speichern', btn_cancel:'Abbrechen', btn_close:'Schlie\u00dfen',
        btn_back:'Zur\u00fcck', btn_next:'Weiter', btn_confirm:'Best\u00e4tigen',
        loading:'Wird geladen...', error:'Fehler', success:'Erfolg',
        confirm_delete:'Wirklich l\u00f6schen?',
        // === Login ===
        login_title:'cockpit', login_email:'E-Mail', login_password:'Passwort',
        login_submit:'Anmelden', login_forgot:'Passwort vergessen?',
        login_reset_title:'Passwort zur\u00fccksetzen',
        login_reset_desc:'Gib deine E-Mail ein. Du erh\u00e4ltst einen Link zum Zur\u00fccksetzen.',
        login_reset_send:'Link senden', login_reset_sent:'E-Mail gesendet! Pr\u00fcfe deinen Posteingang.',
        pw_change_title:'Neues Passwort setzen',
        pw_change_desc:'Gib dein neues Passwort ein (mindestens 6 Zeichen).',
        pw_change_new:'Neues Passwort', pw_change_repeat:'Passwort wiederholen',
        pw_change_save:'Passwort speichern', pw_change_success:'Passwort erfolgreich ge\u00e4ndert!',
        pw_change_mismatch:'Passw\u00f6rter stimmen nicht \u00fcberein.',
        pw_change_min:'Mindestens 6 Zeichen.',
        // === Erweiterte Übersetzungen ===
        tr_followup_title:'Nachfass-Systematik',
        tr_followup_desc:'Offene Angebote systematisch nachfassen. Abschlussquote +10-15%.',
        tr_followup_trigger:'Abschlussquote unter Netzwerk-Ø',
        tr_bwa_title:'BWA richtig lesen',
        tr_bwa_desc:'Wichtigste BWA-Kennzahlen verstehen und Maßnahmen ableiten.',
        tr_bwa_trigger:'BWA hochgeladen',
        tr_content_title:'Content in 10 Minuten',
        tr_content_desc:'Local-Hero-Video in unter 10 Minuten erstellen.',
        tr_content_trigger:'Kein Content seit 14+ Tagen',
        tr_workshop_title:'Durchlaufzeit optimieren',
        tr_workshop_desc:'Durchlaufzeit reduzieren, Kundenzufriedenheit steigern.',
        tr_workshop_trigger:'Durchlaufzeit über Schwellwert',
        tr_leadqual_title:'Lead-Qualifizierung',
        tr_leadqual_desc:'Leads systematisch bewerten und priorisieren. Fokus auf kaufbereite Kunden.',
        tr_leadqual_trigger:'Leads/Woche unter Mindestwert',
        tr_margin_title:'Rohertrag steigern',
        tr_margin_desc:'Zubehör-Attach-Rate erhöhen. 2-3% mehr Rohertrag möglich.',
        tr_margin_trigger:'Rohertrag unter Netzwerk-Ø',
        tr_liquidity_title:'Liquiditätsplanung',
        tr_liquidity_desc:'Cashflow vorausplanen, Engpässe vermeiden.',
        tr_liquidity_trigger:'Liquidität unter Schwelle',
        tr_gmb_title:'Google My Business optimieren',
        tr_gmb_desc:'GMB-Profil vollständig pflegen. Mehr lokale Sichtbarkeit.',
        tr_gmb_trigger:'GMB Score unter 80%',
        tr_triggered:'Ausgelöst: ',
        tr_started:'🎓 Trainer gestartet!',
        tr_active:'Trainer aktiv',
        tr_min:'Min',
        tr_start_cta:'▶ Starten',
        tr_snooze:'⏰ Später',
        sol_it_title:'IT-Probleme? Probier zuerst:',
        sol_purchasing_title:'Einkauf – Häufige Lösung:',
        sol_accounting_title:'Buchhaltung – Schnellhilfe:',
        sol_marketing_title:'Marketing – Sofort-Hilfe:',
        sol_general_title:'Allgemein – Mögliche Lösung:',
        bill_generate_drafts:'📝 Monats-Drafts generieren',
        bill_confirm_drafts:'Monats-Drafts generieren?',
        bill_drafts_desc:'Dies erstellt Rechnungsentwürfe für alle Standorte mit gesperrter Jahresstrategie.',
        bill_quarterly:'📊 Quartals-Settlement',
        bill_confirm_quarterly:'Quartals-Settlement generieren?',
        bill_quarterly_desc:'Dies berechnet die Spitzenausgleiche basierend auf den vorliegenden BWA-Daten.',
        bill_quarterly_warn:'Fehlende BWA-Monate werden zu 100% Planbasis abgerechnet.',
        bill_finalize_all:'✅ Alle Drafts finalisieren',
        bill_confirm_finalize:'Alle Drafts finalisieren?',
        bill_finalize:'Rechnung finalisieren?',
        bill_mark_paid:'Als bezahlt markieren?',
        bill_remove_line:'Position entfernen?',
        bill_new_desc:'Beschreibung:',
        bill_new_amount:'Betrag (€):',
        bill_strategy_lock:'Strategie sperren? Danach kann sie nicht mehr bearbeitet werden und wird zur Berechnungsbasis.',
        bill_strategy_submitted:'✅ Jahresstrategie eingereicht',
        bill_valid_revenue:'Bitte gültigen Jahresumsatz eingeben',
        alert_error:'Fehler: ',
        alert_success:'Erfolg!',
        alert_fill_required:'Bitte alle Pflichtfelder ausfüllen.',
        alert_enter_email_pw:'Bitte E-Mail und Passwort eingeben.',
        alert_enter_subject:'Bitte Betreff eingeben.',
        alert_enter_title:'Bitte Titel eingeben.',
        alert_enter_name:'Bitte Name eingeben.',
        alert_enter_task:'Bitte Aufgabe eingeben.',
        alert_enter_comment:'Bitte Kommentar eingeben.',
        alert_enter_message:'Bitte Nachricht eingeben.',
        alert_enter_date:'Bitte Datum eingeben',
        alert_select_file:'Bitte Datei auswaehlen.',
        alert_select_location:'Bitte einen Standort wählen.',
        alert_enter_firstname:'Bitte Vorname, Nachname und E-Mail ausfüllen.',
        alert_min_role:'Mindestens eine Rolle nötig.',
        alert_already_voted:'Du hast bereits für diese Idee gestimmt!',
        alert_order_success:'Bestellung erfolgreich! 🎉',
        alert_pw_changed:'✅ Passwort geändert!',
        alert_push_unsupported:'Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.',
        alert_push_denied:'Push-Berechtigung wurde verweigert. Bitte in den Browser-Einstellungen aktivieren.',
        confirm_delete_post:'Beitrag wirklich löschen?',
        confirm_delete_bwa:'BWA wirklich loeschen?',
        confirm_delete_doc:'Dokument wirklich loeschen?',
        confirm_delete_event:'Termin wirklich löschen?',
        confirm_delete_goal:'Ziel wirklich löschen?',
        confirm_delete_entry:'Eintrag wirklich entfernen?',
        confirm_delete_protocol:'Protokoll wirklich löschen?',
        confirm_delete_section:'Sektion löschen? Aufgaben werden zu "Eingang" verschoben.',
        confirm_reject_user:'User wirklich ablehnen? Der Account wird gesperrt.',
        ui_uploading:'Wird hochgeladen...',
        ui_saving:'Speichern...',
        ui_signing_in:'Anmelden...',
        ui_sign_in:'Anmelden',
        ui_upload:'Hochladen',
        ui_save_bwa:'BWA speichern',
        ui_save_pw:'Passwort speichern',
        ui_pw_changed_redirect:'Passwort erfolgreich geaendert! Du wirst weitergeleitet...',
        ui_choose_recipient:'Empfänger wählen',
        ui_choose_location:'— Standort wählen —',
        ui_speak_now:'Sprich jetzt... Drücke ✓ zum Senden',
        ui_listening:'🎤 Hört zu...',
        ui_press_mic:'Drücke 🎤 oder tippe deine Antwort',
        health_rank:'Rang',
        health_of:'von',
        bwa_escalation3:'Eskalationsstufe 3 – BWA überfällig!',
        bwa_overdue:'🚨 Überfällig:',
        bwa_early_gold:'🥇 Frühabgabe = Gold-Status!',
        bwa_no_data_warning:'Ohne aktuelle Zahlen können wir dich nicht gezielt bei Einkauf, Marketing und Controlling unterstützen.',
        misc_ticket_load_error:'Fehler beim Laden des Tickets.',
        misc_no_permission:'Status konnte nicht geändert werden – keine Berechtigung.',
        misc_solution_try:'✅ Danke! Probiere die vorgeschlagene Lösung aus.',
        misc_group_call:'📋 Frage für den Gruppencall vorgemerkt!',
        misc_announcements_hq:'Ankündigungen von der Zentrale',
        misc_max_repeat:'Maximal 100 Wiederholungen erlaubt. Bitte kürzeren Zeitraum wählen.',
        misc_enter_name_slug:'Bitte Name und Slug ausfüllen.',
        misc_enter_title_date:'Bitte Titel und Datum angeben.',
        misc_enter_title_content:'Bitte Titel und Inhalt ausfuellen.',
        misc_enter_date_seller:'Bitte Datum und Verkaeufer eingeben.',
        misc_enter_revenue:'Bitte Plan-Umsatz eingeben',
        misc_enter_product:'Bitte Produktname eingeben',
        misc_min_month:'Bitte mindestens einen Monat ausfüllen.',
        misc_min_revenue:'Bitte mindestens Umsatz oder Wareneinsatz eingeben.',
        misc_assign_location:'Bitte einen Standort zuweisen.',
        misc_enter_valid_email:'Bitte gib eine gueltige E-Mail ein.',
        misc_doc_uploaded:'✅ Dokument hochgeladen!',
        misc_bwa_for:'BWA für',
        misc_min_8_chars:'Passwort muss mindestens 8 Zeichen haben.',
        // === Buchhaltung & PDF ===
        bill_tab_invoices:'📄 Rechnungen',
        bill_tab_payments:'💳 Zahlungsstatus',
        bill_tab_strategy:'🎯 Jahresstrategie',
        bill_tab_costs:'🔍 Kostenaufschlüsselung',
        bill_paid:'Bezahlt',
        bill_open:'Offen',
        bill_total_year:'Gesamt',
        bill_invoices:'Rechnungen',
        bill_payment_history:'📋 Zahlungsverlauf',
        bill_no_payments:'Noch keine Zahlungsdaten vorhanden',
        bill_paid_on:'Bezahlt am',
        bill_due_since:'Fällig seit',
        bill_status_paid:'Bezahlt',
        bill_status_finalized:'Finalisiert',
        bill_status_sent:'Versendet',
        bill_status_draft:'Entwurf',
        bill_no_invoices:'Noch keine Rechnungen vorhanden',
        bill_period:'Zeitraum',
        bill_back_overview:'← Zurück zur Übersicht',
        bill_how_calculated:'📐 So wurde deine Rechnung berechnet:',
        bill_position:'Position',
        bill_amount:'Betrag',
        bill_net:'Netto',
        bill_vat:'MwSt',
        bill_gross_total:'Gesamt',
        bill_pdf_invoice:'RECHNUNG',
        bill_pdf_date:'Rechnungsdatum',
        bill_pdf_period:'Leistungszeitraum',
        bill_pdf_qty:'Menge',
        bill_pdf_unit_price:'Einzelpreis',
        bill_pdf_net_amount:'Nettobetrag',
        bill_pdf_total:'Gesamtbetrag',
        bill_pdf_payment_terms:'Zahlungsziel: 14 Tage netto',
        bill_pdf_transfer:'Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer.',
        nav_billing:'Buchhaltung',
        nav_my_billing:'Meine Buchhaltung'
    },
    en: {
        nav_home:'Home', nav_dashboards:'Dashboards', nav_mainmenu:'Main Menu',
        nav_general:'General', nav_marketing:'Marketing', nav_purchasing:'Purchasing',
        nav_controlling:'Zahlen', nav_sales:'Sales', nav_filingcab:'Filing Cabinet',
        nav_support:'Support', nav_communication:'Communication', nav_knowledge:'Knowledge', nav_shop:'Merchandise Shop', h_purchasing:'PURCHASING', h_controlling:'ZAHLEN', h_filingcab:'FILE CABINET', h_support:'SUPPORT', h_ideaboard:'IDEA BOARD', h_communication:'COMMUNICATION', h_forum:'FORUM', h_chat:'CHAT', h_calendar:'CALENDAR', h_todos:'TASKS', h_onboarding:'ONBOARDING', nav_ideaboard:'Idea Board',
        nav_onboarding:'Onboarding', nav_hq_control:'HQ Control',
        nav_hq_cockpit:'Network Cockpit', nav_hq_locations:'Locations',
        nav_hq_finance:'Finance', nav_hq_actions:'Action Required', nav_hq_command:'Command Center', nav_hq_comm:'Communication', nav_hq_campaigns:'Campaigns', nav_hq_docs:'Documents', nav_hq_calendar:'Calendar', nav_hq_tasks:'Tasks', nav_hq_analytics:'Portal Usage', nav_calendar:'Calendar', nav_todo:'Tasks',
        h_marketing:'MARKETING', h_sales:'SALES', h_dashboards:'DASHBOARDS',
        h_leadreporting:'LEAD REPORTING',
        welcome:'Welcome back, {name}!',
        dash_consultations:'Consultations today', dash_openoffers:'Open offers',
        dash_opentickets:'Open tickets',
        tab_campaigns:'Campaigns', tab_socialmedia:'Social Media',
        tab_contentlib:'Content Library', tab_analytics:'Analytics',
        tab_strategy:'📋 Strategy', tab_knowledge:'📚 Knowledge',
        sm_channels:'📱 Our Channels', sm_topics:'🎬 Content Briefs',
        sm_upload:'📤 Upload Video', sm_ranking:'📊 Network Ranking',
        sm_howto:'ℹ️ How it works',
        filter_all:'All', filter_new:'🆕 New for you', filter_done:'✅ Completed',
        search_topic:'Search topic...',
        role_seller:'Sales Associate',
        btn_shoot:'📤 Shoot', btn_upload_now:'📤 Shoot & upload this topic now',
        btn_submit:'🚀 Submit video', btn_to_channel:'Go to channel →',
        btn_follow:'Follow', btn_subscribe:'Subscribe',
        lbl_videos_shot:'Videos recorded', lbl_topics:'Topics',
        lbl_streak:'🔥 Streak: 2 weeks', lbl_rank:'🏆 Rank 5 of 21',
        lbl_next_badge:'⭐ Next badge: 5 Videos',
        lbl_hook:'🎣 Hook / Intro (first 3 seconds)',
        lbl_main:'📋 Main Part – What to show/say',
        lbl_outro:'📣 Outro / Call-to-Action',
        lbl_hqtip:'💡 Tip from HQ Marketing',
        lbl_example_video:'Watch example video',
        lbl_example_desc:'See how others did it – then recreate it!',
        lbl_watch:'Watch →', lbl_done_video:'✅ You have already submitted this video!',
        lbl_difficulty:'Difficulty',
        upl_title:'Upload Video', upl_desc:'Choose a topic, upload your video – done! We handle editing, subtitles and posting.',
        upl_select:'Choose topic...', upl_own:'0000 – Own suggestion',
        upl_your_video:'Your Video', upl_drag:'Drag video here',
        upl_click:'or click to browse', upl_comment:'Short comment',
        upl_comment_ph:"e.g. 'Shot in the store, lighting was tricky'",
        upl_footer:'HQ edits your video, adds subtitles and posts it as a collab post on your profile.',
        rank_title:'🏆 Content Ranking – Who shoots the most?',
        rank_badges:'🎖️ Badges', rank_stats:'📊 Network Statistics',
        rank_total_vids:'Total videos', rank_topics_covered:'Topics covered',
        rank_active:'Active locations', rank_no_video:'No video yet',
        howto_title:'How Local Hero works – 3 simple steps',
        howto_step1:'1. Inspiration', howto_step1d:'We provide the topic + example video',
        howto_step2:'2. Shoot & Upload', howto_step2d:'Shoot 1-3 min. video with your phone and upload here',
        howto_step3:'3. Edit & Post', howto_step3d:'We edit, add subtitles and post as a collab',
        howto_tips:'💡 Tips for great videos', howto_links:'🔗 Helpful links',
        lh_title:'🎬 Local Hero – Content Strategy',
        lh_desc:'Shoot a quick video, upload it – we do the rest! Editing, subtitles & posting is handled by HQ.',
        ch_followers:'Followers', ch_posts:'Posts', ch_engagement:'Engagement',
        ch_subscribers:'Subscribers', ch_videos:'Videos', ch_views:'Views',
        ch_likes:'Likes',
        badge_first:'First Upload', badge_3:'3 Videos', badge_5:'5 Videos',
        badge_10:'10 Videos', badge_25:'25 Videos', badge_50:'50 Videos',
        badge_reached:'✅ Achieved', badge_almost:'1 more!', badge_locked:'Locked',
        lbl_content_theme:'Choose content topic',
        optional:'(optional)',
        // === BWA Reminders ===
        bwa_reminder_title:'Submit BWA {monat} {jahr}',
        bwa_reminder_desc:'The BWA for {monat} {jahr} must be submitted by {deadline}. Please upload in the Controlling section.',
        bwa_reminder_urgent:'\u26A0\uFE0F URGENT: The deadline is in a few days!',
        bwa_reminder_overdue:'\uD83D\uDEA8 OVERDUE! Please submit immediately. HQ will be notified.',
        bwa_banner_info:'BWA reminder: Please submit.',
        bwa_banner_warn:'BWA reminder: Deadline approaching!',
        bwa_banner_urgent:'Submit BWA urgently!',
        bwa_banner_overdue:'BWA overdue! HQ will be notified.',
        bwa_banner_missing:'Missing',
        bwa_banner_btn:'Submit now',
        // === Todos ===
        todo_open:'Open', todo_today:'Today', todo_overdue:'Overdue', todo_done:'Done',
        todo_no_tasks:'No tasks', todo_add:'Add task', todo_edit:'Edit',
        todo_delete:'Delete', todo_save:'Save', todo_cancel:'Cancel',
        todo_title_ph:'Enter task...', todo_due:'Due', todo_prio:'Priority',
        todo_cat:'Category', todo_system:'System task', todo_manual:'Manual',
        prio_high:'High', prio_normal:'Normal', prio_low:'Low', prio_urgent:'Urgent',
        cat_sales:'Sales', cat_workshop:'Workshop', cat_marketing:'Marketing',
        cat_admin:'Admin', cat_other:'Other',
        // === Tickets ===
        ticket_new:'New ticket', ticket_subject:'Subject', ticket_desc:'Description',
        ticket_category:'Category', ticket_priority:'Priority', ticket_create:'Create ticket',
        ticket_status_open:'Open', ticket_status_progress:'In Progress',
        ticket_status_waiting:'Waiting', ticket_status_resolved:'Resolved',
        ticket_comments:'Comments', ticket_comment_ph:'Write a comment...',
        ticket_comment_send:'Send', ticket_change_status:'Change status',
        ticket_mark_resolved:'Mark as resolved', ticket_no_tickets:'No tickets',
        // === Controlling / BWA ===
        ctrl_bwa:'BWA', ctrl_trend:'Trend', ctrl_upload:'Upload BWA',
        ctrl_month:'Month', ctrl_year:'Year', ctrl_revenue:'Revenue',
        ctrl_gross_profit:'Gross profit', ctrl_costs:'Total costs', ctrl_result:'Result',
        ctrl_select_bwa:'Select BWA', ctrl_edit:'Edit', ctrl_delete:'Delete',
        // === Sales ===
        sales_week:'Week view', sales_pipeline:'Pipeline', sales_analysis:'Analysis',
        sales_yearly:'Annual plan', sales_plan:'Plan', sales_actual:'Actual',
        sales_consultations:'Consultations', sales_sold:'Sold', sales_revenue:'Revenue',
        sales_quote:'Rate', sales_all_sellers:'All sellers',
        sales_no_data:'No sales data for this week',
        sales_add_entry:'Add entry',
        // === Communication ===
        comm_announcements:'Announcements', comm_board:'Bulletin board',
        comm_forum:'Forum', comm_chat:'Chat',
        comm_new_announcement:'New announcement', comm_important:'Important',
        comm_edit:'Edit', comm_delete:'Delete', comm_publish:'Publish',
        // === Documents ===
        doc_upload:'Upload document', doc_title:'Title', doc_category:'Category',
        doc_download:'Download', doc_delete:'Delete', doc_select_file:'Select file',
        doc_guidelines:'Guidelines', doc_templates:'Templates', doc_trainings:'Trainings',
        doc_contracts:'Contracts', doc_other:'Other',
        // === Shop ===
        shop_cart:'Shopping cart', shop_empty:'Cart is empty', shop_order:'Order',
        shop_total:'Total', shop_per_piece:'per piece', shop_remove:'Remove',
        // === General ===
        btn_save:'Save', btn_cancel:'Cancel', btn_close:'Close',
        btn_back:'Back', btn_next:'Next', btn_confirm:'Confirm',
        loading:'Loading...', error:'Error', success:'Success',
        confirm_delete:'Really delete?',
        // === Login ===
        login_title:'cockpit', login_email:'Email', login_password:'Password',
        login_submit:'Sign in', login_forgot:'Forgot password?',
        login_reset_title:'Reset password',
        login_reset_desc:'Enter your email. You will receive a link to reset your password.',
        login_reset_send:'Send link', login_reset_sent:'Email sent! Check your inbox.',
        pw_change_title:'Set new password',
        pw_change_desc:'Enter your new password (at least 6 characters).',
        pw_change_new:'New password', pw_change_repeat:'Repeat password',
        pw_change_save:'Save password', pw_change_success:'Password changed successfully!',
        pw_change_mismatch:'Passwords do not match.',
        pw_change_min:'At least 6 characters.',
        // === Extended translations ===
        tr_followup_title:'Follow-up System',
        tr_followup_desc:'Systematically follow up on open offers. Close rate +10-15%.',
        tr_followup_trigger:'Close rate below network average',
        tr_bwa_title:'Reading BWA correctly',
        tr_bwa_desc:'Understand key BWA metrics and derive actions.',
        tr_bwa_trigger:'BWA uploaded',
        tr_content_title:'Content in 10 minutes',
        tr_content_desc:'Create a Local Hero video in under 10 minutes.',
        tr_content_trigger:'No content for 14+ days',
        tr_workshop_title:'Optimize turnaround time',
        tr_workshop_desc:'Reduce turnaround time, increase customer satisfaction.',
        tr_workshop_trigger:'Turnaround time above threshold',
        tr_leadqual_title:'Lead Qualification',
        tr_leadqual_desc:'Systematically evaluate and prioritize leads. Focus on purchase-ready customers.',
        tr_leadqual_trigger:'Leads/week below minimum',
        tr_margin_title:'Increase gross margin',
        tr_margin_desc:'Increase accessory attach rate. 2-3% more gross margin possible.',
        tr_margin_trigger:'Gross margin below network average',
        tr_liquidity_title:'Liquidity planning',
        tr_liquidity_desc:'Plan cash flow ahead, avoid bottlenecks.',
        tr_liquidity_trigger:'Liquidity below threshold',
        tr_gmb_title:'Optimize Google My Business',
        tr_gmb_desc:'Maintain complete GMB profile. More local visibility.',
        tr_gmb_trigger:'GMB Score below 80%',
        tr_triggered:'Triggered: ',
        tr_started:'🎓 Trainer started!',
        tr_active:'Trainers active',
        tr_min:'min',
        tr_start_cta:'▶ Start',
        tr_snooze:'⏰ Later',
        sol_it_title:'IT problems? Try first:',
        sol_purchasing_title:'Purchasing – Common solution:',
        sol_accounting_title:'Accounting – Quick help:',
        sol_marketing_title:'Marketing – Instant help:',
        sol_general_title:'General – Possible solution:',
        bill_generate_drafts:'📝 Generate monthly drafts',
        bill_confirm_drafts:'Generate monthly drafts?',
        bill_drafts_desc:'This creates invoice drafts for all locations with locked annual strategies.',
        bill_quarterly:'📊 Quarterly settlement',
        bill_confirm_quarterly:'Generate quarterly settlement?',
        bill_quarterly_desc:'This calculates settlements based on available BWA data.',
        bill_quarterly_warn:'Missing BWA months will be billed at 100% plan basis.',
        bill_finalize_all:'✅ Finalize all drafts',
        bill_confirm_finalize:'Finalize all drafts?',
        bill_finalize:'Finalize invoice?',
        bill_mark_paid:'Mark as paid?',
        bill_remove_line:'Remove line item?',
        bill_new_desc:'Description:',
        bill_new_amount:'Amount (€):',
        bill_strategy_lock:'Lock strategy? It can no longer be edited and becomes the calculation basis.',
        bill_strategy_submitted:'✅ Annual strategy submitted',
        bill_valid_revenue:'Please enter a valid annual revenue',
        alert_error:'Error: ',
        alert_success:'Success!',
        alert_fill_required:'Please fill in all required fields.',
        alert_enter_email_pw:'Please enter email and password.',
        alert_enter_subject:'Please enter a subject.',
        alert_enter_title:'Please enter a title.',
        alert_enter_name:'Please enter a name.',
        alert_enter_task:'Please enter a task.',
        alert_enter_comment:'Please enter a comment.',
        alert_enter_message:'Please enter a message.',
        alert_enter_date:'Please enter a date',
        alert_select_file:'Please select a file.',
        alert_select_location:'Please select a location.',
        alert_enter_firstname:'Please fill in first name, last name and email.',
        alert_min_role:'At least one role required.',
        alert_already_voted:'You have already voted for this idea!',
        alert_order_success:'Order successful! 🎉',
        alert_pw_changed:'✅ Password changed!',
        alert_push_unsupported:'Push notifications are not supported by this browser.',
        alert_push_denied:'Push permission was denied. Please enable in browser settings.',
        confirm_delete_post:'Really delete this post?',
        confirm_delete_bwa:'Really delete this BWA?',
        confirm_delete_doc:'Really delete this document?',
        confirm_delete_event:'Really delete this event?',
        confirm_delete_goal:'Really delete this goal?',
        confirm_delete_entry:'Really remove this entry?',
        confirm_delete_protocol:'Really delete this protocol?',
        confirm_delete_section:'Delete section? Tasks will be moved to "Inbox".',
        confirm_reject_user:'Really reject user? The account will be blocked.',
        ui_uploading:'Uploading...',
        ui_saving:'Saving...',
        ui_signing_in:'Signing in...',
        ui_sign_in:'Sign in',
        ui_upload:'Upload',
        ui_save_bwa:'Save BWA',
        ui_save_pw:'Save password',
        ui_pw_changed_redirect:'Password changed successfully! Redirecting...',
        ui_choose_recipient:'Choose recipient',
        ui_choose_location:'— Select location —',
        ui_speak_now:'Speak now... Press ✓ to send',
        ui_listening:'🎤 Listening...',
        ui_press_mic:'Press 🎤 or type your answer',
        health_rank:'Rank',
        health_of:'of',
        bwa_escalation3:'Escalation level 3 – BWA overdue!',
        bwa_overdue:'🚨 Overdue:',
        bwa_early_gold:'🥇 Early submission = Gold status!',
        bwa_no_data_warning:'Without current figures, we cannot support you effectively in purchasing, marketing, and controlling.',
        misc_ticket_load_error:'Error loading ticket.',
        misc_no_permission:'Status could not be changed – no permission.',
        misc_solution_try:'✅ Thanks! Try the suggested solution.',
        misc_group_call:'📋 Question noted for the group call!',
        misc_announcements_hq:'Announcements from HQ',
        misc_max_repeat:'Maximum 100 repetitions allowed. Please choose a shorter period.',
        misc_enter_name_slug:'Please fill in name and slug.',
        misc_enter_title_date:'Please provide title and date.',
        misc_enter_title_content:'Please fill in title and content.',
        misc_enter_date_seller:'Please enter date and seller.',
        misc_enter_revenue:'Please enter planned revenue',
        misc_enter_product:'Please enter product name',
        misc_min_month:'Please fill in at least one month.',
        misc_min_revenue:'Please enter at least revenue or cost of goods.',
        misc_assign_location:'Please assign a location.',
        misc_enter_valid_email:'Please enter a valid email.',
        misc_doc_uploaded:'✅ Document uploaded!',
        misc_bwa_for:'BWA for',
        misc_min_8_chars:'Password must be at least 8 characters.',
        // === Buchhaltung & PDF ===
        bill_tab_invoices:'📄 Invoices',
        bill_tab_payments:'💳 Payment status',
        bill_tab_strategy:'🎯 Annual strategy',
        bill_tab_costs:'🔍 Cost breakdown',
        bill_paid:'Paid',
        bill_open:'Open',
        bill_total_year:'Total',
        bill_invoices:'Invoices',
        bill_payment_history:'📋 Payment history',
        bill_no_payments:'No payment data available yet',
        bill_paid_on:'Paid on',
        bill_due_since:'Due since',
        bill_status_paid:'Paid',
        bill_status_finalized:'Finalized',
        bill_status_sent:'Sent',
        bill_status_draft:'Draft',
        bill_no_invoices:'No invoices yet',
        bill_period:'Period',
        bill_back_overview:'← Back to overview',
        bill_how_calculated:'📐 How your invoice was calculated:',
        bill_position:'Line item',
        bill_amount:'Amount',
        bill_net:'Net',
        bill_vat:'VAT',
        bill_gross_total:'Total',
        bill_pdf_invoice:'INVOICE',
        bill_pdf_date:'Invoice date',
        bill_pdf_period:'Service period',
        bill_pdf_qty:'Qty',
        bill_pdf_unit_price:'Unit price',
        bill_pdf_net_amount:'Net amount',
        bill_pdf_total:'Total amount',
        bill_pdf_payment_terms:'Payment terms: 14 days net',
        bill_pdf_transfer:'Please transfer the amount stating the invoice number.',
        nav_billing:'Accounting',
        nav_my_billing:'My Accounting'
    },
    nl: {
        // Navigatie
        nav_home:'Startpagina', nav_dashboards:'Dashboards', nav_mainmenu:'Hoofdmenu',
        nav_general:'Algemeen', nav_marketing:'Marketing', nav_purchasing:'Inkoop',
        nav_controlling:'Zahlen', nav_sales:'Verkoop', nav_filingcab:'Documentenarchief',
        nav_support:'Ondersteuning', nav_communication:'Communicatie', nav_knowledge:'Kennis', nav_shop:'Promotieshop', h_purchasing:'INKOOP', h_controlling:'ZAHLEN', h_filingcab:'DOCUMENTENARCHIEF', h_support:'ONDERSTEUNING', h_ideaboard:'IDEE\u00cbNBORD', h_communication:'COMMUNICATIE', h_forum:'FORUM', h_chat:'CHAT', h_calendar:'AGENDA', h_todos:'TAKEN', h_onboarding:'ONBOARDING', nav_ideaboard:'Idee\u00ebnbord',
        nav_onboarding:'Onboarding', nav_hq_control:'HQ Beheer',
        nav_hq_cockpit:'Netwerk-Cockpit', nav_hq_locations:'Locaties',
        nav_hq_finance:'Financi\u00ebn', nav_hq_actions:'Actie vereist', nav_hq_command:'Commandocentrum', nav_hq_comm:'Communicatie', nav_hq_campaigns:'Campagnes', nav_hq_docs:'Documenten', nav_hq_calendar:'Agenda', nav_hq_tasks:'Taken', nav_hq_analytics:'Portaalgebruik', nav_calendar:'Agenda', nav_todo:'Taken',
        // Kopjes
        h_marketing:'MARKETING', h_sales:'VERKOOP', h_dashboards:'DASHBOARDS',
        h_leadreporting:'LEAD RAPPORTAGE',
        welcome:'Welkom terug, {name}!',
        // Dashboard
        dash_consultations:'Adviezen vandaag', dash_openoffers:'Openstaande offertes',
        dash_opentickets:'Open tickets',
        // Marketing tabs
        tab_campaigns:'Campagnes', tab_socialmedia:'Social Media',
        tab_contentlib:'Content Bibliotheek', tab_analytics:'Analytics',
        tab_strategy:'\ud83d\udccb Strategie', tab_knowledge:'\ud83d\udcda Kennis',
        // Social Media
        sm_channels:'\ud83d\udcf1 Onze kanalen', sm_topics:'\ud83c\udfac Content-opdrachten',
        sm_upload:'\ud83d\udce4 Video uploaden', sm_ranking:'\ud83d\udcca Netwerk-ranking',
        sm_howto:'\u2139\ufe0f Zo werkt het',
        filter_all:'Alle', filter_new:'\ud83c\udd95 Nieuw voor jou', filter_done:'\u2705 Afgerond',
        search_topic:'Onderwerp zoeken...',
        role_seller:'Verkoper',
        btn_shoot:'\ud83d\udce4 Filmen', btn_upload_now:'\ud83d\udce4 Dit onderwerp nu filmen & uploaden',
        btn_submit:'\ud83d\ude80 Video indienen', btn_to_channel:'Naar kanaal \u2192',
        btn_follow:'Volgen', btn_subscribe:'Abonneren',
        lbl_videos_shot:'Videos gemaakt', lbl_topics:'Onderwerpen',
        lbl_streak:'\ud83d\udd25 Reeks: 2 weken', lbl_rank:'\ud83c\udfc6 Rang 5 van 21',
        lbl_next_badge:'\u2b50 Volgende badge: 5 Videos',
        lbl_hook:'\ud83c\udfa3 Hook / Intro (eerste 3 seconden)',
        lbl_main:'\ud83d\udccb Hoofddeel \u2013 Wat laten zien/vertellen',
        lbl_outro:'\ud83d\udce3 Outro / Call-to-Action',
        lbl_hqtip:'\ud83d\udca1 Tip van HQ Marketing',
        lbl_example_video:'Voorbeeldvideo bekijken',
        lbl_example_desc:'Bekijk hoe anderen het deden \u2013 en doe het na!',
        lbl_watch:'Bekijken \u2192', lbl_done_video:'\u2705 Je hebt deze video al ingediend!',
        lbl_difficulty:'Moeilijkheid',
        upl_title:'Video uploaden', upl_desc:'Kies een onderwerp, upload je video \u2013 klaar! Wij zorgen voor montage, ondertiteling en publicatie.',
        upl_select:'Onderwerp kiezen...', upl_own:'0000 \u2013 Eigen voorstel',
        upl_your_video:'Jouw video', upl_drag:'Sleep video hierheen',
        upl_click:'of klik om te selecteren', upl_comment:'Kort commentaar',
        upl_comment_ph:"bijv. 'In de winkel gefilmd, belichting was lastig'",
        upl_footer:'HQ monteert je video, voegt ondertiteling toe en plaatst het als collab-post op je profiel.',
        rank_title:'\ud83c\udfc6 Content-ranking \u2013 Wie filmt het meest?',
        rank_badges:'\ud83c\udf96\ufe0f Badges', rank_stats:'\ud83d\udcca Netwerkstatistieken',
        rank_total_vids:'Totaal videos', rank_topics_covered:'Onderwerpen behandeld',
        rank_active:'Actieve locaties', rank_no_video:'Nog geen video',
        howto_title:'Zo werkt Local Hero \u2013 in 3 stappen',
        howto_step1:'1. Inspiratie', howto_step1d:'Wij leveren het onderwerp + voorbeeldvideo',
        howto_step2:'2. Filmen & Upload', howto_step2d:'Film 1-3 min. video met je telefoon en upload hier',
        howto_step3:'3. Montage & Publicatie', howto_step3d:'Wij monteren, voegen ondertiteling toe en publiceren als collab',
        howto_tips:'\ud83d\udca1 Tips voor goede videos', howto_links:'\ud83d\udd17 Handige links',
        lh_title:'\ud83c\udfac Local Hero \u2013 Content Strategie',
        lh_desc:'Film een korte video, upload het \u2013 wij doen de rest! Montage, ondertiteling & publicatie doet het HQ.',
        ch_followers:'Volgers', ch_posts:'Berichten', ch_engagement:'Betrokkenheid',
        ch_subscribers:'Abonnees', ch_videos:'Videos', ch_views:'Weergaven',
        ch_likes:'Likes',
        badge_first:'Eerste upload', badge_3:'3 Videos', badge_5:'5 Videos',
        badge_10:'10 Videos', badge_25:'25 Videos', badge_50:'50 Videos',
        badge_reached:'\u2705 Behaald', badge_almost:'Nog 1!', badge_locked:'Vergrendeld',
        lbl_content_theme:'Content-onderwerp kiezen',
        optional:'(optioneel)',
        // === BWA Herinneringen ===
        bwa_reminder_title:'BWA {monat} {jahr} indienen',
        bwa_reminder_desc:'De BWA voor {monat} {jahr} moet voor {deadline} ingediend worden. Upload in het onderdeel Controlling.',
        bwa_reminder_urgent:'\u26a0\ufe0f DRINGEND: De deadline is over een paar dagen!',
        bwa_reminder_overdue:'\ud83d\udea8 TE LAAT! Dien zo snel mogelijk in. HQ wordt ge\u00efnformeerd.',
        bwa_banner_info:'BWA-herinnering: Gelieve in te dienen.',
        bwa_banner_warn:'BWA-herinnering: Deadline nadert!',
        bwa_banner_urgent:'BWA dringend indienen!',
        bwa_banner_overdue:'BWA te laat! HQ wordt ge\u00efnformeerd.',
        bwa_banner_missing:'Ontbrekend',
        bwa_banner_btn:'Nu indienen',
        // === Taken ===
        todo_open:'Open', todo_today:'Vandaag', todo_overdue:'Te laat', todo_done:'Afgerond',
        todo_no_tasks:'Geen taken', todo_add:'Taak toevoegen', todo_edit:'Bewerken',
        todo_delete:'Verwijderen', todo_save:'Opslaan', todo_cancel:'Annuleren',
        todo_title_ph:'Taak invoeren...', todo_due:'Deadline', todo_prio:'Prioriteit',
        todo_cat:'Categorie', todo_system:'Systeemtaak', todo_manual:'Handmatig',
        prio_high:'Hoog', prio_normal:'Normaal', prio_low:'Laag', prio_urgent:'Dringend',
        cat_sales:'Verkoop', cat_workshop:'Werkplaats', cat_marketing:'Marketing',
        cat_admin:'Administratie', cat_other:'Overig',
        // === Tickets ===
        ticket_new:'Nieuw ticket', ticket_subject:'Onderwerp', ticket_desc:'Beschrijving',
        ticket_category:'Categorie', ticket_priority:'Prioriteit', ticket_create:'Ticket aanmaken',
        ticket_status_open:'Open', ticket_status_progress:'In behandeling',
        ticket_status_waiting:'Wachtend', ticket_status_resolved:'Opgelost',
        ticket_comments:'Reacties', ticket_comment_ph:'Reactie schrijven...',
        ticket_comment_send:'Verzenden', ticket_change_status:'Status wijzigen',
        ticket_mark_resolved:'Als opgelost markeren', ticket_no_tickets:'Geen tickets',
        // === Controlling / BWA ===
        ctrl_bwa:'BWA', ctrl_trend:'Trend', ctrl_upload:'BWA uploaden',
        ctrl_month:'Maand', ctrl_year:'Jaar', ctrl_revenue:'Omzet',
        ctrl_gross_profit:'Brutowinst', ctrl_costs:'Totale kosten', ctrl_result:'Resultaat',
        ctrl_select_bwa:'BWA selecteren', ctrl_edit:'Bewerken', ctrl_delete:'Verwijderen',
        // === Verkoop ===
        sales_week:'Weekoverzicht', sales_pipeline:'Pipeline', sales_analysis:'Analyse',
        sales_yearly:'Jaarplan', sales_plan:'Plan', sales_actual:'Werkelijk',
        sales_consultations:'Adviezen', sales_sold:'Verkocht', sales_revenue:'Omzet',
        sales_quote:'Percentage', sales_all_sellers:'Alle verkopers',
        sales_no_data:'Geen verkoopgegevens voor deze week',
        sales_add_entry:'Invoeren',
        // === Communicatie ===
        comm_announcements:'Aankondigingen', comm_board:'Prikbord',
        comm_forum:'Forum', comm_chat:'Chat',
        comm_new_announcement:'Nieuwe aankondiging', comm_important:'Belangrijk',
        comm_edit:'Bewerken', comm_delete:'Verwijderen', comm_publish:'Publiceren',
        // === Documenten ===
        doc_upload:'Document uploaden', doc_title:'Titel', doc_category:'Categorie',
        doc_download:'Downloaden', doc_delete:'Verwijderen', doc_select_file:'Bestand selecteren',
        doc_guidelines:'Richtlijnen', doc_templates:'Sjablonen', doc_trainings:'Trainingen',
        doc_contracts:'Contracten', doc_other:'Overig',
        // === Shop ===
        shop_cart:'Winkelwagen', shop_empty:'Winkelwagen leeg', shop_order:'Bestellen',
        shop_total:'Totaal', shop_per_piece:'per stuk', shop_remove:'Verwijderen',
        // === Algemeen ===
        btn_save:'Opslaan', btn_cancel:'Annuleren', btn_close:'Sluiten',
        btn_back:'Terug', btn_next:'Volgende', btn_confirm:'Bevestigen',
        loading:'Wordt geladen...', error:'Fout', success:'Gelukt',
        confirm_delete:'Echt verwijderen?',
        // === Login ===
        login_title:'Partner Portaal', login_email:'E-mail', login_password:'Wachtwoord',
        login_submit:'Inloggen', login_forgot:'Wachtwoord vergeten?',
        login_reset_title:'Wachtwoord resetten',
        login_reset_desc:'Voer je e-mailadres in. Je ontvangt een link om je wachtwoord te resetten.',
        login_reset_send:'Link verzenden', login_reset_sent:'E-mail verzonden! Controleer je inbox.',
        pw_change_title:'Nieuw wachtwoord instellen',
        pw_change_desc:'Voer je nieuwe wachtwoord in (minimaal 6 tekens).',
        pw_change_new:'Nieuw wachtwoord', pw_change_repeat:'Wachtwoord herhalen',
        pw_change_save:'Wachtwoord opslaan', pw_change_success:'Wachtwoord succesvol gewijzigd!',
        pw_change_mismatch:'Wachtwoorden komen niet overeen.',
        pw_change_min:'Minimaal 6 tekens.',
        // === Uitgebreide vertalingen ===
        tr_followup_title:'Opvolgsysteem',
        tr_followup_desc:'Openstaande offertes systematisch opvolgen. Sluitingspercentage +10-15%.',
        tr_followup_trigger:'Sluitingspercentage onder netwerkgemiddelde',
        tr_bwa_title:'BWA correct lezen',
        tr_bwa_desc:'Belangrijkste BWA-kengetallen begrijpen en acties afleiden.',
        tr_bwa_trigger:'BWA geüpload',
        tr_content_title:'Content in 10 minuten',
        tr_content_desc:'Maak een Local Hero-video in minder dan 10 minuten.',
        tr_content_trigger:'Geen content sinds 14+ dagen',
        tr_workshop_title:'Doorlooptijd optimaliseren',
        tr_workshop_desc:'Doorlooptijd verkorten, klanttevredenheid verhogen.',
        tr_workshop_trigger:'Doorlooptijd boven drempelwaarde',
        tr_leadqual_title:'Lead-kwalificatie',
        tr_leadqual_desc:'Leads systematisch beoordelen en prioriteren. Focus op koopklare klanten.',
        tr_leadqual_trigger:'Leads/week onder minimum',
        tr_margin_title:'Brutowinst verhogen',
        tr_margin_desc:'Accessoire-attach-rate verhogen. 2-3% meer brutowinst mogelijk.',
        tr_margin_trigger:'Brutowinst onder netwerkgemiddelde',
        tr_liquidity_title:'Liquiditeitsplanning',
        tr_liquidity_desc:'Cashflow vooruit plannen, knelpunten vermijden.',
        tr_liquidity_trigger:'Liquiditeit onder drempel',
        tr_gmb_title:'Google My Business optimaliseren',
        tr_gmb_desc:'Volledig GMB-profiel onderhouden. Meer lokale zichtbaarheid.',
        tr_gmb_trigger:'GMB Score onder 80%',
        tr_triggered:'Geactiveerd: ',
        tr_started:'🎓 Trainer gestart!',
        tr_active:'Trainers actief',
        tr_min:'min',
        tr_start_cta:'▶ Starten',
        tr_snooze:'⏰ Later',
        sol_it_title:'IT-problemen? Probeer eerst:',
        sol_purchasing_title:'Inkoop – Veelvoorkomende oplossing:',
        sol_accounting_title:'Boekhouding – Snelle hulp:',
        sol_marketing_title:'Marketing – Directe hulp:',
        sol_general_title:'Algemeen – Mogelijke oplossing:',
        bill_generate_drafts:'📝 Maand-concepten genereren',
        bill_confirm_drafts:'Maand-concepten genereren?',
        bill_drafts_desc:'Dit maakt factuurconcepten voor alle locaties met vergrendelde jaarstrategie.',
        bill_quarterly:'📊 Kwartaalafrekening',
        bill_confirm_quarterly:'Kwartaalafrekening genereren?',
        bill_quarterly_desc:'Dit berekent de verrekening op basis van beschikbare BWA-gegevens.',
        bill_quarterly_warn:'Ontbrekende BWA-maanden worden tegen 100% planbasis gefactureerd.',
        bill_finalize_all:'✅ Alle concepten afronden',
        bill_confirm_finalize:'Alle concepten afronden?',
        bill_finalize:'Factuur afronden?',
        bill_mark_paid:'Als betaald markeren?',
        bill_remove_line:'Positie verwijderen?',
        bill_new_desc:'Beschrijving:',
        bill_new_amount:'Bedrag (€):',
        bill_strategy_lock:'Strategie vergrendelen? Kan daarna niet meer worden bewerkt en wordt de berekeningsbasis.',
        bill_strategy_submitted:'✅ Jaarstrategie ingediend',
        bill_valid_revenue:'Voer een geldige jaaromzet in',
        alert_error:'Fout: ',
        alert_success:'Gelukt!',
        alert_fill_required:'Vul alle verplichte velden in.',
        alert_enter_email_pw:'Voer e-mail en wachtwoord in.',
        alert_enter_subject:'Voer een onderwerp in.',
        alert_enter_title:'Voer een titel in.',
        alert_enter_name:'Voer een naam in.',
        alert_enter_task:'Voer een taak in.',
        alert_enter_comment:'Voer een reactie in.',
        alert_enter_message:'Voer een bericht in.',
        alert_enter_date:'Voer een datum in',
        alert_select_file:'Selecteer een bestand.',
        alert_select_location:'Selecteer een locatie.',
        alert_enter_firstname:'Vul voornaam, achternaam en e-mail in.',
        alert_min_role:'Minimaal één rol vereist.',
        alert_already_voted:'Je hebt al op dit idee gestemd!',
        alert_order_success:'Bestelling geslaagd! 🎉',
        alert_pw_changed:'✅ Wachtwoord gewijzigd!',
        alert_push_unsupported:'Pushmeldingen worden niet ondersteund door deze browser.',
        alert_push_denied:'Pushtoestemming is geweigerd. Schakel in via browserinstellingen.',
        confirm_delete_post:'Bericht echt verwijderen?',
        confirm_delete_bwa:'BWA echt verwijderen?',
        confirm_delete_doc:'Document echt verwijderen?',
        confirm_delete_event:'Afspraak echt verwijderen?',
        confirm_delete_goal:'Doel echt verwijderen?',
        confirm_delete_entry:'Invoer echt verwijderen?',
        confirm_delete_protocol:'Protocol echt verwijderen?',
        confirm_delete_section:'Sectie verwijderen? Taken worden naar "Inbox" verplaatst.',
        confirm_reject_user:'Gebruiker echt afwijzen? Het account wordt geblokkeerd.',
        ui_uploading:'Wordt geüpload...',
        ui_saving:'Opslaan...',
        ui_signing_in:'Inloggen...',
        ui_sign_in:'Inloggen',
        ui_upload:'Uploaden',
        ui_save_bwa:'BWA opslaan',
        ui_save_pw:'Wachtwoord opslaan',
        ui_pw_changed_redirect:'Wachtwoord succesvol gewijzigd! Je wordt doorgestuurd...',
        ui_choose_recipient:'Ontvanger kiezen',
        ui_choose_location:'— Locatie kiezen —',
        ui_speak_now:'Spreek nu... Druk op ✓ om te verzenden',
        ui_listening:'🎤 Luistert...',
        ui_press_mic:'Druk op 🎤 of typ je antwoord',
        health_rank:'Rang',
        health_of:'van',
        bwa_escalation3:'Escalatieniveau 3 – BWA te laat!',
        bwa_overdue:'🚨 Te laat:',
        bwa_early_gold:'🥇 Vroege indiening = Gold-status!',
        bwa_no_data_warning:'Zonder actuele cijfers kunnen we je niet gericht ondersteunen bij inkoop, marketing en controlling.',
        misc_ticket_load_error:'Fout bij laden van ticket.',
        misc_no_permission:'Status kon niet worden gewijzigd – geen toestemming.',
        misc_solution_try:'✅ Bedankt! Probeer de voorgestelde oplossing.',
        misc_group_call:'📋 Vraag genoteerd voor de groepscall!',
        misc_announcements_hq:'Aankondigingen van het hoofdkantoor',
        misc_max_repeat:'Maximaal 100 herhalingen toegestaan. Kies een kortere periode.',
        misc_enter_name_slug:'Vul naam en slug in.',
        misc_enter_title_date:'Vul titel en datum in.',
        misc_enter_title_content:'Vul titel en inhoud in.',
        misc_enter_date_seller:'Voer datum en verkoper in.',
        misc_enter_revenue:'Voer geplande omzet in',
        misc_enter_product:'Voer productnaam in',
        misc_min_month:'Vul minimaal één maand in.',
        misc_min_revenue:'Voer minimaal omzet of wareneinkoop in.',
        misc_assign_location:'Wijs een locatie toe.',
        misc_enter_valid_email:'Voer een geldig e-mailadres in.',
        misc_doc_uploaded:'✅ Document geüpload!',
        misc_bwa_for:'BWA voor',
        misc_min_8_chars:'Wachtwoord moet minimaal 8 tekens bevatten.',
        // === Buchhaltung & PDF ===
        bill_tab_invoices:'📄 Facturen',
        bill_tab_payments:'💳 Betalingsstatus',
        bill_tab_strategy:'🎯 Jaarstrategie',
        bill_tab_costs:'🔍 Kostenoverzicht',
        bill_paid:'Betaald',
        bill_open:'Openstaand',
        bill_total_year:'Totaal',
        bill_invoices:'Facturen',
        bill_payment_history:'📋 Betalingsgeschiedenis',
        bill_no_payments:'Nog geen betalingsgegevens beschikbaar',
        bill_paid_on:'Betaald op',
        bill_due_since:'Verschuldigd sinds',
        bill_status_paid:'Betaald',
        bill_status_finalized:'Afgerond',
        bill_status_sent:'Verzonden',
        bill_status_draft:'Concept',
        bill_no_invoices:'Nog geen facturen beschikbaar',
        bill_period:'Periode',
        bill_back_overview:'← Terug naar overzicht',
        bill_how_calculated:'📐 Zo is je factuur berekend:',
        bill_position:'Positie',
        bill_amount:'Bedrag',
        bill_net:'Netto',
        bill_vat:'BTW',
        bill_gross_total:'Totaal',
        bill_pdf_invoice:'FACTUUR',
        bill_pdf_date:'Factuurdatum',
        bill_pdf_period:'Dienstverleningsperiode',
        bill_pdf_qty:'Aantal',
        bill_pdf_unit_price:'Stukprijs',
        bill_pdf_net_amount:'Nettobedrag',
        bill_pdf_total:'Totaalbedrag',
        bill_pdf_payment_terms:'Betalingstermijn: 14 dagen netto',
        bill_pdf_transfer:'Gelieve het bedrag over te maken onder vermelding van het factuurnummer.',
        nav_billing:'Boekhouding',
        nav_my_billing:'Mijn Boekhouding'
    }
};

// ========== WERBEMITTEL-SHOP ==========
var shopCart = [];
var shopCurrentFilter = 'all';
var shopAllProducts = [];
var shopVariants = {}; // product_id -> [variants]

export async function renderShop() {
    var container = document.getElementById('shopGrid');
    if(!container) return;
    try {
        if (shopAllProducts.length === 0) {
            var resp = await _sb().from('shop_products').select('*').eq('is_active', true).order('category');
            if(resp.error) throw resp.error;
            shopAllProducts = resp.data || [];
            // Load all variants
            var vResp = await _sb().from('shop_product_variants').select('*').order('sort_index');
            if(!vResp.error && vResp.data) {
                vResp.data.forEach(function(v) {
                    if(!shopVariants[v.product_id]) shopVariants[v.product_id] = [];
                    shopVariants[v.product_id].push(v);
                });
            }
        }
        var products = shopCurrentFilter === 'all' ? shopAllProducts : shopAllProducts.filter(function(p){ return p.category === shopCurrentFilter; });
            var catIcons = {print:'🖨️',textil:'👕',display:'🏪',digital:'💻',give:'🎁'};
        var html = '';
        products.forEach(function(p) {
            var variants = shopVariants[p.id] || [];
            var hasVariants = variants.length > 0;
            var totalStock = hasVariants ? variants.reduce(function(a,v){return a+v.stock},0) : null;
            var catIcons = {print:'\ud83d\udda8\ufe0f',textil:'\ud83d\udc55',display:'\ud83c\udfea',digital:'\ud83d\udcbb',give:'\ud83c\udf81'};
            
            html += '<div class="vit-card p-5 hover:shadow-md transition flex flex-col">';
            if (p.image_url) {
                html += '<div class="w-full h-40 rounded-lg mb-3 overflow-hidden bg-gray-50"><img src="'+p.image_url+'" alt="'+p.name+'" class="w-full h-full object-contain" onerror="this.parentNode.innerHTML=\'<div class=\\\'flex items-center justify-center h-full text-5xl\\\'>'+(catIcons[p.category]||'\ud83d\udecd\ufe0f')+'</div>\'"></div>';
            } else {
                html += '<div class="w-full h-40 bg-gradient-to-br from-gray-50 to-orange-50 rounded-lg mb-3 flex items-center justify-center text-5xl">' + (catIcons[p.category]||'\ud83d\udecd\ufe0f') + '</div>';
            }
            html += '<span class="text-xs font-semibold text-vit-orange uppercase">' + (p.category||'') + '</span>';
            html += '<h3 class="font-bold text-gray-800 text-sm mt-1">' + p.name + '</h3>';
            if(p.description) html += '<p class="text-xs text-gray-500 mt-1 line-clamp-2">' + p.description + '</p>';
            
            // Stock indicator
            if (hasVariants) {
                html += '<div class="mt-2">';
                if (totalStock === 0) {
                    html += '<span class="text-xs font-semibold text-red-500">Ausverkauft</span>';
                } else if (totalStock <= 5) {
                    html += '<span class="text-xs font-semibold text-amber-500">Nur noch ' + totalStock + ' auf Lager</span>';
                } else {
                    html += '<span class="text-xs text-green-600">\u2713 Auf Lager (' + totalStock + ')</span>';
                }
                html += '</div>';
            }
            
            // SIZE + QUANTITY GRID (for textil/variants)
            if (hasVariants && totalStock > 0) {
                html += '<div class="mt-3 space-y-1" id="sizeGrid_'+p.id+'" data-price="'+p.price+'">';
                html += '<div class="flex items-center text-[9px] text-gray-400 uppercase font-semibold mb-1"><span class="w-10">Gr\u00f6\u00dfe</span><span class="flex-1 text-center">Anzahl</span><span class="w-12 text-right">Lager</span></div>';
                variants.forEach(function(v) {
                    var oos = v.stock <= 0;
                    var inCart = shopCart.find(function(c){return c.variant_id===v.id;});
                    var cartQty = inCart ? inCart.menge : 0;
                    html += '<div class="flex items-center gap-1 '+(oos?'opacity-40':'')+'\">';
                    html += '<span class="w-10 text-[11px] font-bold '+(oos?'text-gray-300 line-through':'text-gray-700')+'">'+v.variant_name+'</span>';
                    if(!oos) {
                        html += '<div class="flex-1 flex items-center justify-center">';
                        html += '<button onclick="shopSizeQty(\''+p.id+'\',\''+v.id+'\',\''+v.variant_name+'\',-1,'+p.price+')" class="w-6 h-6 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs font-bold flex items-center justify-center">\u2212</button>';
                        html += '<input type="number" id="sqty_'+v.id+'" data-name="'+_escH(v.variant_name)+'" min="0" max="'+v.stock+'" value="'+cartQty+'" onchange="shopSizeQtyInput(\''+p.id+'\',\''+v.id+'\',\''+v.variant_name+'\',this.value,'+p.price+')" class="w-10 h-6 text-center text-xs font-bold border border-gray-200 rounded mx-1 '+(cartQty>0?'bg-orange-50 text-vit-orange border-vit-orange':'text-gray-600')+'">';
                        html += '<button onclick="shopSizeQty(\''+p.id+'\',\''+v.id+'\',\''+v.variant_name+'\',1,'+p.price+')" class="w-6 h-6 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs font-bold flex items-center justify-center">+</button>';
                        html += '</div>';
                        html += '<span class="w-12 text-right text-[10px] text-gray-400">'+v.stock+'</span>';
                    } else {
                        html += '<div class="flex-1 text-center text-[10px] text-gray-300">\u2014</div>';
                        html += '<span class="w-12 text-right text-[10px] text-gray-300">0</span>';
                    }
                    html += '</div>';
                });
                html += '</div>';
            }
            
            // Price + total for this product
            var productCartItems = shopCart.filter(function(c){return c.id===p.id;});
            var productCartTotal = productCartItems.reduce(function(s,c){return s + c.menge * c.preis;},0);
            var productCartQty = productCartItems.reduce(function(s,c){return s + c.menge;},0);
            
            html += '<div class="mt-auto pt-2 border-t border-gray-100" id="shopCardFooter_'+p.id+'">';
            html += '<div class="flex items-center justify-between mb-2">';
            html += '<span class="font-bold text-gray-800 text-lg">' + fmtEur(p.price) + '</span>';
            if(productCartQty > 0) {
                html += '<span class="text-xs font-bold text-vit-orange">\ud83d\uded2 '+productCartQty+' = '+fmtEur(productCartTotal)+'</span>';
            }
            html += '</div>';
            if(hasVariants) {
                html += '<button id="shopAddBtn_'+p.id+'" onclick="shopAddSelectedSizes(\''+p.id+'\',\''+_escH(p.name)+'\')" class="w-full py-2.5 bg-vit-orange text-white rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center justify-center space-x-2">\ud83d\uded2 In den Warenkorb</button>';
            } else {
                html += '<button onclick="addToCart(\''+p.id+'\',\''+_escH(p.name)+'\','+p.price+')" class="w-full py-2.5 bg-vit-orange text-white rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center justify-center space-x-2"><span>\ud83d\uded2</span><span>In den Warenkorb</span></button>';
            }
            html += '</div></div>';
        });
        if(products.length===0) html = '<div class="col-span-3 text-center py-8 text-gray-400">Keine Produkte in dieser Kategorie.</div>';
        container.innerHTML = html;
        renderShopCart();
    } catch(err) { console.error('Shop:', err); container.innerHTML = '<p class="text-center text-red-400 py-8">Fehler: '+err.message+'</p>'; }
}

var shopSelectedSizes = {}; // kept for backwards compat

export function shopSizeQty(productId, variantId, variantName, delta, price) {
    var input = document.getElementById('sqty_' + variantId);
    if(!input) { console.error('Input not found: sqty_' + variantId); return; }
    var current = parseInt(input.value) || 0;
    var mx = parseInt(input.max) || 99;
    var nv = current + delta;
    if(nv < 0) nv = 0;
    if(nv > mx) nv = mx;
    input.value = nv;
    input.style.backgroundColor = nv > 0 ? '#fff7ed' : '';
    input.style.color = nv > 0 ? '#ea580c' : '#4b5563';
    input.style.borderColor = nv > 0 ? '#ea580c' : 'var(--c-border)';
    // Update button text
    var grid = document.getElementById('sizeGrid_' + productId);
    if(grid) {
        var allInputs = grid.querySelectorAll('input[type="number"]');
        var totalQty = 0;
        allInputs.forEach(function(i) { totalQty += (parseInt(i.value) || 0); });
        var btn = document.getElementById('shopAddBtn_' + productId);
        if(btn) {
            if(totalQty > 0) {
                btn.textContent = '\ud83d\uded2 ' + totalQty + ' St\u00fcck in den Warenkorb (' + fmtEur(totalQty * price) + ')';
            } else {
                btn.textContent = '\ud83d\uded2 In den Warenkorb';
            }
        }
    }
}

export function shopSizeQtyInput(productId, variantId, variantName, val, price) {
    var input = document.getElementById('sqty_' + variantId);
    if(!input) return;
    var qty = parseInt(val) || 0;
    var mx = parseInt(input.max) || 99;
    if(qty < 0) qty = 0;
    if(qty > mx) qty = mx;
    input.value = qty;
    input.style.backgroundColor = qty > 0 ? '#fff7ed' : '';
    input.style.color = qty > 0 ? '#ea580c' : '#4b5563';
    input.style.borderColor = qty > 0 ? '#ea580c' : 'var(--c-border)';
    shopSizeQty(productId, variantId, variantName, 0, price);
}

export function shopAddSelectedSizes(productId, productName) {
    var grid = document.getElementById('sizeGrid_' + productId);
    if(!grid) return;
    var price = parseFloat(grid.dataset.price) || 0;
    var inputs = grid.querySelectorAll('input[type="number"]');
    var added = 0;
    inputs.forEach(function(inp) {
        var qty = parseInt(inp.value) || 0;
        if(qty <= 0) return;
        var vid = inp.id.replace('sqty_','');
        var vname = inp.dataset.name || vid;
        var cartKey = productId + '_' + vid;
        shopCart = shopCart.filter(function(c){ return c.cartKey !== cartKey; });
        shopCart.push({
            cartKey: cartKey,
            id: productId,
            variant_id: vid,
            variant_name: vname,
            name: productName + ' (' + vname + ')',
            preis: price,
            menge: qty
        });
        added += qty;
    });
    if(added === 0) { alert('Bitte w\u00e4hle mindestens eine Gr\u00f6\u00dfe aus.'); return; }
    renderShop();
}

export function shopUpdateSizeCart(productId, variantId, variantName, qty, price) {
    // Legacy - kept for compatibility
    var cartKey = productId + '_' + variantId;
    shopCart = shopCart.filter(function(c){ return c.cartKey !== cartKey; });
    if(qty > 0) {
        shopCart.push({
            cartKey: cartKey, id: productId, variant_id: variantId,
            variant_name: variantName, name: 'Produkt (' + variantName + ')',
            preis: price, menge: qty
        });
    }
    renderShopCart();
}

export function selectShopSize(productId, variantId, variantName) {
    // Legacy - now handled by shopSizeQty
}

export function updateCartQty(input) {
    var pid = input.dataset.pid;
    var vid = input.dataset.vid;
    var vname = input.dataset.vname;
    var pname = input.dataset.pname;
    var price = parseFloat(input.dataset.price);
    var qty = parseInt(input.value) || 0;
    var cartKey = pid + '_' + vid;
    
    // Remove existing
    shopCart = shopCart.filter(function(c){ return c.cartKey !== cartKey; });
    
    // Add if qty > 0
    if(qty > 0) {
        shopCart.push({
            cartKey: cartKey,
            id: pid,
            variant_id: vid,
            variant_name: vname,
            name: pname + ' (' + vname + ')',
            preis: price,
            menge: qty
        });
    }
    renderShopCart();
    // Update the border color of this input's parent
    var parent = input.closest('div');
    if(parent) {
        if(qty > 0) parent.className = parent.className.replace('border-gray-200','border-vit-orange bg-orange-50');
        else parent.className = parent.className.replace('border-vit-orange bg-orange-50','border-gray-200');
    }
    // Update cart count display on product card
    var cartCount = shopCart.filter(function(c){return c.id===pid;}).reduce(function(s,c){return s+c.menge;},0);
    // Just update the cart badge
    var countEl = document.getElementById('shopCartCount');
    if(countEl) countEl.textContent = shopCart.reduce(function(s,c){return s+c.menge;},0);
}

export function addToCartWithSize(productId, name, preis) {
    // Legacy - now handled by quantity inputs
    var sel = shopSelectedSizes[productId];
    if (!sel) return;
    // Check stock
    var variants = shopVariants[productId] || [];
    var variant = variants.find(function(v){return v.id===sel.variant_id});
    if (!variant || variant.stock <= 0) { alert('Diese Größe ist leider ausverkauft.'); return; }
    
    var cartKey = productId + '_' + sel.variant_id;
    var existing = shopCart.find(function(c){return c.cartKey===cartKey});
    if (existing) {
        if (existing.menge >= variant.stock) { alert('Maximal ' + variant.stock + ' verfügbar in Größe ' + sel.variant_name + '.'); return; }
        existing.menge++;
    } else {
        shopCart.push({ cartKey: cartKey, id: productId, variant_id: sel.variant_id, variant_name: sel.variant_name, name: name + ' (' + sel.variant_name + ')', preis: preis, menge: 1 });
    }
    renderShop();
}

export function addToCart(id, name, preis) {
    var existing = shopCart.find(function(c){return c.id===id && !c.variant_id});
    if(existing) { existing.menge++; } else { shopCart.push({cartKey:id, id:id, name:name, preis:preis, menge:1}); }
    renderShop();
}

export function renderShopCart() {
    var container = document.getElementById('shopCartItems');
    if(!container) return;
    if(shopCart.length===0) {
        container.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Warenkorb leer</p>';
        var totalEl = document.getElementById('shopCartTotal'); if(totalEl) totalEl.textContent = '0,00';
        var countEl = document.getElementById('shopCartCount'); if(countEl) countEl.textContent = '0';
        return;
    }
    var html = ''; var total = 0; var count = 0;
    shopCart.forEach(function(c) {
        total += c.preis * c.menge;
        count += c.menge;
        html += '<div class="flex items-center justify-between py-2 border-b border-gray-100">';
        html += '<div class="flex-1 min-w-0"><span class="text-sm font-medium text-gray-800 truncate block">' + c.name + '</span>';
        html += '<span class="text-xs text-gray-400">' + fmtEur(c.preis) + ' / St\u00fcck</span></div>';
        html += '<div class="flex items-center space-x-2 ml-3">';
        html += '<button onclick="updateShopCart(\x27'+c.cartKey+'\x27,-1)" class="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold">\u2212</button>';
        html += '<span class="text-sm font-bold w-6 text-center">' + c.menge + '</span>';
        html += '<button onclick="updateShopCart(\x27'+c.cartKey+'\x27,1)" class="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold">+</button>';
        html += '<span class="text-sm font-bold text-gray-800 w-16 text-right">' + fmtEur(c.preis*c.menge) + '</span>';
        html += '<button onclick="removeFromCart(\x27'+c.cartKey+'\x27)" class="text-gray-300 hover:text-red-500 ml-1">\u2715</button>';
        html += '</div></div>';
    });
    html += '<div class="flex justify-between pt-3 font-bold text-gray-800"><span>Gesamt (netto)</span><span>' + fmtEur(total) + '</span></div>';
    html += '<div class="flex justify-between text-xs text-gray-400"><span>zzgl. 19% MwSt</span><span>' + fmtEur(total*0.19) + '</span></div>';
    html += '<div class="flex justify-between pt-1 font-bold text-lg text-vit-orange"><span>Brutto</span><span>' + fmtEur(total*1.19) + '</span></div>';
    container.innerHTML = html;
    var totalEl = document.getElementById('shopCartTotal'); if(totalEl) totalEl.textContent = total.toFixed(2).replace('.',',');
    var countEl = document.getElementById('shopCartCount'); if(countEl) countEl.textContent = count;
}

export function filterShop(kat) {
    shopCurrentFilter = kat;
    document.querySelectorAll('.shop-filter-btn').forEach(function(b){b.className='shop-filter-btn text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn=document.querySelector('.shop-filter-btn[data-sf="'+kat+'"]');
    if(btn) btn.className='shop-filter-btn text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderShop();
}

export function showShopTab(tab) {
    document.querySelectorAll('.shop-main-tabcontent').forEach(function(el){el.style.display='none';});
    document.querySelectorAll('.shop-main-tab').forEach(function(b){b.className='shop-main-tab px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';});
    var tabEl = document.getElementById('shopTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if(tabEl) tabEl.style.display = 'block';
    var btn = document.querySelector('.shop-main-tab[data-tab="'+tab+'"]');
    if(btn) btn.className = 'shop-main-tab px-4 py-2.5 text-sm font-semibold border-b-2 border-vit-orange text-vit-orange';
    if(tab==='orders') loadMyShopOrders();
}

export async function loadMyShopOrders() {
    var el = document.getElementById('myShopOrders');
    if(!el) return;
    el.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
    try {
        var query = _sb().from('shop_orders').select('*, items:shop_order_items(quantity, product_name, variant_name, amount)').order('created_at', {ascending:false}).limit(20);
        if(sbStandort && sbStandort.id) query = query.eq('standort_id', sbStandort.id);
        var { data: orders, error } = await query;
        if(error) throw error;
        if(!orders || !orders.length) { el.innerHTML = '<p class="text-center text-gray-400 py-8">Noch keine Bestellungen aufgegeben.</p>'; return; }
    var statusC = {pending:'bg-yellow-100 text-yellow-700',confirmed:'bg-blue-100 text-blue-700',shipped:'bg-purple-100 text-purple-700',delivered:'bg-green-100 text-green-700',cancelled:'bg-gray-100 text-gray-400'};
    var statusL = {pending:'⏳ Wird bearbeitet',confirmed:'📋 In Vorbereitung',shipped:'🚚 Unterwegs',delivered:'✅ Zugestellt',cancelled:'❌ Storniert'};
    var statusStep = {pending:1,confirmed:2,shipped:3,delivered:4};
    var h = '';
    orders.forEach(function(o) {
        var step = statusStep[o.status] || 0;
        h += '<div class="vit-card p-5">';
        h += '<div class="flex items-center justify-between mb-3">';
        h += '<div><span class="font-mono text-sm font-bold text-gray-700">'+o.order_number+'</span>';
        h += '<span class="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold '+(statusC[o.status]||'')+'">'+(statusL[o.status]||o.status)+'</span></div>';
        h += '<span class="text-lg font-bold text-gray-800">'+fmtEur(o.total)+'</span></div>';
        
        // Progress bar
        h += '<div class="flex items-center space-x-1 mb-4">';
        ['Bestellt','Vorbereitung','Versendet','Zugestellt'].forEach(function(label, i) {
            var active = i < step;
            h += '<div class="flex-1"><div class="h-1.5 rounded-full '+(active?'bg-vit-orange':'bg-gray-200')+'"></div>';
            h += '<p class="text-[9px] text-center mt-0.5 '+(active?'text-vit-orange font-semibold':'text-gray-400')+'">'+label+'</p></div>';
        });
        h += '</div>';
        
        // Items
        h += '<div class="space-y-1 mb-3">';
        (o.items||[]).forEach(function(it) {
            h += '<div class="flex justify-between text-xs text-gray-600"><span>'+it.quantity+'x '+(it.variant_name?it.variant_name+' ':'')+it.product_name+'</span><span class="font-semibold">'+fmtEur(it.amount)+'</span></div>';
        });
        h += '</div>';
        
        // Tracking
        if(o.tracking_number) {
            var trackUrl = o.tracking_url || '#';
            h += '<a href="'+trackUrl+'" target="_blank" class="inline-flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700 hover:bg-blue-100">';
            h += '<span>🚚 '+(o.tracking_carrier||'Paket')+': <strong>'+o.tracking_number+'</strong></span>';
            h += '<span class="text-xs underline">Sendung verfolgen →</span></a>';
        }
        
        h += '<p class="text-xs text-gray-400 mt-2">Bestellt am '+fmtDate(o.created_at)+'</p>';
        h += '</div>';
    });
    el.innerHTML = h;
    } catch(err) { console.error('Shop orders:', err); el.innerHTML = '<p class="text-center text-gray-400 py-8">Fehler beim Laden: '+err.message+'</p>'; }
}

export async function submitShopOrder() {
    if(shopCart.length===0 || !sbUser) return;
    if(!confirm('Bestellung aufgeben? Die Rechnung wird automatisch erstellt und an deinen Standort gebucht.')) return;
    try {
        var subtotal = shopCart.reduce(function(a,c){return a+c.preis*c.menge},0);
        var taxAmount = Math.round(subtotal * 0.19 * 100) / 100;
        var total = Math.round((subtotal + taxAmount) * 100) / 100;
        var stId = sbStandort ? sbStandort.id : null;
        if(!stId) { alert('Kein Standort zugeordnet.'); return; }

        // 1. Create shop order
        var orderNum = 'SHOP-' + new Date().getFullYear() + '-' + Date.now().toString(36).toUpperCase();
        var { data: order, error: orderErr } = await _sb().from('shop_orders').insert({
            standort_id: stId,
            order_number: orderNum,
            subtotal: Math.round(subtotal*100)/100,
            tax_amount: taxAmount,
            total: total,
            ordered_by: _sbUser().id,
            notes: shopCart.map(function(c){return c.menge+'x '+c.name}).join(', ')
        }).select().single();
        if(orderErr) throw orderErr;

        // 2. Create order items
        var items = shopCart.map(function(c){
            return { order_id: order.id, product_id: c.id, product_name: c.name, quantity: c.menge, unit_price: c.preis, amount: c.preis*c.menge, variant_id: c.variant_id||null, variant_name: c.variant_name||null };
        });
        await _sb().from('shop_order_items').insert(items);

        // 2b. Decrement stock for variant items
        for (var ci = 0; ci < shopCart.length; ci++) {
            var cartItem = shopCart[ci];
            if (cartItem.variant_id) {
                try {
                    var stockResp = await sb.rpc('decrement_stock', { p_variant_id: cartItem.variant_id, p_qty: cartItem.menge });
                    if(stockResp.error) throw stockResp.error;
                } catch(stockErr) {
                    // Fallback: direct update
                    var currentVariants = shopVariants[cartItem.id] || [];
                    var matchV = currentVariants.find(function(v){return v.id===cartItem.variant_id});
                    var newStock = Math.max(0, (matchV ? matchV.stock : 0) - cartItem.menge);
                    await _sb().from('shop_product_variants').update({ stock: newStock }).eq('id', cartItem.variant_id);
                }
            }
        }

        // 3. Create billing invoice (shop_immediate type)
        var invNum = 'VB-SHOP-' + orderNum.split('-').pop();
        var today = new Date().toISOString().substring(0,10);
        var { data: inv, error: invErr } = await _sb().from('billing_invoices').insert({
            standort_id: stId,
            invoice_number: invNum,
            invoice_type: 'shop_immediate',
            period_start: today,
            period_end: today,
            subtotal: Math.round(subtotal*100)/100,
            tax_amount: taxAmount,
            total: total,
            status: 'finalized',
            finalized_at: new Date().toISOString(),
            due_date: new Date(Date.now() + 14*24*60*60*1000).toISOString().substring(0,10),
            notes: 'Shop-Bestellung ' + orderNum,
            calculated_snapshot: { order_id: order.id, order_number: orderNum, items: shopCart }
        }).select().single();

        if (!invErr && inv) {
            // Link order to invoice
            await _sb().from('shop_orders').update({ billing_invoice_id: inv.id, status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', order.id);

            // Create billing line items
            var billingLines = shopCart.map(function(c, idx){
                return { invoice_id: inv.id, description: c.name, quantity: c.menge, unit_price: c.preis, amount: c.preis*c.menge, editable: false, sort_index: idx+1 };
            });
            await _sb().from('billing_invoice_line_items').insert(billingLines);

            // 4. Auto-sync to LexOffice
            try {
                var syncResp = await fetch(SUPABASE_URL + '/functions/v1/lexoffice-sync', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + (await _sb().auth.getSession()).data.session.access_token, 'apikey': SUPABASE_ANON, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sync-invoice', invoice_id: inv.id })
                });
                var syncData = await syncResp.json();
                if(syncData.lexofficeId) console.log('Shop order synced to LexOffice:', syncData.lexofficeId);
            } catch(syncErr) { console.warn('LexOffice sync delayed:', syncErr); }
        }

        shopCart = [];
        shopAllProducts = [];
        shopVariants = {};
        shopSelectedSizes = {};
        document.getElementById('shopOrderModal').classList.remove('hidden');
        document.getElementById('shopOrderModalContent').innerHTML = 
            '<div class="text-center"><div class="text-5xl mb-3">✅</div>' +
            '<h3 class="font-bold text-xl text-gray-800 mb-2">Bestellung aufgegeben!</h3>' +
            '<p class="text-sm text-gray-500 mb-1">Bestellnr: <strong>' + orderNum + '</strong></p>' +
            '<p class="text-sm text-gray-500 mb-3">Betrag: <strong>' + fmtEur(total) + ' (brutto)</strong></p>' +
            '<p class="text-xs text-gray-400">Die Rechnung findest du unter Buchhaltung → Meine Rechnungen.</p></div>';
        renderShop();
    } catch(err) { alert('Fehler bei Bestellung: '+err.message); console.error(err); }
}

export function removeFromCart(cartKey) {
    shopCart = shopCart.filter(function(c){return c.cartKey!==cartKey;});
    renderShop();
}

export function updateShopCart(cartKey, delta) {
    var item = shopCart.find(function(c){return c.cartKey===cartKey;});
    if(!item) return;
    // Check stock for variant items
    if (delta > 0 && item.variant_id) {
        var variants = shopVariants[item.id] || [];
        var variant = variants.find(function(v){return v.id===item.variant_id});
        if (variant && item.menge >= variant.stock) { alert('Maximal ' + variant.stock + ' verfügbar.'); return; }
    }
    item.menge += delta;
    if(item.menge <= 0) shopCart = shopCart.filter(function(c){return c.cartKey!==cartKey;});
    renderShop();
}

// ========== HQ DRILL-DOWN: Switch to Partner view for a specific location ==========
export function hqDrillDown(locationKey) {
    // Switch to partner mode for that location
    var sel = document.getElementById('viewModeSwitch');
    if(sel) {
        // Find matching option
        var opts = sel.options;
        for(var i=0; i<opts.length; i++) {
            if(opts[i].value.indexOf(locationKey) > -1) {
                sel.value = opts[i].value;
                switchViewMode(opts[i].value);
                return;
            }
        }
    }
    // Fallback
    switchViewMode('partner_grafrath');
}

export function handleFileUpload(input) {
    if(input.files && input.files[0]) {
        var name = input.files[0].name;
        var size = (input.files[0].size/1024).toFixed(1);
        var parent = input.closest('[onclick]') || input.parentElement;
        if(parent) {
            var origHTML = parent.innerHTML;
            parent.innerHTML = '<div class="py-4"><p class="text-green-600 font-semibold text-sm">✅ '+name+'</p><p class="text-xs text-gray-400">'+size+' KB hochgeladen</p></div>';
        }
    }
}

// ============================================
// RUNTIME TRANSLATION DICTIONARY
// Translates hardcoded German text to EN/NL
// ============================================
var rtDict = {
  en: {
    // Navigation & Menu
    'Startseite':'Home','Kalender':'Calendar','Aufgaben':'Tasks','Kommunikation':'Communication',
    'Dashboards':'Dashboards','Verkauf':'Sales','Einkauf':'Purchasing','Marketing':'Marketing',
    'Zahlen':'Financials','Werkstatt':'Workshop','Buchhaltung':'Accounting','Aktenschrank':'Filing Cabinet',
    'Support':'Support','Wissen':'Knowledge','Ideenboard':'Idea Board','Onboarding':'Onboarding',
    'Einstellungen':'Settings','Profil':'Profile','Abmelden':'Log out','Forum':'Forum','Chat':'Chat',
    'Hauptmenü':'Main Menu','Allgemein':'General','Netzwerk-Cockpit':'Network Cockpit',
    'Standorte':'Locations','Finanzen':'Finance','Handlungsbedarf':'Action Required',
    'Kommandozentrale':'Command Center','Dokumente':'Documents','Nutzung Portal':'Portal Usage',
    // Common Actions
    'Speichern':'Save','Abbrechen':'Cancel','Löschen':'Delete','Bearbeiten':'Edit',
    'Schließen':'Close','Suchen':'Search','Filtern':'Filter','Hochladen':'Upload',
    'Herunterladen':'Download','Zurück':'Back','Weiter':'Next','Fertig':'Done',
    'Anlegen':'Create','Aktualisieren':'Update','Einreichen':'Submit',
    'Änderungen speichern':'Save changes','Passwort ändern':'Change password',
    'Abschicken':'Send','Anzeigen':'Show','Ausblenden':'Hide','Auswählen':'Select',
    'Hinzufügen':'Add','Entfernen':'Remove','Übernehmen':'Apply',
    // Status & Labels
    'Alle':'All','Offen':'Open','Erledigt':'Done','Gesamt':'Total','Heute':'Today',
    'Diesen Monat':'This month','Diese Woche':'This week','Neu':'New','Aktiv':'Active',
    'Geplant':'Planned','Finalisiert':'Finalized','Gesperrt':'Blocked','In Bearbeitung':'In progress',
    'Bezahlt':'Paid','Verkauft':'Sold','Umgesetzt':'Implemented','Abgeschlossen':'Completed',
    'Überfällig':'Overdue','Ausstehend':'Pending','Entwurf':'Draft','Archiviert':'Archived',
    // Business Terms
    'Umsatz':'Revenue','Beratungen':'Consultations','Angebote':'Offers','Tickets':'Tickets',
    'Mitarbeiter':'Employees','Standort':'Location','Netzwerk':'Network','Pipeline':'Pipeline',
    'Strategie':'Strategy','Budget':'Budget','Kampagnen':'Campaigns','Reichweite':'Reach',
    'Rohertrag':'Gross profit','Plan-Umsatz':'Planned revenue','Wareneinsatz':'Cost of goods',
    'Offene Angebote':'Open offers','Offene Tickets':'Open tickets','Offene Leads':'Open leads',
    'Beratungen heute':'Consultations today','Tickets offen':'Tickets open',
    // Form Labels
    'Kategorie':'Category','Status':'Status','Datum':'Date','Beschreibung':'Description',
    'Notizen':'Notes','Kommentar':'Comment','Name':'Name','E-Mail':'Email','Telefon':'Phone',
    'Position':'Position','Rolle':'Role','Passwort':'Password','Betrag':'Amount',
    'Menge':'Quantity','Netto':'Net','Kosten':'Cost','Typ':'Type','Aktion':'Action',
    'Monat':'Month','Details':'Details','Titel':'Title','Inhalt':'Content','Priorität':'Priority',
    'Fällig':'Due','Zugewiesen':'Assigned','Erstellt':'Created',
    // Video Pipeline
    'Deine Videos':'Your Videos','Video hochladen':'Upload video','Videos einreichen':'Submit videos',
    'Kurzer Kommentar':'Short comment','Meine Videos':'My videos',
    'Themen-Aufträge':'Content briefs','Unsere Kanäle':'Our channels',
    'Netzwerk-Ranking':'Network ranking','Noch keine Videos hochgeladen.':'No videos uploaded yet.',
    'Erstes Video hochladen':'Upload first video','Video auswaehlen':'Select video',
    'Videos hierhin ziehen':'Drag videos here','oder klicken zum Auswaehlen':'or click to browse',
    'Mehrfachauswahl moeglich':'Multiple selection possible',
    'Hochladen:':'Uploading:','Speichern...':'Saving...','hochgeladen':'uploaded',
    'VIDEO AUSGEWAEHLT':'VIDEO SELECTED','VIDEOS AUSGEWAEHLT':'VIDEOS SELECTED',
    // Marketing
    'Cockpit':'Cockpit','Social Media':'Social Media','Wissen':'Knowledge',
    'Performance':'Performance','Content Library':'Content Library',
    // Dashboard
    'Dashboard anpassen':'Customize dashboard','Meine Pipeline':'My pipeline',
    'Marketing Performance':'Marketing Performance',
    // Controlling / BWA
    'BWA hochladen':'Upload BWA','BWA auswaehlen':'Select BWA',
    'Bitte Datei auswaehlen.':'Please select a file.',
    // Profile
    'Erscheinungsbild':'Appearance','E-Mail-Benachrichtigungen':'Email notifications',
    'BWA-Erinnerungen':'BWA reminders','Lead-Benachrichtigungen':'Lead notifications',
    'Trainer-Erinnerungen':'Trainer reminders','Gruppencall-Erinnerungen':'Group call reminders',
    'Push-Benachrichtigungen aktivieren':'Enable push notifications',
    // Errors & Messages
    'Fehler beim Laden':'Error loading','Keine Daten vorhanden':'No data available',
    'Wird geladen...':'Loading...','Bitte warten...':'Please wait...',
    'Nicht eingeloggt':'Not logged in','Kein Zugriff':'No access',
    'Fehler:':'Error:','Bitte alle Pflichtfelder ausfüllen.':'Please fill in all required fields.',
    'Profil gespeichert!':'Profile saved!','Änderungen gespeichert!':'Changes saved!',
    // Time
    'gerade eben':'just now','Std.':'hrs','Tagen':'days','Minuten':'min',
    'Montag':'Monday','Dienstag':'Tuesday','Mittwoch':'Wednesday',
    'Donnerstag':'Thursday','Freitag':'Friday','Samstag':'Saturday','Sonntag':'Sunday',
    'Januar':'January','Februar':'February','März':'March','April':'April',
    'Mai':'May','Juni':'June','Juli':'July','August':'August',
    'September':'September','Oktober':'October','November':'November','Dezember':'December',
    // Misc
    'DEMO-MODUS':'DEMO MODE',
    'Dieses Modul zeigt Beispieldaten zur Veranschaulichung. Die dargestellten Inhalte sind nicht real.':
      'This module shows sample data for illustration. The displayed content is not real.',
    'Sonstiges':'Other','Probefahrt':'Test ride','Werkstatt':'Workshop','Event':'Event',
    'Bestandskunde':'Existing customer','Cargo':'Cargo',
    'Dein Standort':'Your location','Lieferant':'Supplier','Kontakt':'Contact',
    'Schulung':'Training','Pflicht':'Required','Modul':'Module',
    'Vorname':'First name','Nachname':'Last name',
    'Mehr anzeigen':'Show more','Weniger anzeigen':'Show less',
    'Sortieren':'Sort','Exportieren':'Export','Drucken':'Print',
    'Ja':'Yes','Nein':'No','OK':'OK',
    // HQ Marketing tabs & compound words with 'Ja' (must be in dict so longer match wins)
    'Jahresgespräche':'Annual Reviews','Jahresgespraech':'Annual Review','Jahresbudget':'Annual Budget',
    'Budget-Steuerung':'Budget Management','Lead Reporting':'Lead Reporting',
    'Video-Freigabe':'Video Approval','Action Required':'Action Required',
    'Übersicht':'Overview',
  },
  nl: {
    // Navigation & Menu
    'Startseite':'Startpagina','Kalender':'Kalender','Aufgaben':'Taken','Kommunikation':'Communicatie',
    'Dashboards':'Dashboards','Verkauf':'Verkoop','Einkauf':'Inkoop','Marketing':'Marketing',
    'Zahlen':'Cijfers','Werkstatt':'Werkplaats','Buchhaltung':'Boekhouding','Aktenschrank':'Archiefkast',
    'Support':'Support','Wissen':'Kennis','Ideenboard':'Ideeënbord','Onboarding':'Onboarding',
    'Einstellungen':'Instellingen','Profil':'Profiel','Abmelden':'Uitloggen','Forum':'Forum','Chat':'Chat',
    'Hauptmenü':'Hoofdmenu','Allgemein':'Algemeen','Netzwerk-Cockpit':'Netwerk-cockpit',
    'Standorte':'Locaties','Finanzen':'Financiën','Handlungsbedarf':'Actie vereist',
    'Kommandozentrale':'Commandocentrum','Dokumente':'Documenten','Nutzung Portal':'Portaalgebruik',
    // Common Actions
    'Speichern':'Opslaan','Abbrechen':'Annuleren','Löschen':'Verwijderen','Bearbeiten':'Bewerken',
    'Schließen':'Sluiten','Suchen':'Zoeken','Filtern':'Filteren','Hochladen':'Uploaden',
    'Herunterladen':'Downloaden','Zurück':'Terug','Weiter':'Volgende','Fertig':'Klaar',
    'Anlegen':'Aanmaken','Aktualisieren':'Bijwerken','Einreichen':'Indienen',
    'Änderungen speichern':'Wijzigingen opslaan','Passwort ändern':'Wachtwoord wijzigen',
    'Abschicken':'Versturen','Anzeigen':'Tonen','Ausblenden':'Verbergen','Auswählen':'Selecteren',
    'Hinzufügen':'Toevoegen','Entfernen':'Verwijderen','Übernehmen':'Toepassen',
    // Status & Labels
    'Alle':'Alle','Offen':'Open','Erledigt':'Afgerond','Gesamt':'Totaal','Heute':'Vandaag',
    'Diesen Monat':'Deze maand','Diese Woche':'Deze week','Neu':'Nieuw','Aktiv':'Actief',
    'Geplant':'Gepland','Finalisiert':'Afgerond','Gesperrt':'Geblokkeerd','In Bearbeitung':'In behandeling',
    'Bezahlt':'Betaald','Verkauft':'Verkocht','Umgesetzt':'Geïmplementeerd','Abgeschlossen':'Voltooid',
    'Überfällig':'Achterstallig','Ausstehend':'In afwachting','Entwurf':'Concept','Archiviert':'Gearchiveerd',
    // Business Terms
    'Umsatz':'Omzet','Beratungen':'Adviesgesprekken','Angebote':'Offertes','Tickets':'Tickets',
    'Mitarbeiter':'Medewerkers','Standort':'Locatie','Netzwerk':'Netwerk','Pipeline':'Pipeline',
    'Strategie':'Strategie','Budget':'Budget','Kampagnen':'Campagnes','Reichweite':'Bereik',
    'Rohertrag':'Brutowinst','Plan-Umsatz':'Geplande omzet','Wareneinsatz':'Inkoopwaarde',
    'Offene Angebote':'Open offertes','Offene Tickets':'Open tickets','Offene Leads':'Open leads',
    'Beratungen heute':'Adviesgesprekken vandaag','Tickets offen':'Tickets open',
    // Form Labels
    'Kategorie':'Categorie','Status':'Status','Datum':'Datum','Beschreibung':'Beschrijving',
    'Notizen':'Notities','Kommentar':'Opmerking','Name':'Naam','E-Mail':'E-mail','Telefon':'Telefoon',
    'Position':'Positie','Rolle':'Rol','Passwort':'Wachtwoord','Betrag':'Bedrag',
    'Menge':'Aantal','Netto':'Netto','Kosten':'Kosten','Typ':'Type','Aktion':'Actie',
    'Monat':'Maand','Details':'Details','Titel':'Titel','Inhalt':'Inhoud','Priorität':'Prioriteit',
    'Fällig':'Vervaldatum','Zugewiesen':'Toegewezen','Erstellt':'Aangemaakt',
    // Video Pipeline
    'Deine Videos':'Je video\'s','Video hochladen':'Video uploaden','Videos einreichen':'Video\'s indienen',
    'Kurzer Kommentar':'Kort commentaar','Meine Videos':'Mijn video\'s',
    'Themen-Aufträge':'Thema-opdrachten','Unsere Kanäle':'Onze kanalen',
    'Netzwerk-Ranking':'Netwerkranking','Noch keine Videos hochgeladen.':'Nog geen video\'s geüpload.',
    'Erstes Video hochladen':'Eerste video uploaden','Video auswaehlen':'Video selecteren',
    'Videos hierhin ziehen':'Sleep video\'s hierheen','oder klicken zum Auswaehlen':'of klik om te selecteren',
    'Mehrfachauswahl moeglich':'Meerdere selectie mogelijk',
    'Hochladen:':'Uploaden:','Speichern...':'Opslaan...','hochgeladen':'geüpload',
    'VIDEO AUSGEWAEHLT':'VIDEO GESELECTEERD','VIDEOS AUSGEWAEHLT':'VIDEO\'S GESELECTEERD',
    // Dashboard
    'Dashboard anpassen':'Dashboard aanpassen','Meine Pipeline':'Mijn pipeline',
    // Profile
    'Erscheinungsbild':'Uiterlijk','E-Mail-Benachrichtigungen':'E-mailmeldingen',
    'BWA-Erinnerungen':'BWA-herinneringen','Lead-Benachrichtigungen':'Leadmeldingen',
    'Trainer-Erinnerungen':'Trainerherinneringen','Gruppencall-Erinnerungen':'Groepsgesprekherinneringen',
    'Push-Benachrichtigungen aktivieren':'Pushmeldingen activeren',
    // Errors & Messages
    'Fehler beim Laden':'Fout bij laden','Keine Daten vorhanden':'Geen gegevens beschikbaar',
    'Wird geladen...':'Laden...','Bitte warten...':'Even geduld...',
    'Nicht eingeloggt':'Niet ingelogd','Kein Zugriff':'Geen toegang',
    'Fehler:':'Fout:','Bitte alle Pflichtfelder ausfüllen.':'Vul alle verplichte velden in.',
    'Profil gespeichert!':'Profiel opgeslagen!','Änderungen gespeichert!':'Wijzigingen opgeslagen!',
    // Time
    'gerade eben':'zojuist','Std.':'uur','Tagen':'dagen','Minuten':'min',
    'Montag':'Maandag','Dienstag':'Dinsdag','Mittwoch':'Woensdag',
    'Donnerstag':'Donderdag','Freitag':'Vrijdag','Samstag':'Zaterdag','Sonntag':'Zondag',
    'Januar':'Januari','Februar':'Februari','März':'Maart','April':'April',
    'Mai':'Mei','Juni':'Juni','Juli':'Juli','August':'Augustus',
    'September':'September','Oktober':'Oktober','November':'November','Dezember':'December',
    // Misc
    'DEMO-MODUS':'DEMOMODUS',
    'Dieses Modul zeigt Beispieldaten zur Veranschaulichung. Die dargestellten Inhalte sind nicht real.':
      'Deze module toont voorbeeldgegevens ter illustratie. De getoonde inhoud is niet echt.',
    'Sonstiges':'Overig','Probefahrt':'Proefrit','Event':'Evenement',
    'Bestandskunde':'Bestaande klant','Cargo':'Cargo',
    'Dein Standort':'Jouw locatie','Lieferant':'Leverancier','Kontakt':'Contact',
    'Schulung':'Training','Pflicht':'Verplicht','Modul':'Module',
    'Vorname':'Voornaam','Nachname':'Achternaam',
    'Mehr anzeigen':'Meer tonen','Weniger anzeigen':'Minder tonen',
    'Sortieren':'Sorteren','Exportieren':'Exporteren','Drucken':'Afdrukken',
    'Ja':'Ja','Nein':'Nee','OK':'OK',
    // HQ Marketing tabs & compound words
    'Jahresgespräche':'Jaargesprekken','Jahresgespraech':'Jaargesprek','Jahresbudget':'Jaarbudget',
    'Budget-Steuerung':'Budgetbeheer','Lead Reporting':'Lead Rapportage',
    'Video-Freigabe':'Video Goedkeuring','Action Required':'Actie vereist',
    'Übersicht':'Overzicht',
  }
};

// Runtime DOM translator - walks the DOM and replaces German text
export function translateDOM(lang) {
    if(lang === 'de' || !rtDict[lang]) return; // German is source, no translation needed
    var dict = rtDict[lang];
    // Sort keys by length descending to match longer phrases first
    var keys = Object.keys(dict).sort(function(a,b){ return b.length - a.length; });
    
    // Helper: replace text, using word-boundary for short keys (<=3 chars)
    function rtReplace(txt) {
        var changed = false;
        for(var i = 0; i < keys.length; i++) {
            if(txt.indexOf(keys[i]) === -1) continue;
            if(keys[i].length <= 3 && /^[a-zA-ZäöüÄÖÜß]+$/.test(keys[i])) {
                // Word-boundary match for short alphabetic keys to prevent substring corruption
                var escaped = keys[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var re = new RegExp('(?<![a-zA-ZäöüÄÖÜß])' + escaped + '(?![a-zA-ZäöüÄÖÜß])', 'g');
                var newTxt = txt.replace(re, dict[keys[i]]);
                if(newTxt !== txt) { txt = newTxt; changed = true; }
            } else {
                var parts = txt.split(keys[i]);
                if(parts.length > 1) { txt = parts.join(dict[keys[i]]); changed = true; }
            }
        }
        return changed ? txt : null;
    }
    
    // Walk all text nodes
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while(node = walker.nextNode()) {
        if(!node.nodeValue || !node.nodeValue.trim()) continue;
        // Skip script/style
        var par = node.parentElement;
        if(!par || par.tagName === 'SCRIPT' || par.tagName === 'STYLE' || par.tagName === 'NOSCRIPT') continue;
        // Skip elements handled separately (welcome text, date)
        if(par.id === 'welcomeText' || par.id === 'welcomeDate' || par.hasAttribute('data-i18n-date')) continue;
        var result = rtReplace(node.nodeValue);
        if(result !== null) node.nodeValue = result;
    }
    // Translate placeholders
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(function(el) {
        var result = rtReplace(el.placeholder);
        if(result !== null) el.placeholder = result;
    });
    // Translate title attributes
    document.querySelectorAll('[title]').forEach(function(el) {
        var result = rtReplace(el.title);
        if(result !== null) el.title = result;
    });
}

// Reverse translate: restore German (for switching back to DE)
var rtDictReverse = {};
['en','nl'].forEach(function(lang) {
    rtDictReverse[lang] = {};
    Object.keys(rtDict[lang]).forEach(function(k) {
        rtDictReverse[lang][rtDict[lang][k]] = k;
    });
});

export function switchLang(lang) {
    // If switching FROM a non-DE lang, first restore German
    if(currentLang !== 'de' && lang !== currentLang) {
        // Reload is safest way to restore
        currentLang = lang;
        try { localStorage.setItem('vit-lang', lang); } catch(e){}
        location.reload();
        return;
    }
    currentLang = lang;
    try { localStorage.setItem('vit-lang', lang); } catch(e){}
    document.documentElement.lang = lang;
    // Update flag opacity
    document.querySelectorAll('.lang-flag').forEach(function(f){
        f.classList.toggle('opacity-40', f.getAttribute('data-lang')!==lang);
        f.classList.toggle('opacity-100', f.getAttribute('data-lang')===lang);
    });
    // Translate all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(function(el){
        var key = el.getAttribute('data-i18n');
        if(i18n[lang] && i18n[lang][key]) {
            var txt = i18n[lang][key];
            // Replace {name} placeholder if element stores the user name
            var uname = el.getAttribute('data-i18n-name');
            if(uname) txt = txt.replace('{name}', uname);
            el.textContent = txt;
        }
    });
    // Translate placeholders via data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){
        var key = el.getAttribute('data-i18n-placeholder');
        if(i18n[lang] && i18n[lang][key]) {
            el.placeholder = i18n[lang][key];
        }
    });
    // Runtime DOM translation for hardcoded strings
    translateDOM(lang);
    // Re-render dynamic content
    try { renderTodos(); } catch(e){}
    try { renderTickets('all'); } catch(e){}
    try { renderAnnouncements(); } catch(e){}
    try { renderShopCart(); } catch(e){}
    var views = document.querySelectorAll('.view');
    views.forEach(function(v) {
        if(v.style.display !== 'none') {
            var vid = v.id;
            if(vid==='homeView') { /* static i18n handles it */ }
            if(vid==='smThemenList' || document.getElementById('smThemenList')) { try{renderSmThemen();}catch(e){} }
            if(vid==='smRankingList' || document.getElementById('smRankingList')) { try{renderSmRanking();}catch(e){} }
            if(vid==='shopView') { try{renderShop();}catch(e){} }
            if(vid==='wissenView') { try{renderWissenGlobal();}catch(e){} }
        }
    });
    try{if(document.getElementById('smThemenList') && document.getElementById('smThemenList').innerHTML) renderSmThemen();}catch(e){}
    try{if(document.getElementById('smRankingList') && document.getElementById('smRankingList').innerHTML) renderSmRanking();}catch(e){}
    // Re-translate after dynamic re-renders
    if(lang !== 'de') setTimeout(function(){ translateDOM(lang); }, 200);
    // Update date display
    var dateEl = document.getElementById('welcomeDate');
    if(dateEl && typeof getDateStr === 'function') dateEl.textContent = getDateStr(lang);
    // Update welcome text with name
    var wEl = document.getElementById('welcomeText');
    if(wEl) {
        var nm = wEl.getAttribute('data-i18n-name') || '';
        var wMap = {de:'Willkommen zurück, ',en:'Welcome back, ',nl:'Welkom terug, '};
        wEl.textContent = (wMap[lang]||wMap.de) + nm + '!';
    }
}

// Helper: get translated text (for JS-rendered content)
export function t(key) {
    return (i18n[currentLang] && i18n[currentLang][key]) || (i18n.de[key]) || key;
}

var currentSmFilter = 'all';

export function switchSmSub(sub) {
    document.querySelectorAll('.sm-sub-content').forEach(function(el){el.style.display='none';});
    document.querySelectorAll('.sm-sub-btn').forEach(function(b){b.className='sm-sub-btn px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-600';});
    var target = document.getElementById('smSub'+sub.charAt(0).toUpperCase()+sub.slice(1));
    if(target) target.style.display='block';
    var btn = document.querySelector('.sm-sub-btn[data-smsub="'+sub+'"]');
    if(btn) btn.className='sm-sub-btn px-4 py-2 rounded-full text-sm font-semibold bg-vit-orange text-white';
    if(sub==='themen') renderSmThemen();
    if(sub==='ranking') renderSmRanking();
    if(sub==='pipeline' && window.vpRenderPipelineDashboard) vpRenderPipelineDashboard();
    if(sub==='consents' && window.vpRenderConsents) vpRenderConsents();
    if(sub==='upload' && window.vpInitUpload) vpInitUpload();
}

export function filterSmThemen(filter) {
    currentSmFilter = filter;
    document.querySelectorAll('.sm-thema-filter').forEach(function(b){b.className='sm-thema-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn = document.querySelector('.sm-thema-filter[data-smf="'+filter+'"]');
    if(btn) btn.className='sm-thema-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderSmThemen();
}

export function renderSmThemen() {
    var search = (document.getElementById('smThemenSearch')||{}).value||'';
    var list = smThemen.filter(function(t){
        if(currentSmFilter==='neu' && t.done) return false;
        if(currentSmFilter==='done' && !t.done) return false;
        if(search && t.thema.toLowerCase().indexOf(search.toLowerCase())===-1 && t.id.toLowerCase().indexOf(search.toLowerCase())===-1) return false;
        return true;
    });

    var katColors = {Story:'bg-pink-100 text-pink-700',Technik:'bg-blue-100 text-blue-700',Beratung:'bg-green-100 text-green-700',Werkstatt:'bg-gray-200 text-gray-700',USP:'bg-orange-100 text-orange-700',Tipps:'bg-cyan-100 text-cyan-700',Ergonomie:'bg-purple-100 text-purple-700'};
    var schwColors = {leicht:'🟢',mittel:'🟡',schwer:'🔴'};

    var el = document.getElementById('smThemenList');
    if(!el) return;
    var h = '';
    list.forEach(function(th,idx){
        var detailId = 'smDetail_'+th.id;
        h += '<div class="vit-card overflow-hidden '+(th.done?'opacity-60 border-l-4 border-green-400':'border-l-4 border-transparent hover:border-l-4 hover:border-vit-orange')+' transition">';

        // Header row (clickable to expand)
        h += '<div class="p-4 flex items-center space-x-4 cursor-pointer" onclick="var d=document.getElementById(\''+detailId+'\');d.style.display=d.style.display===\'none\'?\'block\':\'none\'">';
        // Status icon
        if(th.done) {
            h += '<div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">✓</div>';
        } else {
            h += '<div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-vit-orange font-bold text-lg flex-shrink-0">▶</div>';
        }
        // Title area
        h += '<div class="flex-1 min-w-0">';
        h += '<div class="flex items-center space-x-2 mb-0.5">';
        h += '<span class="text-[10px] font-mono font-bold text-gray-400">'+th.id.toUpperCase()+'</span>';
        h += '<span class="text-[10px] px-1.5 py-0.5 rounded '+(katColors[th.kat]||'bg-gray-100 text-gray-600')+'">'+th.kat+'</span>';
        h += '<span class="text-[10px]">'+schwColors[th.schwierig]+' '+th.schwierig+'</span>';
        if(th.beispiel) h += '<span class="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded">🎥 Beispielvideo</span>';
        h += '</div>';
        h += '<p class="text-sm font-semibold text-gray-800">'+th.thema+'</p>';
        h += '</div>';
        // Expand arrow + action
        h += '<div class="flex items-center space-x-2 flex-shrink-0">';
        if(!th.done) h += '<button class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:opacity-90 whitespace-nowrap" onclick="event.stopPropagation(); switchSmSub(\'upload\')">'+ _t('btn_shoot')+'</button>';
        h += '<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>';
        h += '</div>';
        h += '</div>';

        // Expandable detail (hidden by default)
        h += '<div id="'+detailId+'" style="display:none;" class="px-4 pb-5 border-t border-gray-100 bg-gray-50">';
        h += '<div class="pt-4 space-y-4">';

        // Beispielvideo
        if(th.beispiel) {
            h += '<div class="p-3 bg-red-50 rounded-lg flex items-center space-x-3">';
            h += '<span class="text-2xl">🎥</span>';
            h += '<div class="flex-1"><p class="text-xs font-bold text-gray-700">'+ _t('lbl_example_video')+'</p><p class="text-[10px] text-gray-500">'+_t('lbl_example_desc')+'</p></div>';
            h += '<a href="'+th.beispiel+'" target="_blank" class="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:opacity-90">'+ _t('lbl_watch')+'</a>';
            h += '</div>';
        }

        // Hook
        h += '<div>';
        h += '<p class="text-xs font-bold text-vit-orange uppercase mb-1.5">'+ _t('lbl_hook')+'</p>';
        th.hook.forEach(function(hk){
            h += '<p class="text-sm text-gray-700 italic bg-white p-2 rounded mb-1 border-l-3 border-l-2 border-vit-orange">'+hk+'</p>';
        });
        h += '</div>';

        // Hauptteil
        h += '<div>';
        h += '<p class="text-xs font-bold text-blue-600 uppercase mb-1.5">'+ _t('lbl_main')+'</p>';
        h += '<p class="text-sm text-gray-700 bg-white p-3 rounded leading-relaxed">'+th.hauptteil+'</p>';
        h += '</div>';

        // CTA
        h += '<div>';
        h += '<p class="text-xs font-bold text-green-600 uppercase mb-1.5">'+ _t('lbl_outro')+'</p>';
        h += '<p class="text-sm text-gray-700 bg-white p-2 rounded italic">'+th.cta+'</p>';
        h += '</div>';

        // HQ Tipp
        if(th.hqTipp) {
            h += '<div class="p-3 bg-orange-50 rounded-lg border border-orange-200">';
            h += '<p class="text-xs font-bold text-vit-orange mb-1">'+ _t('lbl_hqtip')+'</p>';
            h += '<p class="text-xs text-gray-600">'+th.hqTipp+'</p>';
            h += '</div>';
        }

        // Upload CTA
        if(!th.done) {
            h += '<button class="w-full py-3 bg-vit-orange text-white rounded-lg font-bold text-sm hover:opacity-90 transition" onclick="switchSmSub(\'upload\')">'+ _t('btn_upload_now')+'</button>';
        } else {
            h += '<div class="text-center py-2 text-sm text-green-600 font-semibold">'+ _t('lbl_done_video')+'</div>';
        }

        h += '</div></div>';
        h += '</div>';
    });
    if(!list.length) h = '<div class="text-center py-8 text-gray-400"><p class="text-3xl mb-2">🎬</p><p class="text-sm">Keine Themen gefunden</p></div>';
    el.innerHTML = h;

    // Populate upload select
    var sel = document.getElementById('smUploadThema');
    if(sel && sel.options.length<=1) {
        smThemen.filter(function(t){return !t.done;}).forEach(function(t){
            sel.innerHTML += '<option value="'+t.id+'">'+t.id.toUpperCase()+' – '+t.thema+'</option>';
        });
        sel.innerHTML += '<option value="0000">0000 – Eigener Vorschlag</option>';
    }
}

export function renderSmRanking() {
    var el = document.getElementById('smRankingList');
    if(!el) return;
    var sorted = smRankingData.slice().sort(function(a,b){return b.count-a.count;});
    var maxCount = sorted[0]?sorted[0].count:1;
    var h = '';
    sorted.forEach(function(s,i){
        var isMe = s.name==='Grafrath';
        var w = maxCount ? Math.max(5, s.count/maxCount*100) : 5;
        var medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
        h += '<div class="flex items-center space-x-3 p-2 rounded-lg '+(isMe?'bg-orange-50 border border-orange-200':'')+'"><span class="text-xs w-5 text-gray-400 font-bold">'+(i+1)+'</span><span class="text-xs w-28 truncate font-semibold '+(isMe?'text-vit-orange':'text-gray-700')+'">'+medal+' '+s.name+(isMe?' (du)':'')+'</span><div class="flex-1 bg-gray-100 rounded-full h-4"><div class="h-4 rounded-full '+(s.count>0?'bg-gradient-to-r from-vit-orange to-yellow-400':'bg-gray-200')+'" style="width:'+w+'%"></div></div><span class="text-xs font-bold w-8 text-right">'+s.count+'</span></div>';
    });
    el.innerHTML = h;
}

// showAllgemeinTab - replaced by new allgemein module (see below)

export function showView(viewName) {
    console.log('showView called with:', viewName);
    
    // Check module status - block 'in_bearbeitung' (bald) and 'deaktiviert' modules
    var moduleStatusMap = {verkauf:'verkauf',controlling:'controlling',marketing:'marketing',werkstatt:'werkstatt',personal:'personal',office:'office',kalender:'kalender',nachrichten:'nachrichten',wissen:'wissen',support:'support',einkauf:'einkauf',dashboards:'dashboards',allgemein:'allgemein',shop:'shop',aktenschrank:'aktenschrank',mitarbeiter:'mitarbeiter'};
    var moduleKey = moduleStatusMap[viewName];
    var _modulStatus = window.sbModulStatus || {};
    if(moduleKey && _modulStatus[moduleKey]) {
        var mStatus = _modulStatus[moduleKey];
        if(mStatus === 'in_bearbeitung' || mStatus === 'deaktiviert') {
            if(typeof window._showToast === 'function') window._showToast('Dieses Modul ist noch nicht verf\u00fcgbar (' + (mStatus === 'in_bearbeitung' ? 'Kommt bald' : 'Deaktiviert') + ')', 'info');
            else alert('Dieses Modul ist noch nicht verf\u00fcgbar (' + (mStatus === 'in_bearbeitung' ? 'Kommt bald' : 'Deaktiviert') + ')');
            return;
        }
    }
    
    // Verstecke ALLE Views automatisch (per Klasse statt hardcoded Liste)
    var allViews = document.querySelectorAll('.view');
    console.log('Found', allViews.length, 'views to hide');
    for(var i = 0; i < allViews.length; i++) {
        allViews[i].style.display = 'none';
    }
    
    // Zeige gewählte View
    var viewId = viewName + 'View';
    var viewEl = document.getElementById(viewId);
    if(viewEl) {
        viewEl.style.display = 'block';
        console.log('SUCCESS: Showed', viewId, '- offsetHeight:', viewEl.offsetHeight);
        if(viewName === 'dashboards') initDashboardTabs();
        if(viewName === 'hqFeatureFlags') { showView('entwicklung'); setTimeout(function(){showEntwicklungTab('flags')},50); return; }
        if(viewName === 'hqBackups') { showView('entwicklung'); setTimeout(function(){showEntwicklungTab('system')},50); return; }
        
        var areaMap = {home:'allgemein',controlling:'controlling',verkauf:'verkauf',marketing:'marketing'};
        var containerMap = {home:'trainerAreaHome',controlling:'trainerAreaControlling',verkauf:'trainerAreaVerkauf',marketing:'trainerAreaMarketing'};
        if(areaMap[viewName] && window.showTrainerForArea) window.showTrainerForArea(areaMap[viewName], containerMap[viewName]);
        
        // Version badge anzeigen
        showModuleVersionBadge(viewName + 'View');
        // Apply runtime translation if non-DE
        if(currentLang !== 'de') setTimeout(function(){ translateDOM(currentLang); }, 100);
        // Apply dark mode to dynamically loaded content
        if(document.body.classList.contains('dark')) {
            setTimeout(function(){ applyDarkModeInlineStyles(true); }, 150);
            setTimeout(function(){ applyDarkModeInlineStyles(true); }, 600);
        }
        
        // Fire event so modules can react to view changes
        // This replaces fragile showView wrapper chains
        window.dispatchEvent(new CustomEvent('vit:view-changed', { 
            detail: { view: viewName, element: viewEl } 
        }));
    } else {
        console.error('FAILED: View not found:', viewId);
    }
}

export function showModuleVersionBadge(viewId) {
    var old = document.getElementById('moduleVersionBadge');
    if(old) old.remove();
    var badge = document.createElement('div');
    badge.id = 'moduleVersionBadge';
    badge.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:50;background:rgba(255,255,255,0.9);border:1px solid var(--c-border);border-radius:6px;padding:2px 8px;font-size:10px;color:var(--c-muted);font-family:monospace;pointer-events:none;backdrop-filter:blur(4px);';
    badge.textContent = 'v' + PORTAL_VERSION;
    document.body.appendChild(badge);
}

// Asana Onboarding Integration
const ASANA_PROJECT_ID = '1212995737414526'; // Onboarding vit:bikes Partner
let asanaTasks = [];
let asanaSections = {};

export async function loadAsanaOnboarding() {
    const container = document.getElementById('asanaOnboardingContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-vit-orange"></div>
            <p class="mt-4 text-gray-600 font-semibold">Lade Onboarding-Aufgaben...</p>
            <p class="mt-2 text-sm text-gray-500">Synchronisiere mit Asana Projekt</p>
        </div>
    `;
    
    // Simuliere kurzes Laden
    setTimeout(() => {
        loadDemoTasks();
        groupTasksBySections();
        renderAsanaTasks();
    }, 800);
}


export function loadDemoTasks() {
    // Demo Tasks basierend auf echten Asana Daten
    asanaTasks = [
        // Allgemein - Qualifizierungsphase
        { gid: '1', name: 'Whatsapp-Gruppe beitreten', completed: true, section: 'Allgemein', due_on: null, notes: 'Link zur WhatsApp-Gruppe findest du in der Willkommens-E-Mail', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '2', name: 'Sharepoint Zugang einrichten', completed: true, section: 'Allgemein', due_on: null, notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '3', name: 'Vorstellung Teams im Büro', completed: false, section: 'Allgemein', due_on: '2026-02-20', assignee: { name: 'Jens Bader' }, notes: 'Kennenlernen der Kollegen im HQ', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '4', name: 'Das vit:bikes Portal kennenlernen', completed: false, section: 'Allgemein', due_on: '2026-02-18', assignee: { name: 'Markus Unger' }, notes: 'Einführung in alle Features', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '5', name: 'Lizenzvertrag durchgehen', completed: false, section: 'Allgemein', due_on: '2026-02-19', assignee: { name: 'Markus Unger' }, notes: 'Vertragsdetails klären', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        
        // vit:bikes basic
        { gid: '10', name: 'Akademie App installieren', completed: true, section: 'vit:bikes basic', due_on: null, notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '11', name: 'Module durchgehen', completed: true, section: 'vit:bikes basic', due_on: null, notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '12', name: 'Social Media Kanäle folgen', completed: true, section: 'vit:bikes basic', due_on: null, notes: 'Instagram, LinkedIn, Facebook', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '13', name: 'Die Entwicklung des Fahrradmarktes verstehen', completed: false, section: 'vit:bikes basic', due_on: '2026-02-22', notes: 'Video-Kurs in der Akademie', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '14', name: 'Zielgruppe definieren', completed: false, section: 'vit:bikes basic', due_on: '2026-02-24', notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        
        // Marketing
        { gid: '20', name: 'Willkommen im Marketing-Modul', completed: true, section: 'Marketing', due_on: null, assignee: { name: 'Mike' }, notes: 'Einführung von Mike', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '21', name: 'Google My Business Profil optimieren', completed: true, section: 'Marketing', due_on: null, notes: 'Schritt-für-Schritt Anleitung befolgen', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '22', name: 'Social Media Bestandsaufnahme', completed: true, section: 'Marketing', due_on: null, notes: 'Alle Profile durchgehen und dokumentieren', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '23', name: 'Youtube Kanal einrichten', completed: false, section: 'Marketing', due_on: '2026-02-25', assignee: { name: 'Basti Schrecker' }, notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '24', name: 'Website Check durchführen', completed: false, section: 'Marketing', due_on: '2026-02-28', notes: 'Performance, SEO, UX prüfen', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '25', name: 'Strategie-Meeting mit Mike', completed: false, section: 'Marketing', due_on: '2026-03-03', assignee: { name: 'Mike' }, notes: 'Marketingstrategie besprechen', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        
        // Verkauf
        { gid: '30', name: 'Was ist Verkauf?', completed: true, section: 'Verkauf', due_on: null, notes: 'Grundlagen-Video ansehen', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '31', name: 'vit:bikes Verkaufsablauf lernen', completed: true, section: 'Verkauf', due_on: null, notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '32', name: 'Die Erfolgstabelle verstehen', completed: true, section: 'Verkauf', due_on: null, notes: 'Tracking-System einführen', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '33', name: '3D-Vermessungssystem Training', completed: false, section: 'Verkauf', due_on: '2026-02-21', notes: 'Praktisches Training vor Ort', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '34', name: 'Fahrspaßgarantie verstehen', completed: false, section: 'Verkauf', due_on: '2026-02-26', notes: 'USP von vit:bikes', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '35', name: 'Verkaufstraining für Mitarbeiter', completed: false, section: 'Verkauf', due_on: '2026-03-01', notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        
        // Einkauf
        { gid: '40', name: 'Willkommen im Einkaufssystem', completed: false, section: 'Einkauf', due_on: '2026-02-19', assignee: { name: 'Florian' }, notes: 'Einführung von Florian', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '41', name: 'Gemeinsam stark Prinzip verstehen', completed: false, section: 'Einkauf', due_on: '2026-02-23', notes: 'Warum Gruppenvolumen Konditionssprung bedeutet', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '42', name: 'Zentralregulierung erklärt', completed: false, section: 'Einkauf', due_on: '2026-02-27', notes: 'IHT statt Bico Prozess', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '43', name: 'Kernsortiment: 7-8 Marken Strategie', completed: false, section: 'Einkauf', due_on: '2026-03-02', notes: 'Fokus auf Kernlieferanten', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '44', name: '4-Marken-Strategie definieren', completed: false, section: 'Einkauf', due_on: '2026-03-05', notes: 'Expertenstatus statt Bauchladen', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        
        // Werkstatt
        { gid: '50', name: 'Werkstatt-Prozesse kennenlernen', completed: false, section: 'Werkstatt', due_on: '2026-02-24', notes: '', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '51', name: 'Service-Standards vit:bikes', completed: false, section: 'Werkstatt', due_on: '2026-03-01', notes: 'Qualitätsrichtlinien', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        
        // Toolbox
        { gid: '60', name: 'Quiply App installieren', completed: false, section: 'Toolbox', due_on: '2026-02-20', notes: 'Interne Kommunikation', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '61', name: 'Todoist einrichten', completed: false, section: 'Toolbox', due_on: '2026-02-22', notes: 'Task Management', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` },
        { gid: '62', name: 'Outlook konfigurieren', completed: false, section: 'Toolbox', due_on: '2026-02-25', notes: 'E-Mail Setup', permalink_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}` }
    ];
}

export function groupTasksBySections() {
    asanaSections = {};
    
    asanaTasks.forEach(task => {
        if (task.memberships && task.memberships.length > 0) {
            const sectionName = task.memberships[0].section.name;
            
            if (!asanaSections[sectionName]) {
                asanaSections[sectionName] = [];
            }
            
            asanaSections[sectionName].push(task);
        }
    });
}

export function renderAsanaTasks() {
    const container = document.getElementById('asanaOnboardingContent');
    
    // Berechne Gesamt-Fortschritt
    const totalTasks = asanaTasks.length;
    const completedTasks = asanaTasks.filter(t => t.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    let html = `
        <!-- Header mit Fortschritt -->
        <div class="vit-card p-6 mb-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="h2-headline text-gray-800">Dein Onboarding-Plan</h2>
                <a href="https://app.asana.com/0/${ASANA_PROJECT_ID}" target="_blank" class="text-sm text-vit-orange hover:underline font-semibold">
                    In Asana öffnen →
                </a>
            </div>
            
            <p class="text-sm text-gray-600 mb-6">Live synchronisiert mit Asana • ${totalTasks} Aufgaben</p>

            <!-- Gesamt-Fortschritt -->
            <div class="mb-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold text-gray-700">Gesamt-Fortschritt</span>
                    <span class="text-sm font-semibold text-vit-orange">${progress}% (${completedTasks}/${totalTasks})</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3">
                    <div class="bg-vit-orange h-3 rounded-full transition-all duration-500" style="width: ${progress}%"></div>
                </div>
            </div>
        </div>
    `;
    
    // Wichtige Sections die wir anzeigen wollen
    const sectionsToShow = [
        'Allgemein',
        'vit:bikes basic',
        'Marketing', 
        'Verkauf',
        'Einkauf',
        'Werkstatt',
        'Toolbox'
    ];
    
    sectionsToShow.forEach(sectionName => {
        if (asanaSections[sectionName]) {
            html += renderSection(sectionName, asanaSections[sectionName]);
        }
    });
    
    container.innerHTML = html;
}

export function renderSection(sectionName, tasks) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const sectionProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Filter out separator tasks (those starting with --)
    const realTasks = tasks.filter(t => !t.name.startsWith('--'));
    
    if (realTasks.length === 0) return '';
    
    return `
        <div class="vit-card p-6 mb-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-gray-800 flex items-center">
                    ${getSectionIcon(sectionName)}
                    <span class="ml-2">${sectionName}</span>
                    <span class="ml-3 text-sm font-normal text-gray-500">${completedTasks}/${totalTasks}</span>
                </h3>
                <div class="text-sm font-semibold ${sectionProgress === 100 ? 'text-green-600' : 'text-vit-orange'}">
                    ${sectionProgress}%
                </div>
            </div>
            
            <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div class="bg-vit-orange h-2 rounded-full transition-all duration-500" style="width: ${sectionProgress}%"></div>
            </div>
            
            <div class="space-y-2">
                ${realTasks.map(task => renderTask(task)).join('')}
            </div>
        </div>
    `;
}

export function getSectionIcon(sectionName) {
    const icons = {
        'Allgemein': '📋',
        'vit:bikes basic': '🎓',
        'Marketing': '📢',
        'Verkauf': '🎯',
        'Einkauf': '🛒',
        'Werkstatt': '🔧',
        'Toolbox': '🛠️',
        'Mitarbeiter/Team': '👥'
    };
    return `<span class="text-2xl">${icons[sectionName] || '📌'}</span>`;
}

export function renderTask(task) {
    const isCompleted = task.completed;
    const dueDate = task.due_on ? new Date(task.due_on).toLocaleDateString('de-DE') : null;
    const assignee = task.assignee ? task.assignee.name : null;
    
    return `
        <div class="flex items-start space-x-3 p-3 ${isCompleted ? 'bg-green-50' : 'bg-white border border-gray-200'} rounded-lg hover:shadow-sm transition-shadow">
            <input 
                type="checkbox" 
                ${isCompleted ? 'checked' : ''} 
                onchange="toggleTaskCompletion('${task.gid}', this.checked)"
                class="w-5 h-5 mt-0.5 text-vit-orange rounded cursor-pointer"
            >
            <div class="flex-1">
                <div class="flex items-start justify-between">
                    <span class="text-sm ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-700 font-medium'}">
                        ${task.name}
                    </span>
                    ${dueDate || assignee ? `
                        <div class="flex items-center space-x-2 ml-2">
                            ${dueDate ? `<span class="text-xs text-gray-500">📅 ${dueDate}</span>` : ''}
                            ${assignee ? `<span class="text-xs text-gray-500">👤 ${assignee}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
                ${task.notes ? `
                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">${task.notes}</p>
                ` : ''}
            </div>
            <a href="${task.permalink_url}" target="_blank" class="text-gray-400 hover:text-vit-orange">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
            </a>
        </div>
    `;
}

export async function toggleTaskCompletion(taskGid, completed) {
    try {
        // Optimistic UI Update
        const task = asanaTasks.find(t => t.gid === taskGid);
        if (task) {
            task.completed = completed;
            renderAsanaTasks();
        }
        
        // Update in Asana via MCP
        const response = await fetch('/api/asana/task/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task_id: taskGid,
                completed: completed
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update task');
        }
        
        // Show success feedback
        showNotification(completed ? '✅ Aufgabe abgeschlossen!' : '↩️ Aufgabe reaktiviert', 'success');
        
    } catch (error) {
        console.error('Error updating task:', error);
        
        // Revert optimistic update
        const task = asanaTasks.find(t => t.gid === taskGid);
        if (task) {
            task.completed = !completed;
            renderAsanaTasks();
        }
        
        showNotification('❌ Fehler beim Aktualisieren', 'error');
    }
}


// Verkaufserfolg Tracking Functions
export function updateSalesData() {
    const planned = parseInt(document.getElementById('plannedInput').value) || 0;
    const spontaneous = parseInt(document.getElementById('spontaneousInput').value) || 0;
    const online = parseInt(document.getElementById('onlineInput').value) || 0;
    const ergo = parseInt(document.getElementById('ergoInput').value) || 0;
    const sales = parseInt(document.getElementById('salesInput').value) || 0;
    
    // Berechne Gesamt-Beratungen
    const totalConsultations = planned + spontaneous + online;
    
    // Berechne Quote
    const quote = totalConsultations > 0 ? Math.round((sales / totalConsultations) * 100) : 0;
    
    // Update Display
    document.getElementById('totalConsultations').textContent = totalConsultations;
    document.getElementById('quoteDisplay').textContent = quote + '%';
    
    // Färbe Quote je nach Performance
    const quoteElement = document.getElementById('quoteDisplay');
    if (quote >= 40) {
        quoteElement.className = 'text-2xl font-bold text-green-600';
    } else if (quote >= 25) {
        quoteElement.className = 'text-2xl font-bold text-blue-600';
    } else {
        quoteElement.className = 'text-2xl font-bold text-orange-600';
    }
}

export function saveSalesData() {
    var salesperson = document.getElementById('salesPersonSelect').value;
    var planned = document.getElementById('plannedInput').value;
    var spontaneous = document.getElementById('spontaneousInput').value;
    var online = document.getElementById('onlineInput').value;
    var ergo = document.getElementById('ergoInput').value;
    
    // Show success feedback
    var btn = event && event.target ? event.target : null;
    if(btn) {
        var orig = btn.innerHTML;
        btn.innerHTML = '✅ Gespeichert!';
        btn.classList.add('bg-green-500');
        btn.classList.remove('bg-vit-orange');
        setTimeout(function(){ btn.innerHTML = orig; btn.classList.remove('bg-green-500'); btn.classList.add('bg-vit-orange'); }, 2000);
    }
}


// ============================================================


// Strangler Fig
const _exports = {renderKommandozentrale,renderShop,shopSizeQty,shopSizeQtyInput,shopAddSelectedSizes,shopUpdateSizeCart,selectShopSize,updateCartQty,addToCartWithSize,addToCart,renderShopCart,filterShop,showShopTab,loadMyShopOrders,submitShopOrder,removeFromCart,updateShopCart,hqDrillDown,handleFileUpload,translateDOM,switchLang,t,switchSmSub,filterSmThemen,renderSmThemen,renderSmRanking,showView,showModuleVersionBadge,loadAsanaOnboarding,loadDemoTasks,groupTasksBySections,renderAsanaTasks,renderSection,getSectionIcon,renderTask,toggleTaskCompletion,updateSalesData,saveSalesData};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[strategie.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
