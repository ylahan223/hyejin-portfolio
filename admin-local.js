const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const ROOT_DATA_FILE = "works-data.js";
const DB_NAME = "hyejin-portfolio-admin";
const DB_STORE = "handles";
const DB_KEY = "repo-root";
const CATEGORIES = ["콘텐츠 디자인", "광고·캠페인", "상세·랜딩페이지", "웹디자인", "퍼블리싱", "그래픽·인쇄물"];
const QUICK_TOOLS = ["Figma", "Photoshop", "Illustrator", "ChatGPT"];
const DEFAULT_THUMB = { mode: "contain", scale: 1, x: 0, y: 0 };

let rootHandle = null;
let works = [];
let editingId = null;
let formState = blankForm();
let coverState = { existingUrl: "", file: null, previewUrl: "" };
let detailState = [];
let removedPaths = [];
let selected = new Set();
let page = 1;
let pageSize = 10;
let query = "";
let categoryFilter = "전체";
let dragPinId = null;
let saving = false;

async function withSaving(action){
  if(saving)return;
  saving=true; $("#admin-view").inert=true;
  try{return await action();}
  catch(error){showNotice(`저장하지 못했어요: ${error.message}`);}
  finally{saving=false; $("#admin-view").inert=false;}
}

const form = $("#work-form");

