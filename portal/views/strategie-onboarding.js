/**
 * views/strategie-onboarding.js - Asana Onboarding Integration, Verkaufserfolg Tracking
 * @module views/strategie-onboarding
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }

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

// Strangler Fig
const _exports = { loadAsanaOnboarding, loadDemoTasks, groupTasksBySections, renderAsanaTasks, renderSection, getSectionIcon, renderTask, toggleTaskCompletion, updateSalesData, saveSalesData };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
