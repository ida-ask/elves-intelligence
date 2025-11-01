const STORAGE="elves-session-v1";
const LAST="elves-last-date";
const qs=s=>document.querySelector(s);

const state=(()=>{try{return JSON.parse(localStorage.getItem(STORAGE))||{agent:{},session:{loggedIn:false},history:[]}}catch{return {agent:{},session:{loggedIn:false},history:[]}}})();
function save(){localStorage.setItem(STORAGE,JSON.stringify(state))}

function todayISO(){return new Date().toISOString().split("T")[0]}
const todayString=new Date().toDateString();
const last=localStorage.getItem(LAST);
if(last && last!==todayString){ state.session.loggedIn=false; save(); }
localStorage.setItem(LAST,todayString);

const DAILY_CODES={
  "2025-12-01":"ELF1","2025-12-02":"ELF2","2025-12-03":"ELF3","2025-12-04":"ELF4",
  "2025-12-05":"ELF5","2025-12-06":"ELF6","2025-12-07":"ELF7","2025-12-08":"ELF8",
  "2025-12-09":"ELF9","2025-12-10":"ELF10","2025-12-11":"ELF11","2025-12-12":"ELF12",
  "2025-12-13":"ELF13","2025-12-14":"ELF14","2025-12-15":"ELF15","2025-12-16":"ELF16",
  "2025-12-17":"ELF17","2025-12-18":"ELF18","2025-12-19":"ELF19","2025-12-20":"ELF20",
  "2025-12-21":"ELF21","2025-12-22":"ELF22","2025-12-23":"ELF23","2025-12-24":"ELF24"
};
function dagensKode(){
  const urlOverride=new URLSearchParams(location.search).get("code");
  if(urlOverride) return urlOverride.toUpperCase().trim();
  return (DAILY_CODES[todayISO()]||"ELF1").toUpperCase();
}

const $login=qs("#login"),$chat=qs("#chat"),$history=qs("#history");
const $name=qs("#agentName"),$code=qs("#dayCode"),$loginBtn=qs("#loginBtn"),$loginMsg=qs("#loginMsg");
const $inbox=qs("#inbox"),$inboxStatus=qs("#inboxStatus"),$msg=qs("#msg"),$file=qs("#file"),$send=qs("#sendBtn"),$clear=qs("#clearBtn"),$hist=qs("#historyList");

function showApp(){ $login.classList.add("hidden"); $chat.classList.remove("hidden"); $history.classList.remove("hidden"); }
function showLogin(){ $login.classList.remove("hidden"); $chat.classList.add("hidden"); $history.classList.add("hidden"); }

if(state.session.loggedIn){ showApp(); fetchInbox(); renderHistory(); } else { showLogin(); }

$loginBtn.addEventListener("click", ()=>{
  const entered=($code.value||"").trim().toUpperCase();
  const correct=dagensKode();
  if(entered!==correct){ $loginMsg.textContent="Feil feltkode for dagens oppdrag."; return; }
  if(($name.value||"").trim()) state.agent.name=$name.value.trim();
  state.session.loggedIn=true; save();
  $loginMsg.textContent="";
  showApp(); fetchInbox(); renderHistory();
});

async function fetchInbox(){
  try{
    const res=await fetch("/api/inbox?ts="+Date.now());
    if(!res.ok) throw new Error(res.statusText);
    const data=await res.json();
    renderInbox(Array.isArray(data)?data:[]);
    $inboxStatus.textContent="Innboks oppdatert: "+new Date().toLocaleString();
  }catch(e){
    $inboxStatus.textContent="Kunne ikke laste innboks.";
  }
}
setInterval(()=>{ if(state.session.loggedIn) fetchInbox(); }, 60000);

function safe(s){ return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function renderInbox(items){
  $inbox.innerHTML="";
  if(!items.length){ $inbox.innerHTML='<div class="muted">Ingen meldinger enda.</div>'; return; }
  items.sort((a,b)=>(a.ts||0)-(b.ts||0));
  for(const m of items){
    const el=document.createElement("div"); el.className="msg";
    let media="";
    if(m.media){
      const t=m.media.type, u=m.media.url;
      if(t==="image") media=`<img class="msgImg" src="${safe(u)}" alt="">`;
      else if(t==="video") media=`<video class="msgVid" controls src="${safe(u)}"></video>`;
      else if(t==="audio") media=`<audio controls src="${safe(u)}"></audio>`;
      else if(t==="youtube") media=`<iframe class="msgVid" src="https://www.youtube.com/embed/${safe(u.split("v=").pop())}" allowfullscreen></iframe>`;
      else if(t==="vimeo") media=`<iframe class="msgVid" src="https://player.vimeo.com/video/${safe(u.split("/").pop())}" allowfullscreen></iframe>`;
    }
    el.innerHTML = `
      <div class="head"><strong>${safe(m.from||"ELVES HQ")}</strong><span class="small muted">${m.ts?new Date(m.ts).toLocaleString():""}</span></div>
      ${m.title?`<div class="small"><em>${safe(m.title)}</em></div>`:""}
      ${m.text?`<div>${safe(m.text)}</div>`:""}
      ${media}
    `;
    $inbox.appendChild(el);
  }
}

function formEl(){ return document.querySelector('form[name="agent-chat"][data-netlify]'); }
async function sendViaForms(text, file){
  const f=formEl();
  if(!f) throw new Error("Form mangler");
  const fd=new FormData(f);
  fd.set("message", text||"");
  fd.set("agent", state.agent?.name || "");
  if(file) fd.set("file", file, file.name);
  const res=await fetch("/", { method:"POST", body:fd });
  if(!res.ok) throw new Error("Submit-feil");
  return true;
}

$send.addEventListener("click", async()=>{
  const t=($msg.value||"").trim();
  const file=($file.files&&$file.files[0])?$file.files[0]:null;
  if(!t && !file){ alert("Skriv en melding eller legg ved fil."); return; }
  $send.disabled=true; $send.textContent="Sender…";
  try{
    await sendViaForms(t,file);
    state.history.push({ ts:Date.now(), title:(t.slice(0,80)|| (file?`Sendte fil: ${file.name}`:"Melding")), body:t, file:file?file.name:null });
    save(); renderHistory(); $msg.value=""; if($file) $file.value="";
    alert("Sendt!");
  }catch(e){ alert("Kunne ikke sende meldingen."); }
  finally{ $send.disabled=false; $send.textContent="SEND"; }
});

$clear.addEventListener("click", ()=>{ $msg.value=""; if($file) $file.value=""; });

function renderHistory(){
  if(!state.history.length){ $hist.textContent="Ingen rapporter enda."; return; }
  const html = state.history.slice().sort((a,b)=>(a.ts||0)-(b.ts||0)).map(r=>{
    const ts = new Date(r.ts).toLocaleString();
    const title = safe(r.title||"Melding"); const body=safe(r.body||"");
    const file = r.file?`<div class="muted">Fil: ${safe(r.file)}</div>`:"";
    return `<div class="msg"><div class="head"><strong>${title}</strong><span class="small muted">${ts}</span></div>${body?`<div>${body}</div>`:""}${file}</div>`;
  }).join("");
  $hist.innerHTML = html;
}
