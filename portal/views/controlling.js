/**
 * views/controlling.js - Partner-Portal Controlling & BWA Module
 *
 * Handles: BWA upload/parse (Excel/CSV), AI-powered analysis, BWA detail view,
 *          BWA trend charts, file format detection (DATEV/Kompakt/etc),
 *          Plan/Ist comparison, financial helpers
 *
 * @module views/controlling
 */
function _sb()        { return window.sb; }
function _sbUser()    { return window.sbUser; }
function _sbProfile() { return window.sbProfile; }
function _escH(s)     { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)        { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t){ if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)     { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }

// === CONTROLLING TABS ===
export function showControllingTab(tabName) {
    document.querySelectorAll('.ctrl-tab-content').forEach(function(t) { t.style.display = 'none'; });
    document.querySelectorAll('.ctrl-tab-btn').forEach(function(b) {
        b.className = 'ctrl-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
    });
    var tabId = 'ctrlTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    var el = document.getElementById(tabId);
    if (el) el.style.display = 'block';
    var btn = document.querySelector('.ctrl-tab-btn[data-tab="' + tabName + '"]');
    if (btn) btn.className = 'ctrl-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
}

export function showBwaDetail(id) {
    // Legacy stub - now handled by showBwaFromDb
}

// =============================================
// BWA PARSER MODULE (Auto-Detect 8 Formate)
// =============================================
var BwaParser=(function(){'use strict';var BWA_ZEILEN={1020:{name:'Umsatzerlöse',gruppe:'Umsatzerlöse',summe:true},1040:{name:'Bestandsveränderg. FE/UE',gruppe:'Bestandsveränderungen',summe:true},1045:{name:'Aktivierte Eigenleistungen',gruppe:'Eigenleistungen',summe:true},1050:{name:'Sonstige betriebliche Erlöse',gruppe:'Sonstige Erlöse',summe:true},1051:{name:'Gesamtleistung',gruppe:'Gesamtleistung',summe:true},1060:{name:'Material-/Wareneinkauf',gruppe:'Materialaufwand',summe:true},1080:{name:'Rohertrag',gruppe:'Rohertrag',summe:true},1100:{name:'Sonstige betriebliche Erlöse',gruppe:'Sonstige Erlöse',summe:true},1120:{name:'Betrieblicher Rohertrag',gruppe:'Betrieblicher Rohertrag',summe:true},1140:{name:'Personalkosten',gruppe:'Personalkosten',summe:true},1150:{name:'Löhne und Gehälter',gruppe:'Personalkosten',summe:false},1155:{name:'Soziale Abgaben',gruppe:'Personalkosten',summe:false},1160:{name:'Raumkosten',gruppe:'Raumkosten',summe:true},1170:{name:'Betriebliche Steuern',gruppe:'Steuern/Versicherungen',summe:true},1175:{name:'Versicherungen/Beiträge',gruppe:'Steuern/Versicherungen',summe:true},1180:{name:'Kfz-Kosten',gruppe:'Fahrzeugkosten',summe:true},1190:{name:'Werbe-/Reisekosten',gruppe:'Werbe-/Reisekosten',summe:true},1200:{name:'Kosten der Warenabgabe',gruppe:'Warenabgabekosten',summe:true},1210:{name:'Abschreibungen',gruppe:'Abschreibungen',summe:true},1220:{name:'Reparatur/Instandhaltung',gruppe:'Instandhaltung',summe:true},1240:{name:'Sonstige Kosten',gruppe:'Sonstige Kosten',summe:true},1250:{name:'Gesamtkosten',gruppe:'Gesamtkosten',summe:true},1260:{name:'Summe betriebliche Aufwendungen',gruppe:'Summe Aufwendungen',summe:true},1270:{name:'Betriebsergebnis',gruppe:'Betriebsergebnis',summe:true},1280:{name:'Zinsaufwand',gruppe:'Zinsen',summe:true},1285:{name:'Zinsertrag',gruppe:'Zinsen',summe:true},1290:{name:'Neutraler Aufwand',gruppe:'Neutrales Ergebnis',summe:true},1295:{name:'Neutraler Ertrag',gruppe:'Neutrales Ergebnis',summe:true},1300:{name:'Ergebnis vor Steuern',gruppe:'Ergebnis',summe:true},1370:{name:'Vorläufiges Ergebnis',gruppe:'Ergebnis',summe:true}};
var KOMPAKT_MAP={'umsatzerlöse':{gruppe:'Umsatzerlöse',zeile:1020,summe:true},'umsatzerl.':{gruppe:'Umsatzerlöse',zeile:1020,summe:true},'gesamterlöse':{gruppe:'Gesamtleistung',zeile:1051,summe:true},'gesamtleistung':{gruppe:'Gesamtleistung',zeile:1051,summe:true},'bestandsveränderg. fe/ue':{gruppe:'Bestandsveränderungen',zeile:1040,summe:true},'wareneinsatz':{gruppe:'Materialaufwand',zeile:1060,summe:true},'wareneinsatz / material- und stoffverbrauch':{gruppe:'Materialaufwand',zeile:1060,summe:true},'material-/wareneinkauf':{gruppe:'Materialaufwand',zeile:1060,summe:true},'mat./wareneinkauf':{gruppe:'Materialaufwand',zeile:1060,summe:true},'rohertrag':{gruppe:'Rohertrag',zeile:1080,summe:true},'sonstige betriebliche erlöse':{gruppe:'Sonstige Erlöse',zeile:1100,summe:true},'sonst. betr. erlöse':{gruppe:'Sonstige Erlöse',zeile:1100,summe:true},'betrieblicher rohertrag':{gruppe:'Betrieblicher Rohertrag',zeile:1120,summe:true},'personalkosten':{gruppe:'Personalkosten',zeile:1140,summe:true},'personalaufwand':{gruppe:'Personalkosten',zeile:1140,summe:true},'löhne/gehälter':{gruppe:'Personalkosten',zeile:1150,summe:false},'löhne und gehälter':{gruppe:'Personalkosten',zeile:1150,summe:false},'ges. soz. aufwendung':{gruppe:'Personalkosten',zeile:1155,summe:false},'soziale abgaben':{gruppe:'Personalkosten',zeile:1155,summe:false},'raumkosten':{gruppe:'Raumkosten',zeile:1160,summe:true},'betriebliche steuern':{gruppe:'Steuern/Versicherungen',zeile:1170,summe:true},'vers./beitr./steuern':{gruppe:'Steuern/Versicherungen',zeile:1175,summe:true},'versicherungen / beiträge':{gruppe:'Steuern/Versicherungen',zeile:1175,summe:true},'kfz. kosten':{gruppe:'Fahrzeugkosten',zeile:1180,summe:true},'kfz.-kosten (ohne steuer)':{gruppe:'Fahrzeugkosten',zeile:1180,summe:true},'werbe- und reisekost':{gruppe:'Werbe-/Reisekosten',zeile:1190,summe:true},'werbe- / reisekosten':{gruppe:'Werbe-/Reisekosten',zeile:1190,summe:true},'kosten warenabgabe':{gruppe:'Warenabgabekosten',zeile:1200,summe:true},'kosten der warenabgabe':{gruppe:'Warenabgabekosten',zeile:1200,summe:true},'afa anlageverm.':{gruppe:'Abschreibungen',zeile:1210,summe:false},'afa umlaufverm.':{gruppe:'Abschreibungen',zeile:1210,summe:false},'afa gesamt':{gruppe:'Abschreibungen',zeile:1210,summe:true},'abschreibungen':{gruppe:'Abschreibungen',zeile:1210,summe:true},'instandhaltung':{gruppe:'Instandhaltung',zeile:1220,summe:true},'reparatur/instandhaltung':{gruppe:'Instandhaltung',zeile:1220,summe:true},'sonstige kosten':{gruppe:'Sonstige Kosten',zeile:1240,summe:true},'verschiedene kosten':{gruppe:'Sonstige Kosten',zeile:1240,summe:true},'gesamtkosten':{gruppe:'Gesamtkosten',zeile:1250,summe:true},'summe kosten':{gruppe:'Gesamtkosten',zeile:1250,summe:true},'summe betr.aufw.':{gruppe:'Summe Aufwendungen',zeile:1260,summe:true},'betriebsergebnis':{gruppe:'Betriebsergebnis',zeile:1270,summe:true},'zinsertrag':{gruppe:'Zinsen',zeile:1285,summe:false},'zinsaufwand':{gruppe:'Zinsen',zeile:1280,summe:false},'neutraler aufwand':{gruppe:'Neutrales Ergebnis',zeile:1290,summe:false},'neutraler ertrag':{gruppe:'Neutrales Ergebnis',zeile:1295,summe:false},'neutrales ergebnis':{gruppe:'Neutrales Ergebnis',zeile:1295,summe:true},'ergebnis vor steuern':{gruppe:'Ergebnis',zeile:1300,summe:true},'vorl. ergebnis':{gruppe:'Ergebnis',zeile:1370,summe:true},'vorläufiges ergebnis':{gruppe:'Ergebnis',zeile:1370,summe:true},'besondere kosten':{gruppe:'Sonstige Kosten',zeile:1240,summe:false}};
function grv(sheet,rowNum){var vals=[];var range=XLSX.utils.decode_range(sheet['!ref']||'A1');for(var c=range.s.c;c<=range.e.c;c++){var cell=sheet[XLSX.utils.encode_cell({r:rowNum-1,c:c})];vals.push(cell?(cell.v!==undefined?cell.v:''):'');}return vals;}
function gcv(sheet,row,col){var cell=sheet[XLSX.utils.encode_cell({r:row-1,c:col-1})];return cell?(cell.v!==undefined?cell.v:null):null;}
function toNum(val){if(val===null||val===undefined||val===''||val===' ')return null;if(typeof val==='number')return val;var s=String(val).trim().replace(/\s/g,'');if(s===''||s==='-')return null;s=s.replace(/\./g,'').replace(',','.');var n=parseFloat(s);return isNaN(n)?null:n;}
function normBez(bez){if(!bez)return '';return String(bez).trim().replace(/\s+/g,' ');}
function lookupK(bez){var key=normBez(bez).toLowerCase();return KOMPAKT_MAP[key]||null;}
function extractMJ(filename){var result={monat:null,jahr:null,standort:''};var jahrMatch=filename.match(/(20\d{2})/);if(jahrMatch)result.jahr=parseInt(jahrMatch[1]);var monate={'januar':1,'jan':1,'februar':2,'feb':2,'märz':3,'maerz':3,'marz':3,'mrz':3,'april':4,'apr':4,'mai':5,'juni':6,'jun':6,'juli':7,'jul':7,'august':8,'aug':8,'september':9,'sep':9,'oktober':10,'okt':10,'november':11,'nov':11,'dezember':12,'dez':12};var lower=filename.toLowerCase().replace(/_/g,'').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue');for(var m in monate){if(lower.includes(m)){result.monat=monate[m];break;}}var parts=filename.replace(/\.[^.]+$/,'').split('_');if(parts.length>=3){if(parts[0].toLowerCase()==='bwa')result.standort=parts[2].replace(/U_berarbeitet|MF|Version.*$/gi,'').trim();if(parts[0].toLowerCase()==='planung')result.standort=parts[1];}return result;}
function detectFmt(sheet,filename){var r1=grv(sheet,1);var r2=grv(sheet,2);var r1s=r1.join(' ').toLowerCase();var r2s=r2.join(' ').toLowerCase();var isJ=filename.toLowerCase().includes('jahr');if(filename.toLowerCase().includes('planung'))return{format:'planung',typ:'plan'};if(r1s.includes('zeile')&&r1s.includes('bezeichnung')&&r1s.includes('konto')&&r1s.includes('konten'))return{format:'datev_wertenachweis',typ:isJ?'jahr':'monat'};var r3=grv(sheet,3);var r3s=r3.join(' ').toLowerCase();if(r3s.includes('zeile')&&r3s.includes('bezeichnung')&&r3s.includes('konto'))return{format:'datev_wertenachweis_offset',typ:isJ?'jahr':'monat'};if(r1s.includes('summen')&&r1s.includes('salden'))return{format:'susa',typ:'monat'};if(r2s.includes('konto')&&r2s.includes('beschriftung')&&r2s.includes('eb-wert'))return{format:'susa',typ:'monat'};if(r1s.includes('kanzlei-rechnungswesen')&&r2s.includes('zeile')&&r2s.includes('konto')&&r2s.includes('veränderung'))return{format:'datev_vorjahresvergleich',typ:isJ?'jahr':'monat'};if(r1s.includes('kanzlei-rechnungswesen')&&r2s.includes('zeile')&&r2s.includes('konto'))return{format:'datev_erfolgsrechnung',typ:isJ?'jahr':'monat'};if(r1s.includes('datev-bwa')||r1s.includes('betriebswirtschaftliche auswertung'))return{format:'datev_jahresuebersicht',typ:'jahr'};if(r1s.includes('bezeichnung')&&(r1s.includes('monat')||r1s.includes('ums.%')||r1s.includes('ges.-leistg'))){if(r1.length>10||isJ)return{format:'kompakt_jahr',typ:'jahr'};return{format:'kompakt',typ:'monat'};}if(r1s.includes('bezeichnung')){var c2=sheet['B1']?sheet['B1'].v:null;if(c2 instanceof Date||(typeof c2==='number'&&c2>40000))return{format:'kompakt_datum',typ:'monat'};if(typeof c2==='number'||c2 instanceof Date)return{format:'kompakt_jahr_datum',typ:'jahr'};}return{format:'unbekannt',typ:isJ?'jahr':'monat'};}
function parseDWN(sheet,meta,hRow){var rows=[];var range=XLSX.utils.decode_range(sheet['!ref']);var si=0;var cz=null;var cb='';for(var r=hRow;r<=range.e.r;r++){var zeile=gcv(sheet,r+1,1);var bez=gcv(sheet,r+1,2);var konto=gcv(sheet,r+1,3);var kontoBez=gcv(sheet,r+1,5)||gcv(sheet,r+1,4);var wM=gcv(sheet,r+1,7);var wB=gcv(sheet,r+1,8);var wK=gcv(sheet,r+1,9);var wKB=gcv(sheet,r+1,10);if(zeile&&typeof zeile==='number'&&zeile>=1000){cz=zeile;cb=normBez(bez||kontoBez||'');}if(toNum(wM)===null&&toNum(wB)===null&&toNum(wK)===null)continue;var iS=(zeile&&zeile>=1000)&&(wB!==null);var dB=kontoBez?normBez(kontoBez):cb;if(!dB)continue;var bi=cz?BWA_ZEILEN[cz]:null;rows.push({zeile:cz,konto:konto?String(konto):null,kontengruppe:bi?bi.gruppe:(cb||''),bezeichnung:iS?(bi?bi.name:dB):dB,wert:toNum(iS?wB:wM),wert_kumuliert:toNum(iS?wKB:wK),ist_summenzeile:iS,ebene:iS?0:(konto?2:1),sortierung:si++});}return rows;}
function parseKompakt(sheet,meta){var rows=[];var range=XLSX.utils.decode_range(sheet['!ref']);var si=0;var wCol=2;var kCol=null;var vjCol=null;var header=grv(sheet,1);for(var i=1;i<header.length;i++){var h=String(header[i]).toLowerCase();if(h.includes('monat')||h.includes('2025')||h.includes('2024')||header[i] instanceof Date)wCol=i+1;if(h.includes('lfd. jahr')||h.includes('jan/'))kCol=i+1;if(h.includes('vj. monat')||h.includes('vorjahr'))vjCol=i+1;}for(var r=1;r<=range.e.r;r++){var bez=gcv(sheet,r+1,1);if(!bez||typeof bez!=='string')continue;bez=normBez(bez);if(bez.includes('Bezeichnung')||bez.includes('Kostenarten'))continue;var mapped=lookupK(bez);var wert=toNum(gcv(sheet,r+1,wCol));var kum=kCol?toNum(gcv(sheet,r+1,kCol)):null;var vj=vjCol?toNum(gcv(sheet,r+1,vjCol)):null;if(wert===null&&kum===null)continue;rows.push({zeile:mapped?mapped.zeile:null,konto:null,kontengruppe:mapped?mapped.gruppe:bez,bezeichnung:bez,wert:wert,wert_kumuliert:kum,wert_vorjahr:vj,ist_summenzeile:mapped?mapped.summe:false,ebene:0,sortierung:si++});}return rows;}
function parseDER(sheet,meta){var rows=[];var range=XLSX.utils.decode_range(sheet['!ref']);var si=0;var cz=null;for(var r=2;r<=range.e.r;r++){var zeile=gcv(sheet,r+1,1);var konto=gcv(sheet,r+1,2);var bez=gcv(sheet,r+1,3);var wM=gcv(sheet,r+1,4);var wK=gcv(sheet,r+1,9);if(zeile&&typeof zeile==='number'&&zeile>=1000)cz=zeile;if(!bez||toNum(wM)===null)continue;bez=normBez(bez);var iS=(zeile&&zeile>=1000);var bi=cz?BWA_ZEILEN[cz]:null;rows.push({zeile:cz,konto:konto?String(konto):null,kontengruppe:bi?bi.gruppe:'',bezeichnung:bez,wert:toNum(wM),wert_kumuliert:toNum(wK),ist_summenzeile:iS,ebene:iS?0:(konto?2:1),sortierung:si++});}return rows;}
function parseDVJ(sheet,meta){var rows=[];var range=XLSX.utils.decode_range(sheet['!ref']);var si=0;for(var r=2;r<=range.e.r;r++){var zeile=gcv(sheet,r+1,1);var bez=gcv(sheet,r+1,2);var wM=gcv(sheet,r+1,3);var wVj=gcv(sheet,r+1,4);var wK=gcv(sheet,r+1,7);var wVjK=gcv(sheet,r+1,8);if(!zeile||typeof zeile!=='number'||zeile<1000)continue;if(toNum(wM)===null&&toNum(wK)===null)continue;var bi=BWA_ZEILEN[zeile];bez=normBez(bez||(bi?bi.name:''));rows.push({zeile:zeile,konto:null,kontengruppe:bi?bi.gruppe:'',bezeichnung:bez,wert:toNum(wM),wert_kumuliert:toNum(wK),wert_vorjahr:toNum(wVj),wert_vorjahr_kumuliert:toNum(wVjK),ist_summenzeile:true,ebene:0,sortierung:si++});}return rows;}
function parseJU(sheet,meta,startRow){var rows=[];var range=XLSX.utils.decode_range(sheet['!ref']);var si=0;for(var r=startRow;r<=range.e.r;r++){var bez=gcv(sheet,r+1,1);if(!bez||typeof bez!=='string')continue;bez=normBez(bez);if(bez.includes('Kurzfristige Erfolgsrechnung')||bez.includes('Kostenarten'))continue;var mapped=lookupK(bez);var mw={};var mn=['jan','feb','mrz','apr','mai','jun','jul','aug','sep','okt','nov','dez'];var summe=null;for(var c=1;c<=Math.min(13,range.e.c);c++){var val=toNum(gcv(sheet,r+1,c+1));if(c<=12)mw[mn[c-1]]=val||0;else summe=val;}if(summe===null){summe=0;for(var m in mw)summe+=(mw[m]||0);}rows.push({bezeichnung:bez,kontengruppe:mapped?mapped.gruppe:bez,konto:null,jan:mw.jan,feb:mw.feb,mrz:mw.mrz,apr:mw.apr,mai:mw.mai,jun:mw.jun,jul:mw.jul,aug:mw.aug,sep:mw.sep,okt:mw.okt,nov:mw.nov,dez:mw.dez,summe:summe,ist_summenzeile:mapped?mapped.summe:false,sortierung:si++});}return rows;}
function parseCsvJ(text,meta){var lines=text.split('\n');var rows=[];var si=0;var mn=['jan','feb','mrz','apr','mai','jun','jul','aug','sep','okt','nov','dez'];for(var i=1;i<lines.length;i++){var parts=lines[i].split(';');if(parts.length<2)continue;var bez=normBez(parts[0]);if(!bez||bez.includes('Kurzfristige Erfolgsrechnung'))continue;var mapped=lookupK(bez);var mw={};var summe=0;for(var c=1;c<=Math.min(13,parts.length-1);c++){var val=toNum(parts[c]);if(c<=12)mw[mn[c-1]]=val||0;else summe=val;}if(summe===0)for(var m in mw)summe+=(mw[m]||0);rows.push({bezeichnung:bez,kontengruppe:mapped?mapped.gruppe:bez,jan:mw.jan,feb:mw.feb,mrz:mw.mrz,apr:mw.apr,mai:mw.mai,jun:mw.jun,jul:mw.jul,aug:mw.aug,sep:mw.sep,okt:mw.okt,nov:mw.nov,dez:mw.dez,summe:Math.round(summe*100)/100,ist_summenzeile:mapped?mapped.summe:false,sortierung:si++});}return rows;}
function parsePBwa(sheet){var rows=[];var range=XLSX.utils.decode_range(sheet['!ref']);var si=0;for(var r=4;r<=range.e.r;r++){var gruppe=gcv(sheet,r+1,2);var kontoNr=gcv(sheet,r+1,3);var konto=gcv(sheet,r+1,4);var aktBwa=gcv(sheet,r+1,5);var ytd=gcv(sheet,r+1,6);var ds=gcv(sheet,r+1,7);var hr=gcv(sheet,r+1,8);if(!kontoNr&&!konto)continue;var bez=normBez(konto||'');if(!bez)continue;var pw={};var mn=['jan','feb','mrz','apr','mai','jun','jul','aug','sep','okt','nov','dez'];var sm=0;for(var c=0;c<12;c++){var val=toNum(gcv(sheet,r+1,10+c));pw[mn[c]]=val||0;sm+=(val||0);}rows.push({kontengruppe:normBez(gruppe||''),konto:kontoNr?String(kontoNr):null,bezeichnung:bez,vorjahr_aktuell:toNum(aktBwa),vorjahr_ytd:toNum(ytd),vorjahr_durchschnitt:toNum(ds),vorjahr_hochrechnung:toNum(hr),jan:pw.jan,feb:pw.feb,mrz:pw.mrz,apr:pw.apr,mai:pw.mai,jun:pw.jun,jul:pw.jul,aug:pw.aug,sep:pw.sep,okt:pw.okt,nov:pw.nov,dez:pw.dez,summe:Math.round(sm*100)/100,sortierung:si++});}return rows;}
function parsePUms(sheet){var rows=[];var range=XLSX.utils.decode_range(sheet['!ref']);var si=0;var mn=['jan','feb','mrz','apr','mai','jun','jul','aug','sep','okt','nov','dez'];for(var r=4;r<=range.e.r;r++){var marke=gcv(sheet,r+1,3);if(!marke||typeof marke!=='string'||marke==='0')continue;marke=normBez(marke);if(marke.toLowerCase().includes('planung')||marke.toLowerCase().includes('gesamt'))continue;var mw={};var sm=0;for(var c=0;c<12;c++){var val=toNum(gcv(sheet,r+1,4+c));mw[mn[c]]=val||0;sm+=(val||0);}if(sm===0)continue;rows.push({marke:marke,kategorie:'Fahrräder',jan:mw.jan,feb:mw.feb,mrz:mw.mrz,apr:mw.apr,mai:mw.mai,jun:mw.jun,jul:mw.jul,aug:mw.aug,sep:mw.sep,okt:mw.okt,nov:mw.nov,dez:mw.dez,summe:sm,sortierung:si++});}return rows;}
function parsePPers(sheet){var rows=[];var range=XLSX.utils.decode_range(sheet['!ref']);for(var r=3;r<=range.e.r;r++){var nn=gcv(sheet,r+1,1);var vn=gcv(sheet,r+1,2);if(!nn||typeof nn!=='string')continue;if(nn.includes('Gesamt')||nn.includes('AB Zeile')||nn.includes('Nachname'))continue;var td=function(v){if(!v)return null;if(v instanceof Date)return v.toISOString().split('T')[0];return null;};rows.push({nachname:normBez(nn),vorname:normBez(vn||''),status:gcv(sheet,r+1,3)||'',standort_name:gcv(sheet,r+1,4)||'',abteilung:gcv(sheet,r+1,5)||'',position:gcv(sheet,r+1,7)||'',wochenarbeitszeit:toNum(gcv(sheet,r+1,8)),stundenlohn:toNum(gcv(sheet,r+1,9)),anstelldatum:td(gcv(sheet,r+1,10)),austrittsdatum:td(gcv(sheet,r+1,11)),fixgehalt:toNum(gcv(sheet,r+1,12)),gehalt_neu_1:toNum(gcv(sheet,r+1,13)),gehalt_neu_1_ab:td(gcv(sheet,r+1,14)),gehalt_neu_2:toNum(gcv(sheet,r+1,15)),gehalt_neu_2_ab:td(gcv(sheet,r+1,16))});}return rows;}
function parseFile(file,callback){var filename=file.name;var meta=extractMJ(filename);meta.dateiname=filename;var reader=new FileReader();if(filename.toLowerCase().endsWith('.csv')){reader.onload=function(e){var text=e.target.result;var header=text.split('\n')[0]||'';meta.format=header.includes('Bezeichnung')&&header.includes('EUR')?'csv_jahresuebersicht':'csv_unbekannt';meta.typ='jahr';var result={meta:meta,bwa_daten:[],bwa_jahr_daten:[],plan_bwa:[],plan_umsaetze:[],plan_personal:[]};if(meta.format==='csv_jahresuebersicht')result.bwa_jahr_daten=parseCsvJ(text,meta);callback(null,result);};reader.readAsText(file,'utf-8');}else{reader.onload=function(e){try{var wb=XLSX.read(e.target.result,{type:'array',cellDates:true});var sn=wb.SheetNames[0];var ws=wb.Sheets[sn];var det=detectFmt(ws,filename);meta.format=det.format;meta.typ=det.typ;var result={meta:meta,bwa_daten:[],bwa_jahr_daten:[],plan_bwa:[],plan_umsaetze:[],plan_personal:[]};if(meta.format==='planung'){wb.SheetNames.forEach(function(s){var w=wb.Sheets[s];var sl=s.toLowerCase();if(sl.includes('bwa'))result.plan_bwa=parsePBwa(w);else if(sl.includes('umsätze')||sl.includes('umsaetze'))result.plan_umsaetze=parsePUms(w);else if(sl.includes('personal'))result.plan_personal=parsePPers(w);});meta.typ='plan';callback(null,result);return;}switch(meta.format){case 'datev_wertenachweis':result.bwa_daten=parseDWN(ws,meta,1);break;case 'datev_wertenachweis_offset':result.bwa_daten=parseDWN(ws,meta,3);break;case 'kompakt':case 'kompakt_datum':result.bwa_daten=parseKompakt(ws,meta);break;case 'datev_erfolgsrechnung':result.bwa_daten=parseDER(ws,meta);break;case 'datev_vorjahresvergleich':result.bwa_daten=parseDVJ(ws,meta);break;case 'kompakt_jahr':case 'kompakt_jahr_datum':case 'datev_jahresuebersicht':var sr=0;for(var r=0;r<5;r++){var v=gcv(ws,r+1,1);if(v&&String(v).toLowerCase().includes('umsatzerlöse')){sr=r;break;}if(v&&String(v).toLowerCase().includes('bezeichnung')){sr=r+1;break;}}result.bwa_jahr_daten=parseJU(ws,meta,sr);break;default:result.bwa_daten=parseKompakt(ws,meta);}callback(null,result);}catch(err){callback(err,null);}};reader.readAsArrayBuffer(file);}};return{parseFile:parseFile,extractMonatJahr:extractMJ,BWA_ZEILEN:BWA_ZEILEN,KOMPAKT_MAP:KOMPAKT_MAP};})();

// =============================================
// BWA SUPABASE FUNCTIONS
// =============================================
var bwaCache = [];
var selectedBwaId = null;

var monatNamen = ['','Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

export function eur(val) {
    if(val===null||val===undefined) return '—';
    var n = parseFloat(val);
    return n.toLocaleString('de-DE', {minimumFractionDigits:0, maximumFractionDigits:0});
}
export function eurColor(val) {
    var n = parseFloat(val)||0;
    return n >= 0 ? 'text-gray-800' : 'text-red-600';
}
export function diffHtml(ist, plan) {
    if(!plan) return '<td class="text-right py-2 px-3 text-gray-300">—</td>';
    var d = parseFloat(ist) - parseFloat(plan);
    var cl = d >= 0 ? 'text-green-600' : 'text-red-600';
    var prefix = d >= 0 ? '+' : '';
    return '<td class="text-right py-2 px-3 '+cl+' font-semibold">'+prefix+eur(d)+'</td>';
}

export async function loadBwaList() {
    var container = document.getElementById('bwaFileList');
    if(!container) return;
    // Set standort label dynamically
    var bwaLabel = document.getElementById('bwaStandortLabel');
    var useDemo = (typeof isDemoMode !== 'undefined' && isDemoMode) || (_sbProfile() && (_sbProfile().status === 'demo' || _sbProfile().status === 'demo_active'));
    if(bwaLabel) bwaLabel.textContent = useDemo ? 'vit:bikes Muster-Filiale' : ('vit:bikes ' + (_sbProfile() && _sbProfile().standort_name ? _sbProfile().standort_name : 'Standort'));
    try {
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        console.log('[BWA] loadBwaList() called, stdId:', stdId, 'is_hq:', _sbProfile() ? _sbProfile().is_hq : 'no profile');
        var query = _sb().from('bwa_daten').select('id,monat,jahr,umsatzerloese,rohertrag,ergebnis_vor_steuern,datei_name,datei_url,created_at').order('jahr', {ascending:false}).order('monat', {ascending:false});
        if(stdId && !_sbProfile().is_hq) query = query.eq('standort_id', stdId);
        var resp = await query;
        if(resp.error) throw resp.error;
        bwaCache = resp.data || [];
        if(bwaCache.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Noch keine BWAs erfasst.</p>';
            return;
        }
        // Load corrected ergebnis from detail positions (Zeile 1355, 1300, or 1370)
        var bwaIds = bwaCache.map(function(b){ return b.id; });
        var detResp = await _sb().from('bwa_detail_positionen').select('bwa_id,zeile,wert').in('bwa_id', bwaIds).in('zeile', [1300, 1355, 1370]).eq('ist_summenzeile', true);
        var detMap = {};
        if(detResp.data) detResp.data.forEach(function(d){ 
            var val = parseFloat(d.wert)||0;
            // Priorität: 1355 > 1300 > 1370
            if(!detMap[d.bwa_id] || d.zeile === 1355 || (d.zeile === 1300 && !detMap[d.bwa_id + '_z1355'])) {
                detMap[d.bwa_id] = val;
                if(d.zeile === 1355) detMap[d.bwa_id + '_z1355'] = true;
            }
        });
        // Group by year
        var years = {};
        bwaCache.forEach(function(b) {
            if(!years[b.jahr]) years[b.jahr] = [];
            years[b.jahr].push(b);
        });
        var h = '';
        Object.keys(years).sort(function(a,b){return b-a;}).forEach(function(yr) {
            var items = years[yr];
            h += '<div class="mb-3">';
            h += '<button onclick="this.nextElementSibling.classList.toggle(\'hidden\')" class="flex items-center justify-between w-full text-left p-2 bg-gray-100 rounded-lg hover:bg-gray-200">';
            h += '<span class="font-semibold text-gray-700">📁 '+yr+'</span>';
            h += '<span class="text-gray-400 text-xs">'+items.length+' BWA'+(items.length>1?'s':'')+'</span></button>';
            h += '<div class="mt-2 space-y-1">';
            items.forEach(function(b) {
                var isSelected = selectedBwaId === b.id;
                // Use corrected ergebnis from detail positions if available
                var erg = detMap[b.id] !== undefined ? detMap[b.id] : parseFloat(b.ergebnis_vor_steuern);
                var ergClass = erg >= 0 ? 'text-green-600' : 'text-red-500';
                h += '<div class="flex items-center gap-1">';
                h += '<button onclick="showBwaFromDb(\''+b.id+'\')" class="bwa-file-db flex-1 flex items-center justify-between p-2.5 rounded-lg hover:bg-orange-50 text-left'+(isSelected?' bg-orange-50 border border-vit-orange':'')+'">';
                h += '<div class="flex items-center space-x-3"><span class="text-red-500">📄</span>';
                h += '<div><p class="text-sm font-semibold '+(isSelected?'text-vit-orange':'text-gray-800')+'">'+monatNamen[b.monat]+' '+b.jahr+'</p>';
                h += '<p class="text-xs text-gray-500">Umsatz: '+eur(b.umsatzerloese)+' €</p></div></div>';
                h += '<span class="text-xs '+ergClass+'">'+eur(erg)+' €</span>';
                h += '</button>';
                h += '<button onclick="downloadBwa(\''+b.id+'\')" class="p-2 text-gray-400 hover:text-vit-orange rounded-lg hover:bg-orange-50" title="BWA herunterladen"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></button>';
                h += '</div>';
            });
            h += '</div></div>';
        });
        container.innerHTML = h;
    } catch(err) { console.error('[BWA] loadBwaList error:', err); container.innerHTML = '<p class="text-sm text-red-400 text-center py-4">Fehler: '+err.message+'</p><button onclick="loadBwaList()" class="text-xs text-vit-orange underline mt-2">Erneut versuchen</button>'; }
}

export async function downloadBwa(bwaId) {
    try {
        // Load BWA summary
        var resp = await _sb().from('bwa_daten').select('*').eq('id', bwaId).single();
        if(resp.error) throw resp.error;
        var b = resp.data;

        // If original file exists in storage, download that
        if(b.datei_url) {
            var dlResp = await _sb().storage.from('bwa-dateien').download(b.datei_url);
            if(dlResp.data) {
                var url = URL.createObjectURL(dlResp.data);
                var a = document.createElement('a');
                a.href = url; a.download = b.datei_name || ('BWA_'+monatNamen[b.monat]+'_'+b.jahr+'.csv');
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
                return;
            }
        }

        // Otherwise generate CSV from detail positions
        var detResp = await _sb().from('bwa_detail_positionen').select('*').eq('bwa_id', bwaId).order('sortierung');
        var rows = (detResp.data && detResp.data.length > 0) ? detResp.data : null;
        var csv = '\uFEFF'; // BOM for Excel
        csv += 'BWA ' + monatNamen[b.monat] + ' ' + b.jahr + '\n\n';
        csv += 'Position;Monat;Kumuliert\n';

        if(rows) {
            rows.forEach(function(d) {
                var prefix = d.ist_summenzeile ? '' : '  ';
                var name = (prefix + (d.bezeichnung||'')).replace(/;/g, ',');
                var wert = d.wert !== null ? d.wert.toString().replace('.', ',') : '';
                var kum = d.wert_kumuliert !== null ? d.wert_kumuliert.toString().replace('.', ',') : '';
                csv += name + ';' + wert + ';' + kum + '\n';
            });
        } else {
            // Fallback: use summary fields
            csv += 'Umsatzerlöse;' + b.umsatzerloese + ';\n';
            csv += 'Wareneinsatz;' + b.wareneinsatz + ';\n';
            csv += 'Rohertrag;' + b.rohertrag + ';\n';
            csv += 'Personalkosten;' + b.personalkosten + ';\n';
            csv += 'Raumkosten;' + b.raumkosten + ';\n';
            csv += 'Werbekosten;' + b.werbekosten + ';\n';
            csv += 'Abschreibungen;' + b.abschreibungen + ';\n';
            csv += 'Sonstige Kosten;' + b.sonstige_kosten + ';\n';
            csv += 'Gesamtkosten;' + b.gesamtkosten + ';\n';
            csv += 'Betriebsergebnis;' + b.betriebsergebnis + ';\n';
            csv += 'Zinsaufwand;' + b.zinsaufwand + ';\n';
            csv += 'Ergebnis vor Steuern;' + b.ergebnis_vor_steuern + ';\n';
        }

        var blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'BWA_' + monatNamen[b.monat] + '_' + b.jahr + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch(err) {
        console.error('[BWA Download]', err);
        alert('Download fehlgeschlagen: ' + err.message);
    }
}

export async function showBwaFromDb(bwaId) {
    selectedBwaId = bwaId;
    try {
        var resp = await _sb().from('bwa_daten').select('*').eq('id', bwaId).single();
        if(resp.error) throw resp.error;
        var b = resp.data;
        // Update title
        document.getElementById('bwaTitle').textContent = 'BWA ' + monatNamen[b.monat] + ' ' + b.jahr;
        document.getElementById('bwaEditBtn').style.display = '';
        document.getElementById('bwaDeleteBtn').style.display = '';
        // KPIs
        var marge = parseFloat(b.umsatzerloese) > 0 ? ((parseFloat(b.rohertrag)/parseFloat(b.umsatzerloese))*100).toFixed(1) : 0;
        var ergMarge = parseFloat(b.umsatzerloese) > 0 ? ((parseFloat(b.ergebnis_vor_steuern)/parseFloat(b.umsatzerloese))*100).toFixed(1) : 0;
        document.getElementById('bwaKpiUmsatz').textContent = eur(b.umsatzerloese) + ' €';
        document.getElementById('bwaKpiUmsatzVj').textContent = b.plan_umsatz ? 'Plan: '+eur(b.plan_umsatz)+' €' : '';
        document.getElementById('bwaKpiRohertrag').textContent = eur(b.rohertrag) + ' €';
        document.getElementById('bwaKpiMarge').textContent = 'Marge: '+marge+'%';
        document.getElementById('bwaKpiKosten').textContent = eur(b.gesamtkosten) + ' €';
        document.getElementById('bwaKpiKostenVj').textContent = b.plan_gesamtkosten ? 'Plan: '+eur(b.plan_gesamtkosten)+' €' : '';
        var ergEl = document.getElementById('bwaKpiErgebnis');
        ergEl.textContent = eur(b.ergebnis_vor_steuern) + ' €';
        ergEl.className = 'text-xl font-bold ' + (parseFloat(b.ergebnis_vor_steuern) >= 0 ? 'text-green-600' : 'text-red-600');
        document.getElementById('bwaKpiErgebnisMarge').textContent = 'Marge: '+ergMarge+'%';

        // Detail table - try loading from bwa_detail_positionen first
        var detailResp = await _sb().from('bwa_detail_positionen').select('*').eq('bwa_id', bwaId).order('sortierung');
        var detailRows = (detailResp.data && detailResp.data.length > 0) ? detailResp.data : null;

        // Recalculate KPIs from detail positions if available (sign-inversion correction)
        if(detailRows) {
            var sumMap = {};
            detailRows.forEach(function(d) { if(d.ist_summenzeile && d.zeile) sumMap[d.zeile] = d; });
            // BWA Zeilen: 1000=Umsatzerlöse, 1040=Rohertrag, 1300=Betriebsergebnis, 1355=Vorl.Ergebnis
            var detUmsatz = sumMap[1000] ? parseFloat(sumMap[1000].wert)||0 : parseFloat(b.umsatzerloese)||0;
            var detRohertrag = sumMap[1040] ? parseFloat(sumMap[1040].wert)||0 : parseFloat(b.rohertrag)||0;
            var detErgebnis = sumMap[1355] ? parseFloat(sumMap[1355].wert)||0 : (sumMap[1300] ? parseFloat(sumMap[1300].wert)||0 : parseFloat(b.ergebnis_vor_steuern)||0);
            // Gesamtkosten berechnen: Summe aller Kostenpositionen aus Detail-Zeilen
            var detKosten = 0;
            // Methode 1: Direkt aus Summenzeile 1250 (Gesamtkosten) oder 1260 (Summe Aufwendungen)
            if(sumMap[1250]) { detKosten = parseFloat(sumMap[1250].wert)||0; }
            else if(sumMap[1260]) { detKosten = parseFloat(sumMap[1260].wert)||0; }
            else {
                // Methode 2: Alle Kostengruppen-Summen addieren
                var kostenZeilen = [1140,1160,1170,1175,1180,1190,1200,1210,1220,1240];
                var kostenSumme = 0;
                kostenZeilen.forEach(function(z) {
                    if(sumMap[z]) kostenSumme += Math.abs(parseFloat(sumMap[z].wert)||0);
                });
                if(kostenSumme > 0) { detKosten = -kostenSumme; }
                else if(detRohertrag) {
                    // Methode 3: Rohertrag - Betriebsergebnis
                    var betriebsErg = sumMap[1270] ? parseFloat(sumMap[1270].wert)||0 : (sumMap[1300] ? parseFloat(sumMap[1300].wert)||0 : 0);
                    if(betriebsErg) detKosten = betriebsErg - detRohertrag;
                }
            }
            console.log('[BWA] Gesamtkosten-Berechnung:', {z1250:sumMap[1250]?sumMap[1250].wert:'n/a', z1260:sumMap[1260]?sumMap[1260].wert:'n/a', berechnet:detKosten});
            // Override KPIs with corrected values
            var detMarge = detUmsatz > 0 ? ((detRohertrag/detUmsatz)*100).toFixed(1) : 0;
            var detErgMarge = detUmsatz > 0 ? ((detErgebnis/detUmsatz)*100).toFixed(1) : 0;
            document.getElementById('bwaKpiUmsatz').textContent = eur(detUmsatz) + ' €';
            document.getElementById('bwaKpiRohertrag').textContent = eur(detRohertrag) + ' €';
            document.getElementById('bwaKpiMarge').textContent = 'Marge: '+detMarge+'%';
            if(detKosten) document.getElementById('bwaKpiKosten').textContent = eur(detKosten) + ' €';
            var ergEl2 = document.getElementById('bwaKpiErgebnis');
            ergEl2.textContent = eur(detErgebnis) + ' €';
            ergEl2.className = 'text-xl font-bold ' + (detErgebnis >= 0 ? 'text-green-600' : 'text-red-600');
            document.getElementById('bwaKpiErgebnisMarge').textContent = 'Marge: '+detErgMarge+'%';
            console.log('[BWA] KPIs recalculated from detail positions:', {umsatz:detUmsatz, rohertrag:detRohertrag, kosten:detKosten, ergebnis:detErgebnis});
            // Permanently fix wrong values in bwa_daten
            if(Math.abs(detErgebnis - (parseFloat(b.ergebnis_vor_steuern)||0)) > 1) {
                var fixData = {ergebnis_vor_steuern: detErgebnis, rohertrag: detRohertrag, umsatzerloese: detUmsatz};
                if(detKosten && Math.abs(detKosten - (parseFloat(b.gesamtkosten)||0)) > 1) fixData.gesamtkosten = detKosten;
                _sb().from('bwa_daten').update(fixData).eq('id', bwaId).then(function(r){
                    if(!r.error) { console.log('[BWA] DB values corrected for', bwaId); loadBwaList(); }
                    else console.warn('[BWA] DB fix failed:', r.error);
                });
            }
        }
        
        var tbody = '';
        if(detailRows) {
            // Zeige alle Detail-Positionen aus dem Parser
            var lastGruppe = '';
            detailRows.forEach(function(d) {
                var isSumme = d.ist_summenzeile;
                var isDetail = d.ebene >= 2;
                var cls = isSumme ? 'bg-gray-50 border-b-2 border-gray-300' : 'border-b border-gray-100';
                var tdBold = isSumme ? 'font-semibold' : '';
                var indent = isDetail ? 'pl-6 text-xs text-gray-500' : (d.ebene === 1 ? 'pl-3 text-sm' : '');
                
                // Gruppenheader
                if(isSumme && d.kontengruppe && d.kontengruppe !== lastGruppe) {
                    lastGruppe = d.kontengruppe;
                }
                
                // Highlight für wichtige Summenzeilen
                var hlCls = '';
                if(d.kontengruppe === 'Rohertrag' && isSumme) { cls = 'bg-blue-50 border-b-2 border-blue-200'; hlCls = 'text-blue-800'; }
                if(d.kontengruppe === 'Ergebnis' && isSumme) { 
                    var ergVal = parseFloat(d.wert)||0;
                    cls = (ergVal >= 0 ? 'bg-green-50 border-t-2 border-green-400' : 'bg-red-50 border-t-2 border-red-400');
                    hlCls = ergVal >= 0 ? 'text-green-800' : 'text-red-800';
                }
                if(d.kontengruppe === 'Betriebsergebnis' && isSumme) cls = 'bg-orange-50 border-b-2 border-orange-200';
                if(d.kontengruppe === 'Gesamtkosten' || d.kontengruppe === 'Summe Aufwendungen') cls = 'bg-gray-100 border-b-2 border-gray-400';
                
                tbody += '<tr class="'+cls+'">';
                tbody += '<td class="py-1.5 px-3 '+tdBold+' '+hlCls+' '+indent+'">';
                if(isDetail && d.konto) tbody += '<span class="text-gray-400 text-[10px] mr-1">'+d.konto+'</span> ';
                tbody += (d.bezeichnung||'')+'</td>';
                tbody += '<td class="text-right py-1.5 px-3 '+tdBold+' '+hlCls+' '+eurColor(d.wert)+'">'+eur(d.wert)+'</td>';
                tbody += '<td class="text-right py-1.5 px-3 text-gray-400">'+(d.wert_kumuliert ? eur(d.wert_kumuliert) : '—')+'</td>';
                tbody += '<td class="text-right py-1.5 px-3 text-gray-400">'+(d.wert_vorjahr ? eur(d.wert_vorjahr) : '—')+'</td>';
                tbody += '<td class="text-right py-1.5 px-3 text-gray-300">'+(d.prozent_gesamtleistung ? d.prozent_gesamtleistung+'%' : '')+'</td>';
                tbody += '</tr>';
            });
            // Update table header for detail view
            document.querySelector('#bwaDetailTable thead tr').innerHTML = 
                '<th class="text-left py-2 px-3 font-semibold text-gray-600">Position</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">Monat</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">Kumuliert</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">Vorjahr</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">%</th>';
        } else {
            // Fallback: Standard-Ansicht aus Zusammenfassung
            var rows = [
                {label:'Umsatzerloese', ist:b.umsatzerloese, plan:b.plan_umsatz, bold:true},
                {label:'  Fahrraeder', ist:b.davon_fahrraeder, sub:true},
                {label:'  Teile & Zubehoer', ist:b.davon_teile, sub:true},
                {label:'  Service / Reparatur', ist:b.davon_service, sub:true},
                {label:'  Skonti', ist:b.davon_skonti, sub:true},
                {label:'Wareneinsatz', ist:b.wareneinsatz, plan:b.plan_wareneinsatz, bold:true, bg:'bg-gray-50'},
                {label:'Rohertrag', ist:b.rohertrag, plan:b.plan_rohertrag, bold:true, bg:'bg-blue-50', highlight:'text-blue-800'},
                {label:'Personalkosten', ist:b.personalkosten, plan:b.plan_personalkosten, bold:true},
                {label:'Raumkosten', ist:b.raumkosten, plan:b.plan_raumkosten, bold:true},
                {label:'Werbe-/Reisekosten', ist:b.werbekosten, plan:b.plan_werbekosten, bold:true},
                {label:'Kosten Warenabgabe', ist:b.kosten_warenabgabe, bold:true},
                {label:'Abschreibungen', ist:b.abschreibungen, bold:true},
                {label:'Sonstige Kosten', ist:b.sonstige_kosten, bold:true},
                {label:'Gesamtkosten', ist:b.gesamtkosten, plan:b.plan_gesamtkosten, bold:true, bg:'bg-gray-50', separator:true},
                {label:'Betriebsergebnis', ist:b.betriebsergebnis, bold:true},
                {label:'Zinsaufwand', ist:b.zinsaufwand, bold:true},
                {label:'Ergebnis vor Steuern', ist:b.ergebnis_vor_steuern, plan:b.plan_ergebnis, bold:true, bg:parseFloat(b.ergebnis_vor_steuern)>=0?'bg-green-50':'bg-red-50', highlight:parseFloat(b.ergebnis_vor_steuern)>=0?'text-green-800':'text-red-800', separator:true, big:true}
            ];
            // Restore default header
            document.querySelector('#bwaDetailTable thead tr').innerHTML = 
                '<th class="text-left py-2 px-3 font-semibold text-gray-600">Position</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">IST</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">Plan</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">Abweichung</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">VJ</th>';
            rows.forEach(function(r) {
                var cls = (r.separator?'border-t-2 border-gray-800 ':'border-b ') + (r.bg||'');
                var tdCls = r.bold ? 'font-semibold' : '';
                var hlCls = r.highlight || '';
                var sz = r.big ? 'text-base' : '';
                var indent = r.sub ? 'pl-6 text-gray-600 text-xs' : '';
                tbody += '<tr class="'+cls+'">';
                tbody += '<td class="py-2 px-3 '+tdCls+' '+hlCls+' '+sz+' '+indent+'">'+r.label.trim()+'</td>';
                tbody += '<td class="text-right py-2 px-3 '+tdCls+' '+hlCls+' '+sz+' '+eurColor(r.ist)+'">'+eur(r.ist)+'</td>';
                tbody += '<td class="text-right py-2 px-3 text-gray-400">'+(r.plan?eur(r.plan):'—')+'</td>';
                tbody += diffHtml(r.ist, r.plan);
                tbody += '<td class="text-right py-2 px-3 text-gray-400">—</td>';
                tbody += '</tr>';
            });
        }
        document.getElementById('bwaDetailBody').innerHTML = tbody;

        // Load trend
        loadBwaTrend(b.standort_id, b.jahr);
        // Refresh file list highlight
        loadBwaList();
        
        // Run and display validation
        var valBanner = document.getElementById('bwaValidationBanner');
        if(valBanner) {
            try {
                var valResp = await sb.rpc('validate_bwa', {p_bwa_id: bwaId});
                if(valResp.data) {
                    var vd = valResp.data;
                    var checks = vd.checks || [];
                    var failed = checks.filter(function(c) { return c.pass === false; });
                    var hasNotes = checks.filter(function(c) { return c.note; });
                    
                    if(failed.length === 0) {
                        valBanner.className = 'mt-3 p-3 rounded-lg border text-xs';
                        valBanner.style.background = '#f0fdf4';
                        valBanner.style.borderColor = '#bbf7d0';
                        valBanner.innerHTML = '<div class="flex items-center gap-2"><span class="text-green-600 font-bold">✅ Validierung bestanden</span><span class="text-gray-400">· ' + checks.length + ' Prüfungen OK</span></div>';
                    } else {
                        valBanner.className = 'mt-3 p-3 rounded-lg border text-xs';
                        valBanner.style.background = vd.status === 'error' ? '#fef2f2' : '#fffbeb';
                        valBanner.style.borderColor = vd.status === 'error' ? '#fecaca' : '#fde68a';
                        var icon = vd.status === 'error' ? '❌' : '⚠️';
                        var vh = '<div class="flex items-center gap-2 mb-2"><span class="font-bold" style="color:' + (vd.status === 'error' ? '#dc2626' : '#d97706') + '">' + icon + ' ' + failed.length + ' Abweichung' + (failed.length > 1 ? 'en' : '') + ' gefunden</span></div>';
                        vh += '<div class="space-y-1">';
                        failed.forEach(function(c) {
                            vh += '<div class="flex items-start gap-1.5">';
                            vh += '<span style="color:#d97706">⚠</span>';
                            vh += '<div><strong>' + c.check + '</strong>';
                            if(c.diff !== undefined) vh += ' — Differenz: ' + Number(c.diff).toLocaleString('de-DE') + ' €';
                            if(c.note) vh += '<div class="text-gray-500 mt-0.5">' + c.note + '</div>';
                            vh += '</div></div>';
                        });
                        vh += '</div>';
                        valBanner.innerHTML = vh;
                    }
                } else { valBanner.className = 'hidden'; }
            } catch(valErr) { 
                valBanner.className = 'hidden'; 
                console.warn('BWA Validation display error:', valErr);
            }
        }
    } catch(err) { alert('Fehler: '+err.message); }
}

export async function loadBwaTrend(stdId, jahr) {
    var sec = document.getElementById('bwaTrendSection');
    var cards = document.getElementById('bwaTrendCards');
    if(!sec||!cards) return;
    try {
        var query = _sb().from('bwa_daten').select('monat,umsatzerloese,rohertrag,gesamtkosten,ergebnis_vor_steuern').eq('jahr', jahr).order('monat');
        if(stdId) query = query.eq('standort_id', stdId);
        var resp = await query;
        if(resp.error || !resp.data || resp.data.length < 2) { sec.style.display = 'none'; return; }
        sec.style.display = '';
        var data = resp.data;
        var metrics = [
            {label:'Umsatz',key:'umsatzerloese',color:'#22C55E',bg:'bg-green-50'},
            {label:'Rohertrag',key:'rohertrag',color:'#3B82F6',bg:'bg-blue-50'},
            {label:'Ergebnis',key:'ergebnis_vor_steuern',color:'#EF7D00',bg:'bg-orange-50'},
            {label:'Gesamtkosten',key:'gesamtkosten',color:'#EF4444',bg:'bg-red-50'}
        ];
        var h = '';
        metrics.forEach(function(m) {
            var vals = data.map(function(d){return parseFloat(d[m.key])||0;});
            var labels = data.map(function(d){return monatNamen[d.monat].substring(0,3);});
            var last = vals[vals.length-1];
            var prev = vals.length>1 ? vals[vals.length-2] : last;
            var change = prev!==0 ? Math.round((last-prev)/Math.abs(prev)*100) : 0;
            var totalYTD = vals.reduce(function(a,b){return a+b;},0);
            // Sparkline SVG
            var minV=Math.min.apply(null,vals); var maxV=Math.max.apply(null,vals); var range=maxV-minV||1;
            var sw=120; var sh=35;
            var pts = vals.map(function(v,i){return Math.round(i/(vals.length-1)*sw)+','+Math.round(sh-(v-minV)/range*sh);});
            // Fill area
            var areaPts = pts.join(' ')+' '+sw+','+sh+' 0,'+sh;
            h += '<div class="p-3 '+m.bg+' rounded-lg">';
            h += '<p class="text-xs text-gray-500 mb-1">'+m.label+'</p>';
            h += '<p class="text-lg font-bold text-gray-800">'+eur(last)+' \u20AC</p>';
            h += '<div class="flex items-center justify-between">';
            h += '<p class="text-xs '+(change>=0?'text-green-600':'text-red-600')+'">'+(change>=0?'\u2191':'\u2193')+' '+(change>=0?'+':'')+change+'%</p>';
            h += '<p class="text-xs text-gray-400">YTD: '+eur(totalYTD)+'</p>';
            h += '</div>';
            h += '<svg width="'+sw+'" height="'+(sh+2)+'" class="mt-1">';
            h += '<polygon points="'+areaPts+'" fill="'+m.color+'" fill-opacity="0.15"/>';
            h += '<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+m.color+'" stroke-width="2" stroke-linejoin="round"/>';
            // Last point dot
            var lastPt = pts[pts.length-1].split(',');
            h += '<circle cx="'+lastPt[0]+'" cy="'+lastPt[1]+'" r="3" fill="'+m.color+'"/>';
            h += '</svg>';
            h += '</div>';
        });
        cards.innerHTML = h;
    } catch(e) { sec.style.display = 'none'; }
}

export function openBwaUploadModal() {
    var stdId = _sbProfile() ? _sbProfile().standort_id : null;
    var now = new Date();
    var _mn = (typeof monatNamen !== 'undefined') ? monatNamen : ['','Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    var html = '<div id="bwaUploadOverlay" onclick="closeBwaUploadModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:600px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
    html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-bold text-gray-800">📊 BWA erfassen</h3><button onclick="closeBwaUploadModal()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>';
    
    // AI Upload Section FIRST
    html += '<div class="mb-4 p-4 border-2 border-dashed border-vit-orange/40 rounded-lg bg-orange-50/50">';
    html += '<div class="flex items-center space-x-2 mb-2"><span class="text-lg">🤖</span><p class="text-sm font-semibold text-gray-800">BWA-Datei hochladen – KI liest Werte automatisch</p></div>';
    html += '<p class="text-xs text-gray-500 mb-3">Lade deine BWA als Excel (.xlsx/.xls/.csv) oder PDF hoch. Die KI erkennt Monat, Jahr und alle Kennzahlen automatisch.</p>';
    html += '<div class="flex items-center space-x-3">';
    html += '<input type="file" id="bwaFileInput" accept=".pdf,.xlsx,.xls,.csv" multiple class="text-xs flex-1" onchange="handleBwaFileSelect(this)">';
    html += '<button id="bwaParseBtn" onclick="parseBwaWithAI()" disabled class="px-4 py-2 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">🤖 Auslesen</button>';
    html += '</div>';
    html += '<div id="bwaAiStatus" class="mt-2 hidden"><div class="flex items-center space-x-2"><div class="w-4 h-4 border-2 border-vit-orange border-t-transparent rounded-full animate-spin"></div><span class="text-xs text-gray-600" id="bwaAiStatusText">KI analysiert Datei...</span></div></div>';
    html += '<div id="bwaAiResult" class="mt-2 hidden"></div>';
    html += '</div>';

    // Month/Year AFTER upload (auto-filled by KI)
    html += '<div class="grid grid-cols-2 gap-3 mb-4">';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Monat</label><select id="bwaMonth" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">';
    for(var m=1;m<=12;m++) html += '<option value="'+m+'"'+(m===(now.getMonth())?' selected':'')+'>'+_mn[m]+'</option>';
    html += '</select></div>';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Jahr</label><select id="bwaYear" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">';
    for(var y=2026;y>=2023;y--) html += '<option value="'+y+'">'+y+'</option>';
    html += '</select></div></div>';
    
    // Data entry
    html += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Kennzahlen <span class="text-gray-400 font-normal">(werden automatisch befüllt oder manuell eingeben)</span></p>';
    var fields = [
        {id:'bwaF_umsatz',label:'Umsatzerloese',ph:'z.B. 54938'},
        {id:'bwaF_fahrraeder',label:'davon Fahrraeder',ph:'',sub:true},
        {id:'bwaF_teile',label:'davon Teile & Zubehoer',ph:'',sub:true},
        {id:'bwaF_service',label:'davon Service',ph:'',sub:true},
        {id:'bwaF_skonti',label:'davon Skonti (negativ)',ph:'z.B. -2028',sub:true},
        {id:'bwaF_wareneinsatz',label:'Wareneinsatz (negativ)',ph:'z.B. -33580'},
        {id:'bwaF_personal',label:'Personalkosten (negativ)',ph:'z.B. -13485'},
        {id:'bwaF_raum',label:'Raumkosten (negativ)',ph:'z.B. -4150'},
        {id:'bwaF_werbe',label:'Werbe-/Reisekosten',ph:''},
        {id:'bwaF_warenabgabe',label:'Kosten Warenabgabe',ph:''},
        {id:'bwaF_abschreibung',label:'Abschreibungen',ph:''},
        {id:'bwaF_sonstige',label:'Sonstige Kosten',ph:''},
        {id:'bwaF_zins',label:'Zinsaufwand',ph:''}
    ];
    html += '<div class="space-y-2 mb-4 max-h-60 overflow-y-auto">';
    fields.forEach(function(f) {
        html += '<div class="flex items-center space-x-2"><label class="'+(f.sub?'pl-4 ':'')+' text-xs text-gray-600 w-48 flex-shrink-0">'+f.label+'</label>';
        html += '<input id="'+f.id+'" type="number" step="0.01" class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm text-right bwa-field" placeholder="'+f.ph+'"></div>';
    });
    html += '</div>';
    html += '<div id="bwaUploadError" style="display:none" class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-3"></div>';
    html += '<button onclick="saveBwaData()" id="bwaSaveBtn" class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">BWA speichern</button>';
    html += '</div></div>';
    var c = document.createElement('div'); c.id = 'bwaUploadContainer'; c.innerHTML = html; document.body.appendChild(c);
}

export function handleBwaFileSelect(input) {
    var btn = document.getElementById('bwaParseBtn');
    var count = input.files ? input.files.length : 0;
    if(btn) {
        btn.disabled = count === 0;
        btn.textContent = count > 1 ? '🤖 ' + count + ' Dateien auslesen' : '🤖 Auslesen';
    }
}

export async function parseBwaWithAI() {
    var fileInput = document.getElementById('bwaFileInput');
    if(!fileInput || !fileInput.files || !fileInput.files.length) return;
    
    // Multi-file mode
    if(fileInput.files.length > 1) {
        return parseBwaBatch(fileInput.files);
    }
    
    var file = fileInput.files[0];
    var statusEl = document.getElementById('bwaAiStatus');
    var statusText = document.getElementById('bwaAiStatusText');
    var resultEl = document.getElementById('bwaAiResult');
    var parseBtn = document.getElementById('bwaParseBtn');

    statusEl.classList.remove('hidden');
    resultEl.classList.add('hidden');
    if(parseBtn) parseBtn.disabled = true;

    var isPdf = file.name.match(/\.pdf$/i);
    if(isPdf) {
        // PDF → KI-Analyse via Edge Function
        statusText.textContent = '🤖 PDF wird mit KI analysiert...';
        try {
            var reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    var base64 = e.target.result.split(',')[1];
                    var session = await sb.auth.getSession();
                    var token = session?.data?.session?.access_token;
                    var resp = await fetch(SUPABASE_URL + '/functions/v1/analyze-finance', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token||''), 'apikey': SUPABASE_ANON_KEY },
                        body: JSON.stringify({ type: 'bwa', file_base64: base64, media_type: 'application/pdf' })
                    });
                    if(!resp.ok) throw new Error('API Fehler ' + resp.status);
                    var data = await resp.json();
                    var result = data.result;
                    if(result && result.werte) {
                        // Fill form fields from KI result
                        bwaApplyKiResult(result);
                        statusEl.querySelector('.animate-spin').style.display = 'none';
                        statusText.textContent = '✅ KI-Analyse abgeschlossen' + (result.confidence ? ' (Konfidenz: ' + Math.round(result.confidence * 100) + '%)' : '');
                        if(result.hinweise && result.hinweise.length > 0) {
                            resultEl.innerHTML = '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700"><p class="font-semibold mb-1">KI-Hinweise:</p><ul class="list-disc pl-4">' + result.hinweise.map(function(h){return '<li>'+_escH(h)+'</li>';}).join('') + '</ul></div>';
                            resultEl.classList.remove('hidden');
                        }
                    } else {
                        throw new Error('Keine Werte erkannt');
                    }
                } catch(err2) {
                    statusEl.querySelector('.animate-spin').style.display = 'none';
                    statusText.textContent = '❌ KI-Analyse fehlgeschlagen: ' + (err2.message||err2);
                }
                if(parseBtn) parseBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        } catch(pdfErr) {
            statusEl.querySelector('.animate-spin').style.display = 'none';
            statusText.textContent = '❌ Fehler: ' + (pdfErr.message||pdfErr);
            if(parseBtn) parseBtn.disabled = false;
        }
        return;
    }

    statusText.textContent = '📊 Datei wird analysiert...';

    // === DATEV Sign Inversion Fix ===
    var negZeilen = {1060:1,1100:1,1120:1,1140:1,1150:1,1155:1,1160:1,1170:1,1175:1,1180:1,1190:1,1200:1,1210:1,1220:1,1240:1,1250:1,1260:1,1280:1,1290:1,1310:1,1312:1,1320:1,1355:1};
    function fixDatevSigns(bwaRows) {
        if(!bwaRows || bwaRows.length === 0) return bwaRows;
        // Check if Material/Wareneinkauf (1060) is positive - if so, this is DATEV format where costs are positive
        var we = bwaRows.find(function(x) { return x.zeile === 1060 && x.ist_summenzeile; });
        if(we && we.wert > 0) {
            console.log('[BWA] DATEV Sign Inversion: inverting cost lines');
            bwaRows.forEach(function(row) {
                if(row.zeile && negZeilen[row.zeile] && row.ist_summenzeile) {
                    if(row.wert > 0) row.wert = -row.wert;
                    if(row.wert_kumuliert > 0) row.wert_kumuliert = -row.wert_kumuliert;
                }
            });
        }
        return bwaRows;
    }
    BwaParser.parseFile(file, async function(err, result) {
        if(!err && result && result.bwa_daten) {
            result.bwa_daten = fixDatevSigns(result.bwa_daten);
        }
        if(err) {
            // KI-Fallback: Excel-Text extrahieren und an KI senden
            statusText.textContent = '🤖 Parser fehlgeschlagen – KI-Analyse wird gestartet...';
            try {
                var arrayBuf = await file.arrayBuffer();
                var wb = XLSX.read(arrayBuf, { type: 'array' });
                var rawText = cleanCsvForKi(wb);
                var session = await sb.auth.getSession();
                var token = session?.data?.session?.access_token;
                var resp = await fetch(SUPABASE_URL + '/functions/v1/analyze-finance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token||''), 'apikey': SUPABASE_ANON_KEY },
                    body: JSON.stringify({ type: 'bwa', raw_text: rawText.substring(0, 15000) })
                });
                if(!resp.ok) { var errB=''; try { var eD=await resp.json(); errB=eD.error||eD.details||''; } catch(e2) {} throw new Error('KI-API Fehler ' + resp.status + (errB ? ': '+errB.substring(0,150) : '')); }
                var data = await resp.json();
                if(data.result && data.result.werte) {
                    bwaApplyKiResult(data.result);
                    statusEl.querySelector('.animate-spin').style.display = 'none';
                    statusText.textContent = '✅ KI-Analyse abgeschlossen' + (data.result.confidence ? ' (Konfidenz: ' + Math.round(data.result.confidence * 100) + '%)' : '');
                    if(data.result.hinweise && data.result.hinweise.length > 0) {
                        resultEl.innerHTML = '<div class="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700"><p class="font-semibold mb-1">🤖 KI-Hinweise:</p><ul class="list-disc pl-4">' + data.result.hinweise.map(function(h){return '<li>'+_escH(h)+'</li>';}).join('') + '</ul><p class="mt-2 text-[10px] text-purple-400">Bitte Werte vor dem Speichern kontrollieren.</p></div>';
                        resultEl.classList.remove('hidden');
                    }
                } else { throw new Error('Keine Werte erkannt'); }
            } catch(kiFallbackErr) {
                statusEl.querySelector('.animate-spin').style.display = 'none';
                statusText.textContent = '❌ Auch KI-Analyse fehlgeschlagen: ' + (kiFallbackErr.message||'Unbekannt');
                resultEl.innerHTML = '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">'
                    + '<p class="font-semibold mb-1">Automatische Erkennung fehlgeschlagen</p>'
                    + '<p>Bitte die Werte manuell eingeben.</p></div>';
                resultEl.classList.remove('hidden');
            }
            if(parseBtn) parseBtn.disabled = false;
            return;
        }

        var meta = result.meta;
        var daten = result.bwa_daten;
        var jahrDaten = result.bwa_jahr_daten;

        // Apply detected month/year
        if(meta.monat) {
            var mSel = document.getElementById('bwaMonth');
            if(mSel) { mSel.value = meta.monat; mSel.style.borderColor = '#f97316'; mSel.style.backgroundColor = '#fff7ed'; }
        }
        if(meta.jahr) {
            var ySel = document.getElementById('bwaYear');
            if(ySel) { ySel.value = meta.jahr; ySel.style.borderColor = '#f97316'; ySel.style.backgroundColor = '#fff7ed'; }
        }

        // Extract key values from parsed data
        var parsed = {};
        var matchedRows = [];
        
        // Mapping: kontengruppe/bezeichnung → form field
        var gruppenMap = {
            'Umsatzerlöse': 'umsatzerloese',
            'Gesamtleistung': 'gesamtleistung',
            'Materialaufwand': 'wareneinsatz',
            'Rohertrag': 'rohertrag',
            'Sonstige Erlöse': 'so_betr_erloese',
            'Betrieblicher Rohertrag': 'betrieblicher_rohertrag',
            'Personalkosten': 'personalkosten',
            'Raumkosten': 'raumkosten',
            'Steuern/Versicherungen': 'versicherungen',
            'Fahrzeugkosten': 'fahrzeugkosten',
            'Werbe-/Reisekosten': 'werbekosten',
            'Warenabgabekosten': 'kosten_warenabgabe',
            'Abschreibungen': 'abschreibungen',
            'Instandhaltung': 'reparaturen_instandhaltung',
            'Sonstige Kosten': 'sonstige_kosten',
            'Gesamtkosten': 'gesamtkosten',
            'Summe Aufwendungen': 'gesamtkosten',
            'Betriebsergebnis': 'betriebsergebnis',
            'Zinsen': 'zinsaufwand',
            'Neutrales Ergebnis': 'neutraler_aufwand',
            'Ergebnis': 'ergebnis_vor_steuern'
        };
        
        // Detail-Konten Mapping
        var kontoMap = {
            '4400': 'davon_fahrraeder',
            '4405': 'davon_teile',
            '4407': 'davon_service',
            '4410': 'davon_service',
            '4730': 'davon_skonti',
            '4736': 'davon_skonti'
        };
        
        // Verarbeite Monats-BWA Daten
        if(daten && daten.length > 0) {
            daten.forEach(function(row) {
                if(!row.wert && row.wert !== 0) return;
                
                // Summenzeilen → Hauptfelder
                if(row.ist_summenzeile && row.kontengruppe && gruppenMap[row.kontengruppe]) {
                    var key = gruppenMap[row.kontengruppe];
                    if(!parsed[key]) {
                        parsed[key] = row.wert;
                        matchedRows.push({key: key, label: row.bezeichnung, value: row.wert});
                    }
                }
                
                // Detail-Konten → Unterfelder
                if(row.konto && kontoMap[row.konto]) {
                    var dKey = kontoMap[row.konto];
                    parsed[dKey] = (parsed[dKey] || 0) + row.wert;
                    matchedRows.push({key: dKey, label: row.bezeichnung, value: row.wert});
                }
            });
        }
        
        // Verarbeite Jahres-BWA Daten (nimm den letzten befüllten Monat)
        if(jahrDaten && jahrDaten.length > 0 && daten.length === 0) {
            var monatKeys = ['jan','feb','mrz','apr','mai','jun','jul','aug','sep','okt','nov','dez'];
            // Finde letzten Monat mit Daten
            var lastMonat = 0;
            jahrDaten.forEach(function(row) {
                for(var m = 11; m >= 0; m--) {
                    if(row[monatKeys[m]] && row[monatKeys[m]] !== 0 && m+1 > lastMonat) {
                        lastMonat = m+1;
                    }
                }
            });
            if(lastMonat > 0 && !meta.monat) {
                meta.monat = lastMonat;
                var mSel2 = document.getElementById('bwaMonth');
                if(mSel2) { mSel2.value = lastMonat; mSel2.style.borderColor = '#f97316'; mSel2.style.backgroundColor = '#fff7ed'; }
            }
            var mKey = lastMonat > 0 ? monatKeys[lastMonat - 1] : null;
            if(mKey) {
                jahrDaten.forEach(function(row) {
                    var val = row[mKey];
                    if(!val && val !== 0) return;
                    var bez = (row.bezeichnung || '').toLowerCase();
                    var mapped = null;
                    // Suche in kompakt map
                    var kompaktKeys = Object.keys(BwaParser.KOMPAKT_MAP);
                    for(var i = 0; i < kompaktKeys.length; i++) {
                        if(bez === kompaktKeys[i]) {
                            var info = BwaParser.KOMPAKT_MAP[kompaktKeys[i]];
                            if(info.gruppe && gruppenMap[info.gruppe]) {
                                mapped = gruppenMap[info.gruppe];
                                break;
                            }
                        }
                    }
                    if(mapped && !parsed[mapped]) {
                        parsed[mapped] = val;
                        matchedRows.push({key: mapped, label: row.bezeichnung, value: val});
                    }
                });
            }
        }

        // Berechne abgeleitete Werte
        if(!parsed.rohertrag && parsed.umsatzerloese && parsed.wareneinsatz) {
            parsed.rohertrag = parsed.umsatzerloese + parsed.wareneinsatz;
        }
        if(!parsed.gesamtkosten) {
            parsed.gesamtkosten = (parsed.personalkosten||0) + (parsed.raumkosten||0) + (parsed.werbekosten||0) + 
                (parsed.kosten_warenabgabe||0) + (parsed.abschreibungen||0) + (parsed.sonstige_kosten||0) +
                (parsed.kfzkosten||0) + (parsed.versicherungen||0) + (parsed.instandhaltung||0);
        }
        if(!parsed.betriebsergebnis && parsed.rohertrag) {
            parsed.betriebsergebnis = parsed.rohertrag + (parsed.gesamtkosten||0);
        }
        if(!parsed.ergebnis_vor_steuern && parsed.betriebsergebnis) {
            parsed.ergebnis_vor_steuern = parsed.betriebsergebnis + (parsed.zinsaufwand||0);
        }

        statusEl.querySelector('.animate-spin').style.display = 'none';

        if(matchedRows.length === 0) {
            // KI-Fallback: Format erkannt aber keine Zuordnung möglich
            statusText.textContent = '🤖 Format "' + meta.format + '" nicht zuordbar – KI-Analyse läuft...';
            try {
                var arrayBuf2 = await file.arrayBuffer();
                var wb2 = XLSX.read(arrayBuf2, { type: 'array' });
                var rawText2 = cleanCsvForKi(wb2);
                var kiResult = await callFinanceKi('bwa', null, null, rawText2.substring(0, 15000), {jahr: meta.jahr, monat: meta.monat, format: meta.format});
                if(kiResult && kiResult.werte) {
                    bwaApplyKiResult(kiResult);
                    statusEl.querySelector('.animate-spin').style.display = 'none';
                    statusText.textContent = '✅ KI-Analyse abgeschlossen' + (kiResult.confidence ? ' (Konfidenz: ' + Math.round(kiResult.confidence * 100) + '%)' : '') + ' [' + meta.format + ' → KI]';
                    if(kiResult.hinweise && kiResult.hinweise.length > 0) {
                        resultEl.innerHTML = '<div class="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700"><p class="font-semibold mb-1">🤖 KI-Hinweise:</p><ul class="list-disc pl-4">' + kiResult.hinweise.map(function(h){return '<li>'+_escH(h)+'</li>';}).join('') + '</ul><p class="mt-2 text-[10px] text-purple-400">Bitte Werte vor dem Speichern kontrollieren.</p></div>';
                        resultEl.classList.remove('hidden');
                    }
                } else { throw new Error('Keine Werte erkannt'); }
            } catch(kiErr2) {
                statusEl.querySelector('.animate-spin').style.display = 'none';
                statusText.textContent = '⚠️ Auch KI konnte keine Werte zuordnen (Format: ' + meta.format + ')';
                resultEl.innerHTML = '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">'
                    + '<p class="font-semibold mb-1">Automatische Erkennung fehlgeschlagen</p>'
                    + '<p>Bitte die Werte manuell eingeben.</p></div>';
                resultEl.classList.remove('hidden');
            }
            if(parseBtn) parseBtn.disabled = false;
            return;
        }

        var periodInfo = meta.monat && meta.jahr ? ' (' + monatNamen[meta.monat] + ' ' + meta.jahr + ')' : '';
        statusText.textContent = '✅ ' + matchedRows.length + ' Werte erkannt!' + periodInfo + ' [' + meta.format + ']';

        // Fill form fields
        var fieldMap = {
            umsatzerloese: 'bwaF_umsatz',
            davon_fahrraeder: 'bwaF_fahrraeder',
            davon_teile: 'bwaF_teile',
            davon_service: 'bwaF_service',
            davon_skonti: 'bwaF_skonti',
            wareneinsatz: 'bwaF_wareneinsatz',
            personalkosten: 'bwaF_personal',
            raumkosten: 'bwaF_raum',
            werbekosten: 'bwaF_werbe',
            kosten_warenabgabe: 'bwaF_warenabgabe',
            abschreibungen: 'bwaF_abschreibung',
            sonstige_kosten: 'bwaF_sonstige',
            zinsaufwand: 'bwaF_zins'
        };

        var filledCount = 0;
        Object.keys(fieldMap).forEach(function(key) {
            var val = parsed[key];
            if(val !== undefined && val !== 0) {
                var el = document.getElementById(fieldMap[key]);
                if(el) { 
                    el.value = Math.round(val * 100) / 100; 
                    el.style.borderColor = '#f97316'; 
                    el.style.backgroundColor = '#fff7ed'; 
                    filledCount++; 
                }
            }
        });

        // Show results
        var umsatz = parsed.umsatzerloese || 0;
        var rohertrag = parsed.rohertrag || 0;
        var rohertragPct = umsatz ? ((rohertrag / umsatz) * 100).toFixed(1) : 0;
        var ergebnis = parsed.ergebnis_vor_steuern || parsed.betriebsergebnis || 0;
        
        resultEl.innerHTML = '<div class="bg-green-50 border border-green-200 rounded-lg p-3">'
            + '<p class="text-xs font-semibold text-green-700 mb-2">✅ ' + filledCount + ' Werte erkannt · Format: <code>' + meta.format + '</code></p>'
            + '<div class="grid grid-cols-3 gap-2 text-xs">'
            + '<div><span class="text-gray-500">Umsatz:</span><br><strong>' + umsatz.toLocaleString('de-DE') + ' €</strong></div>'
            + '<div><span class="text-gray-500">Rohertrag:</span><br><strong>' + rohertragPct + '%</strong></div>'
            + '<div><span class="text-gray-500">Ergebnis:</span><br><strong class="' + (ergebnis >= 0 ? 'text-green-600' : 'text-red-600') + '">' + ergebnis.toLocaleString('de-DE') + ' €</strong></div>'
            + '</div>'
            + '<details class="mt-2"><summary class="text-[10px] text-gray-400 cursor-pointer">Erkannte Zuordnungen (' + matchedRows.length + ')</summary>'
            + '<div class="mt-1 space-y-0.5 max-h-40 overflow-y-auto">' + matchedRows.map(function(m) { 
                return '<div class="text-[10px] text-gray-500"><span class="text-gray-700">"' + m.label + '"</span> → <strong>' + m.key + '</strong> = ' + (typeof m.value === 'number' ? m.value.toLocaleString('de-DE') : m.value) + '</div>'; 
            }).join('') + '</div></details>'
            + '<p class="text-[10px] text-gray-400 mt-2">⚠️ Bitte prüfe die Werte vor dem Speichern.</p>'
            + '</div>';
        resultEl.classList.remove('hidden');
        
        // Store detail data for saveBwaData()
        window._lastParsedDetails = daten && daten.length > 0 ? daten : [];
        window._lastParsedFormat = meta.format;
        
        if(parseBtn) parseBtn.disabled = false;
    });
}

