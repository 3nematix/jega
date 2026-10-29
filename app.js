/* Jėga — workout routine planner. Vanilla JS SPA. Data stored on-device. */
(function () {
'use strict';

/* ------------------------------------------------------------------ data */
var EX = window.EXERCISES || [];
var POP = window.POPULAR || [];
var byId = {}, byName = {};
EX.forEach(function (e) { byId[e.id] = e; byName[e.name.toUpperCase()] = e; });

var MUSCLE = {
  chest:'Chest', upper_back:'Upper Back', lats:'Lats', lower_back:'Lower Back',
  traps:'Traps', neck:'Neck', shoulders:'Shoulders', biceps:'Biceps', triceps:'Triceps',
  forearms:'Forearms', abdominals:'Abs', quadriceps:'Quads', hamstrings:'Hamstrings',
  glutes:'Glutes', calves:'Calves', abductors:'Abductors', adductors:'Adductors',
  cardio:'Cardio', full_body:'Full Body', other:'Other'
};
var EQUIP = {
  barbell:'Barbell', dumbbell:'Dumbbell', machine:'Machine', kettlebell:'Kettlebell',
  plate:'Weight Plate', resistance_band:'Resistance Band', suspension:'Suspension',
  none:'Bodyweight', other:'Other'
};
var RESTS = [[0,'Off'],[30,'30s'],[45,'45s'],[60,'1min'],[90,'1.5min'],[120,'2min'],[150,'2.5min'],[180,'3min'],[240,'4min'],[300,'5min']];
function restLabel(s){ for(var i=0;i<RESTS.length;i++) if(RESTS[i][0]===s) return RESTS[i][1]; return s+'s'; }

/* ------------------------------------------------------------------ store */
var KEY = 'jega.db.v1';
var db = { folders: [], routines: [] };
function uid(){ return Math.random().toString(36).slice(2,9); }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(db)); localStorage.setItem('jega.updatedAt', String(Date.now())); }catch(e){} schedulePush(); }
function load(){
  try{ var raw = localStorage.getItem(KEY); if(raw){ db = JSON.parse(raw); return true; } }catch(e){}
  return false;
}
function mkEx(name, nSets, reps, rest){
  var e = byName[name.toUpperCase()]; if(!e) return null;
  var sets = []; for(var i=0;i<nSets;i++) sets.push({reps:reps||'', kg:''});
  return { exId:e.id, note:'', rest:(rest||0), sets:sets };
}
var PROGRAM_FOLDER = '5 dienų programa';
function buildProgram(){
  var fid = uid();
  function R(name, rows){
    return { id:uid(), name:name, folderId:fid, exercises: rows.map(function(a){
      var e = byName[a[0].toUpperCase()]; if(!e) return null;
      var sets=[]; for(var i=0;i<a[1];i++) sets.push({reps:a[2], kg:''});
      return { exId:e.id, note:(a[4]||''), rest:a[3], sets:sets };
    }).filter(Boolean) };
  }
  var routines = [
    R('Viršus A / Upper A (jėga)', [
      ['Bench Press (Barbell)',4,'5-8',180,''],
      ['Bent Over Row (Barbell)',4,'6-10',150,''],
      ['Overhead Press (Barbell)',3,'6-8',150,''],
      ['Pull Up',3,'6-10',120,'arba Weighted Pull Up'],
      ['Lateral Raise (Dumbbell)',3,'12-15',90,''],
      ['Triceps Rope Pushdown',3,'10-12',90,'']
    ]),
    R('Apačia A / Lower A (jėga)', [
      ['Squat (Barbell)',4,'5-8',180,''],
      ['Romanian Deadlift (Barbell)',3,'8-10',150,''],
      ['Leg Press (Machine)',3,'10-12',120,''],
      ['Lying Leg Curl (Machine)',3,'12-15',90,''],
      ['Standing Calf Raise (Machine)',3,'15-20',90,''],
      ['Cable Crunch',3,'12-15',60,'arba Hanging Leg Raise']
    ]),
    R('Viršus B / Upper B (masė)', [
      ['Incline Bench Press (Dumbbell)',4,'8-10',150,''],
      ['Lat Pulldown (Cable)',4,'10-12',120,''],
      ['Shoulder Press (Dumbbell)',3,'10-12',120,''],
      ['Dumbbell Row',3,'10-12',120,''],
      ['Face Pull',3,'15',90,''],
      ['EZ Bar Biceps Curl',3,'10-12',90,'']
    ]),
    R('Apačia B / Lower B (masė)', [
      ['Deadlift (Barbell)',3,'5',240,''],
      ['Bulgarian Split Squat (Barbell)',3,'8-10',120,'Kiekvienai kojai'],
      ['Leg Extension (Machine)',3,'12-15',90,''],
      ['Seated Leg Curl (Machine)',3,'12-15',90,''],
      ['Seated Calf Raise',3,'15-20',90,''],
      ['Plank',3,'45-60s',60,'']
    ]),
    R('5 diena: Pečiai ir rankos (lengva)', [
      ['Lateral Raise (Cable)',4,'12-15',90,''],
      ['Rear Delt Reverse Fly (Machine)',3,'12-15',90,''],
      ['Bicep Curl (Dumbbell)',3,'10-12',90,''],
      ['Triceps Extension (Dumbbell)',3,'10-12',90,''],
      ['Hammer Curl (Dumbbell)',3,'10-12',90,''],
      ['Shrug (Dumbbell)',3,'12-15',90,'']
    ])
  ];
  return { folder:{id:fid, name:PROGRAM_FOLDER, collapsed:false}, routines:routines };
}
function seed(){
  var p = buildProgram();
  db = { folders:[p.folder], routines:p.routines, history:[] };
  save();
}
function loadProgram(){
  if(db.folders.some(function(f){return f.name===PROGRAM_FOLDER;})){ toast('Program jau įkelta'); return; }
  var p = buildProgram();
  db.folders.push(p.folder);
  p.routines.forEach(function(r){ db.routines.push(r); });
  save(); reset('home'); toast('Programa įkelta');
}
if(!load()) seed();
if(!db.history) db.history = [];

/* --------------------------------------------------------- session state */
var SKEY = 'jega.session.v1';
var session = null;
try{ var sraw = localStorage.getItem(SKEY); if(sraw) session = JSON.parse(sraw); }catch(e){}
function saveSession(){ try{ session ? localStorage.setItem(SKEY, JSON.stringify(session)) : localStorage.removeItem(SKEY); }catch(e){} }
function clearSession(){ session = null; saveSession(); }
function startSession(routineId){
  var r = routineById(routineId); if(!r) return;
  session = {
    routineId: routineId, routineName: r.name, startedAt: Date.now(),
    exercises: r.exercises.map(function(x){
      return { exId:x.exId, target:(x.sets||[]).length||1, done:0, topKg:'', finished:false, rest:x.rest||0 };
    })
  };
  saveSession();
}
function bestTopKg(exId){
  var best = null;
  db.history.forEach(function(h){ (h.entries||[]).forEach(function(en){
    if(en.exId===exId && en.topKg){
      var v = parseFloat(String(en.topKg).replace(',','.'));
      if(!isNaN(v) && (best===null || v>best)) best = v;
    }
  }); });
  return best;
}
function lastDone(routineId){
  var h = db.history.filter(function(x){return x.routineId===routineId;})[0];
  return h ? h.date : null;
}
function agoLabel(ts){
  var d = Math.floor((Date.now()-ts)/86400000);
  if(d<=0) return 'today'; if(d===1) return 'yesterday'; if(d<7) return d+' days ago';
  if(d<14) return 'a week ago'; if(d<60) return Math.round(d/7)+' weeks ago';
  return Math.round(d/30)+' months ago';
}
function fmtClock(sec){
  sec = Math.max(0, Math.round(sec));
  var h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  var mm = (m<10&&h>0?'0':'')+m, ss = (s<10?'0':'')+s;
  return (h>0? h+':'+mm+':'+ss : m+':'+ss);
}

