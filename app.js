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
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(db)); }catch(e){} }
function load(){
  try{ var raw = localStorage.getItem(KEY); if(raw){ db = JSON.parse(raw); return true; } }catch(e){}
  return false;
}
function mkEx(name, nSets, reps, rest){
  var e = byName[name.toUpperCase()]; if(!e) return null;
  var sets = []; for(var i=0;i<nSets;i++) sets.push({reps:reps||'', kg:''});
  return { exId:e.id, note:'', rest:(rest||0), sets:sets };
}
function seed(){
  var upper = { id:uid(), name:'Viršus A / Upper A (jėga)', folderId:null, exercises:[
    mkEx('Bench Press (Barbell)',4,'5-8',180),
    mkEx('Bent Over Row (Barbell)',4,'6-10',150),
    mkEx('Overhead Press (Barbell)',3,'6-8',150),
    mkEx('Pull Up',3,'6-10',120),
    mkEx('Lateral Raise (Dumbbell)',3,'12-15',90),
    mkEx('Triceps Rope Pushdown',3,'10-12',90)
  ].filter(Boolean) };
  var fid = uid();
  var fbA = { id:uid(), name:'Full Body A', folderId:fid, exercises:[
    mkEx('Squat (Barbell)',3,'6-8',150),
    mkEx('Bench Press (Barbell)',3,'8-10',120),
    mkEx('Bent Over Row (Barbell)',3,'8-10',120),
    mkEx('Overhead Press (Barbell)',3,'8-12',120),
    mkEx('Lying Leg Curl (Machine)',3,'10-15',90),
    mkEx('Crunch',3,'12-20',60)
  ].filter(Boolean) };
  db = { folders:[{id:fid, name:'Full Body', collapsed:false}], routines:[upper, fbA] };
  save();
}
if(!load()) seed();

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
  dup:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h8"/>'
};
function svg(name, cls){ return '<svg viewBox="0 0 24 24"'+(cls?(' class="'+cls+'"'):'')+'>'+I[name]+'</svg>'; }

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
function render(){
  var t = top();
  if(t.view==='home') return renderHome();
  if(t.view==='routine') return renderRoutine(t.id);
  if(t.view==='editor') return renderEditor(t.id);
  if(t.view==='library') return renderLibrary();
  if(t.view==='exercise') return renderExercise(t.exId);
  renderHome();
}

/* -- Home -- */
function renderHome(){
  var h = topbar({ title:'Routines', icon:{name:'theme',act:'theme'}, menu:true });
  h += '<div class="screen">';
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
  // footer actions
  h += '<div class="sticky-foot"><div class="inner"><div class="btn-row">'
    + '<button class="btn primary" data-act="newRoutine">'+svg('plus')+'New Routine</button>'
    + '<button class="btn" data-act="newFolder">'+svg('folderPlus')+'Folder</button>'
    + '</div></div></div>';
  app.innerHTML = h;
}
function routineCard(r){
  return '<button class="rcard" data-act="openRoutine" data-id="'+r.id+'">'
    + '<div class="rc-body"><div class="rc-title">'+esc(r.name)+'</div>'
    + '<div class="rc-sub">'+esc(routineSub(r))+'</div></div>'
    + '<span class="rc-more iconbtn" data-act="routineMenu" data-id="'+r.id+'" data-stop="1">'+svg('more')+'</span></button>';
}

/* -- Routine view -- */
function routineById(id){ return db.routines.filter(function(r){return r.id===id;})[0]; }
function renderRoutine(id){
  var r = routineById(id); if(!r) return reset('home');
  var h = topbar({ title:r.name, sub:true, back:true, menu:true });
  h += '<div class="screen">';
  // exercise list
  h += '<div class="card" style="padding:4px 14px;margin-top:6px">';
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
  h += '<div class="sticky-foot"><div class="inner">'
    + '<button class="btn primary" data-act="edit" data-id="'+r.id+'">'+svg('edit')+'Edit Routine</button>'
    + '</div></div>';
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
function renderExercise(exId){
  var e = byId[exId]; if(!e) return back();
  var h = topbar({ title:e.name, sub:true, back:true });
  h += '<div class="screen">';
  h += '<div class="hero">'+ (e.thumb? '<img src="'+esc(e.thumb)+'" alt="">' : '<div style="color:var(--muted)">No image</div>') +'</div>';
  h += '<div class="meta">'
    + '<div class="row"><span class="k">Equipment</span><span class="v">'+esc(EQUIP[e.equipment]||e.equipment)+'</span></div>'
    + '<div class="row"><span class="k">Primary Muscle</span><span class="v">'+esc(MUSCLE[e.primary]||e.primary)+'</span></div>'
    + '<div class="row"><span class="k">Secondary</span><span class="v">'+ ((e.secondary&&e.secondary.length)? e.secondary.map(function(m){return esc(MUSCLE[m]||m);}).join(', ') : '—') +'</span></div>'
    + '<div class="row"><span class="k">Type</span><span class="v">'+esc((e.type||'').replace(/_/g,' '))+'</span></div>'
    + '</div>';
  if(e.video){
    h += '<button class="btn ghost" data-act="playVideo" data-ex="'+e.id+'" style="margin-bottom:8px">▶ Play animation</button>';
  }
  h += '<div class="tabs"><button class="tab active">How to</button></div>';
  if(e.howto && e.howto.length){
    h += '<div class="steps">';
    e.howto.forEach(function(s){ h += '<div class="step"><div class="num"></div><p>'+esc(s)+'</p></div>'; });
    h += '</div>';
  } else {
    h += '<div class="empty" style="padding:22px">No instructions for this exercise.</div>';
  }
  h += '</div>';
  app.innerHTML = h;
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
      openSheet('Menu', [
        { label:'Backup data (export)', icon:'download', onClick:exportData },
        { label:'Restore from backup', icon:'upload', onClick:importData }
      ]);
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
    case 'openEx': go('exercise', {exId:exId}); break;
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

render();
})();