// Batch BWA Upload – mehrere Dateien nacheinander parsen + speichern
export async function parseBwaBatch(files) {
    var statusEl = document.getElementById('bwaAiStatus');
    var statusText = document.getElementById('bwaAiStatusText');
    var resultEl = document.getElementById('bwaAiResult');
    var parseBtn = document.getElementById('bwaParseBtn');
    statusEl.classList.remove('hidden');
    resultEl.classList.remove('hidden');
    if(parseBtn) parseBtn.disabled = true;

    var total = files.length;
    var results = [];
    resultEl.innerHTML = '<div id="bwaBatchProgress" class="space-y-2"></div>';

    for(var i = 0; i < total; i++) {
        var file = files[i];
        statusText.textContent = '📊 Datei ' + (i+1) + '/' + total + ': ' + file.name + '...';
        
        var progEl = document.getElementById('bwaBatchProgress');
        var itemId = 'bwaBatch_' + i;
        progEl.innerHTML += '<div id="' + itemId + '" class="flex items-center space-x-2 text-xs p-2 bg-gray-50 rounded"><div class="w-3 h-3 border-2 border-vit-orange border-t-transparent rounded-full animate-spin"></div><span class="flex-1 truncate">' + _escH(file.name) + '</span><span class="text-gray-400">Analysiert...</span></div>';

        // Delay between requests to avoid rate limiting (429)
        if(i > 0) { await new Promise(function(r){ setTimeout(r, 4000); }); }

        try {
            var bwaResult = await parseSingleBwaFileWithRetry(file);
            if(bwaResult && bwaResult.umsatzerloese) {
                // Auto-save
                var saveRes = await autoSaveBwa(bwaResult, file.name);
                var el = document.getElementById(itemId);
                if(el) el.innerHTML = '<span class="text-green-600">✅</span><span class="flex-1">' + _escH(file.name) + '</span><span class="text-green-600 font-semibold">' + bwaResult.monatName + ' ' + bwaResult.jahr + ' – Umsatz: ' + Math.round(bwaResult.umsatzerloese).toLocaleString('de-DE') + ' €</span>';
                results.push({file: file.name, success: true, monat: bwaResult.monat, jahr: bwaResult.jahr});
            } else {
                throw new Error('Keine Werte erkannt');
            }
        } catch(err) {
            var el2 = document.getElementById(itemId);
            if(el2) el2.innerHTML = '<span class="text-red-500">❌</span><span class="flex-1">' + _escH(file.name) + '</span><span class="text-red-500">' + _escH(err.message || 'Fehler') + '</span>';
            results.push({file: file.name, success: false, error: err.message});
        }
    }

    var ok = results.filter(function(r){return r.success;}).length;
    statusEl.querySelector('.animate-spin').style.display = 'none';
    statusText.textContent = '✅ Batch fertig: ' + ok + '/' + total + ' BWAs erfolgreich gespeichert';
    if(parseBtn) parseBtn.disabled = false;

    // Reload BWA list
    if(ok > 0 && typeof loadBwaList === 'function') {
        setTimeout(function(){ loadBwaList(); }, 500);
    }
}

