/**
 * views/einkauf.js - Partner-Portal Einkauf Module
 *
 * Handles: Lieferanten (HQ/Standort), Sortiment, Zentralregulierung,
 *          Strategie, Wissen (IHT, Parts, DB1, Kernsortiment, Vororder)
 *
 * @module views/einkauf
 */
function _sb()        { return window.sb; }
function _escH(s)     { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)        { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t){ if (typeof window.showToast === 'function') window.showToast(m,t); }

// === EINKAUF MODULE (from standalone einkauf_modul.html) ===
var ekLiefFilter = 'all';
var ekLiefQ = '';
var stLiefQ = '';
var wissenSec = 'iht';

var allLief=[{"n": "AMFLOW/ DJI", "art": "bike", "kern": false, "zusatz": false, "auslauf": true, "stat": "Verhandlung gescheitert", "sc": "red", "kond": "Konditionen zu gering", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Babboe", "art": "bike", "kern": false, "zusatz": true, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "Konditionen Accell", "iht": "IHT aktiv", "zr": true, "mail": "service@winora-group.de", "tel": "+49 (0)9721-6501-7878", "b2b": "Accentry b2b", "regmail": "callcenter@winora.de"}, {"n": "CaGo", "art": "bike", "kern": false, "zusatz": true, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "Konditionen Ca Go", "iht": "IHT aktiv", "zr": true, "mail": "nouri.hamsoro@rtisports.de", "tel": "+49 (0)261 899998-220", "b2b": "Ca Go b2b", "regmail": "nouri.hamsoro@rtisports.de"}, {"n": "Centurion", "art": "bike", "kern": false, "zusatz": false, "auslauf": true, "stat": "Verhandlung gescheitert", "sc": "red", "kond": "", "iht": "Abgelehnt", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Conway", "art": "bike", "kern": false, "zusatz": false, "auslauf": false, "stat": "Kontakt aufgenommen", "sc": "blue", "kond": "", "iht": "In Verhandlung", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Gazelle", "art": "bike", "kern": false, "zusatz": false, "auslauf": false, "stat": "Volumen nicht ausreichend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Ghost, Lapierre", "art": "bike", "kern": false, "zusatz": true, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "Konditionen Accell", "iht": "IHT aktiv", "zr": true, "mail": "sales@ghost-bikes.de", "tel": "+49 9632 9255-0", "b2b": "Accentry b2b", "regmail": "service@ghost-bikes.de"}, {"n": "HASE bike", "art": "bike", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "6-7% Rabatt + 2% Sk. 10T", "iht": "Im Onboarding", "zr": false, "mail": "Hendrik.Forejta@hasebikes.com", "tel": "+49 2309 9377-236", "b2b": "", "regmail": "Hendrik.Forejta@hasebikes.com"}, {"n": "HEPHA", "art": "bike", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "", "iht": "IHT aktiv", "zr": true, "mail": "info@hepha.com", "tel": "+49(0) 8142 / 2844480", "b2b": "", "regmail": "bernd.lesch@hepha.com"}, {"n": "i:SY", "art": "bike", "kern": false, "zusatz": false, "auslauf": false, "stat": "Volumen nicht ausreichend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "yasemin@isy.de", "tel": "+49 221 5727744445", "b2b": "", "regmail": "yasemin@isy.de"}, {"n": "Kalkhoff", "art": "bike", "kern": false, "zusatz": false, "auslauf": false, "stat": "Volumen nicht ausreichend", "sc": "gray", "kond": "", "iht": "Abgelehnt", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Koga", "art": "bike", "kern": false, "zusatz": true, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "Konditionen Accell", "iht": "IHT aktiv", "zr": true, "mail": "service@winora-group.de", "tel": "+49 (0)9721-6501-7878", "b2b": "Accentry b2b", "regmail": "callcenter@winora.de"}, {"n": "KTM", "art": "bike", "kern": false, "zusatz": false, "auslauf": false, "stat": "Volumen nicht ausreichend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "M1", "art": "bike", "kern": false, "zusatz": false, "auslauf": true, "stat": "Ausgelaufen (Insolvenz)", "sc": "red", "kond": "", "iht": "Abgelehnt", "zr": false, "mail": "info@m1-sporttechnik.de", "tel": "08020-90891170", "b2b": "", "regmail": "j.sauer@m1-sporttechnik.de"}, {"n": "Nicolai", "art": "bike", "kern": false, "zusatz": false, "auslauf": false, "stat": "In Verhandlung", "sc": "yellow", "kond": "", "iht": "In Verhandlung", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Orbea", "art": "bike", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "40/60% TAM, Diamond 17%", "iht": "In Verhandlung", "zr": false, "mail": "cponzlet@orbea.com", "tel": "+49 231 98819869", "b2b": "Orbea KIDE", "regmail": "cponzlet@orbea.com"}, {"n": "Raymon", "art": "bike", "kern": false, "zusatz": false, "auslauf": false, "stat": "Kontakt aufgenommen", "sc": "blue", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Riese und Müller", "art": "bike", "kern": true, "zusatz": false, "auslauf": false, "stat": "In Verhandlung", "sc": "yellow", "kond": "", "iht": "In Verhandlung", "zr": false, "mail": "vertrieb@r-m.de", "tel": "+49 6151 36686-11", "b2b": "R&M b2b", "regmail": "vertrieb@r-m.de"}, {"n": "Simplon", "art": "bike", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "Premium-Händler, hohe Marge", "iht": "Im Onboarding", "zr": false, "mail": "sales@simplon.com", "tel": "+43 5574 72564401", "b2b": "Simplon b2b", "regmail": "sales@simplon.com"}, {"n": "Specialized", "art": "bike", "kern": false, "zusatz": false, "auslauf": false, "stat": "Volumen nicht ausreichend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Steppenwolf", "art": "bike", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "Kalk. 1,85 + 3% VO + 3% Sk.", "iht": "IHT aktiv", "zr": true, "mail": "sales@steppenwolf-bikes.com", "tel": "+49 30 863280217", "b2b": "Steppenwolf b2b", "regmail": "sales@steppenwolf-bikes.com"}, {"n": "Urban Arrow", "art": "bike", "kern": false, "zusatz": false, "auslauf": true, "stat": "Verhandlung gescheitert", "sc": "red", "kond": "", "iht": "Abgelehnt", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Velo de Ville", "art": "bike", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "12% + 2% Sk. 16T (Fakt. 1,8)", "iht": "IHT aktiv", "zr": true, "mail": "philipp.niehues@velo-de-ville.com", "tel": "+49 2505 9305 965", "b2b": "VdV b2b", "regmail": "marketing@velo-de-ville.com"}, {"n": "Winora, Haibike", "art": "bike", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "Accell max. Staffel (nur IHT)", "iht": "IHT aktiv", "zr": true, "mail": "service@winora-group.de", "tel": "+49(0) 9721-6501-7878", "b2b": "Accentry b2b", "regmail": "callcenter@winora.de"}, {"n": "Bike Leasing Service", "art": "dl", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "6% Prov. - 33,4% MKT - bis 66,67% Wachstum", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "BLS b2b", "regmail": ""}, {"n": "BikeCenter", "art": "dl", "kern": false, "zusatz": true, "auslauf": false, "stat": "In Verhandlung", "sc": "yellow", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Businessbike", "art": "dl", "kern": true, "zusatz": false, "auslauf": false, "stat": "In Finalisierung", "sc": "yellow", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "Businessbike b2b", "regmail": ""}, {"n": "Company Bike", "art": "dl", "kern": false, "zusatz": true, "auslauf": false, "stat": "In Verhandlung", "sc": "yellow", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "CB b2b", "regmail": ""}, {"n": "Deutsche Dienstrad", "art": "dl", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "0% Prov. + 3% Fulfillment + 1% Rückverg.", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "DD b2b", "regmail": ""}, {"n": "Eleasa", "art": "dl", "kern": false, "zusatz": true, "auslauf": false, "stat": "Kontakt ausstehend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "Eleasa b2b", "regmail": ""}, {"n": "GO", "art": "dl", "kern": true, "zusatz": false, "auslauf": false, "stat": "Kontakt ausstehend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Jobrad", "art": "dl", "kern": true, "zusatz": false, "auslauf": false, "stat": "Kontakt ausstehend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "Jobrad b2b", "regmail": ""}, {"n": "Kazenmaier", "art": "dl", "kern": false, "zusatz": true, "auslauf": false, "stat": "Kontakt ausstehend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "Kazenmaier b2b", "regmail": ""}, {"n": "lease a bike", "art": "dl", "kern": false, "zusatz": true, "auslauf": false, "stat": "Kontakt ausstehend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "leasabike b2b", "regmail": ""}, {"n": "Linexo", "art": "dl", "kern": false, "zusatz": true, "auslauf": false, "stat": "Kontakt ausstehend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "linexo b2b", "regmail": ""}, {"n": "Mein Dienstrad", "art": "dl", "kern": false, "zusatz": true, "auslauf": false, "stat": "Kontakt aufgenommen", "sc": "blue", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "MDR b2b", "regmail": ""}, {"n": "Probonio", "art": "dl", "kern": true, "zusatz": false, "auslauf": false, "stat": "Kontakt aufgenommen", "sc": "blue", "kond": "", "iht": "In Verhandlung", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Smartfit", "art": "dl", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "", "iht": "Im Onboarding", "zr": false, "mail": "rw@smartfit.bike", "tel": "+49 160 6666367", "b2b": "", "regmail": "rw@smartfit.bike"}, {"n": "Strom", "art": "dl", "kern": false, "zusatz": false, "auslauf": false, "stat": "Kontakt ausstehend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Telecash", "art": "dl", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "Clover Flex LTE V2, ab 18,90€/Mo", "iht": "", "zr": false, "mail": "christian.koenig@fiserv.com", "tel": "+49 (0) 911 945 8387", "b2b": "", "regmail": "christian.koenig@fiserv.com"}, {"n": "Telekom", "art": "dl", "kern": false, "zusatz": false, "auslauf": false, "stat": "Kontakt ausstehend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Wertgarantie by linexo", "art": "dl", "kern": true, "zusatz": false, "auslauf": false, "stat": "Kontakt ausstehend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "Wertgarantie b2b", "regmail": ""}, {"n": "Würth Leasing", "art": "dl", "kern": false, "zusatz": true, "auslauf": false, "stat": "Kontakt ausstehend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "Würth Leasing b2b", "regmail": ""}, {"n": "ABUS", "art": "parts", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "48% Grund + VO-Staffel", "iht": "Abgelehnt", "zr": false, "mail": "mobile.vertrieb@abus.de", "tel": "+49 2335 634 470", "b2b": "ABUS b2b", "regmail": "mobile.vertrieb@abus.de"}, {"n": "Alps Alpine", "art": "parts", "kern": false, "zusatz": false, "auslauf": false, "stat": "Kontakt aufgenommen", "sc": "blue", "kond": "", "iht": "In Verhandlung", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "ASISTA", "art": "parts", "kern": false, "zusatz": false, "auslauf": true, "stat": "Verhandlung gescheitert", "sc": "red", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Cosmic Sports", "art": "parts", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "SQlab 18%+1%+3%, SP Connect", "iht": "IHT aktiv", "zr": true, "mail": "tm@cosmicsports.de", "tel": "+49 911 310 755 59", "b2b": "Cosmic Sports b2b", "regmail": "tm@cosmicsports.de"}, {"n": "Croozer", "art": "parts", "kern": false, "zusatz": false, "auslauf": false, "stat": "Kontakt aufgenommen", "sc": "blue", "kond": "", "iht": "", "zr": false, "mail": "order@croozer.com", "tel": "02233-959913", "b2b": "", "regmail": "support@croozer.com"}, {"n": "Fidlock", "art": "parts", "kern": true, "zusatz": false, "auslauf": false, "stat": "In Finalisierung", "sc": "yellow", "kond": "", "iht": "Im Onboarding", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Grofa", "art": "parts", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "Giro 19%, Lumos 14%, Park Tool 26%", "iht": "IHT aktiv", "zr": true, "mail": "order@grofa.com", "tel": "06434/2008-200", "b2b": "GROFA b2b", "regmail": "stammdaten@grofa.com"}, {"n": "Hartje", "art": "parts", "kern": false, "zusatz": true, "auslauf": false, "stat": "In Verhandlung", "sc": "yellow", "kond": "", "iht": "In Verhandlung", "zr": false, "mail": "", "tel": "", "b2b": "Hartje EOSweb", "regmail": ""}, {"n": "Livall/ CycloSport", "art": "parts", "kern": false, "zusatz": true, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "Livall 15% + 1% Delk.", "iht": "IHT aktiv", "zr": true, "mail": "bestellung@ciclosport.de", "tel": "089-895270-20", "b2b": "", "regmail": "bestellung@ciclosport.de"}, {"n": "Magura/ Bosch", "art": "parts", "kern": true, "zusatz": false, "auslauf": false, "stat": "Kontakt aufgenommen", "sc": "blue", "kond": "", "iht": "In Verhandlung", "zr": false, "mail": "", "tel": "", "b2b": "MBPS b2b", "regmail": ""}, {"n": "MCG", "art": "parts", "kern": false, "zusatz": false, "auslauf": true, "stat": "Verhandlung gescheitert", "sc": "red", "kond": "", "iht": "Abgelehnt", "zr": false, "mail": "vertrieb@merida-centurion.com", "tel": "+49 (0)7159/9459-300", "b2b": "MCG b2b", "regmail": "vertrieb@merida-centurion.com"}, {"n": "OneUp Components", "art": "parts", "kern": false, "zusatz": true, "auslauf": false, "stat": "Kontakt aufgenommen", "sc": "blue", "kond": "", "iht": "In Verhandlung", "zr": false, "mail": "", "tel": "", "b2b": "ONEup b2b", "regmail": ""}, {"n": "Ortlieb", "art": "parts", "kern": false, "zusatz": true, "auslauf": false, "stat": "Kontakt ausstehend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Paul Lange", "art": "parts", "kern": true, "zusatz": false, "auslauf": false, "stat": "In Finalisierung", "sc": "yellow", "kond": "", "iht": "Im Onboarding", "zr": false, "mail": "verkauf@paul-lange.de", "tel": "+49 (0) 711 2588 333", "b2b": "Paul Lange b2b", "regmail": "verkauf@paul-lange.de"}, {"n": "Pow Unity", "art": "parts", "kern": true, "zusatz": false, "auslauf": false, "stat": "Kontakt ausstehend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "Powunity b2b", "regmail": ""}, {"n": "RTI Sports", "art": "parts", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "Topeak, Ca Go", "iht": "IHT aktiv", "zr": true, "mail": "nouri.hamsoro@rtisports.de", "tel": "+49 (0)261 899998-220", "b2b": "RTI Sports b2b", "regmail": "nouri.hamsoro@rtisports.de"}, {"n": "SportsNut", "art": "parts", "kern": false, "zusatz": false, "auslauf": false, "stat": "Kontakt aufgenommen", "sc": "blue", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "SportsNut b2b", "regmail": ""}, {"n": "SQlab", "art": "parts", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "18% + 1% Delk. + 3% Sk.", "iht": "IHT aktiv", "zr": true, "mail": "feb@sq-lab.com", "tel": "089-6661046-0", "b2b": "SQlab b2b", "regmail": "aba@sq-lab.com"}, {"n": "Thule", "art": "parts", "kern": false, "zusatz": true, "auslauf": false, "stat": "Kontakt aufgenommen", "sc": "blue", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "", "regmail": ""}, {"n": "Tunap", "art": "parts", "kern": true, "zusatz": false, "auslauf": false, "stat": "In Finalisierung", "sc": "yellow", "kond": "Premium Partner, Marge 2,5x", "iht": "Im Onboarding", "zr": false, "mail": "Carolin.Schorsten@tunap-sports.de", "tel": "0151 15059430", "b2b": "TUNAP eShop", "regmail": "Carolin.Schorsten@tunap-sports.de"}, {"n": "Vaude", "art": "parts", "kern": false, "zusatz": true, "auslauf": false, "stat": "Kontakt ausstehend", "sc": "gray", "kond": "", "iht": "", "zr": false, "mail": "", "tel": "", "b2b": "VAUDE b2b", "regmail": ""}, {"n": "Wiener Bike Parts", "art": "parts", "kern": true, "zusatz": false, "auslauf": false, "stat": "Zentral fixiert", "sc": "green", "kond": "10% Kopf + Markenrabatte", "iht": "IHT aktiv", "zr": true, "mail": "callcenter@bike-parts.de", "tel": "09721 65 01-0", "b2b": "Accentry b2b", "regmail": "customer-data@winora-group.de"}];

// Standort demo data
var standorte={
holzkirchen:{name:'Holzkirchen',inhaber:'Dirk Kolditz',nachlassIst:9.73,db1Ist:28.6,bestand:104,bestWert:340105,verkauft:71,umsatz:274593},
berlin:{name:'Berlin Mitte',inhaber:'Max Müller',nachlassIst:6.2,db1Ist:32.1,bestand:86,bestWert:290000,verkauft:95,umsatz:410000},
hamburg:{name:'Hamburg',inhaber:'Sandra Weber',nachlassIst:8.1,db1Ist:30.5,bestand:92,bestWert:310000,verkauft:68,umsatz:295000},
muenchen:{name:'München',inhaber:'Thomas Bauer',nachlassIst:5.8,db1Ist:33.9,bestand:78,bestWert:380000,verkauft:120,umsatz:580000},
grafrath:{name:'Grafrath',inhaber:'Julian Neumann',nachlassIst:7.5,db1Ist:31.2,bestand:65,bestWert:220000,verkauft:52,umsatz:198000}
};

var strategien={
holzkirchen:{status:'veroeffentlicht',datum:'2025-08-28',nachlass25:7,nachlass26:5,db1Ziel:34,
todos:[{t:'Abstimmung mit Marketing',d:true},{t:'POS-Kampagnen',d:false},{t:'Events vor Ort',d:false},{t:'Kaltakquise Leasing',d:true},{t:'Verkäufer schulen',d:false}]},
berlin:{status:'entwurf',datum:'2025-09-10',nachlass25:5,nachlass26:4,db1Ziel:35,
todos:[{t:'Simplon Dealervertrag',d:false},{t:'Premium-Umbau',d:false}]},
hamburg:{status:'review',datum:'2025-09-01',nachlass25:6,nachlass26:5,db1Ziel:34,
todos:[{t:'Haibike Restbestand',d:true},{t:'Orbea Testflotte',d:false},{t:'Leasing vor Ort',d:false}]},
muenchen:{status:'veroeffentlicht',datum:'2025-07-15',nachlass25:5,nachlass26:4,db1Ziel:36,
todos:[{t:'R&M World Umbau',d:true},{t:'Simplon Gravel-Event',d:true},{t:'Zubehör-Bundles',d:false}]},
grafrath:{status:'veroeffentlicht',datum:'2025-08-01',nachlass25:6,nachlass26:5,db1Ziel:34,
todos:[{t:'Kalkhoff auflösen',d:true},{t:'Orbea Marketing',d:false},{t:'Leasing-Angebote',d:false}]}
};

// Parts Priorisierung Matrix (from Excel)
var partsPrio=[{n:'SQlab (Ergonomie)',t:'Ergonomie','5':5,'10':5,'15':5,'17':5,'20':5,'25':5,kap:11240},{n:'Shimano (Ersatzteile)',t:'Service','5':0,'10':1,'15':2,'17':2,'20':3,'25':3,kap:2542},{n:'Schwalbe (Mäntel)',t:'Service','5':0,'10':0.25,'15':2,'17':2,'20':3,'25':3,kap:2859},{n:'Tunap (Pflege)',t:'Service','5':0,'10':0.25,'15':0.25,'17':0.25,'20':0.25,'25':0.25,kap:1528},{n:'ABUS (Schlösser)',t:'Trend','5':0,'10':0.25,'15':0.5,'17':0.75,'20':0.75,'25':1,kap:2885},{n:'Helme',t:'Trend','5':0,'10':1,'15':2,'17':3,'20':3,'25':3,kap:3599},{n:'Topeak (Tools)',t:'Trend','5':0,'10':0,'15':0.5,'17':1,'20':1.5,'25':1.5,kap:2102},{n:'SP Connect',t:'Trend','5':0,'10':0.25,'15':0.25,'17':0.5,'20':0.5,'25':0.5,kap:1829},{n:'Elite/Fidlock',t:'Trend','5':0,'10':0.5,'15':0.5,'17':0.5,'20':0.5,'25':0.5,kap:513},{n:'Busch&Müller',t:'Zubehör','5':0,'10':0.25,'15':0.25,'17':0.25,'20':0.25,'25':0.25,kap:942},{n:'Pedale',t:'Zubehör','5':0,'10':0.25,'15':0.25,'17':0.25,'20':0.25,'25':0.25,kap:862},{n:'Ursus (Ständer)',t:'Zubehör','5':0,'10':0.25,'15':0.25,'17':0.25,'20':0.25,'25':0.25,kap:153},{n:'Vaude (Taschen)',t:'Trend','5':0,'10':0,'15':0.5,'17':0.5,'20':1,'25':1.5,kap:253},{n:'SKS/KlickFix',t:'Zubehör','5':0,'10':0.25,'15':0.25,'17':0.25,'20':0.25,'25':0.25,kap:312},{n:'Kleinteile',t:'Zubehör','5':0,'10':0.25,'15':0.25,'17':0.25,'20':0.25,'25':0.25,kap:753},{n:'by.Schulz',t:'Zubehör','5':0,'10':0.25,'15':0.25,'17':0.25,'20':0.25,'25':0.25,kap:2558},{n:'Supernova/Lupine',t:'Zubehör','5':0,'10':0,'15':0,'17':0,'20':0,'25':0.25,kap:0}];

// WBP Markenrabatte
var wbpR=[{m:'Schwalbe',k:'',r:'Key Account',d:'1%'},{m:'Continental',k:'',r:'14-18%',d:'1%'},{m:'SRAM',k:'',r:'5-10%',d:'1%'},{m:'Shimano',k:'',r:'5%',d:'1%'},{m:'DT Swiss',k:'10%',r:'3%',d:'1%'},{m:'XLC',k:'10%',r:'5%',d:'1%'},{m:'BySchulz',k:'',r:'5%',d:'1%'},{m:'KindShock',k:'',r:'8%',d:'1%'},{m:'Xpedo',k:'10%',r:'8%',d:'1%'},{m:'Basil',k:'10%',r:'5%',d:'1%'},{m:'B&M',k:'10%',r:'5%',d:'1%'},{m:'SKS',k:'10%',r:'5%',d:'1%'},{m:'KMC',k:'10%',r:'5%',d:'1%'},{m:'Cratoni',k:'10%',r:'6%',d:'1%'},{m:'Trelock',k:'10%',r:'8%',d:'1%'}];

// Sortiment Holzkirchen
var hauptmarken=[
{name:'Riese und Müller',s:'R&M',bg:'#1a1a1a',seg:'Premium · Nachorder',sp:'pg',v:27,vj:26,um:130856,ant:47.7,be:33,bw:116645,nl:5.45,vnl:6.24,bew:'Läuft gut',bc:'text-green-600',bi:'✓'},
{name:'Orbea',s:'ORB',bg:'#ea580c',seg:'Premium · Nachorder',sp:'pg',v:22,vj:13,um:83078,ant:30.3,be:28,bw:82092,nl:9.98,vnl:11.70,bew:'Rabatt zu hoch',bc:'text-yellow-600',bi:'⚠'},
{name:'Haibike (Accell)',s:'HAI',bg:'#dc2626',seg:'Preiseinstieg · Vororder',sp:'pb',v:7,vj:1,um:28528,ant:10.4,be:28,bw:100172,nl:6.72,vnl:13.77,bew:'7 verkauft, 28 Bestand!',bc:'text-red-600',bi:'⛔'}
];
var bestandsm=[
{n:'Kalkhoff',s:'KH',bg:'#2563eb',st:'Abverkauf',sp:'py',v:13,be:4,um:'26.946€',nl:'26,45%'},
{n:'Ca Go',s:'CG',bg:'#059669',st:'Abverkauf',sp:'py',v:1,be:1,um:'4.333€',nl:'20,55%'},
{n:'Velo de Ville',s:'VdV',bg:'#7c3aed',st:'Beobachtung',sp:'po',v:1,be:8,um:'952€',nl:'12%+2%Sk'},
{n:'Hase Bikes',s:'HB',bg:'#0891b2',st:'Onboarding',sp:'pb',v:0,be:2,um:'0€',nl:'—'}
];

// ==================== HQ DASHBOARD ====================
export function renderHQDash(){
var h='';
// KPI row
var totLief=allLief.length, fixiert=allLief.filter(function(l){return l.sc=='green'}).length;
var offen=allLief.filter(function(l){return l.sc=='yellow'}).length;
h+='<div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">';
h+='<div class="vc p-3.5 text-center"><p class="text-[10px] text-gray-400 uppercase">Lieferanten gesamt</p><p class="text-2xl font-bold mt-1">'+totLief+'</p></div>';
h+='<div class="vc p-3.5 text-center"><p class="text-[10px] text-gray-400 uppercase">Fixiert</p><p class="text-2xl font-bold text-green-600 mt-1">'+fixiert+'</p></div>';
h+='<div class="vc p-3.5 text-center"><p class="text-[10px] text-gray-400 uppercase">In Verhandlung</p><p class="text-2xl font-bold mt-1" style="color:#EF7D00">'+offen+'</p></div>';
h+='<div class="vc p-3.5 text-center"><p class="text-[10px] text-gray-400 uppercase">Standorte</p><p class="text-2xl font-bold mt-1">'+Object.keys(standorte).length+'</p></div>';
var kritisch=Object.values(standorte).filter(function(s){return s.nachlassIst>7}).length;
h+='<div class="vc p-3.5 text-center '+(kritisch?'border-2 border-red-200':'')+'"><p class="text-[10px] text-gray-400 uppercase">Nachlass kritisch</p><p class="text-2xl font-bold text-red-500 mt-1">'+kritisch+'</p></div>';
h+='</div>';

// Standort-Alarme
h+='<h2 class="text-sm font-bold mb-3">🚨 Standort-Alarme</h2><div class="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">';
Object.keys(standorte).forEach(function(k){
var s=standorte[k], st=strategien[k]||{};
var done=(st.todos||[]).filter(function(t){return t.d}).length, total=(st.todos||[]).length;
var pct=total?Math.round(done/total*100):0;
var nlCls=s.nachlassIst>7?'text-red-500':s.nachlassIst>5?'text-yellow-600':'text-green-600';
var dbCls=s.db1Ist<32?'text-red-500':s.db1Ist<34?'text-yellow-600':'text-green-600';
var statMap={veroeffentlicht:'pg',review:'pb',entwurf:'py'};
var statLabel={veroeffentlicht:'✅',review:'🔍',entwurf:'📝'};
h+='<div class="vc p-4"><div class="flex items-center justify-between mb-2"><h3 class="font-bold text-sm">'+s.name+'</h3><span class="pill '+(statMap[st.status]||'pgr')+'">'+(statLabel[st.status]||'—')+' '+(st.status||'—')+'</span></div>';
h+='<p class="text-[10px] text-gray-400 mb-2">'+s.inhaber+' · '+s.verkauft+' Bikes · '+s.umsatz.toLocaleString('de-DE')+'€</p>';
h+='<div class="grid grid-cols-3 gap-2 text-center text-[11px] mb-2">';
h+='<div class="p-2 rounded-lg bg-gray-50"><span class="text-gray-400 block">Nachlass</span><b class="'+nlCls+'">'+s.nachlassIst.toFixed(1).replace('.',',')+'%</b></div>';
h+='<div class="p-2 rounded-lg bg-gray-50"><span class="text-gray-400 block">DB1</span><b class="'+dbCls+'">'+s.db1Ist.toFixed(1).replace('.',',')+'%</b></div>';
h+='<div class="p-2 rounded-lg bg-gray-50"><span class="text-gray-400 block">Bestand</span><b>'+s.bestand+'</b></div>';
h+='</div>';
h+='<div class="flex items-center gap-2"><div class="prog flex-1"><div class="pf" style="width:'+pct+'%;background:var(--v)"></div></div><span class="text-[10px] font-bold" style="color:#EF7D00">'+pct+'% ToDos</span></div>';
h+='</div>';
});
h+='</div>';

// Offene Lieferanten-Verhandlungen
h+='<h2 class="text-sm font-bold mb-3">🔄 Offene Verhandlungen & Aktionen</h2><div class="vc overflow-x-auto mb-6"><table class="dt"><thead><tr><th>Lieferant</th><th>Art</th><th>Status</th><th>IHT</th><th>Aktion nötig</th></tr></thead><tbody>';
allLief.filter(function(l){return l.sc=='yellow'||l.sc=='blue'}).forEach(function(l){
var artI={bike:'🚲',parts:'🔧',dl:'🏢'};
h+='<tr><td class="font-semibold">'+l.n+'</td><td class="text-xs">'+(artI[l.art]||'')+' '+l.art+'</td>';
h+='<td><span class="pill '+(l.sc=='yellow'?'py':'pb')+'">'+l.stat+'</span></td>';
h+='<td class="text-xs">'+(l.iht||'—')+'</td>';
var aktion='Verhandlung fortführen';
if(l.stat.indexOf('Finalisierung')>=0) aktion='Vertrag abschließen';
if(l.stat.indexOf('Kontakt au')>=0) aktion='Erstkontakt herstellen';
if(l.stat.indexOf('Kontakt aufgenommen')>=0) aktion='Angebot einholen';
h+='<td><span class="text-xs font-semibold" style="color:#EF7D00">→ '+aktion+'</span></td></tr>';
});
h+='</tbody></table></div>';

// Bestands-Alarme
h+='<h2 class="text-sm font-bold mb-3">📦 Bestands-Alarme (Holzkirchen)</h2><div class="grid md:grid-cols-3 gap-3">';
hauptmarken.forEach(function(m){
if(m.be>20 && m.v<15){
    h+='<div class="vc p-4 border-l-4 border-red-400"><div class="flex items-center gap-2 mb-1"><div class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] font-bold" style="background:'+m.bg+'">'+m.s+'</div><b class="text-xs">'+m.name+'</b></div>';
    h+='<p class="text-[11px] text-red-600 font-semibold">'+m.v+' verkauft vs. '+m.be+' Bestand ('+m.bw.toLocaleString('de-DE')+'€)</p>';
    h+='<p class="text-[10px] text-gray-400">Ratio: '+(m.v/m.be).toFixed(2)+' — Aktion: Abverkauf forcieren</p></div>';
}
});
h+='</div>';
return h;
}

// ==================== HQ LIEFERANTEN ====================
var liefFilter='all', liefQ='';
export function renderHQLief(){
var h='';
h+='<div class="flex flex-col sm:flex-row gap-3 mb-4"><div class="relative flex-1 max-w-md"><svg class="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input type="text" id="lq" oninput="liefQ=this.value;reRenderEkTab()" placeholder="Suchen…" class="si" value="'+liefQ+'"></div>';
h+='<div class="flex gap-1.5 flex-wrap">';
['all','bike','parts','dl'].forEach(function(f){
var lb={all:'Alle',bike:'🚲 Bikes',parts:'🔧 Parts',dl:'🏢 DL'}[f];
h+='<button onclick="liefFilter=\''+f+'\';reRenderEkTab()" class="px-3 py-1.5 rounded-full text-xs font-semibold '+(liefFilter==f?'text-white':'bg-gray-100 text-gray-600')+'" '+(liefFilter==f?'style="background:#EF7D00"':'')+'>'+lb+'</button>';
});
h+='</div><button onclick="openLiefEditor()" class="vbtn">＋ Neuer Lieferant</button></div>';

// Legend
h+='<div class="flex flex-wrap gap-3 mb-3 text-[10px] text-gray-500">';
[{c:'bg-green-500',l:'Fixiert'},{c:'bg-yellow-500',l:'In Verhandlung'},{c:'bg-blue-500',l:'Kontakt'},{c:'bg-gray-400',l:'Ausstehend'},{c:'bg-red-500',l:'Gescheitert'}].forEach(function(s){h+='<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full '+s.c+'"></span>'+s.l+'</span>'});
h+='</div>';

h+='<div class="vc overflow-x-auto"><table class="dt"><thead><tr><th>Lieferant</th><th>Art</th><th>Kern</th><th>Status</th><th>Kalkulation</th><th>IHT</th><th>Kontakt</th><th>B2B</th><th></th></tr></thead><tbody>';
var sc={green:'bg-green-500',yellow:'bg-yellow-500',blue:'bg-blue-500',gray:'bg-gray-400',red:'bg-red-500'};
var artI={bike:'🚲',parts:'🔧',dl:'🏢'};
var q=liefQ.toLowerCase();
allLief.filter(function(l){
if(liefFilter!='all'&&l.art!=liefFilter) return false;
if(q&&l.n.toLowerCase().indexOf(q)<0) return false;
return true;
}).forEach(function(l,i){
var kernLabel=l.kern?'<span class="font-bold text-[10px]" style="color:#EF7D00">★ Kern</span>':l.zusatz?'<span class="text-[10px] text-gray-400">Zusatz</span>':l.auslauf?'<span class="text-[10px] text-red-400">⊘ Auslauf</span>':'<span class="text-[10px] text-gray-300">—</span>';
h+='<tr><td class="font-semibold">'+l.n+'</td>';
h+='<td class="text-xs">'+(artI[l.art]||'')+' '+l.art+'</td>';
h+='<td>'+kernLabel+'</td>';
h+='<td><span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full '+(sc[l.sc]||'bg-gray-300')+'"></span><span class="text-xs">'+l.stat+'</span></span></td>';
h+='<td class="text-[11px]">'+(l.kond||'<span class="text-gray-300">—</span>')+'</td>';
h+='<td class="text-xs">'+(l.iht||'<span class="text-gray-300">—</span>')+'</td>';
h+='<td class="text-[11px]">'+(l.mail?'<a href="mailto:'+l.mail+'" class="text-blue-600">'+l.mail+'</a>':'<span class="text-gray-300">—</span>')+(l.tel?'<br><span class="text-gray-400">'+l.tel+'</span>':'')+'</td>';
h+='<td>'+(l.b2b?'<span class="text-[10px] font-semibold text-blue-600">'+l.b2b+'</span>':'<span class="text-gray-300 text-xs">—</span>')+'</td>';
h+='<td><button onclick="openLiefEditor('+i+')" class="rbtn text-[10px]">✏️</button></td>';
h+='</tr>';
});
h+='</tbody></table></div>';
return h;
}

// ==================== LIEFERANT EDITOR MODAL ====================
export function openLiefEditor(idx){
var l=idx!=null?allLief[idx]:{n:'',art:'bike',kern:false,zusatz:false,auslauf:false,stat:'',sc:'gray',kond:'',iht:'',zr:false,mail:'',tel:'',b2b:'',regmail:'',hp:'',katalog:'',notizen:''};
var isNew=idx==null;
var h='<div class="modal-bg" onclick="if(event.target==this)closeModal()"><div class="modal">';
h+='<div class="flex items-center justify-between mb-4"><h2 class="font-bold text-base">'+(isNew?'Neuer Lieferant':'✏️ '+l.n+' bearbeiten')+'</h2><button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-lg">✕</button></div>';

h+='<div class="form-row"><div><label class="form-label">Name</label><input class="form-input" id="eN" value="'+l.n+'"></div><div><label class="form-label">Art</label><select class="form-input" id="eArt"><option value="bike"'+(l.art=='bike'?' selected':'')+'>🚲 Bike</option><option value="parts"'+(l.art=='parts'?' selected':'')+'>🔧 Parts</option><option value="dl"'+(l.art=='dl'?' selected':'')+'>🏢 Dienstleister</option></select></div></div>';

h+='<div class="form-row"><div><label class="form-label">Status Konditionen</label><select class="form-input" id="eStat"><option value="Zentral fixiert"'+(l.stat.indexOf('fixiert')>=0?' selected':'')+'>✅ Zentral fixiert</option><option value="In Verhandlung"'+(l.stat=='In Verhandlung'?' selected':'')+'>🔄 In Verhandlung</option><option value="In Finalisierung"'+(l.stat.indexOf('Finalisierung')>=0?' selected':'')+'>📝 In Finalisierung</option><option value="Kontakt aufgenommen"'+(l.stat=='Kontakt aufgenommen'?' selected':'')+'>📞 Kontakt aufgenommen</option><option value="Kontakt ausstehend"'+(l.stat.indexOf('ausstehend')>=0?' selected':'')+'>⏳ Kontakt ausstehend</option><option value="Volumen nicht ausreichend"'+(l.stat.indexOf('Volumen')>=0?' selected':'')+'>📉 Volumen nicht ausreichend</option><option value="Verhandlung gescheitert"'+(l.stat.indexOf('gescheitert')>=0?' selected':'')+'>❌ Gescheitert</option><option value="Ausgelaufen"'+(l.stat.indexOf('Ausgelaufen')>=0?' selected':'')+'>⊘ Ausgelaufen</option></select></div>';
h+='<div><label class="form-label">Einstufung</label><select class="form-input" id="eKern"><option value="kern"'+(l.kern?' selected':'')+'>★ Kernsortiment</option><option value="zusatz"'+(l.zusatz?' selected':'')+'>＋ Zusatz</option><option value="auslauf"'+(l.auslauf?' selected':'')+'>⊘ Auslauf</option><option value=""'+(!l.kern&&!l.zusatz&&!l.auslauf?' selected':'')+'>— Keine</option></select></div></div>';

h+='<h3 class="font-bold text-xs text-gray-500 mt-4 mb-2">💰 Kalkulation & Konditionen</h3>';
h+='<div class="form-row"><div><label class="form-label">Konditionen (Kurzform)</label><input class="form-input" id="eKond" value="'+(l.kond||'').replace(/"/g,'&quot;')+'"></div><div><label class="form-label">IHT-Status</label><select class="form-input" id="eIht"><option value="">— Nicht relevant</option><option value="IHT aktiv"'+(l.iht=='IHT aktiv'?' selected':'')+'>✅ IHT aktiv</option><option value="Im Onboarding"'+(l.iht=='Im Onboarding'?' selected':'')+'>🔄 Im Onboarding</option><option value="In Verhandlung"'+(l.iht=='In Verhandlung'?' selected':'')+'>📝 In Verhandlung</option><option value="Abgelehnt"'+(l.iht=='Abgelehnt'?' selected':'')+'>❌ Abgelehnt</option></select></div></div>';
h+='<div><label class="form-label">Konditionen Detail / Vertragsinhalte</label><textarea class="form-input" id="eKondDetail" rows="3" placeholder="z.B. 12% Händlerrabatt, 2% Skonto 16 Tage, Faktor 1,8…">'+(l.kondDetail||'')+'</textarea></div>';

h+='<h3 class="font-bold text-xs text-gray-500 mt-4 mb-2">👤 Ansprechpartner & Kontakt</h3>';
h+='<div class="form-row"><div><label class="form-label">E-Mail Innendienst</label><input class="form-input" id="eMail" value="'+(l.mail||'')+'"></div><div><label class="form-label">Telefon</label><input class="form-input" id="eTel" value="'+(l.tel||'')+'"></div></div>';
h+='<div class="form-row"><div><label class="form-label">E-Mail für Registrierung</label><input class="form-input" id="eReg" value="'+(l.regmail||'')+'"></div><div><label class="form-label">Ansprechpartner Name</label><input class="form-input" id="eAP" value="'+(l.ansprechpartner||'')+'"></div></div>';

h+='<h3 class="font-bold text-xs text-gray-500 mt-4 mb-2">🔗 Links & Ressourcen</h3>';
h+='<div class="form-row"><div><label class="form-label">B2B-Shop</label><input class="form-input" id="eB2b" value="'+(l.b2b||'')+'"></div><div><label class="form-label">Homepage</label><input class="form-input" id="eHp" value="'+(l.hp||'')+'"></div></div>';
h+='<div class="form-row"><div><label class="form-label">Katalog-Link</label><input class="form-input" id="eKat" value="'+(l.katalog||'')+'"></div><div><label class="form-label">ZR über IHT</label><select class="form-input" id="eZr"><option value="false"'+(!l.zr?' selected':'')+'>Nein</option><option value="true"'+(l.zr?' selected':'')+'>Ja</option></select></div></div>';

h+='<div><label class="form-label">Notizen</label><textarea class="form-input" id="eNot" rows="2" placeholder="Interne Notizen…">'+(l.notizen||'')+'</textarea></div>';

h+='<div class="flex gap-3 mt-5 pt-4 border-t border-gray-100"><button onclick="saveLief('+(idx!=null?idx:'null')+')" class="vbtn">💾 Speichern</button><button onclick="closeModal()" class="rbtn">Abbrechen</button></div>';
h+='</div></div>';
document.getElementById('modalWrap').innerHTML=h;
document.getElementById('modalWrap').style.display='block';
}

export function saveLief(idx){
var statToSc={'Zentral fixiert':'green','In Verhandlung':'yellow','In Finalisierung':'yellow','Kontakt aufgenommen':'blue','Kontakt ausstehend':'gray','Volumen nicht ausreichend':'gray','Verhandlung gescheitert':'red','Ausgelaufen':'red'};
var kernVal=document.getElementById('eKern').value;
var obj={
n:document.getElementById('eN').value,
art:document.getElementById('eArt').value,
kern:kernVal=='kern',zusatz:kernVal=='zusatz',auslauf:kernVal=='auslauf',
stat:document.getElementById('eStat').value,
sc:statToSc[document.getElementById('eStat').value]||'gray',
kond:document.getElementById('eKond').value,
kondDetail:document.getElementById('eKondDetail').value,
iht:document.getElementById('eIht').value,
zr:document.getElementById('eZr').value=='true',
mail:document.getElementById('eMail').value,
tel:document.getElementById('eTel').value,
regmail:document.getElementById('eReg').value,
ansprechpartner:document.getElementById('eAP').value,
b2b:document.getElementById('eB2b').value,
hp:document.getElementById('eHp').value,
katalog:document.getElementById('eKat').value,
notizen:document.getElementById('eNot').value
};
if(idx!=null) allLief[idx]=Object.assign(allLief[idx],obj);
else allLief.push(obj);
closeModal();
reRenderEkTab();
}

export function closeModal(){document.getElementById('modalWrap').style.display='none';document.getElementById('modalWrap').innerHTML='';}

// ==================== HQ STRATEGIEN ====================
export function renderHQStrat(){
var h='<div class="vc p-5 mb-5"><h2 class="font-bold text-sm mb-3">📊 Strategie-Übersicht aller Standorte</h2>';
h+='<div class="overflow-x-auto"><table class="dt"><thead><tr><th>Standort</th><th>Inhaber</th><th>Status</th><th>Ø Nachlass</th><th>DB1 Ist/Ziel</th><th>ToDo-Fortschritt</th><th>Stand</th></tr></thead><tbody>';
var stL={veroeffentlicht:{p:'pg',l:'✅ Veröff.'},review:{p:'pb',l:'🔍 Review'},entwurf:{p:'py',l:'📝 Entwurf'}};
Object.keys(standorte).forEach(function(k){
var s=standorte[k],st=strategien[k]||{};
var done=(st.todos||[]).filter(function(t){return t.d}).length,total=(st.todos||[]).length;
var pct=total?Math.round(done/total*100):0;
var sl=stL[st.status]||{p:'pgr',l:'—'};
h+='<tr><td class="font-semibold">'+s.name+'</td><td class="text-xs text-gray-500">'+s.inhaber+'</td>';
h+='<td><span class="pill '+sl.p+'">'+sl.l+'</span></td>';
h+='<td class="font-bold '+(s.nachlassIst>7?'text-red-500':s.nachlassIst>5?'text-yellow-600':'text-green-600')+'">'+s.nachlassIst.toFixed(1).replace('.',',')+'%</td>';
h+='<td class="text-xs">'+s.db1Ist.toFixed(1).replace('.',',')+'% <span class="text-gray-400">/ '+(st.db1Ziel||'—')+'%</span></td>';
h+='<td><div class="flex items-center gap-2"><div class="prog flex-1"><div class="pf" style="width:'+pct+'%;background:var(--v)"></div></div><span class="text-[10px] font-bold" style="color:#EF7D00">'+pct+'%</span></div></td>';
h+='<td class="text-xs text-gray-400">'+(st.datum||'—')+'</td></tr>';
});
h+='</tbody></table></div></div>';
return h;
}

// ==================== STANDORT: SORTIMENT ====================
export function renderStSortiment(){
var h='';
// KPIs
var s=standorte.holzkirchen;
h+='<div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">';
h+='<div class="vc p-3 text-center"><p class="text-[10px] text-gray-400 uppercase">Bike-Marken</p><p class="text-xl font-bold mt-1">4</p></div>';
h+='<div class="vc p-3 text-center"><p class="text-[10px] text-gray-400 uppercase">Verkauft</p><p class="text-xl font-bold mt-1">'+s.verkauft+'</p></div>';
h+='<div class="vc p-3 text-center"><p class="text-[10px] text-gray-400 uppercase">Umsatz netto</p><p class="text-xl font-bold mt-1">'+s.umsatz.toLocaleString('de-DE')+'€</p></div>';
h+='<div class="vc p-3 text-center"><p class="text-[10px] text-gray-400 uppercase">Ø DB1</p><p class="text-xl font-bold mt-1" style="color:#EF7D00">'+s.db1Ist+'%</p></div>';
h+='<div class="vc p-3 text-center"><p class="text-[10px] text-gray-400 uppercase">Ø Nachlass</p><p class="text-xl font-bold text-red-500 mt-1">'+s.nachlassIst+'%</p></div>';
h+='</div>';

// Hauptmarken
h+='<h2 class="text-sm font-bold mb-3">🚲 Hauptmarken</h2><div class="grid lg:grid-cols-3 gap-4 mb-6">';
hauptmarken.forEach(function(m){
var vc=m.vj>0?((m.v-m.vj)/m.vj*100).toFixed(0):'—';
h+='<div class="mc vc p-4"><div class="flex items-center gap-2.5 mb-2.5"><div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[10px]" style="background:'+m.bg+'">'+m.s+'</div><div><h3 class="font-bold text-sm">'+m.name+'</h3><span class="pill '+m.sp+'">'+m.seg+'</span></div></div>';
h+='<div class="grid grid-cols-2 gap-2 text-[10px] mb-2">';
h+='<div class="p-2 bg-blue-50 rounded-lg"><span class="text-gray-400">Verkauft</span><p class="font-bold text-sm">'+m.v+'</p><span class="text-gray-400">VJ: '+m.vj+' ('+vc+'%)</span></div>';
h+='<div class="p-2 bg-green-50 rounded-lg"><span class="text-gray-400">Umsatz</span><p class="font-bold text-sm">'+m.um.toLocaleString('de-DE')+'€</p><span class="text-gray-400">'+m.ant+'%</span></div>';
h+='<div class="p-2 '+(m.be>20&&m.v<10?'bg-red-50 border border-red-200':'bg-orange-50')+' rounded-lg"><span class="text-gray-400">Bestand</span><p class="font-bold text-sm">'+m.be+'</p><span class="text-gray-400">'+m.bw.toLocaleString('de-DE')+'€</span></div>';
h+='<div class="p-2 bg-purple-50 rounded-lg"><span class="text-gray-400">Nachlass</span><p class="font-bold text-sm '+(m.nl>7?'text-red-600':'')+'">'+m.nl.toFixed(2).replace('.',',')+'%</p></div>';
h+='</div><p class="text-[10px] '+m.bc+' font-bold">'+m.bi+' '+m.bew+'</p></div>';
});
h+='</div>';

// Bestandsmarken
h+='<h2 class="text-sm font-bold mb-3">📦 Bestandsmarken</h2><div class="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">';
bestandsm.forEach(function(m){
h+='<div class="vc p-3 opacity-80 border-l-4 border-yellow-400"><div class="flex items-center gap-2 mb-1.5"><div class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] font-bold" style="background:'+m.bg+'">'+m.s+'</div><div><b class="text-xs">'+m.n+'</b><span class="pill '+m.sp+' ml-1">'+m.st+'</span></div></div>';
h+='<div class="grid grid-cols-2 gap-1 text-[10px]"><div>Verk: <b>'+m.v+'</b></div><div>Best: <b>'+m.be+'</b></div><div>Ums: <b>'+m.um+'</b></div><div>NL: <b>'+m.nl+'</b></div></div></div>';
});
h+='</div>';

// Teilelieferanten
h+='<h2 class="text-sm font-bold mb-3">🔧 Teilelieferanten</h2><div class="vc overflow-x-auto"><table class="dt"><thead><tr><th>Lieferant</th><th>Konditionen</th><th>IHT</th><th>Kontakt</th></tr></thead><tbody>';
allLief.filter(function(l){return l.art=='parts'&&l.sc=='green'}).forEach(function(l){
h+='<tr><td class="font-semibold">'+l.n+'</td><td class="text-xs">'+l.kond+'</td><td>'+(l.zr?'<span class="pill pg">IHT ✓</span>':'<span class="pill pgr">Direkt</span>')+'</td><td class="text-xs text-gray-500">'+l.mail+'</td></tr>';
});
h+='</tbody></table></div>';
return h;
}

// ==================== STANDORT: LIEFERANTEN (READ-ONLY) ====================
export function renderStLief(){
var h='<div class="relative mb-4 max-w-md"><svg class="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input type="text" id="slq" oninput="stLiefQ=this.value;reRenderEkTab()" placeholder="Suchen…" class="si" value="'+(stLiefQ||'')+'"></div>';
h+='<div class="vc overflow-x-auto"><table class="dt"><thead><tr><th>Lieferant</th><th>Art</th><th>Kern</th><th>Status</th><th>Konditionen</th><th>IHT</th><th>Kontakt</th><th>B2B</th></tr></thead><tbody>';
var sc={green:'bg-green-500',yellow:'bg-yellow-500',blue:'bg-blue-500',gray:'bg-gray-400',red:'bg-red-500'};
var q=(stLiefQ||'').toLowerCase();
allLief.filter(function(l){return !q||l.n.toLowerCase().indexOf(q)>=0}).forEach(function(l){
h+='<tr><td class="font-semibold">'+l.n+'</td><td class="text-xs">'+(l.art=='bike'?'🚲':l.art=='parts'?'🔧':'🏢')+' '+l.art+'</td>';
h+='<td>'+(l.kern?'<span class="font-bold text-[10px]" style="color:#EF7D00">★ Kern</span>':l.zusatz?'<span class="text-[10px] text-gray-400">Zusatz</span>':'<span class="text-gray-300 text-[10px]">—</span>')+'</td>';
h+='<td><span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full '+(sc[l.sc]||'bg-gray-300')+'"></span><span class="text-xs">'+l.stat+'</span></span></td>';
h+='<td class="text-[11px]">'+(l.kond||'—')+'</td>';
h+='<td class="text-xs">'+(l.iht||'—')+'</td>';
h+='<td class="text-[11px]">'+(l.mail||'—')+'</td>';
h+='<td class="text-[10px]">'+(l.b2b?'<span class="text-blue-600 font-semibold">'+l.b2b+'</span>':'—')+'</td></tr>';
});
h+='</tbody></table></div>';
return h;
}
var stLiefQ='';

// ==================== ZENTRALREGULIERUNG ====================
export function renderZR(){
return '<div class="vc p-5 mb-5" style="border-left:4px solid #EF7D00"><h2 class="text-base font-bold mb-1">vit:bikes Streckenlieferantensystem</h2><p class="text-xs text-gray-500">Full-Service-Kooperation mit Cronbank, IHT und HIW.</p></div>'+
'<div class="grid md:grid-cols-3 gap-4 mb-5">'+
'<div class="vc p-4 text-center"><div class="text-xl mb-1">🏦</div><h3 class="font-bold text-xs">Cronbank</h3><p class="text-[10px] text-gray-500 mt-1">Finanzierung & Bankkonto. Wöchentlich: Sofort+Skonto oder Kontokorrent.</p></div>'+
'<div class="vc p-4 text-center"><div class="text-xl mb-1">📋</div><h3 class="font-bold text-xs">IHT</h3><p class="text-[10px] text-gray-500 mt-1">Zahlungsmanagement, Zahlungsabsicherung, Rechnungsarchiv MHK.net.</p></div>'+
'<div class="vc p-4 text-center"><div class="text-xl mb-1">💻</div><h3 class="font-bold text-xs">HIW</h3><p class="text-[10px] text-gray-500 mt-1">Warenwirtschaft, IC-Bestellungen, Onlineshop-Anbindung.</p></div></div>'+
'<div class="vc p-5 mb-5"><h3 class="font-bold text-xs mb-3">Ablauf</h3><div class="grid md:grid-cols-3 gap-3">'+
['1|Bestellung|Direkt beim Lieferanten','2|Rechnung → IHT|Kopie an IHT','3|Digitalisierung|MHK.net Archiv','4|Zahlung|IHT zahlt in Skontofrist','5|SEPA-Lastschrift|16+x Tage (Fr)','✓|Flexibilität|Sofort+Skonto oder schieben'].map(function(s){var p=s.split('|');return '<div class="flex gap-2"><div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style="background:#EF7D00">'+p[0]+'</div><div><p class="text-[11px] font-semibold">'+p[1]+'</p><p class="text-[10px] text-gray-400">'+p[2]+'</p></div></div>'}).join('')+
'</div></div>'+
'<div class="grid md:grid-cols-2 gap-4">'+
'<div class="vc p-4"><h3 class="font-bold text-xs text-green-700 mb-2">✓ Vorteile für Dich</h3><div class="text-[11px] text-gray-600 space-y-1"><p>▸ Höhere Konditionen → besserer DB1</p><p>▸ Zeitsparende Belegarchivierung</p><p>▸ Flexible Zahlungsziele → Liquidität</p><p>▸ IC-Austausch via HIW</p></div></div>'+
'<div class="vc p-4"><h3 class="font-bold text-xs text-blue-700 mb-2">🤝 Vorteile für Lieferanten</h3><div class="text-[11px] text-gray-600 space-y-1"><p>▸ Zahlungsgarantie durch IHT</p><p>▸ Hohes Gruppenvolumen</p><p>▸ Zentrale Ansprechpartner</p><p>▸ Premium-Ladenbau</p></div></div></div>';
}

// ==================== STANDORT: STRATEGIE ====================
export function renderStStrat(){
var s=standorte.holzkirchen, st=strategien.holzkirchen;
var done=st.todos.filter(function(t){return t.d}).length, total=st.todos.length, pct=total?Math.round(done/total*100):0;
var h='<div class="vc p-5 mb-5" style="border-left:4px solid #EF7D00"><div class="flex items-start justify-between"><div><h2 class="font-bold text-base">Einkaufsstrategie — Holzkirchen</h2><p class="text-[11px] text-gray-400">Stand '+st.datum+' · Inhaber: '+s.inhaber+'</p></div><div class="flex gap-2"><span class="pill pg">✅ Veröffentlicht</span><button class="vbtn text-[11px]">📥 PDF</button></div></div></div>';

// Progress
h+='<div class="vc p-4 mb-5 flex items-center gap-4" style="background:linear-gradient(135deg,#fff7ed,#fff)"><div class="w-14 h-14 rounded-full flex items-center justify-center font-bold text-base text-white flex-shrink-0" style="background:#EF7D00">'+pct+'%</div><div class="flex-1"><p class="text-xs font-bold">Gesamtfortschritt</p><div class="prog mt-1" style="height:9px"><div class="pf" style="width:'+pct+'%;background:var(--v)"></div></div><p class="text-[10px] text-gray-400 mt-1">'+done+' von '+total+' erledigt</p></div></div>';

// KPIs
h+='<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">';
h+='<div class="vc p-3 text-center border-2 border-red-200"><p class="text-[10px] text-gray-400 uppercase">Nachlass</p><p class="text-2xl font-bold text-red-500 mt-1">'+s.nachlassIst+'%</p><p class="text-[10px] text-gray-400">Ziel: '+st.nachlass25+'%</p></div>';
h+='<div class="vc p-3 text-center"><p class="text-[10px] text-gray-400 uppercase">DB1</p><p class="text-2xl font-bold mt-1" style="color:#EF7D00">'+s.db1Ist+'%</p><p class="text-[10px] text-gray-400">Ziel: '+st.db1Ziel+'%</p></div>';
h+='<div class="vc p-3 text-center"><p class="text-[10px] text-gray-400 uppercase">Bestand</p><p class="text-2xl font-bold mt-1">'+s.bestand+'</p></div>';
h+='<div class="vc p-3 text-center"><p class="text-[10px] text-gray-400 uppercase">Liquidität</p><p class="text-lg font-bold mt-1">🟡 Angespannt</p></div>';
h+='</div>';

// ToDos
h+='<div class="vc p-5"><h3 class="font-bold text-sm mb-3">📋 Deine ToDos</h3><div class="space-y-1">';
st.todos.forEach(function(t,i){
h+='<div class="td flex items-center gap-2.5 '+(t.d?'opacity-60':'')+'"><input type="checkbox" '+(t.d?'checked':'')+' onchange="strategien.holzkirchen.todos['+i+'].d=!strategien.holzkirchen.todos['+i+'].d;reRenderEkTab()"><span class="text-xs '+(t.d?'line-through text-gray-400':'text-gray-700')+'">'+t.t+'</span>'+(t.d?'<span class="pill pg ml-auto">✓</span>':'')+'</div>';
});
h+='</div></div>';
return h;
}

// ==================== WISSEN ====================
var wissenSec='iht';
export function renderWissen(){
var h='<div class="flex flex-wrap gap-2 mb-5">';
[{id:'iht',l:'🏦 IHT'},{id:'parts',l:'🔧 Parts'},{id:'db1',l:'📊 DB1'},{id:'kern',l:'🚲 Kernsortiment'},{id:'vo',l:'📦 Vororder'}].forEach(function(w){
h+='<div class="wn'+(wissenSec==w.id?' on':'')+'" onclick="wissenSec=\''+w.id+'\';reRenderEkTab()">'+w.l+'</div>';
});
h+='</div>';

if(wissenSec=='iht') h+=renderWIht();
if(wissenSec=='parts') h+=renderWParts();
if(wissenSec=='db1') h+=renderWDb1();
if(wissenSec=='kern') h+=renderWKern();
if(wissenSec=='vo') h+=renderWVo();
return h;
}

export function renderWIht(){return '<div class="vc p-5"><h3 class="font-bold text-sm mb-2">Wie funktioniert die IHT?</h3><p class="text-xs text-gray-500 mb-3">Zahlungsmanagement für alle registrierten Standorte. Bestellprozess wie gewohnt.</p><div class="grid md:grid-cols-2 gap-3"><div class="p-3 bg-gray-50 rounded-xl"><h4 class="font-semibold text-[11px] mb-1">Rechnungsverarbeitung</h4><p class="text-[10px] text-gray-500">IHT digitalisiert → MHK.net Archiv. Per Suche abrufbar oder an Steuerberater.</p></div><div class="p-3 bg-gray-50 rounded-xl"><h4 class="font-semibold text-[11px] mb-1">Zahlung & Flexibilität</h4><p class="text-[10px] text-gray-500">IHT zahlt in Skontofrist. Wöchentlich wählbar: Sofort+Skonto oder Kontokorrent Cronbank.</p></div></div></div>';}

export function renderWParts(){
var lfdm=17;
var h='<div class="vc p-5 mb-4"><h3 class="font-bold text-sm mb-2">Zentrale Parts-Empfehlung</h3><p class="text-xs text-gray-500 mb-3">Basierend auf laufenden Metern deiner Zubehörwände (Daten aus Excel-Matrix).</p>';
h+='<div class="p-3 rounded-xl border-2 mb-3" style="background:var(--c-orange-tint,#fff7ed);border-color:var(--v)"><label class="text-[11px] font-semibold">Laufende Meter: </label><input type="range" min="5" max="25" value="17" id="lfdmSlider" oninput="document.getElementById(\'lfdmVal\').textContent=this.value" class="mx-2"><span id="lfdmVal" class="font-bold">17</span> lfdm</div></div>';

var tc={Ergonomie:'pb',Service:'pg',Trend:'po','Zubehör':'pgr'};
h+='<div class="vc overflow-x-auto"><table class="dt"><thead><tr><th>Produktgruppe</th><th class="text-center">Typ</th><th class="text-right">lfdm</th><th class="text-right">Kapitalbedarf</th></tr></thead><tbody>';
var total=0;
partsPrio.forEach(function(p){
var l=p['17']||0;
total+=p.kap;
h+='<tr><td class="font-semibold">'+p.n+'</td><td class="text-center"><span class="pill '+(tc[p.t]||'pgr')+'">'+p.t+'</span></td><td class="text-right font-semibold">'+l+'</td><td class="text-right">'+(p.kap>0?Math.round(p.kap).toLocaleString('de-DE')+'€':'—')+'</td></tr>';
});
h+='<tr class="font-bold" style="background:var(--c-bg2)"><td>GESAMT</td><td></td><td class="text-right">17</td><td class="text-right">'+Math.round(total).toLocaleString('de-DE')+'€</td></tr>';
h+='</tbody></table></div>';

// WBP Markenrabatte
h+='<div class="vc p-5 mt-4"><h3 class="font-bold text-sm mb-2">Wiener Bike Parts — Markenrabatte</h3><div class="overflow-x-auto"><table class="dt"><thead><tr><th>Marke</th><th>Kopfrabatt</th><th>Markenrabatt</th><th>Delkredere</th><th>Skonto</th></tr></thead><tbody>';
wbpR.forEach(function(r){h+='<tr><td class="font-semibold">'+r.m+'</td><td class="text-xs">'+r.k+'</td><td class="text-xs">'+r.r+'</td><td class="text-xs">'+r.d+'</td><td class="text-xs">2%</td></tr>'});
h+='</tbody></table></div><p class="text-[10px] text-gray-400 mt-2">Lieferung ab 100€ versandkostenfrei. Alle Preise zzgl. 2% Skonto 14 Tage.</p></div>';
return h;
}

export function renderWDb1(){return '<div class="vc p-5 mb-4"><h3 class="font-bold text-sm mb-2">DB1 — Deckungsbeitrag 1</h3><p class="text-xs text-gray-500 mb-3">Der echte Ertragswert nach MwSt-Bereinigung.</p><div class="grid md:grid-cols-3 gap-3"><div class="p-3 bg-gray-50 rounded-xl"><h4 class="text-[11px] font-semibold mb-1" style="color:#EF7D00">Handelsspanne 45%</h4><p class="text-[10px] text-gray-500">3.999€ × 45% = 1.799€</p><p class="text-xs font-bold text-green-600 mt-1">DB1 = 1.161€</p></div><div class="p-3 bg-gray-50 rounded-xl"><h4 class="text-[11px] font-semibold mb-1" style="color:#EF7D00">Faktor 1,82</h4><p class="text-[10px] text-gray-500">3.999€ / 1,82 = 2.197€ HEK</p><p class="text-xs font-bold text-green-600 mt-1">DB1 = 1.163€</p></div><div class="p-3 rounded-xl text-white" style="background:#EF7D00"><h4 class="text-[11px] font-semibold mb-1">In Prozent</h4><p class="text-[10px] opacity-80">= 1.163 / 3.361</p><p class="text-lg font-bold mt-1">= 34,62%</p></div></div></div><div class="vc p-5"><h4 class="font-semibold text-xs mb-3">+3% DB1 aufs Ergebnis</h4><div class="grid md:grid-cols-2 gap-3"><div class="p-3 bg-gray-50 rounded-xl"><p class="text-xs font-semibold">Ohne</p><p class="text-base font-bold">100.000€</p></div><div class="p-3 bg-green-50 rounded-xl border border-green-200"><p class="text-xs font-semibold">Mit +3%</p><p class="text-base font-bold text-green-600">129.400€ (+29%)</p></div></div></div>';}

export function renderWKern(){return '<div class="vc p-5"><h3 class="font-bold text-sm mb-2">Kernsortiment — 4-Marken-Politik</h3><p class="text-xs text-gray-500 mb-3">Max. 4 Bike-Marken pro Standort aus dem Pool.</p><div class="overflow-x-auto"><table class="dt"><thead><tr style="background:#EF7D00"><th class="text-white"></th><th class="text-white">E-Trekking</th><th class="text-white">E-City/Urban</th><th class="text-white">E-MTB</th><th class="text-white">E-Race/Gravel</th></tr></thead><tbody><tr><td class="font-bold" style="background:var(--c-orange-tint,#fff7ed)">Premium<br><span class="text-[9px] text-gray-400">ab 6k€</span></td><td class="text-[11px]">R&M·Orbea·Simplon·Steppenwolf</td><td class="text-[11px]">R&M·Orbea·Simplon·Steppenwolf</td><td class="text-[11px]">Orbea·Simplon·Steppenwolf</td><td class="text-[11px]">Orbea·Simplon</td></tr><tr><td class="font-bold" style="background:var(--c-blue-tint,#eff6ff)">Preis<br><span class="text-[9px] text-gray-400">bis 6k€</span></td><td class="text-[11px]">VdV·Haibike·Winora·Hepha</td><td class="text-[11px]">VdV·Winora·Hepha</td><td class="text-[11px]">Haibike·Hepha</td><td class="text-[11px] text-gray-300">—</td></tr></tbody></table></div></div>';}

export function renderWVo(){return '<div class="vc p-5"><h3 class="font-bold text-sm mb-2">Vororder & Nachorder</h3><p class="text-xs text-gray-500 mb-3">Cashflow: Großteil mit Nachordermarken planen.</p><div class="grid md:grid-cols-2 gap-4"><div class="p-4 bg-red-50 rounded-xl border border-red-200"><h4 class="font-bold text-xs mb-2">Vorordermarken</h4><p class="text-[10px] text-gray-500 mb-2">Verbindlich → bessere Konditionen, hohe Kapitalbindung</p><div class="flex flex-wrap gap-1"><span class="pill pr">Haibike</span><span class="pill pr">Winora</span><span class="pill pr">Hepha</span><span class="pill pr">Steppenwolf</span></div></div><div class="p-4 bg-green-50 rounded-xl border border-green-200"><h4 class="font-bold text-xs mb-2">Nachordermarken</h4><p class="text-[10px] text-gray-500 mb-2">Konfigurierbar, weniger Kapitalbindung</p><div class="flex flex-wrap gap-1"><span class="pill pg">Orbea</span><span class="pill pg">R&amp;M</span><span class="pill pg">Simplon</span><span class="pill pg">Velo de Ville</span></div></div></div></div>';}

// === EINKAUF TAB NAVIGATION (Portal-adapted) ===

export function reRenderEkTab() {
    var activeBtn = document.querySelector('.ek-tab-btn.text-vit-orange') || document.querySelector('.hqek-tab-btn.text-vit-orange');
    if(activeBtn) {
        var tab = activeBtn.dataset.tab || activeBtn.dataset.hqek;
        if(activeBtn.classList.contains('hqek-tab-btn')) { showHqEkTab(tab); }
        else { showEinkaufTab(tab); }
    }
}

export function showEinkaufTab(tabName) {
    document.querySelectorAll('.ek-tab-content').forEach(function(t){t.style.display='none';});
    document.querySelectorAll('.ek-tab-btn').forEach(function(b){
        b.className='ek-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
    });
    var tabMap = {sortiment:'Sortiment',lieferanten:'Lieferanten',zentralreg:'Zentralreg',ekStrategie:'EkStrategie',ekWissen:'EkWissen'};
    var el = document.getElementById('ekTab' + (tabMap[tabName]||''));
    if(el) el.style.display = 'block';
    var btn = document.querySelector('.ek-tab-btn[data-tab="'+tabName+'"]');
    if(btn) btn.className='ek-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';

    // Render tab content dynamically
    if(tabName==='sortiment') { var c=document.getElementById('ekTabSortiment'); if(c) c.innerHTML='<div class="fi">'+renderStSortiment()+'</div>'; }
    if(tabName==='lieferanten') { var c=document.getElementById('ekTabLieferanten'); if(c) c.innerHTML='<div class="fi">'+renderStLief()+'</div>'; }
    if(tabName==='zentralreg') { var c=document.getElementById('ekTabZentralreg'); if(c) c.innerHTML='<div class="fi">'+renderZR()+'</div>'; }
    if(tabName==='ekStrategie') { var c=document.getElementById('ekTabEkStrategie'); if(c) c.innerHTML='<div class="fi">'+renderStStrat()+'</div>'; }
    // ekWissen handled by Wissen override
}

// === HQ EINKAUF TAB NAVIGATION ===
export function showHqEkTab(tabName) {
    document.querySelectorAll('.hqek-tab-content').forEach(function(t){t.style.display='none';});
    document.querySelectorAll('.hqek-tab-btn').forEach(function(b){
        b.className='hqek-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
    });
    var tabMap = {dash:'Dash',lief:'Lief',strat:'Strat'};
    var el = document.getElementById('hqEkTab' + (tabMap[tabName]||''));
    if(el) el.style.display = 'block';
    var btn = document.querySelector('.hqek-tab-btn[data-hqek="'+tabName+'"]');
    if(btn) btn.className='hqek-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';

    if(tabName==='dash') { var c=document.getElementById('hqEkTabDash'); if(c) c.innerHTML='<div class="fi">'+renderHQDash()+'</div>'; }
    if(tabName==='lief') { var c=document.getElementById('hqEkTabLief'); if(c) c.innerHTML='<div class="fi">'+renderHQLief()+'</div>'; }
    if(tabName==='strat') { var c=document.getElementById('hqEkTabStrat'); if(c) c.innerHTML='<div class="fi">'+renderHQStrat()+'</div>'; }
}

// Init Einkauf on first open
export function initEinkaufModule() {
    showEinkaufTab('sortiment');
}




// Strangler Fig
const _exports = {renderHQDash,renderHQLief,openLiefEditor,saveLief,closeModal,renderHQStrat,renderStSortiment,renderStLief,renderZR,renderStStrat,renderWissen,renderWIht,renderWParts,renderWDb1,renderWKern,renderWVo,reRenderEkTab,showEinkaufTab,showHqEkTab,initEinkaufModule};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
// [prod] log removed

// === Window Exports (onclick handlers) ===
window.showHqEkTab = showHqEkTab;
