/**
 * views/misc-training.js - KI-Verkaufstrainer: Szenarien, Speech Recognition, TTS, Evaluation
 * Sub-Modul von misc-views.js (Orchestrator)
 * @module views/misc-training
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }

// === VERKAUFSTRAINING KI ENGINE (Local Simulation) ===
// ============================================================

var TRAIN_SCENARIOS = [
    {
        id:'ebike_beratung', title:'E-Bike Erstberatung', icon:'🚲', difficulty:'Einsteiger', diffColor:'#059669',
        desc:'Kunde interessiert sich für ein E-Bike, ist unsicher und braucht Beratung.',
        opener:'Hallo! Ich schau mich mal ein bisschen um... Ich überlege mir eventuell ein E-Bike anzuschaffen, aber ich bin mir noch nicht so sicher.',
        criteria:['Bedarfsermittlung','Produktwissen','Einwandbehandlung','Abschlusstechnik','Kundenfreundlichkeit'],
        customer:'Thomas Müller, 52 Jahre, Pendler (12km), Budget 3-4k',
        responses:[
            {phase:'start', triggers:['willkommen','hallo','guten tag','herzlich','grüß','schön dass','freut mich','kann ich','darf ich','helfen','beratung','was suchen'],
             replies:['Danke! Ja, ich pendel jeden Tag 12 Kilometer zur Arbeit und dachte, vielleicht wäre ein E-Bike eine Alternative zum Auto.','Danke, ja genau. Ich fahre täglich zur Arbeit, so 12 Kilometer einfach. Da kam mir die Idee mit dem E-Bike.'],
             score:{kundenfreundlichkeit:15}},
            {phase:'bedarf', triggers:['wie weit','strecke','kilometer','wohin','wofür','nutzen','fahren','pendel','alltag','einsatz','gelände','stadt','weg','route'],
             replies:['Also hauptsächlich für den Arbeitsweg. 12 Kilometer einfach, größtenteils Radweg, ein paar Steigungen sind dabei. Und am Wochenende vielleicht mal eine Tour mit meiner Frau.','Der Arbeitsweg ist 12km, relativ flach mit zwei kleinen Hügeln. Gibt es da einen großen Unterschied bei den Motoren?'],
             score:{bedarfsermittlung:20}},
            {phase:'budget', triggers:['budget','preis','kosten','ausgeben','vorstellung','preislich','investieren','preisklasse','euro','geld','wert'],
             replies:['So zwischen 3.000 und 4.000 Euro hatte ich mir gedacht. Ist das realistisch für ein gutes E-Bike?','Hmm, ich hatte so an 3.000 bis 4.000 gedacht. Kriegt man da was Vernünftiges?'],
             score:{bedarfsermittlung:15}},
            {phase:'produkt', triggers:['motor','bosch','shimano','akku','reichweite','watt','nm','drehmoment','antrieb','mittelmotor','hinterrad','schaltung','gang','bremse','federung','rahmen','gewicht','kilo'],
             replies:['Bosch kenne ich vom Hören. Wie weit kommt man denn mit einer Akkuladung? Meine Strecke ist ja 24km hin und zurück.','Das klingt schon gut. Und wie ist das mit der Reichweite? Ich will nicht auf halber Strecke stehen bleiben!'],
             score:{produktwissen:20}},
            {phase:'einwand_akku', triggers:['reichweite','laden','akku','batterie','strom','ladezeit','km','kilometer','weit','laden'],
             replies:['80 bis 120 Kilometer? Das reicht ja locker für die ganze Woche! Muss man den Akku komplett leerfahren oder kann man auch zwischendurch laden?','Ok, das beruhigt mich. Wie lange hält so ein Akku eigentlich, bevor man ihn tauschen muss?'],
             score:{einwandbehandlung:15}},
            {phase:'einwand_diebstahl', triggers:['diebstahl','sicher','schloss','versicherung','stehlen','abschließen','geklaut','angst','keller','garage','dieb'],
             replies:['Ja, das ist bei mir ein großes Thema. Bei der Arbeit steht das Rad draußen. Was empfehlen Sie da?','Guter Punkt! Auf der Arbeit gibt es nur einen normalen Fahrradständer draußen. Gibt es gute Schlösser oder eine Versicherung?'],
             score:{einwandbehandlung:20}},
            {phase:'probefahrt', triggers:['probefahrt','testen','ausprobieren','mal drauf','fahren','sitzen','test','probe','aufsteigen','mal setzen'],
             replies:['Ja, sehr gerne! Das würde mir die Entscheidung bestimmt leichter machen.','Probefahrt wäre super! Dann merke ich ja, ob mir das Fahrgefühl taugt.'],
             score:{abschlusstechnik:20}},
            {phase:'vergleich', triggers:['unterschied','vergleich','besser','oder','modell','empfehl','welches','tipp','vorschlag','favorit','top','best'],
             replies:['Und was würden Sie mir konkret empfehlen? Also welches Modell für meinen Einsatz?','Haben Sie einen persönlichen Favoriten für Pendler in meiner Preisklasse?'],
             score:{produktwissen:15}},
            {phase:'abschluss', triggers:['bestellen','kaufen','nehmen','haben','reservieren','lieferzeit','verfügbar','mitnehmen','wann','finanzierung','leasing','jobrad'],
             replies:['Das klingt wirklich gut. Wie sieht es mit der Verfügbarkeit aus? Und bieten Sie auch Finanzierung an?','Ich bin ziemlich überzeugt. Gibt es die Möglichkeit, das über JobRad zu machen? Mein Arbeitgeber bietet das an.'],
             score:{abschlusstechnik:25}},
            {phase:'positiv', triggers:['gut','super','toll','klasse','prima','perfekt','genau','richtig','stimmt','interessant','klingt gut','spannend'],
             replies:['Ja, das klingt wirklich überzeugend. Haben Sie noch weitere Tipps für E-Bike-Einsteiger?','Super, danke für die Info! Was sollte ich noch wissen, bevor ich mich entscheide?'],
             score:{kundenfreundlichkeit:10}},
            {phase:'negativ', triggers:['teuer','viel geld','überlegen','nochmal drüber','frau fragen','weiß nicht','unsicher','schwierig','hmm','naja'],
             replies:['Hmm, das ist schon eine Menge Geld. Lohnt sich das wirklich gegenüber dem Auto?','Ich muss da nochmal drüber nachdenken. Kann ich ein Angebot mitnehmen?'],
             score:{}},
            {phase:'default', triggers:[],
             replies:['Können Sie mir dazu noch etwas mehr erzählen?','Das ist interessant. Was genau meinen Sie damit?','Verstehe. Und was empfehlen Sie da konkret?'],
             score:{}}
        ]
    },
    {
        id:'premium_upgrade', title:'Premium-Upgrade', icon:'💎', difficulty:'Fortgeschritten', diffColor:'#D97706',
        desc:'Stammkundin will ihr 3 Jahre altes E-Bike ersetzen. Chance für ein Upgrade!',
        opener:'Hi! Ich war vor drei Jahren schon mal bei euch und hab mein Trekking-Bike hier gekauft. Jetzt brauch ich was Neues, der Akku macht langsam schlapp.',
        criteria:['Kundenhistorie nutzen','Upselling-Technik','Mehrwert-Argumentation','Vergleichskompetenz','Kundenbindung'],
        customer:'Sabine Koch, 44 Jahre, erfahrene Fahrerin (5000km/Jahr)',
        responses:[
            {phase:'start', triggers:['willkommen','schön','wieder','erinnere','damals','freut','toll dass','zurück'],
             replies:['Ja, damals war ich super zufrieden mit der Beratung! Das Bike hat mir drei Jahre gute Dienste geleistet. Aber jetzt merke ich den Akku doch deutlich.'],
             score:{kundenhistorie:20}},
            {phase:'bedarf', triggers:['was fahren','strecke','nutzen','wofür','wie viel','kilometer','akku problem','defekt'],
             replies:['Ich fahre so 5.000 Kilometer im Jahr, hauptsächlich Touren und den Arbeitsweg. Beim alten Bike schafft der Akku nur noch 60km statt der ursprünglichen 100.'],
             score:{kundenhistorie:15}},
            {phase:'upgrade', triggers:['neu','technologie','besser','weiterentwickl','fortschritt','generation','upgrade','verbessert','modern'],
             replies:['Oh wirklich? Was hat sich denn in den drei Jahren so getan? Mein altes hat noch den Bosch Performance Line.'],
             score:{upselling:20}},
            {phase:'premium', triggers:['premium','hochwertig','top','spitzen','leicht','carbon','vollausstattung','extra','beste'],
             replies:['Das klingt schon verlockend, aber brauche ich wirklich die Premium-Variante? Was ist der konkrete Vorteil gegenüber der Mittelklasse?'],
             score:{mehrwert:20,upselling:15}},
            {phase:'vergleich', triggers:['unterschied','vergleich','versus','statt','gegenüber','besser als','dein altes','modell'],
             replies:['Ok, also mehr Reichweite und leichter. Wie viel mehr kostet die Premium-Variante gegenüber dem vergleichbaren Mittelklasse-Modell?'],
             score:{vergleichskompetenz:20}},
            {phase:'preis', triggers:['preis','kosten','euro','budget','invest','teuer','wert','lohnt','amortis'],
             replies:['Hmm, 4.500 Euro ist schon ein Sprung nach oben. Kann man das irgendwie finanzieren? Und was würde ich für mein altes Bike noch bekommen?'],
             score:{upselling:10}},
            {phase:'inzahlung', triggers:['altes bike','inzahlung','tausch','eintausch','ankauf','gebraucht','zurücknehmen','alt gegen neu'],
             replies:['Inzahlung? Das wäre natürlich super! Dann relativiert sich der Preis ja. Was wäre mein altes Bike noch wert?'],
             score:{kundenbindung:20}},
            {phase:'abschluss', triggers:['bestellen','kaufen','nehmen','probefahrt','test','probieren','entschieden','will','hätte gern'],
             replies:['Ich bin ehrlich gesagt ziemlich überzeugt. Kann ich eine Probefahrt machen, um den Unterschied selbst zu spüren?'],
             score:{upselling:15,kundenbindung:15}},
            {phase:'default', triggers:[],
             replies:['Können Sie mir das etwas genauer erklären?','Interessant. Wie schlägt sich das im Vergleich zu meinem aktuellen Bike?','Und was sagen Ihre anderen Kunden dazu?'],
             score:{}}
        ]
    },
    {
        id:'reklamation', title:'Schwieriger Kunde', icon:'😤', difficulty:'Experte', diffColor:'#DC2626',
        desc:'Unzufriedener Kunde mit Reklamation. E-Bike hat nach 4 Monaten einen Defekt.',
        opener:'So, ich bin jetzt zum zweiten Mal hier wegen dem Problem. Mein E-Bike ist vier Monate alt und der Motor spinnt schon wieder. Beim Anruf letzte Woche hat mir niemand geholfen!',
        criteria:['Empathie zeigen','Deeskalation','Lösungsorientierung','Verbindlichkeit','Kundenzufriedenheit'],
        customer:'Frank Weber, 38 Jahre, verärgert, E-Bike 4 Monate alt (3800€)',
        responses:[
            {phase:'empathie', triggers:['versteh','tut mir','entschuldig','nachvollzieh','ärger','verständ','sorry','schlimm','unangenehm','bedauer'],
             replies:['Na immerhin nimmt mich hier mal jemand ernst. Aber ich bin trotzdem sauer. Das Bike hat fast 4.000 Euro gekostet!','Ok... Danke. Aber was passiert jetzt konkret? Ich brauche das Bike für den Arbeitsweg.'],
             score:{empathie:25,deeskalation:15}},
            {phase:'problem', triggers:['was genau','problem','sympto','beschreib','erzähl','wann','wie äußert','geräusch','motor','defekt','fehler','passiert'],
             replies:['Der Motor macht ein komisches Klacken und schaltet sich manchmal einfach ab. Mitten auf der Straße! Das ist doch gefährlich!','Beim Anfahren klackt es laut und ab 20 km/h schaltet die Unterstützung manchmal einfach aus. Das passiert seit zwei Wochen.'],
             score:{loesungsorientierung:15}},
            {phase:'loesung', triggers:['werkstatt','reparatur','lösung','beheben','sofort','schnell','termin','prüfen','diagnose','tauschen','ersatz','garantie','gewährleist'],
             replies:['Garantie ist klar, aber wie lange dauert die Reparatur? Ich kann nicht wochenlang ohne Bike sein!','Ok, und wenn es länger dauert? Bekomme ich dann ein Leihrad? Ich bin auf das Bike angewiesen.'],
             score:{loesungsorientierung:20,verbindlichkeit:15}},
            {phase:'leihrad', triggers:['leihrad','leih','ersatzrad','übergangs','zwischenzei','überbrück','alternative','solange'],
             replies:['Ein Leihrad? Das wäre natürlich super. Dann kann ich damit leben. Wann könnte ich das abholen?','Ok, das ist fair. Wann steht das Leihrad bereit und wie lange wird die Reparatur dauern?'],
             score:{kundenzufriedenheit:20,verbindlichkeit:15}},
            {phase:'termin', triggers:['morgen','übermorgen','diese woche','termin','wann','zeitplan','abhol','bringen','vorbeikommen','montag','dienstag'],
             replies:['Morgen wäre gut. Kann ich das Bike morgen früh vorbeibringen und direkt das Leihrad mitnehmen?','Diese Woche noch? Ok, das geht in Ordnung. Dann komme ich morgen.'],
             score:{verbindlichkeit:20}},
            {phase:'eskalation', triggers:['anwalt','bewertung','google','facebook','melden','verbraucherschutz','schlecht','unverschämt','frechheit','skandal'],
             replies:['Hören Sie, ich will mich nicht streiten. Ich will nur, dass mein Bike funktioniert. Können wir das jetzt klären?','Ich will keine schlechte Bewertung schreiben müssen. Geben Sie mir einfach eine vernünftige Lösung.'],
             score:{}},
            {phase:'zufrieden', triggers:['danke','ok','gut','fair','einverstanden','passt','akzeptier','annehm','klingt gut'],
             replies:['Gut, danke. Dann machen wir das so. Entschuldigung, dass ich vorhin etwas laut war. Aber Sie verstehen das sicher.','Ok, das klingt fair. Schreiben Sie mir das bitte noch als Bestätigung auf? Dann sind wir uns einig.'],
             score:{kundenzufriedenheit:20,deeskalation:10}},
            {phase:'default', triggers:[],
             replies:['Ja und? Was machen wir jetzt?','Das hilft mir jetzt nicht weiter. Was ist der konkrete nächste Schritt?','Können wir bitte zum Punkt kommen?'],
             score:{}}
        ]
    },
    {
        id:'family', title:'Familienberatung', icon:'👨‍👩‍👧', difficulty:'Einsteiger', diffColor:'#059669',
        desc:'Familie möchte Fahrräder für alle. Verschiedene Wünsche und Bedürfnisse.',
        opener:'Guten Tag! Wir sind die Familie Berger. Wir wollen uns alle mit neuen Fahrrädern ausstatten - meine Frau, meine Tochter und ich. Wo fangen wir am besten an?',
        criteria:['Mehrpersonen-Beratung','Budgetberatung','Angst nehmen','Paketangebot','Familienfreundlichkeit'],
        customer:'Martin Berger (41), Frau Lisa (39, unsicher), Tochter Emma (12)',
        responses:[
            {phase:'start', triggers:['willkommen','hallo','schön','toll','familie','super','klasse','gemeinsam','zusammen'],
             replies:['Danke! Ja, wir wollen das jetzt endlich mal anpacken. Emma hat schon ganz hibbelig gefragt, ob sie sich ein Bike aussuchen darf.'],
             score:{familienfreundlichkeit:15}},
            {phase:'bedarf', triggers:['wofür','nutzen','fahren','wohin','strecke','gelände','touren','alltag','schule','arbeit'],
             replies:['Also ich will damit zur Arbeit fahren, so 8 Kilometer. Lisa will hauptsächlich Einkäufe machen und vielleicht Wochenendtouren. Und Emma fährt damit zur Schule und zu Freunden.'],
             score:{mehrpersonen:20}},
            {phase:'lisa', triggers:['frau','lisa','partnerin','unsicher','angst','sicher','komfort','bequem','einstieg','tief','aufrecht'],
             replies:['Ja, Lisa ist da etwas nervös... Sie ist seit 10 Jahren nicht mehr gefahren. Lisa sagt gerade, sie hätte gerne einen tiefen Einstieg und aufrechtes Sitzen. Und bitte nicht so schnell!'],
             score:{angst:20,mehrpersonen:10}},
            {phase:'emma', triggers:['tochter','emma','kind','mädchen','jugend','cool','farbe','schule','12','größe'],
             replies:['Emma ist 12 und ungefähr 1,52 Meter groß. Sie hätte das Rad gerne in Türkis oder Mint. Und es MUSS cool aussehen, sagt sie. Ihre Freundinnen haben auch neue Räder.'],
             score:{familienfreundlichkeit:15}},
            {phase:'budget', triggers:['budget','preis','kosten','gesamt','zusammen','paket','rabatt','sparen','angebot','alles zusammen'],
             replies:['Insgesamt hatten wir so an 4.000 bis maximal 6.000 Euro gedacht für alle drei. Geht das? Gibt es einen Familienrabatt?'],
             score:{budgetberatung:20}},
            {phase:'paket', triggers:['paket','bundle','zusammen','komplett','set','alles','drei räder','familien'],
             replies:['Ein Familienpaket? Das klingt gut! Was würde denn da alles reingehören? Helme und Schlösser auch?'],
             score:{paketangebot:25}},
            {phase:'zubehoer', triggers:['helm','schloss','licht','korb','tasche','zubehör','satteltasche','gepäck','klingel','ständer'],
             replies:['Stimmt, Helme brauchen wir auch alle drei neue. Und Lisa hätte gerne einen Korb vorne. Können Sie da was zusammenstellen?'],
             score:{paketangebot:15}},
            {phase:'probefahrt', triggers:['probefahrt','test','ausprobieren','sitzen','fahren','mal drauf','probieren'],
             replies:['Oh ja! Können wir alle drei eine Probefahrt machen? Lisa will unbedingt vorher testen, ob sie sich sicher fühlt.'],
             score:{angst:15,familienfreundlichkeit:10}},
            {phase:'abschluss', triggers:['bestellen','kaufen','nehmen','entschieden','kauf','paket','machen wir','lieferung','wann','abholen'],
             replies:['Das klingt nach einem super Plan! Können Sie uns das Angebot aufschreiben? Dann besprechen wir es kurz und entscheiden uns.'],
             score:{paketangebot:10,budgetberatung:10}},
            {phase:'default', triggers:[],
             replies:['Das müsste ich kurz mit meiner Frau besprechen... Lisa, was meinst du?','Interessant! Emma, hast du das gehört? Wie findest du das?','Können Sie uns noch mehr dazu erzählen?'],
             score:{}}
        ]
    }
];

var tState = { active:false, scenario:null, messages:[], timer:0, timerInterval:null, recognition:null, isListening:false, isSpeaking:false, usedPhases:[], scores:{} };

export function initTrainingModule() {
    var grid = document.getElementById('trainingScenarios');
    if(!grid) return;
    var h = '';
    TRAIN_SCENARIOS.forEach(function(sc) {
        h += '<div class="vit-card t-scenario-card p-5" onclick="startTraining(\''+sc.id+'\')">';
        h += '<div class="flex items-start gap-3">';
        h += '<span class="text-3xl">'+sc.icon+'</span>';
        h += '<div class="flex-1">';
        h += '<div class="flex items-center gap-2 mb-1"><span class="font-bold text-gray-800">'+sc.title+'</span>';
        h += '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full" style="background:'+sc.diffColor+'15;color:'+sc.diffColor+'">'+sc.difficulty+'</span></div>';
        h += '<p class="text-xs text-gray-500 leading-relaxed">'+sc.desc+'</p>';
        h += '<p class="text-[10px] text-gray-400 mt-1 italic">Kunde: '+sc.customer+'</p>';
        h += '</div>';
        h += '<span class="t-card-arrow text-lg" style="color:#EF7D00">→</span>';
        h += '</div></div>';
    });
    grid.innerHTML = h;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) { var w=document.getElementById('trainingSpeechWarn'); if(w) w.classList.remove('hidden'); }
}

export function getSimulatedResponse(scenario, userMsg) {
    var msg = userMsg.toLowerCase();
    var responses = scenario.responses;
    var bestMatch = null;
    var bestScore = 0;

    for(var i=0; i<responses.length; i++) {
        var r = responses[i];
        if(r.phase === 'default') continue;
        var matchCount = 0;
        for(var t=0; t<r.triggers.length; t++) {
            if(msg.includes(r.triggers[t])) matchCount++;
        }
        // Bonus for unused phases
        if(matchCount > 0 && tState.usedPhases.indexOf(r.phase) === -1) matchCount += 0.5;
        if(matchCount > bestScore) { bestScore = matchCount; bestMatch = r; }
    }

    if(!bestMatch || bestScore === 0) {
        bestMatch = responses[responses.length-1]; // default
    }

    // Track used phases and scores
    if(bestMatch.phase !== 'default') tState.usedPhases.push(bestMatch.phase);
    if(bestMatch.score) {
        for(var k in bestMatch.score) {
            tState.scores[k] = (tState.scores[k]||0) + bestMatch.score[k];
        }
    }

    // Pick a random reply from the options
    var replies = bestMatch.replies;
    return replies[Math.floor(Math.random()*replies.length)];
}

export function generateEvaluation(scenario) {
    var totalMsgs = tState.messages.filter(function(m){return m.role==='seller';}).length;
    var scores = tState.scores;
    var criteria = scenario.criteria;
    var evalResult = {gesamtScore:0, kriterien:[], staerken:[], verbesserungen:[], zusammenfassung:''};

    var total = 0;
    criteria.forEach(function(c) {
        var key = c.toLowerCase().replace(/[äöü ]/g, function(ch){return{ä:'ae',ö:'oe',ü:'ue',' ':''}[ch]||ch;}).replace(/[-\/]/g,'');
        // Check multiple possible key matches
        var score = 0;
        for(var k in scores) {
            if(key.includes(k) || k.includes(key.substring(0,6))) score += scores[k];
        }
        score = Math.min(100, Math.max(15, score + (totalMsgs > 3 ? 20 : 0)));
        // Add some variance
        score = Math.min(100, score + Math.floor(Math.random()*15));

        var kommentar = score >= 80 ? 'Sehr gut umgesetzt!' : score >= 60 ? 'Solide Leistung, noch Potenzial.' : score >= 40 ? 'Hier gibt es noch Verbesserungsmöglichkeiten.' : 'Dieser Bereich wurde kaum abgedeckt.';
        evalResult.kriterien.push({name:c, score:score, kommentar:kommentar});
        total += score;
    });

    evalResult.gesamtScore = Math.round(total / criteria.length);

    // Staerken (high scores)
    var sorted = evalResult.kriterien.slice().sort(function(a,b){return b.score-a.score;});
    sorted.slice(0,2).forEach(function(k) {
        if(k.score >= 50) evalResult.staerken.push(k.name + ' (' + k.score + '/100)');
    });
    if(evalResult.staerken.length===0) evalResult.staerken.push('Gespräch wurde geführt');
    if(totalMsgs >= 5) evalResult.staerken.push('Ausreichend Gesprächstiefe');

    // Verbesserungen (low scores)
    sorted.slice(-2).forEach(function(k) {
        if(k.score < 70) evalResult.verbesserungen.push(k.name + ' stärker fokussieren');
    });
    if(tState.usedPhases.length < 4) evalResult.verbesserungen.push('Mehr verschiedene Gesprächsaspekte abdecken');
    if(totalMsgs < 4) evalResult.verbesserungen.push('Längere Gespräche führen für bessere Ergebnisse');

    var gs = evalResult.gesamtScore;
    evalResult.zusammenfassung = gs >= 80
        ? 'Hervorragende Beratung! Du hast den Kunden gut abgeholt, auf seine Bedürfnisse eingegangen und ein überzeugendes Gespräch geführt.'
        : gs >= 60
        ? 'Solide Beratung mit guten Ansätzen. Einige Bereiche können noch vertieft werden, um den Kunden noch besser zu überzeugen.'
        : gs >= 40
        ? 'Das Gespräch hatte Potenzial, aber wichtige Beratungsaspekte wurden nicht ausreichend abgedeckt. Übe gezielt die schwächeren Bereiche.'
        : 'Hier ist noch viel Luft nach oben. Versuche, aktiver auf den Kunden einzugehen und alle Beratungsschritte abzudecken.';

    return evalResult;
}

export function startTraining(scenarioId) {
    var sc = TRAIN_SCENARIOS.find(function(s){ return s.id === scenarioId; });
    if(!sc) return;
    tState = {active:true, scenario:sc, messages:[], timer:0, timerInterval:null, recognition:null, isListening:false, isSpeaking:false, usedPhases:[], scores:{}};
    document.getElementById('trainingMenu').style.display = 'none';
    document.getElementById('trainingEval').style.display = 'none';
    document.getElementById('trainingSession').style.display = '';
    document.getElementById('tSessionIcon').textContent = sc.icon;
    document.getElementById('tSessionTitle').textContent = sc.title;
    document.getElementById('tSessionDiff').textContent = sc.difficulty;
    document.getElementById('tSessionHint').textContent = sc.desc;
    document.getElementById('tChatMessages').innerHTML = '';
    document.getElementById('tEndBtn').disabled = true;
    document.getElementById('tEndBtn').textContent = 'Beenden & Bewerten';
    clearInterval(tState.timerInterval);
    tState.timerInterval = setInterval(function() {
        tState.timer++;
        var el = document.getElementById('tSessionTimer');
        if(el) el.textContent = Math.floor(tState.timer/60)+':'+String(tState.timer%60).padStart(2,'0');
    }, 1000);
    tState.messages.push({role:'customer',text:sc.opener});
    renderTrainingMessages();
    speakTraining(sc.opener);
}

export function renderTrainingMessages() {
    var el = document.getElementById('tChatMessages');
    if(!el) return;
    var h = '';
    tState.messages.forEach(function(m) {
        if(m.role === 'customer') {
            h += '<div class="t-msg-customer"><p class="t-msg-label" style="color:var(--c-sub)">'+tState.scenario.icon+' Kunde</p><p class="t-msg-text">'+m.text+'</p></div>';
        } else {
            h += '<div class="t-msg-seller"><p class="t-msg-label" style="color:#EF7D00">🧑‍💼 Du (Verkäufer)</p><p class="t-msg-text">'+m.text+'</p></div>';
        }
    });
    el.innerHTML = h;
    el.scrollTop = el.scrollHeight;
    if(tState.messages.length >= 4) document.getElementById('tEndBtn').disabled = false;
}

export function speakTraining(text) {
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'de-DE';
    utt.rate = 1.0;
    var voices = window.speechSynthesis.getVoices();
    var deVoice = voices.find(function(v){ return v.lang.startsWith('de'); });
    if(deVoice) utt.voice = deVoice;
    tState.isSpeaking = true;
    showTrainingWave(true, false);
    utt.onend = function() { tState.isSpeaking = false; hideTrainingWave(); };
    utt.onerror = function() { tState.isSpeaking = false; hideTrainingWave(); };
    window.speechSynthesis.speak(utt);
}

export function showTrainingWave(speaking, listening) {
    var el = document.getElementById('tWaveform');
    var label = document.getElementById('tWaveLabel');
    if(!el) return;
    el.classList.remove('hidden');
    if(listening) {
        el.style.background = 'rgba(239,125,0,0.05)';
        if(label) { label.textContent = '🎤 Hört zu...'; label.style.color = '#EF7D00'; }
    } else {
        el.style.background = 'rgba(59,130,246,0.05)';
        if(label) { label.textContent = '🔊 Kunde spricht...'; label.style.color = '#3b82f6'; }
    }
    var bars = document.getElementById('tWaveBars');
    if(bars) {
        var bh = '';
        for(var i=0;i<24;i++) bh += '<div style="width:3px;border-radius:2px;background:'+(listening?'#EF7D00':'#3b82f6')+';height:4px;transition:height 0.12s" class="t-wave-bar"></div>';
        bars.innerHTML = bh;
        animateTrainingWave();
    }
}

var tWaveAnimId = null;
export function animateTrainingWave() {
    clearInterval(tWaveAnimId);
    tWaveAnimId = setInterval(function() {
        document.querySelectorAll('.t-wave-bar').forEach(function(b) {
            b.style.height = (tState.isListening || tState.isSpeaking) ? (Math.random()*24+4)+'px' : '4px';
        });
    }, 100);
}
export function hideTrainingWave() {
    var el = document.getElementById('tWaveform');
    if(el) el.classList.add('hidden');
    clearInterval(tWaveAnimId);
}

export function toggleTrainingMic() {
    if(tState.isListening) return;
    if(tState.isSpeaking) { window.speechSynthesis.cancel(); tState.isSpeaking = false; hideTrainingWave(); }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) { _showToast('Spracherkennung nicht verfügbar','warning'); return; }
    var recognition = new SR();
    recognition.lang = 'de-DE';
    recognition.interimResults = true;
    recognition.continuous = true;
    tState.recognition = recognition;
    tState.isListening = true;
    var finalT = '';
    recognition.onresult = function(e) {
        var interim = '';
        for(var i=e.resultIndex;i<e.results.length;i++) {
            if(e.results[i].isFinal) finalT += e.results[i][0].transcript + ' ';
            else interim += e.results[i][0].transcript;
        }
        var full = (finalT + interim).trim();
        var el = document.getElementById('tTranscript');
        if(el && full) { el.classList.remove('hidden'); el.textContent = '"' + full + '"'; }
    };
    recognition.onerror = function() { tState.isListening = false; resetTrainingInput(); hideTrainingWave(); };
    recognition.onend = function() { tState.isListening = false; };
    recognition.start();
    showTrainingWave(false, true);
    document.getElementById('tMicBtn').classList.add('hidden');
    document.getElementById('tSendMicBtn').classList.remove('hidden');
    document.getElementById('tInputHint').textContent = 'Sprich jetzt... Drücke ✓ zum Senden';
}

export function sendTrainingVoice() {
    if(tState.recognition) { tState.recognition.stop(); tState.recognition = null; }
    tState.isListening = false;
    hideTrainingWave();
    var el = document.getElementById('tTranscript');
    var text = el ? el.textContent.replace(/^"|"$/g,'').trim() : '';
    if(el) el.classList.add('hidden');
    resetTrainingInput();
    if(!text) return;
    processTrainingMessage(text);
}

export function sendTrainingText() {
    var inp = document.getElementById('tTextInput');
    var text = inp ? inp.value.trim() : '';
    if(!text) return;
    inp.value = '';
    var btn = document.getElementById('tSendTextBtn');
    if(btn) btn.classList.add('hidden');
    processTrainingMessage(text);
}

document.addEventListener('input', function(e) {
    if(e.target && e.target.id === 'tTextInput') {
        var btn = document.getElementById('tSendTextBtn');
        if(btn) btn.classList.toggle('hidden', !e.target.value.trim());
    }
});

export function resetTrainingInput() {
    var mic = document.getElementById('tMicBtn');
    var send = document.getElementById('tSendMicBtn');
    if(mic) mic.classList.remove('hidden');
    if(send) send.classList.add('hidden');
    var hint = document.getElementById('tInputHint');
    if(hint) hint.textContent = 'Drücke 🎤 oder tippe deine Antwort';
}

export function processTrainingMessage(text) {
    tState.messages.push({role:'seller', text:text});
    renderTrainingMessages();

    // Show thinking briefly
    var thinking = document.getElementById('tThinking');
    if(thinking) thinking.classList.remove('hidden');

    // Simulate small delay for realism
    setTimeout(function() {
        if(thinking) thinking.classList.add('hidden');
        var reply = getSimulatedResponse(tState.scenario, text);
        tState.messages.push({role:'customer', text:reply});
        renderTrainingMessages();
        speakTraining(reply);
    }, 800 + Math.random()*700);
}

export function endTrainingSession() {
    if(tState.recognition) { tState.recognition.stop(); tState.recognition = null; }
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    clearInterval(tState.timerInterval);
    tState.isListening = false;
    tState.isSpeaking = false;
    tState.active = false;
    hideTrainingWave();

    var ev = generateEvaluation(tState.scenario);
    showTrainingEvaluation(ev);
}

export function showTrainingEvaluation(ev) {
    document.getElementById('trainingSession').style.display = 'none';
    document.getElementById('trainingEval').style.display = '';
    document.getElementById('tEvalTitle').textContent = tState.scenario.title;
    document.getElementById('tEvalMeta').textContent = tState.messages.length + ' Nachrichten • ' + Math.floor(tState.timer/60)+':'+String(tState.timer%60).padStart(2,'0');
    var score = ev.gesamtScore || 0;
    var svg = document.getElementById('tScoreRing');
    var r=42, circ=2*Math.PI*r, offset=circ-(score/100)*circ;
    var col = score>=80?'#059669':score>=60?'#D97706':'#DC2626';
    svg.innerHTML = '<circle cx="50" cy="50" r="'+r+'" fill="none" stroke="#e5e7eb" stroke-width="5"/><circle cx="50" cy="50" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="5" stroke-dasharray="'+circ+'" stroke-dashoffset="'+offset+'" stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:center;transition:stroke-dashoffset 1s"/><text x="50" y="50" text-anchor="middle" dominant-baseline="central" style="font-size:24px;font-weight:800;fill:'+col+'">'+score+'</text>';
    document.getElementById('tScoreLabel').textContent = score>=80?'Hervorragend! 🌟':score>=60?'Gut gemacht! 👍':'Ausbaufähig 💪';
    document.getElementById('tScoreSummary').textContent = ev.zusammenfassung || '';
    var rings = document.getElementById('tCriteriaRings');
    var details = document.getElementById('tCriteriaDetails');
    var rh='', dh='';
    (ev.kriterien||[]).forEach(function(k) {
        var kc = k.score>=80?'#059669':k.score>=60?'#D97706':'#DC2626';
        var kr=20, kcirc=2*Math.PI*kr, koff=kcirc-(k.score/100)*kcirc;
        rh += '<div class="text-center"><svg width="48" height="48"><circle cx="24" cy="24" r="'+kr+'" fill="none" stroke="#e5e7eb" stroke-width="3"/><circle cx="24" cy="24" r="'+kr+'" fill="none" stroke="'+kc+'" stroke-width="3" stroke-dasharray="'+kcirc+'" stroke-dashoffset="'+koff+'" stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:center;transition:stroke-dashoffset 1s"/><text x="24" y="24" text-anchor="middle" dominant-baseline="central" style="font-size:11px;font-weight:700;fill:'+kc+'">'+k.score+'</text></svg><p class="text-[9px] text-gray-500 font-semibold mt-1" style="max-width:70px">'+k.name+'</p></div>';
        dh += '<div class="p-3 rounded-lg" style="background:var(--c-bg2)"><div class="flex justify-between mb-1"><span class="text-xs font-semibold text-gray-800">'+k.name+'</span><span class="text-xs font-bold" style="color:'+kc+'">'+k.score+'/100</span></div><p class="text-[11px] text-gray-500">'+k.kommentar+'</p></div>';
    });
    if(rings) rings.innerHTML = rh;
    if(details) details.innerHTML = dh;
    var sh='', ih='';
    (ev.staerken||[]).forEach(function(s){ sh += '<p class="text-xs text-gray-600">• '+s+'</p>'; });
    (ev.verbesserungen||[]).forEach(function(v){ ih += '<p class="text-xs text-gray-600">• '+v+'</p>'; });
    document.getElementById('tStrengths').innerHTML = sh || '<p class="text-xs text-gray-400">—</p>';
    document.getElementById('tImprovements').innerHTML = ih || '<p class="text-xs text-gray-400">—</p>';
}

export function restartTrainingScenario() { if(tState.scenario) startTraining(tState.scenario.id); }
export function backToTrainingMenu() {
    document.getElementById('trainingSession').style.display = 'none';
    document.getElementById('trainingEval').style.display = 'none';
    document.getElementById('trainingMenu').style.display = '';
    document.getElementById('tEndBtn').textContent = 'Beenden & Bewerten';
    initTrainingModule();
}

// Strangler Fig
const _exports = {initTrainingModule,getSimulatedResponse,generateEvaluation,startTraining,renderTrainingMessages,speakTraining,showTrainingWave,animateTrainingWave,hideTrainingWave,toggleTrainingMic,sendTrainingVoice,sendTrainingText,resetTrainingInput,processTrainingMessage,endTrainingSession,showTrainingEvaluation,restartTrainingScenario,backToTrainingMenu};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });

// === Window Exports (onclick handlers) ===
window.backToTrainingMenu = backToTrainingMenu;
window.endTrainingSession = endTrainingSession;
window.restartTrainingScenario = restartTrainingScenario;
window.sendTrainingText = sendTrainingText;
window.sendTrainingVoice = sendTrainingVoice;
window.toggleTrainingMic = toggleTrainingMic;