// Parse a single BWA file – returns {monat, jahr, monatName, umsatzerloese, ...} or throws
// Retry wrapper: retries on 429 rate limit with exponential backoff
export async function parseSingleBwaFileWithRetry(file, attempt) {
    attempt = attempt || 1;
    try {
        return await parseSingleBwaFile(file);
    } catch(err) {
        if(err.message && err.message.includes('429') && attempt < 4) {
            var wait = attempt * 5000; // 5s, 10s, 15s
            console.log('Rate limited, retry ' + attempt + ' in ' + (wait/1000) + 's for', file.name);
            await new Promise(function(r){ setTimeout(r, wait); });
            return parseSingleBwaFileWithRetry(file, attempt + 1);
        }
        throw err;
    }
}

// Clean CSV for KI: remove line breaks in cells, clarify SUSA columns
export function cleanCsvForKi(wb) {
    var rawText = '';
    wb.SheetNames.forEach(function(sn) {
        var ws = wb.Sheets[sn];
        // Clean cell values: remove newlines
        var range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for(var R = range.s.r; R <= range.e.r; R++) {
            for(var C = range.s.c; C <= range.e.c; C++) {
                var addr = XLSX.utils.encode_cell({r:R, c:C});
                var cell = ws[addr];
                if(cell && typeof cell.v === 'string') {
                    cell.v = cell.v.replace(/[\r\n]+/g, ' ').trim();
                    if(cell.w) cell.w = cell.w.replace(/[\r\n]+/g, ' ').trim();
                }
            }
        }
        rawText += '=== Sheet: ' + sn + ' ===\n' + XLSX.utils.sheet_to_csv(ws, {FS:';'}) + '\n\n';
    });
    return rawText;
}

