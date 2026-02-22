// vit:bikes — Notification Bus (Push/Email)
// Extracted from index.html lines 9377-9572
(function(){
    // ── Config ──
    var RESEND_EDGE_URL = ''; // Set: sb.functions.invoke('send-email', ...)
    var EMAIL_LOG = []; // In-memory log (prod: notifications_log table)

    // ── Central send function ──
    window.sendEmail = async function(template, to, data) {
        // Anti-spam check
        var key = template + '|' + to + '|' + (data.context_id || '');
        var cooldowns = {welcome:Infinity, employee_welcome:Infinity, employee_invite:Infinity, bwa_escalation:30*86400000, lead_stale:7*86400000, deal_status:0, trainer_ignored:48*3600000, groupcall_reminder:24*3600000};
        var cd = cooldowns[template] || 86400000;
        if(cd > 0) {
            var existing = EMAIL_LOG.find(function(l){return l.key===key && (Date.now()-l.ts)<cd;});
            if(existing) { console.log('[Email] Cooldown active for', key); return null; }
        }

        // Log
        var logEntry = {key:key, template:template, to:to, ts:Date.now(), status:'sent'};
        EMAIL_LOG.push(logEntry);

        // In production: call Supabase Edge Function
        if(typeof sb !== 'undefined' && sb.functions) {
            try {
                var res = await sb.functions.invoke('send-email', {body:{template:template, to:to, data:data}});
                if(res.error) { logEntry.status = 'failed'; console.error('[Email] Error:', res.error); }
                else { console.log('[Email] Sent:', template, 'to', to); }
                // Log to DB
                if(sb.from) {
                    await sb.from('notifications_log').insert({
                        location_id: data.location_id || null,
                        user_id: data.user_id || null,
                        template: template,
                        recipient_email: to,
                        context_json: data,
                        status: logEntry.status,
                        resend_id: res.data ? res.data.id : null
                    });
                }
                return res;
            } catch(e) { logEntry.status = 'failed'; console.error('[Email]', e); }
        } else {
            console.log('[Email][Demo] Would send:', template, 'to', to, data);
        }

        // Show notification in portal
        showEmailNotification(template, to);
        return logEntry;
    };

    // ── Visual notification ──
    function showEmailNotification(template, to) {
        var names = {
            welcome: '📧 Willkommens-Mail gesendet',
            employee_welcome: '📧 Willkommens-Mail an Mitarbeiter gesendet',
            employee_invite: '✉️ Einladungs-Mail an Mitarbeiter gesendet',
            bwa_escalation: '⚠️ BWA-Eskalationsmail gesendet',
            lead_stale: '📧 Lead-Erinnerung gesendet',
            deal_status: '📧 Deal-Status-Mail gesendet',
            trainer_ignored: '📧 Trainer-Erinnerung gesendet',
            groupcall_reminder: '📧 Gruppencall-Erinnerung gesendet'
        };
        var msg = names[template] || '📧 E-Mail gesendet';
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:16px;right:16px;z-index:10000;padding:12px 20px;border-radius:10px;background:#16a34a;color:white;font-size:13px;font-weight:600;font-family:Outfit,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.15);opacity:0;transition:opacity 0.3s;';
        toast.innerHTML = msg + '<span style="font-size:11px;opacity:0.8;margin-left:8px;">→ ' + to + '</span>';
        document.body.appendChild(toast);
        requestAnimationFrame(function(){toast.style.opacity='1';});
        setTimeout(function(){toast.style.opacity='0';setTimeout(function(){toast.remove();},300);},3500);
    }

    // ════════════════════════════════════════════════
    // TRIGGER 1: Welcome bei Anmeldung
    // ════════════════════════════════════════════════
    // Hook into enterApp for first-login detection
    var _origEnterApp2 = window.enterApp;
    if(_origEnterApp2) {
        window.enterApp = function() {
            _origEnterApp2();
            // Check if first login (no previous session)
            setTimeout(function(){
                if(typeof sbProfile !== 'undefined' && sbProfile) {
                    var isFirst = !localStorage.getItem('vit-welcomed-' + sbProfile.id);
                    if(isFirst) {
                        sendEmail('welcome', sbProfile.email || '', {
                            name: sbProfile.name || 'Partner',
                            portalUrl: window.location.href,
                            standort: (typeof sbStandort !== 'undefined' && sbStandort) ? sbStandort.name : '',
                            location_id: sbProfile.standort_id,
                            user_id: sbProfile.id
                        });
                        try { localStorage.setItem('vit-welcomed-' + sbProfile.id, '1'); } catch(e){}
                    }
                }
            }, 2000);
        };
    }

    // ════════════════════════════════════════════════
    // TRIGGER 2: BWA Eskalation (Stufe 3)
    // ════════════════════════════════════════════════
    window.triggerBwaEscalation = function(standortName, ownerEmail, bwaMonth) {
        sendEmail('bwa_escalation', ownerEmail, {
            month: bwaMonth,
            standort: standortName,
            uploadUrl: window.location.href + '#controlling',
            context_id: 'bwa_' + bwaMonth
        });
    };

    // ════════════════════════════════════════════════
    // TRIGGER 3: Lead älter als X Tage
    // ════════════════════════════════════════════════
    window.checkStaleLeads = function() {
        // In prod: query leads table
        // Demo: simulate
        var staleLeads = [
            {name:'Thomas Müller', age:7, seller:'max@vitbikes-grafrath.de', id:'l1'},
            {name:'Anna Schmidt', age:12, seller:'max@vitbikes-grafrath.de', id:'l2'}
        ];
        staleLeads.forEach(function(lead){
            if(lead.age >= 5) {
                sendEmail('lead_stale', lead.seller, {
                    leadName: lead.name,
                    daysSinceContact: lead.age,
                    context_id: 'lead_' + lead.id
                });
            }
        });
    };

    // ════════════════════════════════════════════════
    // TRIGGER 4: Pipeline – Angebot angenommen/abgelehnt
    // ════════════════════════════════════════════════
    window.triggerDealStatusEmail = function(dealName, dealValue, status, sellerEmail, kundeEmail) {
        sendEmail('deal_status', sellerEmail, {
            deal: dealName,
            value: dealValue,
            status: status, // 'gewonnen' oder 'verloren'
            context_id: 'deal_' + dealName
        });
        // Optional: Auch Kunden benachrichtigen bei Gewonnen
        if(status === 'gewonnen' && kundeEmail) {
            sendEmail('deal_status', kundeEmail, {
                deal: dealName,
                value: dealValue,
                status: 'bestaetigung'
            });
        }
    };

    // ════════════════════════════════════════════════
    // TRIGGER 5: Trainer ignoriert (48h)
    // ════════════════════════════════════════════════
    var _origSnooze = window.snoozeTrainer;
    var snoozeCount = {};
    window.snoozeTrainer = function() {
        if(typeof currentTrainer !== 'undefined' && currentTrainer) {
            var tid = currentTrainer.id;
            snoozeCount[tid] = (snoozeCount[tid] || 0) + 1;
            if(snoozeCount[tid] >= 2) {
                // 2x ignoriert → E-Mail
                var email = (typeof sbProfile !== 'undefined' && sbProfile) ? sbProfile.email : 'demo@vitbikes.de';
                sendEmail('trainer_ignored', email, {
                    trainerTitle: currentTrainer.title,
                    module: currentTrainer.module,
                    context_id: 'trainer_' + tid
                });
            }
        }
        if(_origSnooze) _origSnooze();
        else if(document.getElementById('trainerCardOverlay')) document.getElementById('trainerCardOverlay').style.display='none';
    };

    // ════════════════════════════════════════════════
    // TRIGGER 6: Gruppencall-Erinnerung (24h vorher)
    // ════════════════════════════════════════════════
    window.triggerGroupcallReminder = function(callTitle, callDate, callTime, zoomLink, participants) {
        participants.forEach(function(p){
            sendEmail('groupcall_reminder', p.email, {
                callTitle: callTitle,
                date: callDate,
                time: callTime,
                link: zoomLink,
                context_id: 'call_' + callDate + '_' + callTitle
            });
        });
    };

    // ════════════════════════════════════════════════
    // EMAIL LOG VIEWER (HQ feature)
    // ════════════════════════════════════════════════
    window.getEmailLog = function(){ return EMAIL_LOG; };

})();