function escapeHTML(v = "") { return String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]); }
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function relativePath(url = "") { return url.replace(/^\.\//, ""); }
function filename(path = "") { return path.split("/").pop() || "image"; }
function cleanDescription(v = "") { return v.replace(/\n\n<!--HYEJIN_THUMBNAIL:[\s\S]*?-->\s*$/, ""); }
function normalizeThumb(t) { return { mode:["contain","cover","auto"].includes(t?.mode)?t.mode:"contain", scale:Math.min(3,Math.max(1,Number(t?.scale)||1)), x:Math.min(50,Math.max(-50,Number(t?.x)||0)), y:Math.min(50,Math.max(-50,Number(t?.y)||0)) }; }
function formatPeriod(start,end){ if(!start)return "제작일 미입력"; return end && end!==start ? `${start} – ${end}` : start; }
function showNotice(message) { const box=$("#admin-notice"); box.innerHTML=`<button class="notice">${escapeHTML(message)}<span>닫기 ×</span></button>`; box.querySelector("button")?.addEventListener("click",()=>box.innerHTML=""); }
function blankForm(){ return {title:"",category:CATEGORIES[0],date:today(),endDate:"",tools:[...(works[0]?.tools||[])],role:"디자인 100%",description:"",isPublic:true,isFeatured:false,isPinned:false,thumbnail:{...DEFAULT_THUMB}}; }

async function openDB(){ return new Promise((resolve,reject)=>{ const req=indexedDB.open(DB_NAME,1); req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE); }; req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); }
async function saveHandle(handle){ try{ const db=await openDB(); const tx=db.transaction(DB_STORE,"readwrite"); tx.objectStore(DB_STORE).put(handle,DB_KEY); }catch{} }
async function loadHandle(){ try{ const db=await openDB(); return await new Promise(resolve=>{ const tx=db.transaction(DB_STORE,"readonly"); const req=tx.objectStore(DB_STORE).get(DB_KEY); req.onsuccess=()=>resolve(req.result||null); req.onerror=()=>resolve(null); }); }catch{return null;} }
async function permission(handle){ if(!handle)return false; const opts={mode:"readwrite"}; if(await handle.queryPermission(opts)==="granted")return true; return await handle.requestPermission(opts)==="granted"; }
async function getDir(path,create=false){ let dir=rootHandle; for(const part of path.split("/").filter(Boolean)) dir=await dir.getDirectoryHandle(part,{create}); return dir; }
async function getFileHandle(path,create=false){ const parts=path.split("/").filter(Boolean); const name=parts.pop(); const dir=parts.length?await getDir(parts.join("/"),create):rootHandle; return dir.getFileHandle(name,{create}); }
async function readText(path){ return (await (await getFileHandle(path)).getFile()).text(); }
async function writeText(path,content){ const h=await getFileHandle(path,true); const w=await h.createWritable(); try{await w.write(content);await w.close();}catch(error){try{await w.abort();}catch{}throw error;} }
async function writeBlob(path,blob){ const h=await getFileHandle(path,true); const w=await h.createWritable(); try{await w.write(blob);await w.close();}catch(error){try{await w.abort();}catch{}throw error;} }
async function deletePath(path){ if(!path)return; const parts=relativePath(path).split("/").filter(Boolean); const name=parts.pop(); try{ const dir=parts.length?await getDir(parts.join("/")):rootHandle; await dir.removeEntry(name); }catch{} }
async function objectURL(path){ if(!path)return ""; try{return URL.createObjectURL(await (await getFileHandle(relativePath(path))).getFile());}catch{return "";} }
function parseWorks(text){ const m=text.match(/export\s+const\s+worksData\s*=\s*([\s\S]*);\s*$/); if(!m)throw new Error("works-data.js 형식을 읽을 수 없어요."); return JSON.parse(m[1]); }
function serializeWorks(data){ return `// Static portfolio data. Managed by admin.html.\nexport const worksData = ${JSON.stringify(data,null,2)};\n`; }
async function persist(next){ await writeText(ROOT_DATA_FILE,serializeWorks(next)); works=next; }

async function connectFolder(force=false){
  if (!("showDirectoryPicker" in window)) return alert("최신 Whale/Chrome/Edge에서 열어주세요.");
  try{
    let h=!force?await loadHandle():null;
    if(!h || !(await permission(h))){ h=await window.showDirectoryPicker({mode:"readwrite",id:"hyejin-portfolio"}); if(!(await permission(h)))return; }
    rootHandle=h; works=parseWorks(await readText(ROOT_DATA_FILE)); await getDir("assets/portfolio/covers",true); await getDir("assets/portfolio/details",true); await saveHandle(h);
    $("#folder-status").textContent=`${h.name} 연결됨`; showNotice("포트폴리오 폴더를 연결했어요.");
    resetForm(); renderAll();
  }catch(e){ if(e?.name!=="AbortError") alert(`폴더를 연결하지 못했어요.\n\n${e.message}`); }
}

function sortedWorks(){ return [...works].sort((a,b)=>{ if(!!a.isPinned!==!!b.isPinned)return a.isPinned?-1:1; if(a.isPinned&&b.isPinned){ const pa=a.pinOrder??999999,pb=b.pinOrder??999999; if(pa!==pb)return pa-pb; } return 0; }); }
function filteredWorks(){ const q=query.trim().toLowerCase(); return sortedWorks().filter(w=>(categoryFilter==="전체"||w.category===categoryFilter)&&(!q||`${w.title} ${w.category} ${(w.tools||[]).join(" ")} ${w.description||""}`.toLowerCase().includes(q))); }

async function renderTable(){
  $("#works-count").textContent=works.length;
  selected=new Set([...selected].filter(id=>works.some(w=>w.id===id)));
  const rows=filteredWorks(); const size=pageSize||Math.max(rows.length,1); const pages=Math.max(1,Math.ceil(rows.length/size)); page=Math.min(page,pages);
  const visible=pageSize===0?rows:rows.slice((page-1)*size,page*size);
  const tbody=$("#works-table"); tbody.innerHTML=visible.map(w=>`<tr data-row="${w.id}"><td><input type="checkbox" data-check="${w.id}" ${selected.has(w.id)?"checked":""}></td><td><div class="work-name"><div class="mini-thumb" data-mini="${w.id}">IMG</div><strong>${escapeHTML(w.title)}</strong></div></td><td><span class="table-category">${escapeHTML(w.category)}</span></td><td>${escapeHTML(formatPeriod(w.startDate,w.endDate))}</td>${[["isPublic","공개"],["isFeatured","메인"],["isPinned","중요"]].map(([k,l])=>`<td><button type="button" class="toggle ${w[k]?"on":""}" data-toggle="${k}" data-id="${w.id}" aria-label="${l}"><i></i></button></td>`).join("")}<td><div class="row-actions"><button type="button" data-edit="${w.id}">수정</button><button type="button" class="danger" data-delete="${w.id}">삭제</button></div></td></tr>`).join("");
  $("#works-empty").textContent=rows.length?"":"등록된 작업이 없어요.";
  for(const box of tbody.querySelectorAll("[data-mini]")){
    const button=document.createElement("button");
    button.type="button"; button.className="mini-thumb";
    button.style.border="0"; button.style.padding="0";
    button.dataset.mini=box.dataset.mini; button.dataset.edit=box.dataset.mini;
    button.setAttribute("aria-label",`${visible.find(w=>w.id===box.dataset.mini)?.title || "작업"} 수정`);
    button.title="작업 수정"; button.textContent="IMG"; box.replaceWith(button);
  }
  const pager=$("#works-pagination");
  if(pageSize===0||pages<=1){ pager.hidden=true; pager.innerHTML=""; } else {
    pager.hidden=false;
    const from=Math.floor((page-1)/10)*10+1,to=Math.min(pages,from+9);
    const numbers=Array.from({length:to-from+1},(_,i)=>from+i);
    const nums=numbers.map(n=>`<button type="button" data-page="${n}" class="${n===page?"current":""}" ${n===page?'aria-current="page"':""}>${n}</button>`);
    pager.innerHTML=`<button type="button" data-page="${from-1}" aria-label="이전 10페이지" ${from===1?"disabled":""}>◀</button>${nums.join("")}<button type="button" data-page="${to+1}" aria-label="다음 10페이지" ${to===pages?"disabled":""}>▶</button><span>총 ${rows.length}건</span>`;
  }
  const visibleIds=visible.map(w=>w.id); const allChecked=visibleIds.length&&visibleIds.every(id=>selected.has(id)); $("#select-all").checked=!!allChecked;
  renderBulk();
  for(const w of visible){ if(!w.coverUrl)continue; const box=tbody.querySelector(`[data-mini="${CSS.escape(w.id)}"]`); const u=await objectURL(w.coverUrl); if(box&&u){if(box.isConnected)box.innerHTML=`<img src="${u}" alt="">`;else URL.revokeObjectURL(u);} }
}
function renderBulk(){ $("#bulk-count").textContent=selected.size; $("#bulk-bar").hidden=!selected.size; }
function renderPins(){ const pinned=[...works].filter(w=>w.isPinned).sort((a,b)=>(a.pinOrder??999999)-(b.pinOrder??999999)); $("#pin-count").textContent=pinned.length; $("#pin-list").innerHTML=pinned.map(w=>`<li draggable="true" data-pin-id="${w.id}"><span class="drag-handle">⋮⋮</span><strong>${escapeHTML(w.title)}</strong><small>${escapeHTML(w.category)}</small><button type="button" data-unpin="${w.id}">해제</button></li>`).join(""); }
function renderAll(){ renderTable(); renderPins(); renderToolSuggestions(); }

function revokePreviews(){ if(coverState.previewUrl?.startsWith("blob:"))URL.revokeObjectURL(coverState.previewUrl); detailState.forEach(x=>{if(x.previewUrl?.startsWith("blob:"))URL.revokeObjectURL(x.previewUrl);}); }
function setTools(tags){ formState.tools=[...new Set(tags.map(x=>x.trim()).filter(Boolean))]; $("#tool-tags").innerHTML=formState.tools.map(t=>`<button type="button" data-remove-tool="${escapeHTML(t)}">${escapeHTML(t)} <span>×</span></button>`).join(""); $("#tool-hint").hidden=!!editingId||!formState.tools.some(t=>(works[0]?.tools||[]).includes(t)); }
function renderToolSuggestions(){ const counts=new Map(); works.forEach(w=>new Set(w.tools||[]).forEach(t=>counts.set(t,(counts.get(t)||0)+1))); const s=[...QUICK_TOOLS,...[...counts].filter(([,n])=>n>=3).map(([t])=>t).filter(t=>!QUICK_TOOLS.includes(t))]; $("#tool-suggestions").innerHTML=s.map(t=>`<button type="button" data-add-tool="${escapeHTML(t)}" ${formState.tools.some(x=>x.toLowerCase()===t.toLowerCase())?"disabled":""}>+ ${escapeHTML(t)}</button>`).join(""); }
function addTool(raw){ const parts=raw.split(",").map(x=>x.trim()).filter(Boolean); if(!parts.length)return; setTools([...formState.tools,...parts]); $("#tool-input").value=""; renderToolSuggestions(); updatePreview(); }

async function openWork(id=null){
  if(!rootHandle)return showNotice("먼저 포트폴리오 폴더를 연결해주세요.");
  revokePreviews(); const w=id?works.find(x=>x.id===id):null; editingId=id; removedPaths=[]; formState=w?{...w,tools:[...(w.tools||[])],thumbnail:normalizeThumb(w.thumbnail)}:blankForm();
  coverState={existingUrl:w?.coverUrl||"",file:null,previewUrl:await objectURL(w?.coverUrl||"")};
  detailState=await Promise.all([...(w?.images||[])].sort((a,b)=>a.sortOrder-b.sortOrder).map(async img=>({...img,kind:"existing",file:null,previewUrl:await objectURL(img.url)})));
  form.elements.title.value=formState.title||""; form.elements.category.value=formState.category||CATEGORIES[0]; form.elements.date.value=formState.startDate||formState.date||today(); form.elements.endDate.value=formState.endDate||""; form.elements.role.value=formState.role||"디자인 100%"; form.elements.description.value=cleanDescription(formState.description||""); form.elements.isPublic.checked=!!formState.isPublic; form.elements.isFeatured.checked=!!formState.isFeatured; form.elements.isPinned.checked=!!formState.isPinned;
  setTools(formState.tools||[]); $("#form-mode-title").textContent=id?"작업 수정":"새 작업 등록"; $("#submit-work").textContent=id?"수정 내용 저장":"작업 등록하기"; $("#cancel-edit").style.display=id?"":"none";
  updateCover(); renderDetails(); updatePreview(); renderToolSuggestions(); window.scrollTo({top:0,behavior:"smooth"});
}
function resetForm(){ editingId=null; formState=blankForm(); form.reset(); form.elements.category.value=CATEGORIES[0]; form.elements.date.value=today(); form.elements.role.value="디자인 100%"; form.elements.isPublic.checked=true; setTools(formState.tools); coverState={existingUrl:"",file:null,previewUrl:""}; detailState=[]; removedPaths=[]; $("#form-mode-title").textContent="새 작업 등록"; $("#submit-work").textContent="작업 등록하기"; $("#cancel-edit").style.display="none"; updateCover(); renderDetails(); updatePreview(); renderToolSuggestions(); }

function thumbStyle(t){ if(t.mode==="auto")return "object-fit:cover;object-position:50% 50%;transform:none"; if(t.mode==="cover")return `object-fit:cover;object-position:${50-t.x}% ${50-t.y}%;transform:scale(${t.scale})`; return `object-fit:contain;transform:translate(${t.x*t.scale}%,${t.y*t.scale}%) scale(${t.scale})`; }
function updateCover(){ const crop=$("#thumbnail-crop"), card=$("#card-thumbnail"), u=coverState.previewUrl; const t=formState.thumbnail; $$(".thumbnail-mode button").forEach(b=>b.classList.toggle("active",b.dataset.mode===t.mode)); $("#zoom-range").value=t.scale; const html=u?`${t.mode==="contain"?`<img class="thumbnail-blur" src="${u}" alt="">`:""}<img class="thumbnail-main" src="${u}" alt="" style="${thumbStyle(t)}">`:`<span>IMAGE COMING SOON</span>`; crop.innerHTML=html; card.innerHTML=html; $("#cover-preview").innerHTML=u?`<img src="${u}" alt="대표 이미지 미리보기">`:`<div><strong>대표 이미지 선택</strong><span>JPG·PNG·WebP · 최대 20MB</span></div>`; $("#remove-cover").style.display=u?"":"none"; }
function updatePreview(){ $("#preview-category").textContent=form.elements.category.value||CATEGORIES[0]; $("#preview-title").textContent=form.elements.title.value||"작업 제목"; $("#preview-meta").textContent=`${(form.elements.date.value||"").slice(0,7).replace("-",".")} · ${(formState.tools||[]).join(" · ")||"DESIGN"}`; updateCover(); }
function renderDetails(){ const box=$("#detail-grid"); box.innerHTML=detailState.map((x,i)=>`<div class="detail-item" draggable="true" data-detail-index="${i}"><img src="${x.previewUrl}" alt="" draggable="false"><span>${i+1}</span><button type="button" data-remove-detail="${i}" aria-label="삭제">×</button><div class="img-order"><button type="button" data-move-detail="${i}" data-dir="-1" aria-label="앞으로" ${i===0?"disabled":""}>◀</button><button type="button" data-move-detail="${i}" data-dir="1" aria-label="뒤로" ${i===detailState.length-1?"disabled":""}>▶</button></div></div>`).join(""); }

async function optimizeImage(file){ if(file.size>20_000_000)throw new Error("이미지는 한 장당 20MB 이하로 올려 주세요."); const bitmap=await createImageBitmap(file); const isLong=bitmap.height/bitmap.width>3; const ratio=Math.min(1,(isLong?1600:1920)/bitmap.width,isLong?1:1920/bitmap.height); const c=document.createElement("canvas"); c.width=Math.max(1,Math.round(bitmap.width*ratio)); c.height=Math.max(1,Math.round(bitmap.height*ratio)); c.getContext("2d",{alpha:true}).drawImage(bitmap,0,0,c.width,c.height); bitmap.close?.(); return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("이미지 변환 실패")),"image/webp",0.9)); }
async function saveImage(file,folder,stem){ const blob=await optimizeImage(file),name=`${stem}-${Date.now()}-${Math.random().toString(36).slice(2,7)}.webp`,path=`assets/portfolio/${folder}/${name}`; await writeBlob(path,blob); return `./${path}`; }