export async function parseSingleBwaFile(file) {
    return new Promise(function(resolve, reject) {
        var meta = BwaParser.extractMonatJahr(file.name);
        meta.dateiname = file.name;
        var monatNamen = ['','Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

        var isPdf = file.name.match(/\.pdf$/i);
        if(isPdf) {
            // PDF → direkt KI
            var reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    var base64 = e.target.result.split(',')[1];
                    var kiResult = await callFinanceKi('bwa', base64, 'application/pdf', null, {jahr: meta.jahr, monat: meta.monat});
                    if(kiResult && kiResult.werte) {
                        var w = kiResult.werte;
                        var m = (kiResult.meta && kiResult.meta.monat) || meta.monat;
                        var j = (kiResult.meta && kiResult.meta.jahr) || meta.jahr;
                        resolve(Object.assign(w, {monat: m, jahr: j, monatName: monatNamen[m] || '?', quelle: 'ki'}));
                    } else { reject(new Error('KI: Keine Werte')); }
                } catch(err) { reject(err); }
            };
            reader.readAsDataURL(file);
            return;
        }

        // Excel → Parser zuerst, dann KI-Fallback
        BwaParser.parseFile(file, async function(err, result) {
            // Versuche regelbasiert zu parsen
            var parsed = {};
            var matchCount = 0;
            if(!err && result) {
                var daten = result.bwa_daten || [];
                var gruppenMap = {
                    'Umsatzerlöse':'umsatzerloese','Materialaufwand':'wareneinsatz','Rohertrag':'rohertrag',
                    'Betrieblicher Rohertrag':'rohertrag','Personalkosten':'personalkosten','Raumkosten':'raumkosten',
                    'Werbe-/Reisekosten':'werbekosten','Warenabgabekosten':'kosten_warenabgabe',
                    'Abschreibungen':'abschreibungen','Sonstige Kosten':'sonstige_kosten',
                    'Fahrzeugkosten':'kfzkosten','Steuern/Versicherungen':'versicherungen',
                    'Betriebsergebnis':'betriebsergebnis','Zinsen':'zinsaufwand'
                };
                daten.forEach(function(row) {
                    if(row.ist_summenzeile && row.kontengruppe && gruppenMap[row.kontengruppe] && row.wert !== null) {
                        var key = gruppenMap[row.kontengruppe];
                        if(!parsed[key]) { parsed[key] = row.wert; matchCount++; }
                    }
                });
                if(result.meta) { meta.monat = result.meta.monat || meta.monat; meta.jahr = result.meta.jahr || meta.jahr; }
            }

            if(matchCount >= 3) {
                // Parser hat genug Felder gefunden
                resolve(Object.assign(parsed, {monat: meta.monat, jahr: meta.jahr, monatName: monatNamen[meta.monat] || '?', quelle: 'parser'}));
                return;
            }

            // KI-Fallback
            try {
                var arrayBuf = await file.arrayBuffer();
                var wb = XLSX.read(arrayBuf, { type: 'array' });
                var rawText = cleanCsvForKi(wb);
                var kiResult = await callFinanceKi('bwa', null, null, rawText.substring(0, 15000), {jahr: meta.jahr, monat: meta.monat, format: meta.format});
                if(kiResult && kiResult.werte) {
                    var w2 = kiResult.werte;
                    var m2 = (kiResult.meta && kiResult.meta.monat) || meta.monat;
                    var j2 = (kiResult.meta && kiResult.meta.jahr) || meta.jahr;
                    resolve(Object.assign(w2, {monat: m2, jahr: j2, monatName: monatNamen[m2] || '?', quelle: 'ki'}));
                } else { reject(new Error('KI: Keine Werte')); }
            } catch(kiErr) { reject(kiErr); }
        });
    });
}

