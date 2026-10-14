const $ = id => document.getElementById(id);
let state = null, adminUnlocked = false, selectedTeam = "alpha", heartbeatHandle = null, timerHandle = null;

async function api(url, options={}) {
  const res = await fetch(url, { headers: {"Content-Type":"application/json"}, ...options });
  const data = await res.json().catch(()=>({error:"Réponse serveur illisible."}));
  if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
  return data;
}
function show(id) { $(id).classList.remove("hidden"); }
function hide(id) { $(id).classList.add("hidden"); }
function safe(value="") { return String(value).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function applyTheme(game) {
  document.documentElement.style.setProperty("--red", game.theme?.primary || "#C8102E");
  $("siteTitle").textContent = game.title || "OPÉRATION COPENHAGUE";
  $("homeHeading").textContent = game.title || "OPÉRATION COPENHAGUE";
  $("homeIntro").textContent = game.intro || "";
  document.title = game.title || "OPÉRATION COPENHAGUE";
}
async function refresh() {
  try {
    state = await api("/api/state");
    applyTheme(state.game);
    renderFinal(state.game.final);
    if (state.mySession) {
      show("playView"); hide("homeView");
      selectedTeam = state.game.routes?.[selectedTeam] ? selectedTeam : "alpha";
      renderRoute();
    }
    renderTimer();
  } catch(e) { console.error(e); }
}
function renderTimer() {
  if (!state?.timer) return;
  const t=state.timer, now=Date.now();
  let remaining= t.running && t.endsAt ? Math.max(0,t.endsAt-now) : (t.pausedRemainingMs ?? (t.endsAt ? Math.max(0,t.endsAt-now) : Number(state.game.durationMinutes||60)*60000));
  const total=Math.ceil(remaining/1000), m=String(Math.floor(total/60)).padStart(2,"0"), s=String(total%60).padStart(2,"0");
  $("timer").textContent=`${m}:${s}`;
  $("timer").style.color=total<=300?"#b00020":"var(--red)";
  if (total===0) $("timer").textContent="00:00";
}
function renderRoute() {
  const route=state.game.routes?.[selectedTeam]; if(!route)return;
  $("teamName").textContent=route.name || (selectedTeam==="alpha"?"POP ALPHA":"POP BRAVO");
  $("routeEyebrow").textContent=selectedTeam==="alpha"?"PARCOURS ALPHA":"PARCOURS BRAVO";
  $("routeTitle").textContent=route.name || "Votre parcours";
  $("routeIntro").textContent=route.intro || "";
  $("missionList").innerHTML="";
  (route.missions||[]).forEach((m,i)=>{
    const card=document.createElement("article"); card.className="mission-card";
    const photo=m.photo?`<img class="mission-photo" src="${safe(m.photo)}" alt="Photo indice" onerror="this.style.display='none'">`:"";
    const map=m.mapsUrl?`<a class="button secondary" href="${safe(m.mapsUrl)}" target="_blank" rel="noopener">Ouvrir dans Google Maps ↗</a>`:"";
    card.innerHTML=`<div class="eyebrow">MISSION ${i+1} · ${safe(m.id||"")}</div><h3>${safe(m.title||"Mission")}</h3><p>${safe(m.text||"")}</p>${m.location?`<p class="mission-meta">📍 ${safe(m.location)}</p>`:""}${photo}${map}${m.answer?`<div class="answer-row"><input aria-label="Réponse mission" id="ans-${safe(m.id)}" placeholder="Votre réponse"><button class="button primary" data-answer="${safe(m.id)}">Valider</button></div><p id="feedback-${safe(m.id)}" class="small"></p>`:""}${m.hint?`<details><summary>Indice facultatif</summary><p>${safe(m.hint)}</p></details>`:""}`;
    $("missionList").appendChild(card);
  });
  document.querySelectorAll("[data-answer]").forEach(btn=>btn.addEventListener("click",()=>{
    const id=btn.dataset.answer, m=(route.missions||[]).find(x=>x.id===id), val=$(`ans-${id}`).value.trim().toLocaleLowerCase("fr");
    const answers=String(m.answer||"").split("|").map(x=>x.trim().toLocaleLowerCase("fr"));
    const feedback=$(`feedback-${id}`);
    if(answers.includes(val)){feedback.textContent="Indice validé. Notez cette preuve pour le débrief final.";feedback.style.color="#167345";}
    else{feedback.textContent="Ce n'est pas encore la bonne réponse. Relisez l'indice et réessayez.";feedback.style.color="#b00020";}
  }));
}
function renderFinal(f={}) {
  $("finalTitle").textContent=f.title||"Point de convergence";
  $("finalText").textContent=f.text||"";
  $("finalLocation").textContent=f.location||"";
  if(f.photo){$("finalPhoto").src=f.photo;show("finalPhoto");}else hide("finalPhoto");
  if(f.mapsUrl){$("finalMap").href=f.mapsUrl;show("finalMap");}else hide("finalMap");
}
$("joinBtn").addEventListener("click",async()=>{
  selectedTeam=$("teamSelect").value; $("joinError").textContent="";
  try{await api("/api/join",{method:"POST",body:JSON.stringify({team:selectedTeam})});await refresh();hide("homeView");show("playView");heartbeatHandle=setInterval(()=>api("/api/heartbeat",{method:"POST",body:"{}"}).then(s=>{state=s;renderTimer();}).catch(()=>{}),15000);}
  catch(e){$("joinError").textContent=e.message;}
});
$("leaveBtn").addEventListener("click",async()=>{try{await api("/api/leave",{method:"POST",body:"{}"});}catch{}clearInterval(heartbeatHandle);show("homeView");hide("playView");await refresh();});
$("adminOpen").addEventListener("click",()=>{show("adminView");hide("homeView");hide("playView");if(adminUnlocked)show("adminTools");else show("adminLogin");});
$("adminClose").addEventListener("click",()=>{hide("adminView");if(state?.mySession)show("playView");else show("homeView");});
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginError").textContent="";try{await api("/api/admin/login",{method:"POST",body:JSON.stringify({pin:$("pinInput").value})});adminUnlocked=true;hide("adminLogin");show("adminTools");await loadAdmin();}catch(err){$("loginError").textContent=err.message;}});
async function loadAdmin(){
  state=await api("/api/state");const g=state.game;
  $("cfgTitle").value=g.title||"";$("cfgDuration").value=g.durationMinutes||60;$("cfgIntro").value=g.intro||"";$("cfgColor").value=g.theme?.primary||"#C8102E";
  $("finalCfgTitle").value=g.final?.title||"";$("finalCfgText").value=g.final?.text||"";$("finalCfgLocation").value=g.final?.location||"";$("finalCfgPhoto").value=g.final?.photo||"";$("finalCfgMap").value=g.final?.mapsUrl||"";
  $("missionEditors").innerHTML="";
  for(const team of ["alpha","bravo"]){
    const route=g.routes[team];
    const heading=document.createElement("h4");heading.textContent=route.name||team.toUpperCase();$("missionEditors").appendChild(heading);
    const intro=document.createElement("div");intro.className="editor-card";
    intro.innerHTML=`<label>Introduction du parcours<textarea data-team="${team}" data-field="intro" rows="2">${safe(route.intro||"")}</textarea></label>`;
    $("missionEditors").appendChild(intro);
    (route.missions||[]).forEach((m,i)=>{
      const el=document.createElement("div");el.className="editor-card";
      el.innerHTML=`<h4>${safe(m.id||"Mission")} — ${safe(m.title||"")}</h4><div class="editor-two"><label>Titre<input data-team="${team}" data-i="${i}" data-field="title" value="${safe(m.title||"")}"></label><label>Lieu<input data-team="${team}" data-i="${i}" data-field="location" value="${safe(m.location||"")}"></label><label>Texte de mission<textarea data-team="${team}" data-i="${i}" data-field="text" rows="3">${safe(m.text||"")}</textarea></label><label>Réponse acceptée<input data-team="${team}" data-i="${i}" data-field="answer" value="${safe(m.answer||"")}" placeholder="Plusieurs réponses : mot1|mot2"></label><label>Indice facultatif<textarea data-team="${team}" data-i="${i}" data-field="hint" rows="2">${safe(m.hint||"")}</textarea></label><label>URL de photo<input data-team="${team}" data-i="${i}" data-field="photo" value="${safe(m.photo||"")}" placeholder="https://..."></label><label>Lien Google Maps<input data-team="${team}" data-i="${i}" data-field="mapsUrl" value="${safe(m.mapsUrl||"")}" placeholder="https://maps.google.com/..."></label></div>`;
      $("missionEditors").appendChild(el);
    });
  }
}
function collectAdmin(){
  const g=JSON.parse(JSON.stringify(state.game));
  g.title=$("cfgTitle").value.trim()||"OPÉRATION COPENHAGUE";
  g.durationMinutes=Math.max(1,Math.min(240,Number($("cfgDuration").value)||60));
  g.intro=$("cfgIntro").value;g.theme={...(g.theme||{}),primary:$("cfgColor").value};
  for(const el of $("missionEditors").querySelectorAll("[data-field]")){
    const team=el.dataset.team, field=el.dataset.field;
    if(el.dataset.i===undefined){g.routes[team][field]=el.value;continue;}
    const i=Number(el.dataset.i);g.routes[team].missions[i][field]=el.value;
  }
  g.final={...(g.final||{}),title:$("finalCfgTitle").value,text:$("finalCfgText").value,location:$("finalCfgLocation").value,photo:$("finalCfgPhoto").value,mapsUrl:$("finalCfgMap").value};
  return g;
}
$("saveBtn").addEventListener("click",async()=>{try{const game=collectAdmin();const r=await api("/api/admin/game",{method:"PUT",body:JSON.stringify(game)});state.game=r.game;applyTheme(state.game);$("saveStatus").textContent="Modifications enregistrées.";await loadAdmin();}catch(e){$("saveStatus").textContent=e.message;}});
async function timerAction(action){try{await api("/api/admin/timer",{method:"POST",body:JSON.stringify({action})});await refresh();$("saveStatus").textContent="Chronomètre mis à jour.";}catch(e){$("saveStatus").textContent=e.message;}}
$("timerStart").addEventListener("click",()=>timerAction("reset"));$("timerPause").addEventListener("click",()=>timerAction("pause"));$("timerResume").addEventListener("click",()=>timerAction("resume"));
$("clearSessions").addEventListener("click",async()=>{if(!confirm("Libérer toutes les sessions de jeu ?"))return;try{await api("/api/admin/clear-sessions",{method:"POST",body:"{}"});$("saveStatus").textContent="Sessions libérées.";await refresh();}catch(e){$("saveStatus").textContent=e.message;}});
$("adminLogout").addEventListener("click",async()=>{await api("/api/admin/logout",{method:"POST",body:"{}"});adminUnlocked=false;hide("adminTools");show("adminLogin");$("pinInput").value="";});
$("makeQr").addEventListener("click",async()=>{const txt=$("qrText").value.trim();if(!txt)return;try{const r=await api("/api/qr?text="+encodeURIComponent(txt));$("qrResult").innerHTML=`<div class="qr-output"><img alt="QR code généré" src="${r.dataUrl}"><div><strong>QR code prêt à imprimer</strong><p class="small">${safe(txt)}</p><a href="${r.dataUrl}" download="qr-operation-copenhague.png">Enregistrer l'image du QR code</a></div></div>`;}catch(e){$("qrResult").textContent=e.message;}});
setInterval(()=>{if(state){if(state.timer?.running&&state.timer.endsAt&&Date.now()>=state.timer.endsAt){state.timer.running=false;}renderTimer();}},1000);
refresh();