async function saveForm(e){
  e.preventDefault(); if(!rootHandle)return showNotice("먼저 포트폴리오 폴더를 연결해주세요.");
  if(!form.elements.title.value.trim()){showNotice("작업 제목을 입력해주세요.");form.elements.title.focus();return;}
  return withSaving(async()=>{
    const original=editingId?works.find(w=>w.id===editingId):null,id=original?.id||uid(); let coverUrl=coverState.existingUrl||"";
    if(coverState.file){ const old=coverUrl; coverUrl=await saveImage(coverState.file,"covers",`${id}__cover`); if(old)removedPaths.push(old); }
    const images=[]; for(let i=0;i<detailState.length;i++){ const item=detailState[i],imageId=item.id||uid(); let url=item.url||""; if(item.kind==="new")url=await saveImage(item.file,"details",`${id}__${imageId}__detail`); images.push({id:imageId,url,sortOrder:i}); }
    const isPinned=form.elements.isPinned.checked; let pinOrder=original?.pinOrder??null; if(isPinned&&pinOrder==null){ const nums=works.filter(w=>w.isPinned&&w.pinOrder!=null).map(w=>w.pinOrder); pinOrder=nums.length?Math.max(...nums)+1:0; } if(!isPinned)pinOrder=null;
    const item={id,title:form.elements.title.value.trim(),category:form.elements.category.value,startDate:form.elements.date.value,endDate:form.elements.endDate.value,tools:[...formState.tools],role:form.elements.role.value.trim(),description:form.elements.description.value.trim(),thumbnail:normalizeThumb(formState.thumbnail),coverUrl,isPublic:form.elements.isPublic.checked,isFeatured:form.elements.isFeatured.checked,isPinned,pinOrder,images};
    const next=original?works.map(w=>w.id===id?item:w):[item,...works];
    await persist(next);
    for(const p of [...new Set(removedPaths)])if(!works.some(w=>w.coverUrl===p||(w.images||[]).some(x=>x.url===p)))await deletePath(p);
    const keepTools=[...item.tools];revokePreviews();resetForm();setTools(keepTools);updatePreview();
    query="";categoryFilter="전체";page=1;$("#work-search").value="";$("#work-search-clear").hidden=true;$("#work-filter").value="전체";
    renderAll();showNotice("저장했어요. 다음 작업을 등록할 수 있어요. GitHub Desktop에서 Commit → Push 해주세요.");
  });
}
async function deleteWork(id){return withSaving(async()=>{const w=works.find(x=>x.id===id);if(!w||!confirm(`'${w.title}' 작업을 삭제할까요?`))return;await persist(works.filter(x=>x.id!==id));for(const p of [w.coverUrl,...(w.images||[]).map(x=>x.url)])if(!works.some(x=>x.coverUrl===p||(x.images||[]).some(i=>i.url===p)))await deletePath(p);selected.delete(id);if(editingId===id)resetForm();renderAll();showNotice("삭제했어요. Commit → Push 해주세요.");});}
async function toggleWork(id,key){return withSaving(async()=>{const original=works.find(x=>x.id===id);if(!original)return;const w={...original,[key]:!original[key]};if(key==="isPinned"){if(w.isPinned&&w.pinOrder==null){const nums=works.filter(x=>x.isPinned&&x.pinOrder!=null&&x.id!==id).map(x=>x.pinOrder);w.pinOrder=nums.length?Math.max(...nums)+1:0;}if(!w.isPinned)w.pinOrder=null;}await persist(works.map(x=>x.id===id?w:x));renderAll();});}
async function bulkUpdate(patch){return withSaving(async()=>{await persist(works.map(w=>selected.has(w.id)?{...w,...patch}:w));renderAll();showNotice(`${selected.size}개 작업을 변경했어요.`);});}