// Auto-save a parsed BWA to DB
export async function autoSaveBwa(data, filename) {
    var stdId = _sbProfile() ? _sbProfile().standort_id : null;
    if(!stdId) throw new Error('Kein Standort');
    
    // Use parsed summation values if available, compute as fallback
    var rohertrag = data.rohertrag || ((data.umsatzerloese||0) + (data.wareneinsatz||0));
    
    // Gesamtkosten: use parsed value or sum all cost categories
    var gesamtkosten = data.gesamtkosten || (
        (data.personalkosten||0) + (data.raumkosten||0) + (data.werbekosten||0) + 
        (data.kosten_warenabgabe||0) + (data.abschreibungen||0) + (data.sonstige_kosten||0) +
        (data.fahrzeugkosten||0) + (data.versicherungen||0) + 
        (data.reparaturen_instandhaltung||0)
    );
    
    // Betrieblicher Rohertrag = Rohertrag + So. betr. Erlöse
    var betrRohertrag = data.betrieblicher_rohertrag || (rohertrag + (data.so_betr_erloese||0));
    
    // Betriebsergebnis: use parsed value, fallback = betr. Rohertrag + Gesamtkosten
    var betriebsergebnis = data.betriebsergebnis || (betrRohertrag + gesamtkosten);
    
    // Ergebnis v.St.: use parsed value, fallback = BE + Zins + Neutral
    var ergebnis = data.ergebnis_vor_steuern || (
        betriebsergebnis + (data.zinsaufwand||0) + (data.neutraler_aufwand||0) + (data.neutraler_ertrag||0)
    );

    var payload = {
        standort_id: stdId,
        monat: data.monat,
        jahr: data.jahr,
        umsatzerloese: data.umsatzerloese || 0,
        davon_fahrraeder: data.davon_fahrraeder || null,
        davon_teile: data.davon_teile || null,
        davon_service: data.davon_service || null,
        davon_skonti: data.davon_skonti || null,
        wareneinsatz: data.wareneinsatz || 0,
        rohertrag: rohertrag,
        so_betr_erloese: data.so_betr_erloese || 0,
        betrieblicher_rohertrag: betrRohertrag,
        gesamtleistung: data.gesamtleistung || data.umsatzerloese || 0,
        personalkosten: data.personalkosten || 0,
        raumkosten: data.raumkosten || 0,
        versicherungen: data.versicherungen || 0,
        fahrzeugkosten: data.fahrzeugkosten || 0,
        werbekosten: data.werbekosten || 0,
        kosten_warenabgabe: data.kosten_warenabgabe || 0,
        abschreibungen: data.abschreibungen || 0,
        reparaturen_instandhaltung: data.reparaturen_instandhaltung || 0,
        sonstige_kosten: data.sonstige_kosten || 0,
        gesamtkosten: gesamtkosten,
        betriebsergebnis: betriebsergebnis,
        zinsaufwand: data.zinsaufwand || 0,
        neutraler_aufwand: data.neutraler_aufwand || 0,
        neutraler_ertrag: data.neutraler_ertrag || 0,
        ergebnis_vor_steuern: ergebnis,
        steuern: data.steuern || 0,
        ergebnis_nach_steuern: data.ergebnis_nach_steuern || (ergebnis + (data.steuern||0)),
        datei_name: filename,
        format: data.quelle === 'ki' ? 'KI-Analyse' : 'Auto-Parser',
        hochgeladen_von: sbUser ? _sbUser().id : null,
        updated_at: new Date().toISOString()
    };

    var resp = await _sb().from('bwa_daten').upsert(payload, {onConflict: 'standort_id,monat,jahr'}).select();
    if(resp.error) throw resp.error;
    
    // Run validation after save
    if(resp.data && resp.data[0]) {
        try {
            await sb.rpc('validate_bwa', {p_bwa_id: resp.data[0].id});
        } catch(e) { console.warn('BWA Validation failed:', e); }
    }
    
    return resp.data;
}

