const qs=s=>document.querySelector(s);
const $gate=qs("#gate"), $publisher=qs("#publisher"), $inboxView=qs("#inboxView");
const $pin=qs("#pin"), $unlock=qs("#unlock"), $gateMsg=qs("#gateMsg");
const $title=qs("#title"), $text=qs("#text"), $mediaUrl=qs("#mediaUrl"), $mediaType=qs("#mediaType"), $when=qs("#when");
const $publish=qs("#publishBtn"), $preview=qs("#previewBtn"), $list=qs("#list"), $pubMsg=qs("#pubMsg");

let PIN=null;
function safe(s){ return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

$unlock.addEventListener("click", async()=>{
  PIN=($pin.value||"").trim();
  if(!PIN){ $gateMsg.textContent="Skriv PIN."; return; }
  try{
    await fetch("/api/inbox");
    $gate.classList.add("hidden"); $publisher.classList.remove("hidden"); $inboxView.classList.remove("hidden");
    loadList();
  }catch{ $gateMsg.textContent="Kunne ikke åpne admin."; }
});

async function loadList(){
  try{
    const res=await fetch("/api/inbox?ts="+Date.now());
    const items=await res.json();
    renderList(Array.isArray(items)?items:[]);
  }catch{ $list.innerHTML='<div class="muted">Kunne ikke hente liste.</div>'; }
}

function renderList(items){
  if(!items.length){ $list.innerHTML='<div class="muted">Ingen meldinger enda.</div>'; return; }
  items.sort((a,b)=>(b.ts||0)-(a.ts||0));
  $list.innerHTML = items.map(m=>`<div class="msg">
    <div class="head"><strong>${safe(m.title||m.from||"ELVES HQ")}</strong><span class="small muted">${m.ts?new Date(m.ts).toLocaleString():""}</span></div>
    ${m.text?`<div>${safe(m.text)}</div>`:""}
    ${m.media?`<div class="small muted">Media: ${safe(m.media.type)} · ${safe(m.media.url)}</div>`:""}
    ${m.availableAt?`<div class="small muted">Planlagt til: ${new Date(m.availableAt).toLocaleString()}</div>`:""}
  </div>`).join("");
}

$preview.addEventListener("click", ()=>{
  const obj=buildPayload(); alert("Forhåndsvis (JSON):\n\n"+JSON.stringify(obj,null,2));
});

function buildPayload(){
  const ts = Date.now();
  const mediaUrl = ($mediaUrl.value||"").trim();
  const mediaType = ($mediaType.value||"").trim();
  const payload = {
    from: "ELVES HQ",
    title: ($title.value||"").trim(),
    text: ($text.value||"").trim(),
    ts
  };
  if(mediaUrl && mediaType){ payload.media = { type: mediaType, url: mediaUrl }; }
  const when = ($when.value||"").trim();
  if(when){ payload.availableAt = new Date(when).getTime(); }
  return payload;
}

$publish.addEventListener("click", async()=>{
  const body = buildPayload();
  if(!PIN){ alert("PIN mangler."); return; }
  $publish.disabled=true; $publish.textContent="Publiserer…";
  try{
    const res=await fetch("/api/inbox", {
      method:"POST",
      headers: { "content-type":"application/json", "x-admin-pin": PIN },
      body: JSON.stringify(body)
    });
    if(!res.ok){ throw new Error(await res.text()); }
    $pubMsg.textContent = "Publisert!";
    $title.value=""; $text.value=""; $mediaUrl.value=""; $mediaType.value=""; $when.value="";
    await loadList();
  }catch(e){
    alert("Publisering feilet. Sjekk PIN og at funksjonene er deployet.");
  }finally{
    $publish.disabled=false; $publish.textContent="Publiser";
  }
});