$("#connect-folder").addEventListener("click",()=>connectFolder(true));
form.addEventListener("submit",saveForm);
$("#cancel-edit").addEventListener("click",resetForm);
$("#tool-input").addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===","){e.preventDefault();addTool(e.currentTarget.value);} });
$("#tool-input").addEventListener("blur",e=>{if(e.currentTarget.value.trim()){addTool(e.currentTarget.value);updatePreview();}});
$("#add-tool").addEventListener("click",()=>addTool($("#tool-input").value));
$("#tool-tags").addEventListener("click",e=>{const b=e.target.closest("[data-remove-tool]");if(!b)return;setTools(formState.tools.filter(t=>t!==b.dataset.removeTool));renderToolSuggestions();updatePreview();});
$("#tool-suggestions").addEventListener("click",e=>{const b=e.target.closest("[data-add-tool]");if(b){addTool(b.dataset.addTool);updatePreview();}});
$("#tool-clear").addEventListener("click",()=>{setTools([]);renderToolSuggestions();updatePreview();});
["title","category","date","endDate","role","description"].forEach(n=>form.elements[n]?.addEventListener("input",updatePreview));
["date","endDate"].forEach(name=>form.elements[name].addEventListener("click",e=>{
  try{ e.currentTarget.showPicker?.(); }catch{}
}));
$("#cover-input").addEventListener("change",e=>{const f=e.target.files?.[0];if(!f)return;coverState.file=f;if(coverState.previewUrl?.startsWith("blob:"))URL.revokeObjectURL(coverState.previewUrl);coverState.previewUrl=URL.createObjectURL(f);updateCover();e.target.value="";});
$("#remove-cover").addEventListener("click",()=>{if(coverState.existingUrl)removedPaths.push(coverState.existingUrl);coverState={existingUrl:"",file:null,previewUrl:""};updateCover();});
$("#detail-input").addEventListener("change",e=>{for(const f of e.target.files||[])detailState.push({id:uid(),url:"",sortOrder:detailState.length,kind:"new",file:f,previewUrl:URL.createObjectURL(f)});renderDetails();e.target.value="";});
$("#detail-grid").addEventListener("click",e=>{const b=e.target.closest("[data-remove-detail]");if(!b)return;const i=Number(b.dataset.removeDetail),[x]=detailState.splice(i,1);if(x.kind==="existing"&&x.url)removedPaths.push(x.url);renderDetails();});
$("#detail-grid").addEventListener("click",e=>{const b=e.target.closest("[data-move-detail]");if(!b||b.disabled)return;const from=Number(b.dataset.moveDetail),to=from+Number(b.dataset.dir);if(to<0||to>=detailState.length)return;const [item]=detailState.splice(from,1);detailState.splice(to,0,item);renderDetails();});
let detailDrag=null; $("#detail-grid").addEventListener("dragstart",e=>{const el=e.target.closest("[data-detail-index]");if(el)detailDrag=Number(el.dataset.detailIndex);}); $("#detail-grid").addEventListener("dragover",e=>e.preventDefault()); $("#detail-grid").addEventListener("drop",e=>{e.preventDefault();const el=e.target.closest("[data-detail-index]");if(!el||detailDrag==null)return;const to=Number(el.dataset.detailIndex),[x]=detailState.splice(detailDrag,1);detailState.splice(to,0,x);detailDrag=null;renderDetails();});
$$(".thumbnail-mode button").forEach(b=>b.addEventListener("click",()=>{formState.thumbnail.mode=b.dataset.mode;updateCover();}));
$("#zoom-range").addEventListener("input",e=>{formState.thumbnail.scale=Number(e.target.value);updateCover();}); $("#zoom-out").addEventListener("click",()=>{formState.thumbnail.scale=Math.max(1,formState.thumbnail.scale-.05);updateCover();}); $("#zoom-in").addEventListener("click",()=>{formState.thumbnail.scale=Math.min(3,formState.thumbnail.scale+.05);updateCover();}); $("#thumb-reset").addEventListener("click",()=>{formState.thumbnail={...DEFAULT_THUMB,mode:formState.thumbnail.mode};updateCover();});
let cropStart=null; $("#thumbnail-crop").addEventListener("pointerdown",e=>{if(!coverState.previewUrl)return;cropStart={x:e.clientX,y:e.clientY,ox:formState.thumbnail.x,oy:formState.thumbnail.y};e.currentTarget.setPointerCapture(e.pointerId);}); $("#thumbnail-crop").addEventListener("pointermove",e=>{if(!cropStart)return;formState.thumbnail.x=Math.max(-50,Math.min(50,cropStart.ox+(e.clientX-cropStart.x)/3));formState.thumbnail.y=Math.max(-50,Math.min(50,cropStart.oy+(e.clientY-cropStart.y)/3));updateCover();}); $("#thumbnail-crop").addEventListener("pointerup",()=>cropStart=null);