// Apply KI analysis result to BWA form fields
export function bwaApplyKiResult(result) {
    if(!result) return;
    var meta = result.meta || {};
    var werte = result.werte || {};
    // Apply month/year
    if(meta.monat) {
        var mSel = document.getElementById('bwaMonth');
        if(mSel) { mSel.value = meta.monat; mSel.style.borderColor = '#a855f7'; mSel.style.backgroundColor = '#faf5ff'; }
    }
    if(meta.jahr) {
        var ySel = document.getElementById('bwaYear');
        if(ySel) { ySel.value = meta.jahr; ySel.style.borderColor = '#a855f7'; ySel.style.backgroundColor = '#faf5ff'; }
    }
    // Map KI werte to form fields (bwaF_ IDs)
    var fieldMap = {
        umsatzerloese:'bwaF_umsatz', wareneinsatz:'bwaF_wareneinsatz',
        personalkosten:'bwaF_personal', raumkosten:'bwaF_raum',
        werbekosten:'bwaF_werbe', kosten_warenabgabe:'bwaF_warenabgabe',
        abschreibungen:'bwaF_abschreibung', sonstige_kosten:'bwaF_sonstige',
        zinsaufwand:'bwaF_zins',
        davon_fahrraeder:'bwaF_fahrraeder', davon_teile:'bwaF_teile',
        davon_service:'bwaF_service', davon_skonti:'bwaF_skonti'
    };
    var filled = 0;
    Object.keys(werte).forEach(function(key) {
        var elId = fieldMap[key];
        if(!elId) return;
        var el = document.getElementById(elId);
        if(el && werte[key] !== null && werte[key] !== undefined) {
            el.value = Math.round(werte[key] * 100) / 100;
            el.style.borderColor = '#a855f7';
            el.style.backgroundColor = '#faf5ff';
            filled++;
        }
    });
    console.log('[BWA KI] ' + filled + ' Felder befüllt, Konfidenz: ' + (result.confidence||'?'));
}

