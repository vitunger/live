// vit:bikes - Extern/Lite Home View
// Migrated from inline/render-system.js

// Safe Helpers
function _sb()       { return window.sb; }
function _sbUser()   { return window.sbUser; }
function _sbProfile(){ return window.sbProfile; }
function _escH(s)    { return window.escH ? window.escH(s) : String(s); }
function _showToast(m,t){ if(window.showToast) window.showToast(m,t||'info'); }

function renderExternHome() {
    var stage = SESSION.stage;
    var stageLabels = {
        phase0: { label: 'Phase 0 – Kostenloser Akademiezugang', desc: 'Einstieg ohne Verpflichtung – lerne vit:bikes kennen' },
        part1: { label: 'Trainingsphase Part 1 – Strategie & Qualifizierung', desc: '3 Monate strategisches Fundament' },
        part2: { label: 'Trainingsphase Part 2 – Integration & Umsetzung', desc: '9 Monate operative Systemintegration' },
        partner: { label: 'Partnerphase – Voller Standort', desc: 'Willkommen im vit:bikes Netzwerk!' }
    };
    var info = stageLabels[stage] || stageLabels.phase0;
    var el = document.getElementById('externStageLabel');
    if(el) el.textContent = info.label;
    var descEl = document.getElementById('externStageDesc');
    if(descEl) descEl.textContent = info.desc;

    // Roadmap
    var roadmapEl = document.getElementById('externRoadmap');
    if(roadmapEl) {
        var stages = ['phase0','part1','part2','partner'];
        var labels = ['Phase 0','Part 1','Part 2','Partner'];
        var icons = ['\u{1F193}','\u{1F4CB}','\u{26A1}','\u{1F3C6}'];
        var currentIdx = stages.indexOf(stage);
        var h = '';
        stages.forEach(function(s, i) {
            var isCurrent = i === currentIdx;
            var isDone = i < currentIdx;
            var bgColor = isDone ? '#15803d' : isCurrent ? '#EF7D00' : 'var(--c-border)';
            var textColor = isDone || isCurrent ? 'white' : '#6b7280';
            h += '<div class="flex-1 text-center">';
            h += '<div class="mx-auto w-12 h-12 rounded-full flex items-center justify-center text-xl mb-2" style="background:'+bgColor+';color:'+textColor+';">'+(isDone?'\u2713':icons[i])+'</div>';
            h += '<p class="text-xs font-semibold '+(isCurrent?'text-vit-orange':isDone?'text-green-600':'text-gray-400')+'">'+labels[i]+'</p>';
            h += '</div>';
            if(i < stages.length - 1) {
                h += '<div class="flex-shrink-0 w-8 lg:w-16 flex items-center justify-center" style="margin-top:-20px"><div style="height:2px;width:100%;background:'+(isDone?'#15803d':'#e5e7eb')+';"></div></div>';
            }
        });
        roadmapEl.innerHTML = h;
    }

    // Included features
    var includedEl = document.getElementById('externIncluded');
    if(includedEl) {
        var features = {
            phase0: [
                { icon: '\u{1F4DA}', text: 'Akademie-Zugang (Grundkurse)', active: true },
                { icon: '\u{1F4AC}', text: 'Community lesen', active: true },
                { icon: '\u{1F198}', text: 'Basis-Support', active: true },
                { icon: '\u{1F5FA}', text: 'Onboarding-Roadmap', active: true },
                { icon: '\u{1F512}', text: 'Strategiemodule', active: false },
                { icon: '\u{1F512}', text: 'Einkaufskonditionen', active: false }
            ],
            part1: [
                { icon: '\u{1F4DA}', text: 'Alle Akademie-Inhalte', active: true },
                { icon: '\u{1F4CA}', text: 'Strategiemodule', active: true },
                { icon: '\u{1F465}', text: 'Begleitung durch vit:bikes Team', active: true },
                { icon: '\u{1F512}', text: 'Einkaufskonditionen', active: false }
            ],
            part2: [
                { icon: '\u{1F6D2}', text: 'Einkaufs- & Leasingkonditionen', active: true },
                { icon: '\u{1F393}', text: 'Workshops', active: true },
                { icon: '\u{1F4DE}', text: 'Vollstaendiger Support', active: true },
                { icon: '\u{1F512}', text: 'Volle Markenfuehrung', active: false }
            ]
        };
        var list = features[stage] || features.phase0;
        var fh = '';
        list.forEach(function(f) {
            fh += '<div class="flex items-center space-x-3 p-2.5 rounded-lg '+(f.active?'bg-green-50':'bg-gray-50 opacity-60')+'">';
            fh += '<span class="text-lg">'+f.icon+'</span>';
            fh += '<span class="text-sm '+(f.active?'text-gray-700':'text-gray-400')+'">'+f.text+'</span>';
            if(f.active) fh += '<span class="ml-auto text-green-500 text-xs">\u2713</span>';
            fh += '</div>';
        });
        includedEl.innerHTML = fh;
    }
}


// Exports
export { renderExternHome };
window.renderExternHome = renderExternHome;