$("#work-search").addEventListener("input",e=>{query=e.target.value;page=1;$("#work-search-clear").hidden=!query;renderTable();}); $("#work-search-clear").addEventListener("click",()=>{$("#work-search").value="";query="";page=1;$("#work-search-clear").hidden=true;renderTable();}); $("#work-filter").addEventListener("change",e=>{categoryFilter=e.target.value;page=1;renderTable();}); $("#work-page-size").addEventListener("change",e=>{pageSize=Number(e.target.value);page=1;renderTable();});
$("#works-pagination").addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;if(b.dataset.page)page=Number(b.dataset.page);else if(b.dataset.move)page+=Number(b.dataset.move);renderTable();});
$("#works-table").addEventListener("change",e=>{const c=e.target.closest("[data-check]");if(!c)return;c.checked?selected.add(c.dataset.check):selected.delete(c.dataset.check);renderBulk();});
$("#select-all").addEventListener("change",e=>{const rows=filteredWorks(),size=pageSize||rows.length,visible=pageSize===0?rows:rows.slice((page-1)*size,page*size);visible.forEach(w=>e.target.checked?selected.add(w.id):selected.delete(w.id));renderTable();});
$("#works-table").addEventListener("click",e=>{const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]"),tog=e.target.closest("[data-toggle]");if(edit)return openWork(edit.dataset.edit);if(del)return deleteWork(del.dataset.delete);if(tog)return toggleWork(tog.dataset.id,tog.dataset.toggle);});
$("#bulk-clear").addEventListener("click",()=>{selected.clear();renderTable();}); $("#bulk-apply").addEventListener("click",()=>bulkUpdate({category:$("#bulk-category").value})); $("#bulk-public").addEventListener("click",()=>bulkUpdate({isPublic:true})); $("#bulk-private").addEventListener("click",()=>bulkUpdate({isPublic:false}));

const pinList=$("#pin-list");pinList.addEventListener("dragstart",e=>{const li=e.target.closest("[data-pin-id]");if(li)dragPinId=li.dataset.pinId;});pinList.addEventListener("dragover",e=>e.preventDefault());pinList.addEventListener("drop",e=>{e.preventDefault();const target=e.target.closest("[data-pin-id]");if(!target||!dragPinId||target.dataset.pinId===dragPinId)return;const order=[...pinList.querySelectorAll("[data-pin-id]")].map(x=>x.dataset.pinId);const from=order.indexOf(dragPinId),to=order.indexOf(target.dataset.pinId);order.splice(to,0,order.splice(from,1)[0]);withSaving(async()=>{await persist(works.map(w=>order.includes(w.id)?{...w,pinOrder:order.indexOf(w.id)}:w));dragPinId=null;renderAll();});});pinList.addEventListener("click",e=>{const b=e.target.closest("[data-unpin]");if(b)toggleWork(b.dataset.unpin,"isPinned");});

(async()=>{ resetForm(); renderAll(); if(!("showDirectoryPicker" in window)){ showNotice("최신 Whale/Chrome/Edge에서 열어주세요."); return; } const h=await loadHandle(); if(h){ rootHandle=h; try{ if(await h.queryPermission({mode:"readwrite"})==="granted")await connectFolder(false); else $("#folder-status").textContent="이전 폴더 기억됨 · 연결 버튼을 눌러주세요"; }catch{} } })();