export function closeBwaUploadModal() { var c = document.getElementById('bwaUploadContainer'); if(c) c.remove(); }

export async function saveBwaData() {
    var month = parseInt(document.getElementById('bwaMonth').value);
    var year = parseInt(document.getElementById('bwaYear').value);
    var errEl = document.getElementById('bwaUploadError');
    var btn = document.getElementById('bwaSaveBtn');
    var v = function(id) { return parseFloat((document.getElementById(id)||{}).value) || 0; };

    var umsatz = v('bwaF_umsatz');
    var wareneinsatz = v('bwaF_wareneinsatz');
    var rohertrag = umsatz + wareneinsatz; // wareneinsatz is negative
    var personal = v('bwaF_personal');
    var raum = v('bwaF_raum');
    var werbe = v('bwaF_werbe');
    var warenabgabe = v('bwaF_warenabgabe');
    var abschreibung = v('bwaF_abschreibung');
    var sonstige = v('bwaF_sonstige');
    var gesamtkosten = personal + raum + werbe + warenabgabe + abschreibung + sonstige;
    var betriebsergebnis = rohertrag + gesamtkosten;
    var zins = v('bwaF_zins');
    var ergebnis = betriebsergebnis + zins;

    if(!umsatz && !wareneinsatz) { if(errEl){errEl.textContent='Bitte mindestens Umsatz oder Wareneinsatz eingeben.';errEl.style.display='block';} return; }

    if(btn) { btn.disabled=true; btn.textContent='Wird gespeichert...'; }
    try {
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;

        // Upload file if selected
        var fileUrl = null;
        var fileName = null;
        var fileInput = document.getElementById('bwaFileInput');
        if(fileInput && fileInput.files && fileInput.files[0]) {
            var file = fileInput.files[0];
            fileName = file.name;
            var path = (stdId||'hq')+'/'+year+'/'+month+'_'+file.name;
            var upResp = await _sb().storage.from('bwa-dateien').upload(path, file, {upsert:true});
            if(upResp.error) console.warn('File upload error:', upResp.error);
            else fileUrl = path;
        }

        var data = {
            standort_id: stdId,
            monat: month,
            jahr: year,
            umsatzerloese: umsatz,
            davon_fahrraeder: v('bwaF_fahrraeder'),
            davon_teile: v('bwaF_teile'),
            davon_service: v('bwaF_service'),
            davon_skonti: v('bwaF_skonti'),
            wareneinsatz: wareneinsatz,
            rohertrag: rohertrag,
            personalkosten: personal,
            raumkosten: raum,
            werbekosten: werbe,
            kosten_warenabgabe: warenabgabe,
            abschreibungen: abschreibung,
            sonstige_kosten: sonstige,
            gesamtkosten: gesamtkosten,
            betriebsergebnis: betriebsergebnis,
            zinsaufwand: zins,
            ergebnis_vor_steuern: ergebnis,
            plan_umsatz: v('bwaF_planUmsatz'),
            plan_wareneinsatz: v('bwaF_planWareneinsatz'),
            plan_rohertrag: v('bwaF_planRohertrag'),
            plan_personalkosten: v('bwaF_planPersonal'),
            plan_raumkosten: v('bwaF_planRaum'),
            plan_werbekosten: v('bwaF_planWerbe'),
            plan_gesamtkosten: v('bwaF_planGesamt'),
            plan_ergebnis: v('bwaF_planErgebnis'),
            format: window._lastParsedFormat || null,
            hochgeladen_von: sbUser ? _sbUser().id : null,
            updated_at: new Date().toISOString()
        };
        if(fileUrl) { data.datei_url = fileUrl; data.datei_name = fileName; }

        var resp = await _sb().from('bwa_daten').upsert(data, {onConflict:'standort_id,monat,jahr'}).select();
        if(resp.error) throw resp.error;
        var bwaId = resp.data && resp.data[0] ? resp.data[0].id : null;

        // Detail-Positionen speichern (wenn vom Parser vorhanden)
        if(bwaId && window._lastParsedDetails && window._lastParsedDetails.length > 0) {
            // Alte Details löschen
            await _sb().from('bwa_detail_positionen').delete().eq('bwa_id', bwaId);
            // Neue Details in Batches speichern
            var details = window._lastParsedDetails.map(function(d) {
                return {
                    bwa_id: bwaId,
                    standort_id: stdId,
                    jahr: year,
                    monat: month,
                    zeile: d.zeile || null,
                    konto: d.konto || null,
                    kontengruppe: d.kontengruppe || null,
                    bezeichnung: d.bezeichnung,
                    wert: d.wert,
                    wert_kumuliert: d.wert_kumuliert || null,
                    wert_vorjahr: d.wert_vorjahr || null,
                    prozent_gesamtleistung: d.prozent_gesamtleistung || null,
                    ist_summenzeile: d.ist_summenzeile || false,
                    ebene: d.ebene || 0,
                    sortierung: d.sortierung || 0,
                    format: window._lastParsedFormat || null
                };
            });
            // Batch insert (max 500 per request)
            for(var bi = 0; bi < details.length; bi += 500) {
                var batch = details.slice(bi, bi + 500);
                var detResp = await _sb().from('bwa_detail_positionen').insert(batch);
                if(detResp.error) console.warn('Detail insert batch error:', detResp.error);
            }
            console.log('✅ ' + details.length + ' Detail-Positionen gespeichert');
        }

        // Cleanup temp vars
        window._lastParsedDetails = null;
        window._lastParsedFormat = null;

        closeBwaUploadModal();
        await loadBwaList();
        if(bwaId) showBwaFromDb(bwaId);
        alert('✅ BWA '+monatNamen[month]+' '+year+' gespeichert!');
    } catch(err) {
        if(errEl){errEl.textContent='Fehler: '+err.message;errEl.style.display='block';}
        if(btn) { btn.disabled=false; btn.textContent=_t('ui_save_bwa'); }
    }
}



// Strangler Fig
const _exports = {showControllingTab,showBwaDetail,eur,eurColor,diffHtml,loadBwaList,downloadBwa,showBwaFromDb,loadBwaTrend,openBwaUploadModal,handleBwaFileSelect,parseBwaWithAI,parseBwaBatch,parseSingleBwaFileWithRetry,cleanCsvForKi,parseSingleBwaFile,autoSaveBwa,bwaApplyKiResult,closeBwaUploadModal,saveBwaData};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
// BwaParser needed by plan-ist.js
window.BwaParser = BwaParser;
console.log('[controlling.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
