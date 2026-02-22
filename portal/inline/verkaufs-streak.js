// vit:bikes — Verkaufs-Streak Widget
// Extracted from index.html lines 8764-8868
(function(){
    var MO = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    var WOCHENTAGE = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    var IMPULSE = [
        'Du hast 2 Angebote, die seit 5+ Tagen offen sind. Ein kurzer Follow-Up-Anruf könnte den Unterschied machen!',
        'Kunden, die am Wochenende Probefahrt hatten, sind jetzt kaufbereit. Heute anrufen!',
        'Werkstatt ist zu 78% ausgelastet – perfekte Gelegenheit für Service-Angebote an Bestandskunden.',
        'Tipp: E-Bike-Leasing-Anfragen steigen im Frühjahr um 40%. Sprich aktiv Pendler an!',
        'Dein Standort liegt 12% über dem Netzwerk-Durchschnitt bei Zubehör-Attach-Rate. Weiter so! 💪',
        '3 Leads sind im "Schwebend"-Status. Schick heute ein kurzes "Noch Fragen?"-Follow-Up.',
        'Diese Woche sind 2 Events im Kalender. Nutze die Chance für spontane Leads!',
        'Top-Performer im Netzwerk machen 30% ihres Umsatzes mit Service. Wie siehts bei dir aus?'
    ];

    // ──── TAGES-COCKPIT ────
    window.renderDailyFocus = renderDailyFocus;
    function renderDailyFocus() {
        var now = new Date();
        var dateEl = document.getElementById('dailyFocusDate');
        if(dateEl) dateEl.textContent = WOCHENTAGE[now.getDay()] + ', ' + now.getDate() + '. ' + MO[now.getMonth()];

        // BWA Status
        var bwaMo = now.getMonth() === 0 ? {y:now.getFullYear()-1,m:11} : {y:now.getFullYear(),m:now.getMonth()-1};
        var fm = bwaMo.m+1 > 11 ? 0 : bwaMo.m+1;
        var fy = bwaMo.m+1 > 11 ? bwaMo.y+1 : bwaMo.y;
        var deadline = new Date(fy, fm, 15, 23, 59, 59);
        var daysLeft = Math.ceil((deadline - now) / (1000*60*60*24));

        var bwaEl = document.getElementById('dfBwa');
        var bwaSubEl = document.getElementById('dfBwaSub');
        if(bwaEl && bwaSubEl) {
            if(daysLeft > 7) {
                bwaEl.textContent = '✅';
                bwaSubEl.textContent = daysLeft + ' Tage Zeit';
                bwaSubEl.style.color = '#16a34a';
            } else if(daysLeft > 0) {
                bwaEl.textContent = '⚠️';
                bwaSubEl.textContent = 'Noch ' + daysLeft + ' Tage!';
                bwaSubEl.style.color = '#ca8a04';
            } else {
                bwaEl.textContent = '🚨';
                bwaSubEl.textContent = Math.abs(daysLeft) + ' Tage überfällig';
                bwaSubEl.style.color = '#dc2626';
            }
        }

        // Random Impulse
        var impulseEl = document.getElementById('dfImpulseText');
        if(impulseEl) {
            var idx = now.getDate() % IMPULSE.length;
            impulseEl.textContent = IMPULSE[idx];
        }
    }

    // ──── VERKAUFS-STREAK ────
    window.renderSalesMomentum = renderSalesMomentum;
    function renderSalesMomentum() {
        // Demo data - in prod, fetch from Supabase
        var streak = 12;
        var bestStreak = 18;
        var goalIst = 86400;
        var goalSoll = 120000;
        var closeRate = 34;
        var closeRatePrev = 30;
        var avgDeal = 4320;
        var nwAvgDeal = 3890;

        // Update streak emoji
        var emojiEl = document.getElementById('streakEmoji');
        if(emojiEl) {
            if(streak >= 14) emojiEl.textContent = '🔥🔥';
            else if(streak >= 7) emojiEl.textContent = '🔥';
            else if(streak >= 3) emojiEl.textContent = '✨';
            else emojiEl.textContent = '💤';
        }

        // Goal bar
        var pct = Math.min(Math.round(goalIst / goalSoll * 100), 100);
        var goalPctEl = document.getElementById('goalPct');
        var goalBarEl = document.getElementById('goalBar');
        if(goalPctEl) {
            goalPctEl.textContent = pct + '%';
            goalPctEl.style.color = pct >= 90 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626';
        }
        if(goalBarEl) {
            goalBarEl.style.width = pct + '%';
            goalBarEl.style.backgroundColor = pct >= 90 ? '#16a34a' : pct >= 60 ? '#EF7D00' : '#dc2626';
        }

        // Close rate change
        var crDiff = closeRate - closeRatePrev;
        var crEl = document.querySelector('#closeRate + p');
        if(crEl && crDiff !== 0) {
            crEl.textContent = (crDiff > 0 ? '↑ +' : '↓ ') + crDiff + '% ggü. Vormonat';
            crEl.style.color = crDiff > 0 ? '#16a34a' : '#dc2626';
        }
    }

    // ──── INIT ────
// [Hook 2 moved to unified dispatcher]

// [Init moved to unified dispatcher]
})();
