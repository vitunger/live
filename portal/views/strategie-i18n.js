/**
 * views/strategie-i18n.js - Internationalization (i18n) system: dictionaries (de/en/nl), t(), switchLang(), translateDOM()
 * @module views/strategie-i18n
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }

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
    // Missing NL entries (sync with EN rtDict)
    'Cockpit':'Cockpit','Social Media':'Social Media',
    'Performance':'Prestaties','Content Library':'Contentbibliotheek',
    'Marketing Performance':'Marketingprestaties',
    'BWA hochladen':'BWA uploaden','BWA auswaehlen':'BWA selecteren',
    'Bitte Datei auswaehlen.':'Selecteer een bestand.',
  }
};

// Runtime DOM translator - walks the DOM and replaces German text
export function translateDOM(lang) {
    if(lang === 'de' || !rtDict[lang]) return;
    var dict = rtDict[lang];
    // Build reverse map to skip already-translated text
    var vals = {};
    Object.keys(dict).forEach(function(k){ vals[dict[k]] = true; });
    var keys = Object.keys(dict).sort(function(a,b){ return b.length - a.length; });

    function rtReplace(txt) {
        var changed = false;
        for(var i = 0; i < keys.length; i++) {
            if(txt.indexOf(keys[i]) === -1) continue;
            // Skip if the target value is already in the text (prevents Modul→Module→Modulee)
            var target = dict[keys[i]];
            if(target.indexOf(keys[i]) !== -1 && txt.indexOf(target) !== -1) continue;
            if(keys[i].length <= 3 && /^[a-zA-ZäöüÄÖÜß]+$/.test(keys[i])) {
                var escaped = keys[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var re = new RegExp('(?<![a-zA-ZäöüÄÖÜß])' + escaped + '(?![a-zA-ZäöüÄÖÜß])', 'g');
                var newTxt = txt.replace(re, target);
                if(newTxt !== txt) { txt = newTxt; changed = true; }
            } else {
                var parts = txt.split(keys[i]);
                if(parts.length > 1) { txt = parts.join(target); changed = true; }
            }
        }
        return changed ? txt : null;
    }

    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while(node = walker.nextNode()) {
        if(!node.nodeValue || !node.nodeValue.trim()) continue;
        var par = node.parentElement;
        if(!par || par.tagName === 'SCRIPT' || par.tagName === 'STYLE' || par.tagName === 'NOSCRIPT') continue;
        if(par.id === 'welcomeText' || par.id === 'welcomeDate' || par.hasAttribute('data-i18n-date')) continue;
        // Skip already-translated elements
        if(par.hasAttribute('data-translated')) continue;
        var result = rtReplace(node.nodeValue);
        if(result !== null) {
            node.nodeValue = result;
            par.setAttribute('data-translated', lang);
        }
    }
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(function(el) {
        if(el.hasAttribute('data-translated')) return;
        var result = rtReplace(el.placeholder);
        if(result !== null) { el.placeholder = result; el.setAttribute('data-translated', lang); }
    });
    document.querySelectorAll('[title]').forEach(function(el) {
        if(el.getAttribute('data-title-translated')) return;
        var result = rtReplace(el.title);
        if(result !== null) { el.title = result; el.setAttribute('data-title-translated', lang); }
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
    // If switching FROM a non-DE lang, first restore German DOM, then apply new lang
    if(currentLang !== 'de' && lang !== currentLang) {
        // Restore DE first without reload
        currentLang = 'de';
        document.querySelectorAll('[data-i18n]').forEach(function(el){
            var key = el.getAttribute('data-i18n');
            if(i18n.de && i18n.de[key]) {
                var txt = i18n.de[key];
                var uname = el.getAttribute('data-i18n-name');
                if(uname) txt = txt.replace('{name}', uname);
                el.textContent = txt;
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){
            var key = el.getAttribute('data-i18n-placeholder');
            if(i18n.de && i18n.de[key]) el.placeholder = i18n.de[key];
        });
        translateDOM('de');
        // If target is DE, we're done
        if(lang === 'de') {
            try { localStorage.setItem('vit-lang', 'de'); } catch(e){}
            document.documentElement.lang = 'de';
            document.querySelectorAll('.lang-flag').forEach(function(f){
                f.classList.toggle('opacity-40', f.getAttribute('data-lang')!=='de');
                f.classList.toggle('opacity-100', f.getAttribute('data-lang')==='de');
            });
            return;
        }
        // Fall through to apply new lang below
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

// Strangler Fig
const _exports = { translateDOM, switchLang, t };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