/* ------------------------------------------------------------- utilities */
var app = document.getElementById('app');
var layer = document.getElementById('layer');
var nav = [{ view:'home' }];
function top(){ return nav[nav.length-1]; }
function go(view, params){ nav.push(Object.assign({view:view}, params||{})); render(); scrollTop(); }
function back(){ if(nav.length>1){ nav.pop(); render(); } }
function reset(view, params){ nav = [Object.assign({view:view}, params||{})]; render(); scrollTop(); }
function scrollTop(){ window.scrollTo(0,0); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

function toast(msg){
  var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(function(){ t.classList.remove('show'); }, 1900);
}

/* icons */
var I = {
  back:'<path d="M15 18l-6-6 6-6"/>', more:'<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', chev:'<path d="M6 9l6 6 6-6"/>',
  folder:'<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  folderPlus:'<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M12 11v4M10 13h4"/>',
  doc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  trash:'<path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"/>',
  up:'<path d="M6 15l6-6 6 6"/>', down:'<path d="M6 9l6 6 6-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h8"/>',
  download:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', upload:'<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>', check:'<path d="M20 6L9 17l-5-5"/>',
  theme:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  dumbbell:'<path d="M6.5 6.5l11 11M4 9l-1 1 2 2M9 4l1-1 2 2M15 18l1 1 2-2M18 13l1 1 2-2"/>',
  dup:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h8"/>',
  play:'<path d="M7 5l12 7-12 7z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  hist:'<path d="M3.5 9a9 9 0 112 7.5"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/>',
  chart:'<path d="M3 20h18"/><path d="M6 20v-6M11 20V7M16 20v-9"/>',
  chevR:'<path d="M9 6l6 6-6 6"/>'
};
function svg(name, cls){ return '<svg viewBox="0 0 24 24"'+(cls?(' class="'+cls+'"'):'')+'>'+I[name]+'</svg>'; }
function bottomBar(active){
  function tab(view, icon, label){
    return '<button class="tb'+(active===view?' active':'')+'" data-act="tab" data-view="'+view+'">'+svg(icon)+'<span>'+label+'</span></button>';
  }
  return '<div class="tabbar"><div class="inner">'
    + tab('home','dumbbell','Treniruotės')
    + tab('history','chart','Istorija')
    + tab('profile','user','Profilis')
    + '</div></div>';
}

/* exercise thumb */
function thumb(e, cls){
  cls = cls || 'thumb';
  if(e && e.thumb) return '<img class="'+cls+'" loading="lazy" src="'+esc(e.thumb)+'" alt="">';
  var ini = e ? e.name.replace(/[^A-Za-z ]/g,'').split(' ').slice(0,2).map(function(w){return w[0];}).join('') : '?';
  return '<div class="'+cls+' ph">'+esc(ini)+'</div>';
}

/* ------------------------------------------------------- muscle volume */
function volume(routine){
  var v = {};
  (routine.exercises||[]).forEach(function(x){
    var e = byId[x.exId]; if(!e) return;
    var n = (x.sets||[]).length || 0; if(!n) return;
    if(e.primary){ v[e.primary] = (v[e.primary]||0) + n; }
    (e.secondary||[]).forEach(function(m){ v[m] = (v[m]||0) + n*0.5; });
  });
  return v;
}
function fmtVol(n){ return (n%1===0)? String(n) : n.toFixed(1); }

/* scheme summary for an exercise entry */
function scheme(x){
  var sets = x.sets||[]; var n = sets.length;
  if(!n) return 'No sets';
  var reps = sets[0].reps, uniform = sets.every(function(s){return s.reps===reps;});
  var base = uniform && reps ? (n+' × '+reps) : (n+(n===1?' set':' sets'));
  if(x.rest) base += ' · ' + restLabel(x.rest);
  return base;
}
function routineSub(routine){
  var names = (routine.exercises||[]).map(function(x){ var e=byId[x.exId]; return e?e.name:null; }).filter(Boolean);
  return names.length ? names.join(', ') : 'Empty routine';
}
function totalSets(routine){ return (routine.exercises||[]).reduce(function(a,x){return a+((x.sets||[]).length);},0); }
function estDuration(routine){
  var s=0;
  (routine.exercises||[]).forEach(function(x){ var n=(x.sets||[]).length; s += n*45 + n*(x.rest||0); });
  var m = Math.max(1, Math.round(s/60));
  return m+'m';
}

/* ------------------------------------------------------- body heat map */
/* stylized front/back mannequin; each muscle shape recolored by intensity */
function shapes(list){
  return list.map(function(p){
    var m = p[0]; var attrs = 'class="rg"' + (m?(' data-m="'+m+'"'):'') + ' fill="var(--mapbase)"';
    if(p[1]==='r') return '<rect '+attrs+' x="'+p[2]+'" y="'+p[3]+'" width="'+p[4]+'" height="'+p[5]+'" rx="'+(p[6]||4)+'"/>';
    return '<ellipse '+attrs+' cx="'+p[2]+'" cy="'+p[3]+'" rx="'+p[4]+'" ry="'+p[5]+'"/>';
  }).join('');
}
var FRONT = [
  /* base */
  ['','e',50,18,11,12],['','r',37,116,26,22,9],['','e',27,112,5,6],['','e',73,112,5,6],
  ['','r',38,176,10,40,5],['','r',52,176,10,40,5],['','r',37,214,12,9,3],['','r',51,214,12,9,3],
  /* muscles */
  ['neck','r',45,27,10,11,3],
  ['shoulders','e',32,44,9,8],['shoulders','e',68,44,9,8],
  ['chest','r',35,40,14,22,6],['chest','r',51,40,14,22,6],
  ['biceps','r',24,47,10,30,5],['biceps','r',66,47,10,30,5],
  ['forearms','r',22,79,10,30,5],['forearms','r',68,79,10,30,5],
  ['abdominals','r',42,62,16,52,6],
  ['adductors','r',46,140,3,34,1],['adductors','r',51,140,3,34,1],
  ['quadriceps','r',37,138,12,40,6],['quadriceps','r',51,138,12,40,6]
];
var BACK = [
  ['','e',50,18,11,12],['','e',27,112,5,6],['','e',73,112,5,6],
  ['','r',37,214,12,9,3],['','r',51,214,12,9,3],
  ['traps','r',42,30,16,20,6],
  ['shoulders','e',32,44,9,8],['shoulders','e',68,44,9,8],
  ['upper_back','r',37,48,26,16,5],
  ['triceps','r',24,47,10,30,5],['triceps','r',66,47,10,30,5],
  ['forearms','r',22,79,10,30,5],['forearms','r',68,79,10,30,5],
  ['lats','r',35,62,12,24,5],['lats','r',53,62,12,24,5],
  ['lower_back','r',42,86,16,26,5],
  ['abductors','r',33,116,5,22,2],['abductors','r',62,116,5,22,2],
  ['glutes','r',37,114,13,24,7],['glutes','r',50,114,13,24,7],
  ['hamstrings','r',37,140,12,30,5],['hamstrings','r',51,140,12,30,5],
  ['calves','r',38,172,11,42,5],['calves','r',51,172,11,42,5]
];
function bodyMap(vol){
  var max = 0; for(var k in vol) if(vol[k]>max) max=vol[k];
  var html = '<div class="bodymap">'
    + '<svg viewBox="0 0 100 230" aria-label="front">'+shapes(FRONT)+'</svg>'
    + '<svg viewBox="0 0 100 230" aria-label="back">'+shapes(BACK)+'</svg></div>';
  return { html:html, paint:function(root){
    root.querySelectorAll('.bodymap [data-m]').forEach(function(el){
      var m = el.getAttribute('data-m'); var v = vol[m]||0;
      if(v>0 && max>0){ var i = 0.3 + 0.7*(v/max); el.setAttribute('fill','var(--accent)'); el.style.opacity = i.toFixed(2); }
      else { el.setAttribute('fill','var(--mapbase)'); el.style.opacity = 1; }
    });
  }};
}

/* ------------------------------------------------------------- top bar */
function topbar(opts){
  // opts: {title, sub, back, action:{label,act}, icon:{name,act}, menu:true}
  var h = '<div class="topbar">';
  if(opts.back) h += '<button class="iconbtn" data-act="back">'+svg('back')+'</button>';
  h += '<h1'+(opts.sub?' class="sub"':'')+'>'+esc(opts.title)+'</h1>';
  if(opts.icon) h += '<button class="iconbtn" data-act="'+opts.icon.act+'">'+svg(opts.icon.name)+'</button>';
  if(opts.menu) h += '<button class="iconbtn" data-act="menu">'+svg('more')+'</button>';
  if(opts.action) h += '<button class="tb-action" data-act="'+opts.action.act+'">'+esc(opts.action.label)+'</button>';
  if(opts.link) h += '<button class="tb-link" data-act="'+opts.link.act+'">'+esc(opts.link.label)+'</button>';
  h += '</div>';
  return h;
}

/* ------------------------------------------------------------- VIEWS */
var elapsedTimer = null;
function render(){
  if(elapsedTimer){ clearInterval(elapsedTimer); elapsedTimer = null; }
  // Login gate: when cloud is configured, the app requires sign-in.
  if(CLOUD_ON && !cloudUser){
    if(restEl && restEl.classList.contains('show')) hideRest();
    return authReady ? renderAuth() : renderAuthLoading();
  }
  var t = top();
  if(t.view!=='session' && restEl && restEl.classList.contains('show')) hideRest();
  if(t.view==='home') return renderHome();
  if(t.view==='routine') return renderRoutine(t.id);
  if(t.view==='editor') return renderEditor(t.id);
  if(t.view==='library') return renderLibrary();
  if(t.view==='exercise') return renderExercise(t.exId);
  if(t.view==='session') return renderSession();
  if(t.view==='history') return renderHistory();
  if(t.view==='profile') return renderProfile();
  renderHome();
}

/* -- Home -- */
function renderHome(){
  var h = topbar({ title:'Treniruotės', icon:{name:'theme',act:'theme'}, menu:true });
  h += '<div class="screen tabbed">';
  h += '<button class="newrt" data-act="newRoutine"><span class="nr-ic">'+svg('plus')+'</span>Nauja treniruotė</button>';
  // resume active workout
  if(session){
    var done = session.exercises.filter(function(e){return e.finished;}).length;
    h += '<button class="resume-banner" data-act="resume" data-id="'+session.routineId+'">'
      + '<span class="rb-ic">'+svg('play')+'</span>'
      + '<span class="rb-b"><span class="rb-t">Workout in progress</span>'
      + '<span class="rb-s">'+esc(session.routineName)+' · '+done+'/'+session.exercises.length+' done</span></span>'
      + '<span class="rb-go">Resume</span></button>';
  }
  // folders
  db.folders.forEach(function(f){
    var rs = db.routines.filter(function(r){return r.folderId===f.id;});
    h += '<div class="folder'+(f.collapsed?' collapsed':'')+'" data-act="toggleFolder" data-id="'+f.id+'">'
      + svg('chev','chev')
      + '<span class="ftitle">'+esc(f.name)+'</span><span class="count">'+rs.length+'</span>'
      + '<button class="iconbtn" data-act="folderMenu" data-id="'+f.id+'" data-stop="1">'+svg('more')+'</button></div>';
    if(!f.collapsed){
      if(!rs.length) h += '<div class="empty" style="padding:14px">No routines in here yet.</div>';
      rs.forEach(function(r){ h += routineCard(r); });
    }
  });
  // ungrouped
  var un = db.routines.filter(function(r){return !r.folderId || !db.folders.some(function(f){return f.id===r.folderId;});});
  h += '<div class="folder" style="cursor:default"><span class="ftitle">My Routines</span><span class="count">'+un.length+'</span></div>';
  if(!un.length && !db.routines.length){
    h += '<div class="empty">'+svg('doc')+'<div>No routines yet.<br>Tap “New Routine” to start.</div></div>';
  } else if(!un.length){
    h += '<div class="empty" style="padding:14px">Nothing here. Create a routine below.</div>';
  }
  un.forEach(function(r){ h += routineCard(r); });
  h += '</div>';
  h += bottomBar('home');
  app.innerHTML = h;
}
function routineCard(r){
  var has = r.exercises && r.exercises.length;
  var startBtn = has
    ? '<button class="rc2-start" data-act="start" data-id="'+r.id+'">'+svg('play')+'Pradėti</button>'
    : '<button class="rc2-start edit" data-act="edit" data-id="'+r.id+'">'+svg('edit')+'Redaguoti</button>';
  return '<div class="rcard2">'
    + '<div class="rc2-head">'
    + '<button class="rc2-title" data-act="openRoutine" data-id="'+r.id+'">'+esc(r.name)+'</button>'
    + '<span class="rc2-more iconbtn" data-act="routineMenu" data-id="'+r.id+'" data-stop="1">'+svg('more')+'</span>'
    + '</div>'
    + '<button class="rc2-sub" data-act="openRoutine" data-id="'+r.id+'">'+esc(routineSub(r))+'</button>'
    + startBtn
    + '</div>';
}

/* -- Routine view -- */
function routineById(id){ return db.routines.filter(function(r){return r.id===id;})[0]; }
function renderRoutine(id){
  var r = routineById(id); if(!r) return reset('home');
  var h = topbar({ title:r.name, sub:true, back:true, menu:true });
  h += '<div class="screen">';
  var ld = lastDone(r.id);
  if(ld) h += '<div class="elapsed" style="margin:6px 2px 0">'+svg('hist')+'Last done '+esc(agoLabel(ld))+'</div>';
  // exercise list
  h += '<div class="card" style="padding:4px 14px;margin-top:10px">';
  if(!r.exercises.length) h += '<div class="empty" style="padding:26px">No exercises yet.<br>Tap Edit to add some.</div>';
  r.exercises.forEach(function(x){
    var e = byId[x.exId];
    h += '<div class="exrow" data-act="openEx" data-ex="'+x.exId+'">'+thumb(e)
      + '<div class="ex-body"><div class="ex-name">'+esc(e?e.name:'Unknown')+'</div>'
      + '<div class="ex-sub">'+esc(e?(MUSCLE[e.primary]||e.primary):'')+'</div>'
      + '<div class="ex-scheme">'+esc(scheme(x))+'</div></div></div>';
  });
  h += '</div>';
  // summary
  var vol = volume(r); var bm = bodyMap(vol);
  var muscles = Object.keys(vol).sort(function(a,b){return vol[b]-vol[a];});
  var maxv = muscles.length? vol[muscles[0]] : 1;
  h += '<div class="eyebrow">Routine Summary</div>';
  h += '<div class="card sumwrap"><div class="stats">'
    + '<div class="stat"><div class="n tnum">'+r.exercises.length+'</div><div class="l">Exercises</div></div>'
    + '<div class="stat"><div class="n tnum">'+totalSets(r)+'</div><div class="l">Sets</div></div>'
    + '<div class="stat"><div class="n tnum">'+estDuration(r)+'</div><div class="l">Est. Time</div></div></div>';
  h += bm.html;
  if(muscles.length){
    h += '<div class="mbars">';
    muscles.forEach(function(m){
      var pct = Math.round((vol[m]/maxv)*100);
      h += '<div class="mbar"><div class="ml">'+esc(MUSCLE[m]||m)+'</div>'
        + '<div class="mt"><span style="width:'+pct+'%"></span></div>'
        + '<div class="mv tnum">'+fmtVol(vol[m])+'</div></div>';
    });
    h += '</div>';
  } else {
    h += '<div class="empty" style="padding:10px 0 2px">Add exercises to see muscle volume.</div>';
  }
  h += '</div></div>';
  // foot
  var active = session && session.routineId===r.id;
  var canStart = r.exercises.length>0;
  h += '<div class="sticky-foot"><div class="inner"><div class="foot2">';
  if(canStart){
    h += '<button class="btn primary" data-act="'+(active?'resume':'start')+'" data-id="'+r.id+'">'
      + svg('play')+(active?'Resume Workout':'Start Workout')+'</button>'
      + '<button class="btn sq" data-act="edit" data-id="'+r.id+'" aria-label="Edit">'+svg('edit')+'</button>';
  } else {
    h += '<button class="btn primary" data-act="edit" data-id="'+r.id+'">'+svg('edit')+'Edit Routine</button>';
  }
  h += '</div></div></div>';
  app.innerHTML = h;
  bm.paint(app);
}

/* -- Editor -- */
var draft = null; // working copy while editing
function renderEditor(id){
  var r = routineById(id); if(!r) return reset('home');
  if(!draft || draft.id!==id) draft = JSON.parse(JSON.stringify(r));
  var h = topbar({ title:'Edit Routine', sub:true, back:true, action:{label:'Save',act:'saveRoutine'} });
  h += '<div class="screen">';
  h += '<div class="field"><label>Routine title</label>'
    + '<input class="input" id="rname" value="'+esc(draft.name)+'" placeholder="Routine name"></div>';
  draft.exercises.forEach(function(x, i){
    var e = byId[x.exId];
    h += '<div class="card excard" data-i="'+i+'">'
      + '<div class="eh">'+thumb(e,'thumb sm')
      + '<div class="ex-name">'+esc(e?e.name:'Unknown')+'</div>'
      + '<div class="ord"><button data-act="moveUp" data-i="'+i+'"'+(i===0?' disabled':'')+'>'+svg('up')+'</button>'
      + '<button data-act="moveDown" data-i="'+i+'"'+(i===draft.exercises.length-1?' disabled':'')+'>'+svg('down')+'</button></div>'
      + '<button class="iconbtn" data-act="removeEx" data-i="'+i+'">'+svg('trash')+'</button></div>';
    h += '<div class="field" style="margin:12px 0 10px"><label>Note</label>'
      + '<textarea class="input" data-field="note" data-i="'+i+'" placeholder="e.g. last set to failure">'+esc(x.note)+'</textarea></div>';
    h += '<div class="field" style="margin:0 0 6px"><label>Rest timer</label><select class="input" data-field="rest" data-i="'+i+'">'
      + RESTS.map(function(rr){return '<option value="'+rr[0]+'"'+(x.rest===rr[0]?' selected':'')+'>'+rr[1]+'</option>';}).join('')
      + '</select></div>';
    h += '<div class="sets"><div class="sh"><div>Set</div><div>Kg</div><div>Reps</div><div></div></div>';
    x.sets.forEach(function(s, si){
      h += '<div class="sr"><div class="sn tnum">'+(si+1)+'</div>'
        + '<input inputmode="decimal" data-field="kg" data-i="'+i+'" data-si="'+si+'" value="'+esc(s.kg)+'" placeholder="–">'
        + '<input data-field="reps" data-i="'+i+'" data-si="'+si+'" value="'+esc(s.reps)+'" placeholder="8-12">'
        + '<button class="del" data-act="removeSet" data-i="'+i+'" data-si="'+si+'">'+svg('close')+'</button></div>';
    });
    h += '<button class="addset" data-act="addSet" data-i="'+i+'">'+svg('plus')+'Add Set</button></div>';
    h += '</div>';
  });
  h += '<button class="btn" data-act="addExercise" style="margin-top:4px">'+svg('plus')+'Add Exercise</button>';
  h += '</div>';
  h += '<div class="sticky-foot"><div class="inner">'
    + '<button class="btn primary" data-act="saveRoutine">'+svg('check')+'Save Routine</button></div></div>';
  app.innerHTML = h;
}
function commitName(){ var el = document.getElementById('rname'); if(el && draft) draft.name = el.value; }

/* -- Library (browse or picker) -- */
var lib = { q:'', equip:'', muscle:'' };
function renderLibrary(){
  var picker = !!top().picker;
  var h = topbar({ title: picker?'Add Exercise':'Exercises', back:true, link: picker?{label:'Done',act:'back'}:null });
  h += '<div class="screen">';
  h += '<div class="search">'+svg('search')+'<input id="libq" placeholder="Search exercises" value="'+esc(lib.q)+'"></div>';
  h += '<div class="filters">'
    + '<select class="input" id="libequip"><option value="">All Equipment</option>'
    + Object.keys(EQUIP).map(function(k){return '<option value="'+k+'"'+(lib.equip===k?' selected':'')+'>'+EQUIP[k]+'</option>';}).join('')+'</select>'
    + '<select class="input" id="libmuscle"><option value="">All Muscles</option>'
    + Object.keys(MUSCLE).map(function(k){return '<option value="'+k+'"'+(lib.muscle===k?' selected':'')+'>'+MUSCLE[k]+'</option>';}).join('')+'</select></div>';
  h += '<div id="libList"></div></div>';
  if(picker){
    h += '<div class="sticky-foot"><div class="inner"><button class="btn primary" data-act="back">'+svg('check')+'Done</button></div></div>';
  }
  app.innerHTML = h;
  renderLibListReal();
}
function filteredExercises(){
  var q = lib.q.trim().toUpperCase();
  return EX.filter(function(e){
    if(lib.equip && e.equipment!==lib.equip) return false;
    if(lib.muscle && e.primary!==lib.muscle && (e.secondary||[]).indexOf(lib.muscle)<0) return false;
    if(q && e.name.toUpperCase().indexOf(q)<0) return false;
    return true;
  });
}
function renderLibListReal(){
  var el = document.getElementById('libList');
  if(!el) return;
  var picker = !!top().picker;
  var items = filteredExercises();
  var h = '';
  var showPopular = !lib.q && !lib.equip && !lib.muscle;
  if(showPopular){
    var popEx = POP.map(function(id){return byId[id];}).filter(Boolean);
    h += '<div class="eyebrow" style="margin-top:8px">Popular</div>';
    popEx.forEach(function(e){ h += libRow(e, picker); });
    h += '<div class="eyebrow">All Exercises</div>';
  } else {
    h += '<div class="eyebrow" style="margin-top:8px">'+items.length+' result'+(items.length===1?'':'s')+'</div>';
  }
  if(!items.length) h += '<div class="empty">No exercises match.</div>';
  items.forEach(function(e){ h += libRow(e, picker); });
  el.innerHTML = h;
}
function libRow(e, picker){
  var added = picker && draft && draft.exercises.some(function(x){return x.exId===e.id;});
  var right = picker
    ? '<button class="addbtn'+(added?' added':'')+'" data-act="pick" data-ex="'+e.id+'">'+svg(added?'check':'plus')+'</button>'
    : '';
  var tap = picker ? '' : ' data-act="openEx" data-ex="'+e.id+'"';
  return '<'+(picker?'div':'button')+' class="libr"'+tap+'>'+thumb(e,'thumb sm')
    + '<div class="lb"><div class="ln">'+esc(e.name)+'</div>'
    + '<div class="ls">'+esc(MUSCLE[e.primary]||e.primary)+' · '+esc(EQUIP[e.equipment]||e.equipment)+'</div></div>'
    + right + '</'+(picker?'div':'button')+'>';
}

/* -- Exercise detail -- */
/* ---- per-exercise progress ---- */
function exerciseProgress(exId){
  var out = [];
  db.history.forEach(function(hh){
    (hh.entries||[]).forEach(function(en){
      if(en.exId===exId && en.topKg){
        var v = parseFloat(String(en.topKg).replace(',','.'));
        if(!isNaN(v)) out.push({ date:hh.date, topKg:v });
      }
    });
  });
  out.sort(function(a,b){ return a.date-b.date; });
  return out;
}
function weightChart(data){
  var W=320, H=160, padL=30, padB=24, padT=12, padR=10;
  var vals = data.map(function(d){return d.topKg;});
  var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  if(min===max){ min = Math.max(0, min-5); max = max+5; }
  var n = data.length;
  var X=function(i){ return n===1 ? (W/2) : padL + (i/(n-1))*(W-padL-padR); };
  var Y=function(v){ return H-padB - ((v-min)/(max-min))*(H-padB-padT); };
  var pts = data.map(function(d,i){ return [X(i), Y(d.topKg)]; });
  var line = pts.map(function(p,i){ return (i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1); }).join(' ');
  var area = 'M'+pts[0][0].toFixed(1)+' '+(H-padB)+' '+pts.map(function(p){return 'L'+p[0].toFixed(1)+' '+p[1].toFixed(1);}).join(' ')+' L'+pts[n-1][0].toFixed(1)+' '+(H-padB)+' Z';
  var dots = pts.map(function(p,i){ var last=i===n-1; return '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+(last?4:2.6)+'" fill="var(--accent)"/>'; }).join('');
  var labels = '<text x="2" y="'+(Y(max)+3.5)+'" fill="var(--muted)" font-size="10">'+fmtVol(max)+'</text>'
             + '<text x="2" y="'+(Y(min)+3.5)+'" fill="var(--muted)" font-size="10">'+fmtVol(min)+'</text>';
  return '<div class="chartbox"><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block">'
    + '<line x1="'+padL+'" y1="'+(H-padB)+'" x2="'+(W-padR)+'" y2="'+(H-padB)+'" stroke="var(--line)" stroke-width="1"/>'
    + (n>1?'<path d="'+area+'" fill="var(--accent)" opacity="0.1"/>':'')
    + (n>1?'<path d="'+line+'" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>':'')
    + dots + labels + '</svg></div>';
}
function progressTab(exId){
  var data = exerciseProgress(exId);
  if(!data.length){
    return '<div class="empty" style="padding:30px 18px">'+svg('hist')+'<div>Dar nėra duomenų.<br>Treniruotės metu įvesk „Top weight", ir čia matysi svorio augimą.</div></div>';
  }
  var best = Math.max.apply(null, data.map(function(d){return d.topKg;}));
  var h = '<div class="stats" style="margin-top:14px">'
    + '<div class="stat"><div class="n tnum">'+fmtVol(best)+'</div><div class="l">Geriausias kg</div></div>'
    + '<div class="stat"><div class="n tnum">'+fmtVol(data[data.length-1].topKg)+'</div><div class="l">Paskutinis kg</div></div>'
    + '<div class="stat"><div class="n tnum">'+data.length+'</div><div class="l">Kartų</div></div></div>';
  h += '<div class="dlabel" style="margin:16px 0 8px">Svoris laike</div>' + weightChart(data);
  h += '<div class="dlabel" style="margin:18px 0 8px">Paskutinės treniruotės</div><div class="card" style="padding:2px 14px">';
  data.slice().reverse().slice(0,10).forEach(function(d){
    var ds = new Date(d.date).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
    h += '<div class="prow"><span class="pd">'+esc(ds)+'</span><span class="pv tnum">'+fmtVol(d.topKg)+' kg</span></div>';
  });
  h += '</div>';
  return h;
}

var exTab = 'howto';
function renderExercise(exId){
  var e = byId[exId]; if(!e) return back();
  var h = topbar({ title:e.name, sub:true, back:true });
  h += '<div class="screen flush">';
  var media, heroCls='hero';
  if(e.video){
    heroCls = 'hero hasvid';
    media = '<video src="'+esc(e.video)+'" autoplay loop muted playsinline preload="auto"></video>';
  } else {
    media = e.thumb? '<img src="'+esc(e.thumb)+'" alt="">' : '<div style="color:var(--muted)">No image</div>';
  }
  h += '<div class="'+heroCls+'">'+media+'</div>';
  h += '<div class="meta">'
    + '<div class="row"><span class="k">Equipment</span><span class="v">'+esc(EQUIP[e.equipment]||e.equipment)+'</span></div>'
    + '<div class="row"><span class="k">Primary Muscle</span><span class="v">'+esc(MUSCLE[e.primary]||e.primary)+'</span></div>'
    + '<div class="row"><span class="k">Secondary</span><span class="v">'+ ((e.secondary&&e.secondary.length)? e.secondary.map(function(m){return esc(MUSCLE[m]||m);}).join(', ') : '—') +'</span></div>'
    + '<div class="row"><span class="k">Type</span><span class="v">'+esc((e.type||'').replace(/_/g,' '))+'</span></div>'
    + '</div>';
  var tab = (exTab==='progress') ? 'progress' : 'howto';
  h += '<div class="tabs">'
    + '<button class="tab'+(tab==='howto'?' active':'')+'" data-act="exTab" data-tab="howto">Kaip atlikti</button>'
    + '<button class="tab'+(tab==='progress'?' active':'')+'" data-act="exTab" data-tab="progress">Progresas</button>'
    + '</div>';
  if(tab==='progress'){
    h += progressTab(exId);
  } else if(e.howto && e.howto.length){
    h += '<div class="steps">';
    e.howto.forEach(function(s){ h += '<div class="step"><div class="num"></div><p>'+esc(s)+'</p></div>'; });
    h += '</div>';
  } else {
    h += '<div class="empty" style="padding:22px">Nėra instrukcijų šiam pratimui.</div>';
  }
  h += '</div>';
  app.innerHTML = h;
}

/* --------------------------------------------------------- SESSION view */
var sessOpen = null; // index of expanded card
function renderSession(){
  if(!session) return reset('home');
  var h = topbar({ title:session.routineName, sub:true, back:true, action:{label:'Finish',act:'finishSession'} });
  h += '<div class="screen">';
  var doneCount = session.exercises.filter(function(e){return e.finished;}).length;
  var total = session.exercises.length;
  var pct = total? Math.round(doneCount/total*100) : 0;
  h += '<div class="progwrap"><div class="progbar"><span style="width:'+pct+'%"></span></div>'
     + '<div class="progmeta tnum">'+doneCount+'/'+total+'</div></div>';
  h += '<div class="elapsed">'+svg('clock')+'<span id="elapsed">'+fmtClock((Date.now()-session.startedAt)/1000)+'</span> elapsed</div>';
  session.exercises.forEach(function(x,i){
    var e = byId[x.exId]; var open = sessOpen===i; var last = bestTopKg(x.exId);
    h += '<div class="card scard'+(x.finished?' done':'')+'">';
    h += '<div class="sc-head">'+thumb(e,'thumb sm')
      + '<div class="sc-body" data-act="toggleOpen" data-i="'+i+'">'
      + '<div class="sc-name">'+esc(e?e.name:'Unknown')+'</div>'
      + '<div class="sc-sub tnum">'+x.done+'/'+x.target+' sets'+(x.topKg?(' · '+esc(x.topKg)+' kg'):'')+'</div>'
      + ((last!=null && !x.topKg)?('<div class="sc-last">Best: '+esc(last)+' kg</div>'):'')
      + '</div>'
      + '<button class="donebtn'+(x.finished?' on':'')+'" data-act="toggleDone" data-i="'+i+'" aria-label="Done">'+svg('check')+'</button></div>';
    if(open){
      h += '<div class="sc-detail"><div class="dlabel">Sets done</div><div class="pips">';
      for(var k=0;k<x.target;k++) h += '<button class="pip'+(k<x.done?' on':'')+'" data-act="pip" data-i="'+i+'" data-k="'+k+'">'+(k+1)+'</button>';
      h += '</div><div class="dlabel">Top weight · optional</div><div class="kgrow">'
        + '<input inputmode="decimal" data-field="topkg" data-i="'+i+'" value="'+esc(x.topKg)+'" placeholder="'+(last?('beat '+esc(last)):'e.g. 60')+'"><span class="unit">kg</span></div></div>';
    }
    h += '</div>';
  });
  h += '</div>';
  h += '<div class="sticky-foot"><div class="inner"><button class="btn primary" data-act="finishSession">'+svg('flag')+'Finish Workout</button></div></div>';
  app.innerHTML = h;
  elapsedTimer = setInterval(function(){
    var el = document.getElementById('elapsed');
    if(!el || !session){ clearInterval(elapsedTimer); elapsedTimer=null; return; }
    el.textContent = fmtClock((Date.now()-session.startedAt)/1000);
  }, 1000);
}
function toggleDone(i){
  var x = session.exercises[i]; if(!x) return;
  if(x.finished){ x.finished=false; x.done=0; }
  else { x.finished=true; x.done=x.target; startRest(x.rest); }
  saveSession(); render();
}
function pip(i,k){
  var x = session.exercises[i]; if(!x) return;
  var old = x.done;
  x.done = (k+1===x.done) ? k : (k+1);
  x.finished = x.done>=x.target;
  if(x.done>old) startRest(x.rest);
  saveSession(); render();
}
function finishSession(){
  if(!session) return reset('home');
  openSheet('Baigti treniruotę?', [
    { label:'Baigti ir išsaugoti', icon:'check', onClick:doFinishSave },
    { label:'Atmesti (nesaugoti)', icon:'trash', danger:true, onClick:doDiscardSession },
    { label:'Atšaukti', icon:'close', onClick:function(){} }
  ]);
}
function doFinishSave(){
  if(!session) return reset('home');
  var doneCount = session.exercises.filter(function(e){return e.finished;}).length;
  db.history.unshift({
    id:uid(), routineId:session.routineId, routineName:session.routineName,
    date:Date.now(), durationSec:Math.round((Date.now()-session.startedAt)/1000),
    exercisesDone:doneCount, exercisesTotal:session.exercises.length,
    entries: session.exercises.map(function(x){ var e=byId[x.exId]; return { exId:x.exId, name:e?e.name:'', setsDone:x.done, target:x.target, topKg:x.topKg, finished:x.finished }; })
  });
  save(); clearSession(); hideRest(); sessOpen=null;
  reset('history'); toast('Treniruotė išsaugota 💪');
}
function doDiscardSession(){
  openDialog({ title:'Atmesti treniruotę?', desc:'Šios treniruotės duomenys nebus išsaugoti.', input:false, okLabel:'Atmesti', danger:true, onOk:function(){
    clearSession(); hideRest(); sessOpen=null; reset('home'); toast('Treniruotė atmesta');
  }});
}

/* rest timer */
var restEnd=0, restTimer=null, restEl=null, actx=null;
function ensureRestEl(){ if(!restEl){ restEl=document.createElement('div'); restEl.className='restchip'; document.body.appendChild(restEl);} return restEl; }
function renderRest(){ var el=ensureRestEl(); var rem=Math.max(0,(restEnd-Date.now())/1000);
  el.innerHTML='<div><div class="rl">Rest</div><div class="rt tnum">'+fmtClock(rem)+'</div></div><button data-act="restMinus">−15</button><button data-act="skipRest">Skip</button>'; }
function startRest(sec){
  if(!sec){ return; }
  try{ actx = actx || new (window.AudioContext||window.webkitAudioContext)(); if(actx.state==='suspended') actx.resume(); }catch(e){}
  restEnd = Date.now()+sec*1000;
  ensureRestEl().classList.add('show'); renderRest();
  if(restTimer) clearInterval(restTimer);
  restTimer = setInterval(function(){
    if((restEnd-Date.now())/1000 <= 0){ clearInterval(restTimer); restTimer=null; beep(); try{ navigator.vibrate && navigator.vibrate([120,60,120]); }catch(e){} hideRest(); return; }
    renderRest();
  }, 250);
}
function hideRest(){ if(restTimer){ clearInterval(restTimer); restTimer=null; } if(restEl) restEl.classList.remove('show'); }
function beep(){
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended') actx.resume();
    [0,0.18].forEach(function(dt){
      var o=actx.createOscillator(), g=actx.createGain();
      o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(actx.destination);
      var t=actx.currentTime+dt;
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.35,t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,t+0.14); o.start(t); o.stop(t+0.15);
    });
  }catch(e){}
}

/* --------------------------------------------------------- HISTORY view */
function renderHistory(){
  var h = topbar({ title:'Istorija' });
  h += '<div class="screen tabbed">';
  if(!db.history.length){
    h += '<div class="empty" style="padding-top:60px">'+svg('hist')+'<div>Dar nėra treniruočių.<br>Atidaryk treniruotę ir paspausk Pradėti.</div></div>';
  } else {
    var now=Date.now(), wk=now-7*864e5, mo=now-30*864e5;
    var wkN=db.history.filter(function(x){return x.date>=wk;}).length;
    var moN=db.history.filter(function(x){return x.date>=mo;}).length;
    h += '<div class="stats" style="margin:6px 0 16px">'
      + '<div class="stat"><div class="n tnum">'+db.history.length+'</div><div class="l">Iš viso</div></div>'
      + '<div class="stat"><div class="n tnum">'+wkN+'</div><div class="l">Ši savaitė</div></div>'
      + '<div class="stat"><div class="n tnum">'+moN+'</div><div class="l">Šis mėnuo</div></div></div>';
  }
  db.history.forEach(function(e){
    var maxes = (e.entries||[]).filter(function(x){return x.topKg;}).length;
    h += '<button class="hcard" data-act="histOpen" data-id="'+e.id+'">'
      + '<div class="hh"><div class="ht">'+esc(e.routineName)+'</div><div class="hd">'+esc(agoLabel(e.date))+'</div></div>'
      + '<div class="hmeta"><span><b class="tnum">'+e.exercisesDone+'/'+e.exercisesTotal+'</b> exercises</span>'
      + '<span><b class="tnum">'+fmtClock(e.durationSec)+'</b> time</span>'
      + (maxes?('<span><b class="tnum">'+maxes+'</b> weights</span>'):'')
      + '</div></button>';
  });
  h += '</div>';
  h += bottomBar('history');
  app.innerHTML = h;
}
/* --------------------------------------------------------- PROFILE view */
function renderProfile(){
  var email = (cloudUser && cloudUser.email) || '—';
  var initial = (email.charAt(0)||'?').toUpperCase();
  var created = (cloudUser && cloudUser.created_at) ? new Date(cloudUser.created_at) : null;
  var since = (created && !isNaN(created)) ? created.toLocaleDateString(undefined,{month:'long',year:'numeric'}) : null;
  var now=Date.now(), wk=now-7*864e5;
  var workouts = db.history.length, routines = db.routines.length;
  var thisWeek = db.history.filter(function(x){return x.date>=wk;}).length;
  var h = topbar({ title:'Profilis', icon:{name:'theme',act:'theme'} });
  h += '<div class="screen tabbed">';
  h += '<div class="profhead"><div class="avatar">'+esc(initial)+'</div>'
    + '<div class="prof-id"><div class="prof-name">'+esc(email)+'</div>'
    + (since?('<div class="prof-since">Narys nuo '+esc(since)+'</div>'):'')+'</div></div>';
  h += '<div class="stats" style="margin:18px 0 22px">'
    + '<div class="stat"><div class="n tnum">'+workouts+'</div><div class="l">Treniruotės</div></div>'
    + '<div class="stat"><div class="n tnum">'+routines+'</div><div class="l">Rutinos</div></div>'
    + '<div class="stat"><div class="n tnum">'+thisWeek+'</div><div class="l">Šią savaitę</div></div></div>';
  h += '<div class="eyebrow">Daugiau</div>';
  h += '<button class="prow2" data-act="tab" data-view="history">'+svg('hist')+'<span>Istorija</span><span class="pchev">'+svg('chevR')+'</span></button>';
  h += '<button class="prow2" data-act="browseLib">'+svg('dumbbell')+'<span>Pratimų biblioteka</span><span class="pchev">'+svg('chevR')+'</span></button>';
  h += '<div class="eyebrow">Nustatymai</div>';
  h += '<button class="prow2" data-act="theme">'+svg('theme')+'<span>Tema</span><span class="pchev">'+svg('chevR')+'</span></button>';
  if(CLOUD_ON && cloudUser) h += '<button class="prow2 danger" data-act="signout">'+svg('upload')+'<span>Atsijungti</span></button>';
  h += '</div>';
  h += bottomBar('profile');
  app.innerHTML = h;
}
function histOpen(id){
  var e = db.history.filter(function(x){return x.id===id;})[0]; if(!e) return;
  var items = (e.entries||[]).map(function(x){
    var det = x.setsDone+'/'+x.target+' sets'+(x.topKg?(' · '+x.topKg+' kg'):'');
    return { label:(x.name||'Exercise')+' — '+det, icon:(x.finished?'check':'close'), onClick:function(){} };
  });
  items.push({ label:'Delete this workout', icon:'trash', danger:true, onClick:function(){
    db.history = db.history.filter(function(x){return x.id!==id;}); save(); render(); toast('Deleted');
  }});
  openSheet(e.routineName+' · '+agoLabel(e.date), items);
}

/* ------------------------------------------------------- dialogs/sheets */
function closeLayer(){ layer.innerHTML=''; }
function openSheet(title, items){
  var h = '<div class="sheet-back" data-close="1"><div class="sheet">'
    + '<div class="grab"></div>'
    + (title?'<div class="stitle">'+esc(title)+'</div>':'');
  items.forEach(function(it,idx){
    h += '<button class="sitem'+(it.danger?' danger':'')+'" data-sheet="'+idx+'">'+svg(it.icon)+esc(it.label)+'</button>';
  });
  h += '</div></div>';
  layer.innerHTML = h;
  var backEl = layer.querySelector('.sheet-back');
  requestAnimationFrame(function(){ backEl.classList.add('show'); });
  backEl.addEventListener('click', function(ev){
    var si = ev.target.closest('[data-sheet]');
    if(si){ var it = items[+si.getAttribute('data-sheet')]; dismissSheet(backEl, it.onClick); return; }
    if(ev.target.getAttribute('data-close')) dismissSheet(backEl);
  });
}
function dismissSheet(backEl, cb){ backEl.classList.remove('show'); setTimeout(function(){ closeLayer(); if(cb) cb(); }, 230); }

function openDialog(opts){
  // opts: {title, desc, value, placeholder, okLabel, danger, input(bool), onOk}
  var hasInput = opts.input!==false;
  var h = '<div class="dlg-back" data-close="1"><div class="dlg">'
    + '<h3>'+esc(opts.title)+'</h3>'
    + (opts.desc?'<p>'+esc(opts.desc)+'</p>':'')
    + (hasInput?'<input class="input" id="dlgInput" value="'+esc(opts.value||'')+'" placeholder="'+esc(opts.placeholder||'')+'">':'')
    + '<div class="btn-row"><button class="btn ghost" data-dlg="cancel">Cancel</button>'
    + '<button class="btn '+(opts.danger?'primary':'primary')+'" data-dlg="ok"'+(opts.danger?' style="background:#d64527"':'')+'>'+esc(opts.okLabel||'OK')+'</button></div>'
    + '</div></div>';
  layer.innerHTML = h;
  var backEl = layer.querySelector('.dlg-back');
  requestAnimationFrame(function(){ backEl.classList.add('show'); });
  var inp = document.getElementById('dlgInput');
  if(inp){ inp.focus(); inp.setSelectionRange(0,inp.value.length); }
  function done(ok){
    var val = inp? inp.value.trim() : null;
    backEl.classList.remove('show'); setTimeout(closeLayer,180);
    if(ok && opts.onOk) opts.onOk(val);
  }
  backEl.addEventListener('click', function(ev){
    var b = ev.target.closest('[data-dlg]');
    if(b){ done(b.getAttribute('data-dlg')==='ok'); return; }
    if(ev.target.getAttribute('data-close')) done(false);
  });
  if(inp) inp.addEventListener('keydown', function(ev){ if(ev.key==='Enter') done(true); });
}

/* video modal */
function playVideo(exId){
  var e = byId[exId]; if(!e || !e.video) return;
  var h = '<div class="dlg-back show" data-close="1"><div class="dlg" style="max-width:420px;padding:12px">'
    + '<video src="'+esc(e.video)+'" autoplay loop muted playsinline controls style="width:100%;border-radius:12px;background:#000"></video>'
    + '<button class="btn ghost" data-close="1" style="margin-top:10px">Close</button></div></div>';
  layer.innerHTML = h;
  layer.querySelector('.dlg-back').addEventListener('click', function(ev){
    if(ev.target.getAttribute('data-close')){ closeLayer(); }
  });
}

/* ------------------------------------------------------- theme toggle */
function currentTheme(){ try{ return localStorage.getItem('jega.theme')||'system'; }catch(e){ return 'system'; } }
function applyTheme(t){
  if(t==='system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  try{ localStorage.setItem('jega.theme', t); }catch(e){}
}
applyTheme(currentTheme());

/* ------------------------------------------------------- backup */
function exportData(){
  var data = JSON.stringify(db, null, 2);
  var blob = new Blob([data], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'jega-backup-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  toast('Backup downloaded');
}
function importData(){
  var inp = document.createElement('input'); inp.type='file'; inp.accept='application/json,.json';
  inp.addEventListener('change', function(){
    var f = inp.files[0]; if(!f) return;
    var rd = new FileReader();
    rd.onload = function(){
      try{
        var obj = JSON.parse(rd.result);
        if(obj && obj.routines){ db = { folders:obj.folders||[], routines:obj.routines }; save(); reset('home'); toast('Backup restored'); }
        else toast('Not a valid backup file');
      }catch(e){ toast('Could not read file'); }
    };
    rd.readAsText(f);
  });
  inp.click();
}

/* ------------------------------------------------------- actions */
document.addEventListener('click', function(ev){
  var el = ev.target.closest('[data-act]');
  // stop propagation for inner menu buttons on cards
  var stopEl = ev.target.closest('[data-stop]');
  if(!el) return;
  var act = el.getAttribute('data-act');
  var id = el.getAttribute('data-id');
  var exId = el.getAttribute('data-ex');
  var i = el.getAttribute('data-i'); i = i!=null? +i : null;
  var si = el.getAttribute('data-si'); si = si!=null? +si : null;

  // prevent card tap when tapping its menu
  if(stopEl && stopEl!==el){ /* handled below by specificity */ }

  switch(act){
    case 'back': back(); break;
    case 'theme': {
      var order = ['system','light','dark']; var cur = currentTheme();
      openSheet('Appearance', order.map(function(t){
        return { label: t.charAt(0).toUpperCase()+t.slice(1) + (t===cur?'  ✓':''), icon:'theme', onClick:function(){ applyTheme(t); render(); } };
      }).concat([{ label:'Backup data (export)', icon:'download', onClick:exportData },
                 { label:'Restore from backup', icon:'upload', onClick:importData }]));
      break;
    }
    case 'menu': {
      var mitems = [
        { label:'Naujas aplankas', icon:'folderPlus', onClick:function(){ openDialog({ title:'Naujas aplankas', placeholder:'Aplanko pavadinimas', okLabel:'Sukurti', onOk:function(v){ if(!v) return; db.folders.push({id:uid(), name:v, collapsed:false}); save(); render(); } }); } },
        { label:'Įkelti 5 dienų programą', icon:'doc', onClick:loadProgram }
      ];
      if(CLOUD_ON && cloudUser){
        mitems.push({ label:'Sinchronizuoti dabar', icon:'download', onClick:cloudPull });
      }
      mitems.push({ label:'Atsarginė kopija (eksportas)', icon:'download', onClick:exportData });
      mitems.push({ label:'Atkurti iš kopijos', icon:'upload', onClick:importData });
      openSheet('Menu', mitems);
      break;
    }
    case 'toggleFolder': {
      if(ev.target.closest('[data-stop]')) break;
      var f = db.folders.filter(function(x){return x.id===id;})[0]; if(f){ f.collapsed=!f.collapsed; save(); render(); }
      break;
    }
    case 'folderMenu': {
      ev.stopPropagation();
      var fid = id;
      openSheet('Folder', [
        { label:'Rename folder', icon:'edit', onClick:function(){ renameFolder(fid); } },
        { label:'Delete folder', icon:'trash', danger:true, onClick:function(){ deleteFolder(fid); } }
      ]);
      break;
    }
    case 'newFolder': {
      openDialog({ title:'New Folder', placeholder:'Folder name', okLabel:'Create', onOk:function(v){
        if(!v) return; db.folders.push({id:uid(), name:v, collapsed:false}); save(); render();
      }});
      break;
    }
    case 'newRoutine': {
      openDialog({ title:'New Routine', placeholder:'Routine name', okLabel:'Create', onOk:function(v){
        var r = { id:uid(), name:v||'New Routine', folderId:null, exercises:[] };
        db.routines.push(r); save(); draft=null; go('editor', {id:r.id});
      }});
      break;
    }
    case 'openRoutine': { if(!ev.target.closest('[data-stop]')) go('routine', {id:id}); break; }
    case 'routineMenu': {
      ev.stopPropagation();
      routineMenu(id);
      break;
    }
    case 'openEx': exTab='howto'; go('exercise', {exId:exId}); break;
    case 'exTab': { exTab = el.getAttribute('data-tab')==='progress' ? 'progress' : 'howto'; render(); break; }
    case 'authSubmit': authSubmit(); break;
    case 'authToggle': { authMode = authMode==='signup' ? 'signin' : 'signup'; renderAuth(); break; }
    case 'edit': draft=null; go('editor', {id:id}); break;

    /* editor */
    case 'addExercise': { commitName(); go('library', {picker:true}); break; }
    case 'pick': {
      if(!draft) break;
      var exist = draft.exercises.some(function(x){return x.exId===exId;});
      if(exist){ draft.exercises = draft.exercises.filter(function(x){return x.exId!==exId;}); }
      else { draft.exercises.push({ exId:exId, note:'', rest:90, sets:[{reps:'',kg:''},{reps:'',kg:''},{reps:'',kg:''}] }); }
      renderLibListReal();
      break;
    }
    case 'moveUp': { if(draft && i>0){ var a=draft.exercises; var t=a[i]; a[i]=a[i-1]; a[i-1]=t; renderEditor(draft.id); } break; }
    case 'moveDown': { if(draft && i<draft.exercises.length-1){ var a2=draft.exercises; var t2=a2[i]; a2[i]=a2[i+1]; a2[i+1]=t2; renderEditor(draft.id); } break; }
    case 'removeEx': {
      commitName();
      var nm = byId[draft.exercises[i].exId]; nm = nm?nm.name:'this exercise';
      openDialog({ title:'Remove exercise?', desc:nm, input:false, okLabel:'Remove', danger:true, onOk:function(){
        draft.exercises.splice(i,1); renderEditor(draft.id);
      }});
      break;
    }
    case 'addSet': { commitName(); var x=draft.exercises[i]; var last=x.sets[x.sets.length-1]||{reps:'',kg:''}; x.sets.push({reps:last.reps,kg:''}); renderEditor(draft.id); break; }
    case 'removeSet': { commitName(); draft.exercises[i].sets.splice(si,1); renderEditor(draft.id); break; }
    case 'saveRoutine': {
      commitName();
      var r = routineById(draft.id);
      if(r){ r.name=draft.name||'Untitled'; r.exercises=draft.exercises; save(); }
      draft=null; nav.pop(); // leave editor
      // ensure we land on routine view
      if(top().view!=='routine') go('routine',{id:r.id}); else render();
      toast('Routine saved');
      break;
    }
    case 'playVideo': playVideo(exId); break;

    /* session */
    case 'start': {
      if(session && session.routineId!==id){
        openDialog({ title:'Start a new workout?', desc:'This ends your workout in progress without saving it.', input:false, okLabel:'Start new', danger:true, onOk:function(){ startSession(id); sessOpen=null; hideRest(); go('session'); }});
      } else if(session && session.routineId===id){ go('session'); }
      else { startSession(id); sessOpen=null; go('session'); }
      break;
    }
    case 'resume': go('session'); break;
    case 'toggleDone': toggleDone(i); break;
    case 'toggleOpen': { sessOpen = (sessOpen===i? null : i); render(); break; }
    case 'pip': { var k=+el.getAttribute('data-k'); pip(i,k); break; }
    case 'skipRest': hideRest(); break;
    case 'restMinus': { restEnd = Math.max(Date.now(), restEnd-15000); renderRest(); break; }
    case 'finishSession': finishSession(); break;
    case 'openHistory': go('history'); break;
    case 'tab': { var v=el.getAttribute('data-view'); if(top().view!==v) reset(v); break; }
    case 'browseLib': go('library'); break;
    case 'signout': cloudSignOut(); break;
    case 'histOpen': histOpen(id); break;
  }
});

function routineMenu(id){
  var r = routineById(id); if(!r) return;
  var items = [
    { label:'Edit', icon:'edit', onClick:function(){ draft=null; go('editor',{id:id}); } },
    { label:'Rename', icon:'doc', onClick:function(){ renameRoutine(id); } },
    { label:'Duplicate', icon:'dup', onClick:function(){ duplicateRoutine(id); } },
    { label: r.folderId?'Move out of folder':'Move to folder…', icon:'folder', onClick:function(){ moveRoutine(id); } },
    { label:'Delete', icon:'trash', danger:true, onClick:function(){ deleteRoutine(id); } }
  ];
  openSheet(r.name, items);
}
function renameRoutine(id){
  var r = routineById(id); if(!r) return;
  openDialog({ title:'Rename Routine', value:r.name, okLabel:'Save', onOk:function(v){ if(v){ r.name=v; save(); render(); } }});
}
function duplicateRoutine(id){
  var r = routineById(id); if(!r) return;
  var copy = JSON.parse(JSON.stringify(r)); copy.id=uid(); copy.name=r.name+' (copy)';
  var idx = db.routines.indexOf(r); db.routines.splice(idx+1,0,copy); save(); render(); toast('Duplicated');
}
function deleteRoutine(id){
  var r = routineById(id); if(!r) return;
  openDialog({ title:'Delete routine?', desc:r.name, input:false, okLabel:'Delete', danger:true, onOk:function(){
    db.routines = db.routines.filter(function(x){return x.id!==id;}); save();
    if(top().view==='routine') reset('home'); else render();
    toast('Deleted');
  }});
}
function moveRoutine(id){
  var r = routineById(id); if(!r) return;
  if(r.folderId){ r.folderId=null; save(); render(); toast('Moved out'); return; }
  if(!db.folders.length){ toast('No folders yet — create one first'); return; }
  openSheet('Move to folder', db.folders.map(function(f){
    return { label:f.name, icon:'folder', onClick:function(){ r.folderId=f.id; save(); render(); toast('Moved to '+f.name); } };
  }));
}
function renameFolder(fid){
  var f = db.folders.filter(function(x){return x.id===fid;})[0]; if(!f) return;
  openDialog({ title:'Rename Folder', value:f.name, okLabel:'Save', onOk:function(v){ if(v){ f.name=v; save(); render(); } }});
}
function deleteFolder(fid){
  var f = db.folders.filter(function(x){return x.id===fid;})[0]; if(!f) return;
  openDialog({ title:'Delete folder?', desc:'Routines inside will move to “My Routines”.', input:false, okLabel:'Delete', danger:true, onOk:function(){
    db.routines.forEach(function(r){ if(r.folderId===fid) r.folderId=null; });
    db.folders = db.folders.filter(function(x){return x.id!==fid;}); save(); render(); toast('Folder deleted');
  }});
}

/* editor live input binding */
document.addEventListener('input', function(ev){
  var el = ev.target.closest('[data-field]'); if(!el || !draft) return;
  var field = el.getAttribute('data-field');
  var i = +el.getAttribute('data-i');
  var si = el.getAttribute('data-si');
  var x = draft.exercises[i]; if(!x) return;
  if(field==='note') x.note = el.value;
  else if(field==='rest') x.rest = +el.value;
  else if(field==='kg' || field==='reps'){ if(si!=null) x.sets[+si][field] = el.value; }
});
// session top-weight input
document.addEventListener('input', function(ev){
  var el = ev.target.closest('[data-field="topkg"]'); if(!el || !session) return;
  var i = +el.getAttribute('data-i'); if(session.exercises[i]){ session.exercises[i].topKg = el.value; saveSession(); }
});
// library search/filter inputs
document.addEventListener('input', function(ev){
  if(ev.target.id==='libq'){ lib.q = ev.target.value; renderLibListReal(); }
});
document.addEventListener('change', function(ev){
  if(ev.target.id==='libequip'){ lib.equip = ev.target.value; renderLibListReal(); }
  else if(ev.target.id==='libmuscle'){ lib.muscle = ev.target.value; renderLibListReal(); }
});

/* keep routine name as you type (commit before actions) */
document.addEventListener('input', function(ev){ if(ev.target.id==='rname' && draft) draft.name = ev.target.value; });

/* select changes for editor rest timer (some browsers fire change, not input) */
document.addEventListener('change', function(ev){
  var el = ev.target.closest('[data-field="rest"]'); if(!el || !draft) return;
  var i = +el.getAttribute('data-i'); if(draft.exercises[i]) draft.exercises[i].rest = +el.value;
});

/* --------------------------------------------------------- CLOUD SYNC */
var CLOUD = { url:'https://uaehcpbxulqhgqnczqha.supabase.co', key:'sb_publishable_GIFh0fn65FGxp8d8MB9FjA_1Opaa-EW' };
var CLOUD_ON = /^https:\/\/[a-z0-9]+\.supabase\.(co|in)/.test(CLOUD.url);
var supa = null, cloudUser = null, pushTimer = null, authReady = false, authMode = 'signin';

function cloudUpdatedAt(){ try{ return +localStorage.getItem('jega.updatedAt') || 0; }catch(e){ return 0; } }
function setCloudUpdatedAt(ms){ try{ localStorage.setItem('jega.updatedAt', String(ms)); }catch(e){} }
function setLocalDb(){ try{ localStorage.setItem(KEY, JSON.stringify(db)); }catch(e){} }
function resetLocal(){ // wipe this device's cache so accounts never mix
  db = { folders:[], routines:[], history:[] }; session = null; sessOpen = null;
  try{ localStorage.removeItem(KEY); localStorage.removeItem('jega.updatedAt'); localStorage.removeItem(SKEY); }catch(e){}
}

function cloudInit(){
  if(!CLOUD_ON) return;
  if(!window.supabase){ authReady = true; render(); return; }
  try{ supa = window.supabase.createClient(CLOUD.url, CLOUD.key, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } }); }catch(e){ supa = null; authReady = true; render(); return; }
  supa.auth.onAuthStateChange(function(ev, sess){
    cloudUser = sess ? sess.user : null;
    authReady = true;
    if(cloudUser){
      var lastUid = null; try{ lastUid = localStorage.getItem('jega.uid'); }catch(e){}
      if(lastUid === cloudUser.id){
        if(ev==='SIGNED_IN' || ev==='INITIAL_SESSION') cloudPull();
      } else if(lastUid == null){
        // first sign-in on this device: claim existing local data for this account
        try{ localStorage.setItem('jega.uid', cloudUser.id); }catch(e){}
        cloudAdoptOrMigrate();
      } else {
        // a different account signed in: never mix data, wipe + adopt cloud
        resetLocal();
        try{ localStorage.setItem('jega.uid', cloudUser.id); }catch(e){}
        cloudPullOrSeed();
      }
    } else {
      try{ localStorage.removeItem('jega.uid'); }catch(e){}
    }
    render();
  });
}
function schedulePush(){
  if(!CLOUD_ON || !supa || !cloudUser) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(function(){ cloudPush(); }, 1200);
}
function cloudPullOrSeed(){
  if(!supa || !cloudUser) return;
  supa.from('user_data').select('data').eq('user_id', cloudUser.id).maybeSingle().then(function(r){
    var remote = (!r.error && r.data) ? r.data.data : null;
    if(remote && remote.db){
      db = remote.db; if(!db.history) db.history = [];
      setLocalDb(); setCloudUpdatedAt(remote.updatedAt || Date.now());
    } else {
      seed(); cloudPush(); // brand-new account: default program, uploaded
    }
    render();
  }, function(){ render(); });
}
function cloudAdoptOrMigrate(){
  // first sign-in on this device: adopt cloud if it has data, else migrate local data up
  if(!supa || !cloudUser) return;
  supa.from('user_data').select('data').eq('user_id', cloudUser.id).maybeSingle().then(function(r){
    var remote = (!r.error && r.data) ? r.data.data : null;
    if(remote && remote.db && (remote.updatedAt||0) >= cloudUpdatedAt()){
      db = remote.db; if(!db.history) db.history = [];
      setLocalDb(); setCloudUpdatedAt(remote.updatedAt || Date.now());
    } else {
      if(!db.routines || !db.routines.length) seed();
      cloudPush(); // keep existing local data, upload it to this account
    }
    render();
  }, function(){ render(); });
}
function cloudPull(){
  if(!supa || !cloudUser) return;
  supa.from('user_data').select('data').eq('user_id', cloudUser.id).maybeSingle().then(function(r){
    if(r.error){ return; }
    var remote = r.data && r.data.data;
    if(remote && remote.db && (remote.updatedAt||0) > cloudUpdatedAt()){
      db = remote.db; if(!db.history) db.history = [];
      setLocalDb(); setCloudUpdatedAt(remote.updatedAt);
      render();
    } else {
      cloudPush();
    }
  }, function(){});
}
function cloudPush(){
  if(!supa || !cloudUser) return;
  var payload = { user_id: cloudUser.id, data: { db: db, updatedAt: cloudUpdatedAt() || Date.now() }, updated_at: new Date().toISOString() };
  supa.from('user_data').upsert(payload).then(function(){}, function(){});
}
function cloudSignIn(email, pass, mode){
  if(!supa){ toast('Nėra ryšio su serveriu'); return; }
  var pr = (mode==='signup')
    ? supa.auth.signUp({ email:email, password:pass })
    : supa.auth.signInWithPassword({ email:email, password:pass });
  pr.then(function(r){
    if(r.error){ toast(r.error.message || 'Nepavyko prisijungti'); return; }
    if(mode==='signup' && !(r.data && r.data.session)){ toast('Patvirtink el. paštą ir prisijunk'); return; }
    toast(mode==='signup' ? 'Paskyra sukurta' : 'Prisijungta');
  }, function(){ toast('Tinklo klaida'); });
}
function cloudSignOut(){
  if(!supa) return;
  supa.auth.signOut().then(function(){
    cloudUser = null; resetLocal();
    try{ localStorage.removeItem('jega.uid'); }catch(e){}
    nav = [{ view:'home' }]; render();
  });
}

/* ---- login gate screens ---- */
function renderAuthLoading(){
  app.innerHTML = '<div class="authwrap"><div class="authlogo">'+svg('dumbbell')+'</div>'
    + '<div class="authsub" style="margin-top:16px">Kraunama…</div></div>';
}
function renderAuth(){
  var signup = authMode==='signup';
  app.innerHTML = '<div class="authwrap">'
    + '<div class="authlogo">'+svg('dumbbell')+'</div>'
    + '<h1 class="authtitle">Jėga</h1>'
    + '<p class="authsub">'+(signup?'Sukurk paskyrą ir sek savo progresą':'Prisijunk prie savo paskyros')+'</p>'
    + '<input class="input authfield" id="authEmail" type="email" inputmode="email" placeholder="El. paštas" autocomplete="username" autocapitalize="none" spellcheck="false">'
    + '<input class="input authfield" id="authPass" type="password" placeholder="Slaptažodis (min 6)" autocomplete="'+(signup?'new-password':'current-password')+'">'
    + '<button class="btn primary authbtn" data-act="authSubmit">'+(signup?'Sukurti paskyrą':'Prisijungti')+'</button>'
    + '<button class="btn ghost authtoggle" data-act="authToggle">'+(signup?'Jau turi paskyrą? Prisijunk':'Neturi paskyros? Sukurk')+'</button>'
    + '</div>';
}
function authSubmit(){
  var em = document.getElementById('authEmail'), pw = document.getElementById('authPass');
  var email = ((em && em.value) || '').trim(), pass = (pw && pw.value) || '';
  if(!email || pass.length<6){ toast('Įvesk el. paštą ir slaptažodį (min 6)'); return; }
  cloudSignIn(email, pass, authMode==='signup' ? 'signup' : 'signin');
}

// Enter submits the login form
document.addEventListener('keydown', function(ev){
  if(ev.key==='Enter' && (ev.target.id==='authEmail' || ev.target.id==='authPass')){ ev.preventDefault(); authSubmit(); }
});

render();
cloudInit();
})();
