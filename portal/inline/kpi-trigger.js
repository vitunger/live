// vit:bikes — KPI Trigger Engine + Support Level
// Extracted from index.html lines 9184-9303
(function(){
    // ──── KPI TRIGGER ENGINE ────
    // Checks metrics and auto-assigns trainers
    window.kpiTriggerEngine = function() {
        if(typeof MY === 'undefined' || !MY) return;
        var triggers = [];

        // Controlling: BWA pünktlich?
        if(MY.s.controlling < 60) triggers.push({module:'controlling', trainerId:'t2', reason:'Controlling-Score unter 60'});

        // Verkauf: Abschlussquote?
        if(MY.s.verkauf < 65) triggers.push({module:'verkauf', trainerId:'t1', reason:'Verkaufs-Score unter 65'});

        // Marketing: Content-Frequenz?
        if(MY.s.marketing < 60) triggers.push({module:'marketing', trainerId:'t3', reason:'Marketing-Score unter 60'});

        // Werkstatt: Auslastung?
        if(MY.s.werkstatt < 60) triggers.push({module:'werkstatt', trainerId:'t4', reason:'Werkstatt-Score unter 60'});

        // Einkauf: Rohertrag?
        if(MY.s.controlling < 50 || MY.s.verkauf < 50) triggers.push({module:'einkauf', trainerId:'t6', reason:'Rohertrag potentiell unter Schnitt'});

        console.log('[KPI Trigger Engine] '+triggers.length+' triggers found:', triggers.map(function(t){return t.module;}).join(', '));
        return triggers;
    };

    // ──── SUPPORT LEVEL SYSTEM ────
    window.getSupportLevel = function() {
        if(typeof MY === 'undefined' || !MY) return 'A';
        var score = MY.score;
        var hasTrainer = typeof activeTrainers !== 'undefined' && activeTrainers.length > 0;

        // Level A: Quick Ping (async, for healthy scores)
        // Level B: Review (for observation scores)
        // Level C: 15 Min Call (only for critical or post-trainer)
        if(score < 50) return 'C'; // Critical -> direct HQ access
        if(score < 75 && !hasTrainer) return 'A'; // Observation, try trainer first
        if(score < 75 && hasTrainer) return 'B'; // Observation + trainer tried
        return 'A'; // Healthy
    };

    window.canBookHqCall = function() {
        var level = getSupportLevel();
        // Can only book call at Level B or C
        return level === 'B' || level === 'C';
    };

    // ──── IMPACT CHECK (7-day follow-up) ────
    window.scheduleImpactCheck = function(trainerId, startDate) {
        // In production: store in Supabase, cron checks after 7 days
        var checkDate = new Date(startDate);
        checkDate.setDate(checkDate.getDate() + 7);
        console.log('[Impact Check] Scheduled for trainer '+trainerId+' on '+checkDate.toISOString().split('T')[0]);
        // Store locally for demo
        try {
            var checks = JSON.parse(localStorage.getItem('vit_impact_checks') || '[]');
            checks.push({trainerId: trainerId, checkDate: checkDate.toISOString(), resolved: false});
            localStorage.setItem('vit_impact_checks', JSON.stringify(checks));
        } catch(e){}
    };

    window.checkPendingImpacts = function() {
        try {
            var checks = JSON.parse(localStorage.getItem('vit_impact_checks') || '[]');
            var today = new Date();
            var due = checks.filter(function(c) { return !c.resolved && new Date(c.checkDate) <= today; });
            if(due.length > 0) {
                console.log('[Impact Check] '+due.length+' checks due!');
                // In production: compare KPI before/after, show result
            }
        } catch(e){}
    };

    // ──── ONBOARDING PHASE TRACKING ────
    window.getOnboardingPhase = function() {
        try {
            var phase = localStorage.getItem('vit_onb_phase');
            if(phase === 'done') return {phase: 4, label: 'Abgeschlossen'};
            if(phase) return JSON.parse(phase);
        } catch(e){}
        // Default: check if onboarding view has been shown
        return {phase: 2, label: 'Woche 1', progress: 65};
    };

    window.completeOnboardingPhase = function(phaseNum) {
        if(phaseNum >= 3) {
            try { localStorage.setItem('vit_onb_phase', 'done'); } catch(e){}
            console.log('[Onboarding] Completed! Switching to Performance trainers.');
        } else {
            try { localStorage.setItem('vit_onb_phase', JSON.stringify({phase: phaseNum+1, label: phaseNum===1?'Woche 1':'Woche 2-3', progress: phaseNum*33})); } catch(e){}
        }
    };

    // ──── SOFT LOCK CONTROLLER ────
    window.checkSoftLocks = function() {
        if(typeof MY === 'undefined' || !MY) return;

        // Pipeline Insights: locked if close rate low AND no trainer completed
        var pLock = document.getElementById('pipelineInsightLock');
        if(pLock) {
            // Demo: lock if verkauf < 70
            pLock.style.display = MY.s.verkauf < 70 ? '' : 'none';
        }

        // HQ Booking: only available after trainer attempt or critical score
        // (This is checked by canBookHqCall())
    };

    // ──── Dark mode for new panels ────
    // Handled by existing [data-theme="dark"] rules for .gc-prep-slider via white bg override

    // ──── INIT ────
    setTimeout(function(){
        if(typeof kpiTriggerEngine === 'function') kpiTriggerEngine();
        if(typeof checkPendingImpacts === 'function') checkPendingImpacts();
        if(typeof checkSoftLocks === 'function') checkSoftLocks();
    }, 1000);
})();
