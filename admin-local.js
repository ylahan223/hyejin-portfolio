const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const ROOT_DATA_FILE = "works-data.js";
const DB_NAME = "hyejin-portfolio-admin";
const DB_STORE = "handles";
const DB_KEY = "repo-root";

let rootHandle = null;
let works = [];
let editingId = null;
let coverState = { existingUrl: "", file: null, previewUrl: "" };
let detailState = [];
let removedPaths = [];

const form = $("#work-form");
const supportsFS = "showDirectoryPicker" in window;
if (!supportsFS) $("#unsupported").hidden = false;

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 2800);
}
function today() { return new Date().toISOString().slice(0, 10); }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function escapeHTML(value = "") { return String(value).replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]); }
function cleanDescription(value = "") { return value.replace(/\n\n<!--HYEJIN_THUMBNAIL:[\s\S]*?-->\s*$/,"" ); }
function normalizeThumbnail(raw) {
  return {
    mode: ["contain","cover","auto"].includes(raw?.mode) ? raw.mode : "contain",
    scale: Math.min(3, Math.max(1, Number(raw?.scale) || 1)),
    x: Math.min(50, Math.max(-50, Number(raw?.x) || 0)),
    y: Math.min(50, Math.max(-50, Number(raw?.y) || 0)),
  };
}
function relativePath(url = "") { return url.replace(/^\.\//, ""); }
function fileNameFromPath(path = "") { return path.split("/").pop() || "image"; }

async function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveHandle(handle) {
  try { const db = await openDB(); const tx = db.transaction(DB_STORE,"readwrite"); tx.objectStore(DB_STORE).put(handle, DB_KEY); } catch {}
}
async function loadSavedHandle() {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(DB_STORE,"readonly");
      const req = tx.objectStore(DB_STORE).get(DB_KEY);
      req.onsuccess = () => resolve(req.result || null); req.onerror = () => resolve(null);
    });
  } catch { return null; }
}
async function permission(handle, write = true) {
  if (!handle) return false;
  const opts = write ? { mode: "readwrite" } : {};
  if ((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
}

async function getDir(path, create = false) {
  let dir = rootHandle;
  for (const part of path.split("/").filter(Boolean)) dir = await dir.getDirectoryHandle(part, { create });
  return dir;
}
async function getFileHandle(path, create = false) {
  const parts = path.split("/").filter(Boolean), name = parts.pop();
  const dir = parts.length ? await getDir(parts.join("/"), create) : rootHandle;
  return dir.getFileHandle(name, { create });
}
async function readText(path) { const h = await getFileHandle(path); return (await h.getFile()).text(); }
async function writeText(path, content) {
  const h = await getFileHandle(path, true); const w = await h.createWritable(); await w.write(content); await w.close();
}
async function writeBlob(path, blob) {
  const h = await getFileHandle(path, true); const w = await h.createWritable(); await w.write(blob); await w.close();
}
async function deletePath(path) {
  if (!path) return;
  const parts = relativePath(path).split("/").filter(Boolean), name = parts.pop();
  try { const dir = parts.length ? await getDir(parts.join("/")) : rootHandle; await dir.removeEntry(name); } catch {}
}
async function fileObjectURL(path) {
  if (!path) return "";
  try { return URL.createObjectURL(await (await getFileHandle(relativePath(path))).getFile()); } catch { return ""; }
}

function parseWorksData(text) {
  const match = text.match(/export\s+const\s+worksData\s*=\s*([\s\S]*);\s*$/);
  if (!match) throw new Error("works-data.js 형식을 읽을 수 없어요.");
  return JSON.parse(match[1]);
}
function serializeWorksData(data) {
  return `// Static portfolio data. Managed by admin.html.\n// Do not edit image paths unless you know what you are doing.\nexport const worksData = ${JSON.stringify(data, null, 2)};\n`;
}
async function persistWorks() { await writeText(ROOT_DATA_FILE, serializeWorksData(works)); }

async function connectFolder(forcePicker = false) {
  try {
    let handle = !forcePicker ? await loadSavedHandle() : null;
    if (!handle || !(await permission(handle))) {
      handle = await window.showDirectoryPicker({ mode: "readwrite", id: "hyejin-portfolio" });
      if (!(await permission(handle))) return;
    }
    rootHandle = handle;
    const raw = await readText(ROOT_DATA_FILE);
    works = parseWorksData(raw);
    await getDir("assets/portfolio/covers", true);
    await getDir("assets/portfolio/details", true);
    await saveHandle(rootHandle);
    $("#folder-status").textContent = `${handle.name} 연결됨`;
    $("#folder-status").classList.add("ok");
    $("#new-work").disabled = false; $("#search").disabled = false;
    $("#empty-editor").innerHTML = "<b>연결됐어요.</b><p>왼쪽에서 작업을 선택하거나 새 작업을 등록하세요.</p>";
    renderList(); toast("포트폴리오 폴더를 연결했어요.");
  } catch (error) {
    if (error?.name !== "AbortError") alert(`폴더를 연결하지 못했어요.\n\n${error.message}`);
  }
}

function sortedWorks() {
  return [...works].sort((a,b) => (b.startDate || "").localeCompare(a.startDate || "") || (a.title || "").localeCompare(b.title || ""));
}
async function renderList() {
  const q = $("#search").value.trim().toLowerCase();
  const list = $("#work-list");
  const all = sortedWorks();
  $("#project-count").textContent = works.length;
  const filtered = all.filter(w => !q || `${w.title} ${w.category} ${(w.tools||[]).join(" ")}`.toLowerCase().includes(q));
  if (!filtered.length) { list.innerHTML = '<div class="empty">조건에 맞는 작업이 없어요.</div>'; return; }
  list.innerHTML = filtered.map(w => `<button type="button" class="work-item ${w.id===editingId?"active":""}" data-id="${w.id}"><span class="mini-placeholder" data-thumb="${w.id}"></span><span><b>${escapeHTML(w.title)}</b><small>${escapeHTML(w.category)} · ${(w.startDate||"").slice(0,7).replace("-",".")}${w.isPublic?"":" · 숨김"}</small></span></button>`).join("");
  for (const w of filtered) {
    if (!w.coverUrl) continue;
    const target = list.querySelector(`[data-thumb="${CSS.escape(w.id)}"]`);
    const url = await fileObjectURL(w.coverUrl);
    if (target && url) target.outerHTML = `<img src="${url}" alt="">`;
  }
}

function resetPreviewURLs() {
  if (coverState.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(coverState.previewUrl);
  detailState.forEach(x => { if (x.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(x.previewUrl); });
}
function blankWork() {
  return { id:uid(), title:"", category:"콘텐츠 디자인", startDate:today(), endDate:"", tools:[], role:"디자인 100%", description:"", thumbnail:{mode:"contain",scale:1,x:0,y:0}, coverUrl:"", isPublic:true, isFeatured:false, isPinned:false, pinOrder:null, images:[] };
}
async function editWork(id = null) {
  resetPreviewURLs();
  const w = id ? works.find(x=>x.id===id) : blankWork();
  if (!w) return;
  editingId = id;
  removedPaths = [];
  coverState = { existingUrl:w.coverUrl||"", file:null, previewUrl: await fileObjectURL(w.coverUrl) };
  detailState = await Promise.all((w.images||[]).sort((a,b)=>a.sortOrder-b.sortOrder).map(async (img)=>({ ...img, kind:"existing", file:null, previewUrl:await fileObjectURL(img.url) })));
  form.hidden = false; $("#empty-editor").style.display = "none";
  $("#editor-mode").textContent = id ? "EDIT PROJECT" : "NEW PROJECT";
  $("#editor-title").textContent = id ? "작업 수정" : "새 작업 등록";
  $("#delete-work").hidden = !id;
  form.elements.title.value = w.title||""; form.elements.category.value = w.category||"콘텐츠 디자인"; form.elements.role.value=w.role||"디자인 100%";
  form.elements.startDate.value=w.startDate||""; form.elements.endDate.value=w.endDate||""; form.elements.tools.value=(w.tools||[]).join(", "); form.elements.description.value=cleanDescription(w.description||"");
  const t=normalizeThumbnail(w.thumbnail); form.elements.thumbMode.value=t.mode; form.elements.thumbScale.value=t.scale; form.elements.thumbX.value=t.x; form.elements.thumbY.value=t.y;
  form.elements.isPublic.checked=!!w.isPublic; form.elements.isFeatured.checked=!!w.isFeatured; form.elements.isPinned.checked=!!w.isPinned;
  updateCoverPreview(); renderDetails(); renderList();
}

function thumbnailStyle() {
  const mode=form.elements.thumbMode.value, scale=Number(form.elements.thumbScale.value), x=Number(form.elements.thumbX.value), y=Number(form.elements.thumbY.value);
  if (mode==="auto") return "object-fit:cover;object-position:50% 50%;transform:none";
  if (mode==="cover") return `object-fit:cover;object-position:${50-x}% ${50-y}%;transform:scale(${scale})`;
  return `object-fit:contain;transform:translate(${x*scale}%,${y*scale}%) scale(${scale})`;
}
function updateCoverPreview() {
  const box=$("#cover-preview"), url=coverState.previewUrl;
  const mode=form.elements.thumbMode.value;
  $("#scale-out").value=Number(form.elements.thumbScale.value).toFixed(2); $("#x-out").value=form.elements.thumbX.value; $("#y-out").value=form.elements.thumbY.value;
  box.innerHTML = url ? `${mode==="contain"?`<img class="blur" src="${url}" alt="">`:""}<img class="main" src="${url}" alt="" style="${thumbnailStyle()}">` : "<span>NO IMAGE</span>";
}
function renderDetails() {
  const list=$("#detail-list");
  if (!detailState.length) { list.innerHTML='<div class="empty">상세 이미지가 없어요.</div>'; return; }
  list.innerHTML=detailState.map((img,i)=>`<div class="detail-item" data-index="${i}"><img src="${img.previewUrl}" alt=""><span><b>${escapeHTML(img.file?.name || fileNameFromPath(img.url))}</b><small>${i+1}번째 이미지</small></span><div class="detail-actions"><button type="button" data-move="up" ${i===0?"disabled":""}>↑</button><button type="button" data-move="down" ${i===detailState.length-1?"disabled":""}>↓</button><button type="button" data-remove>×</button></div></div>`).join("");
}

async function optimizeImage(file) {
  const bitmap = await createImageBitmap(file);
  const max = 3000, ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas=document.createElement("canvas"); canvas.width=Math.max(1,Math.round(bitmap.width*ratio)); canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
  canvas.getContext("2d",{alpha:true}).drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close?.();
  const blob = await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("이미지 변환 실패")),"image/webp",0.9));
  return blob;
}
async function saveImage(file, folder, stem) {
  const blob=await optimizeImage(file); const name=`${stem}-${Date.now()}-${Math.random().toString(36).slice(2,7)}.webp`; const path=`assets/portfolio/${folder}/${name}`; await writeBlob(path,blob); return `./${path}`;
}

async function saveForm(event) {
  event.preventDefault();
  if (!rootHandle) return;
  const submit=form.querySelector('[type="submit"]'); submit.disabled=true; submit.textContent="저장 중...";
  try {
    const original = editingId ? works.find(x=>x.id===editingId) : null;
    const id=original?.id || uid();
    let coverUrl=original?.coverUrl || "";
    if (coverState.file) {
      const old=coverUrl; coverUrl=await saveImage(coverState.file,"covers",`${id}__cover`); if (old) removedPaths.push(old);
    }
    const images=[];
    for (let i=0;i<detailState.length;i++) {
      const item=detailState[i]; let url=item.url, imageId=item.id||uid();
      if (item.kind==="new") url=await saveImage(item.file,"details",`${id}__${imageId}__detail`);
      images.push({id:imageId,url,sortOrder:i});
    }
    const work={
      id,title:form.elements.title.value.trim(),category:form.elements.category.value,startDate:form.elements.startDate.value,endDate:form.elements.endDate.value,
      tools:form.elements.tools.value.split(",").map(x=>x.trim()).filter(Boolean),role:form.elements.role.value.trim(),description:form.elements.description.value.trim(),
      thumbnail:{mode:form.elements.thumbMode.value,scale:Number(form.elements.thumbScale.value),x:Number(form.elements.thumbX.value),y:Number(form.elements.thumbY.value)},coverUrl,
      isPublic:form.elements.isPublic.checked,isFeatured:form.elements.isFeatured.checked,isPinned:form.elements.isPinned.checked,pinOrder: original?.pinOrder ?? null,images
    };
    if (!work.title) throw new Error("작업명을 입력해주세요.");
    if (original) works[works.findIndex(x=>x.id===editingId)] = work; else works.unshift(work);
    await persistWorks();
    for (const p of [...new Set(removedPaths)]) if (p!==coverUrl && !images.some(x=>x.url===p)) await deletePath(p);
    editingId=id; removedPaths=[];
    await editWork(id); toast("저장 완료. GitHub Desktop에서 Commit → Push 해주세요.");
  } catch(error) { alert(`저장하지 못했어요.\n\n${error.message}`); }
  finally { submit.disabled=false; submit.textContent="저장"; }
}

$("#connect-folder").addEventListener("click",()=>connectFolder(true));
$("#new-work").addEventListener("click",()=>editWork());
$("#search").addEventListener("input",renderList);
$("#work-list").addEventListener("click",e=>{const b=e.target.closest("[data-id]"); if(b) editWork(b.dataset.id);});
$("#cover-input").addEventListener("change",e=>{const f=e.target.files?.[0]; if(!f)return; coverState.file=f; if(coverState.previewUrl?.startsWith("blob:"))URL.revokeObjectURL(coverState.previewUrl); coverState.previewUrl=URL.createObjectURL(f); updateCoverPreview(); e.target.value="";});
$("#detail-input").addEventListener("change",e=>{for(const f of e.target.files||[]) detailState.push({id:uid(),url:"",sortOrder:detailState.length,kind:"new",file:f,previewUrl:URL.createObjectURL(f)}); renderDetails(); e.target.value="";});
$("#detail-list").addEventListener("click",e=>{const row=e.target.closest("[data-index]"); if(!row)return; const i=Number(row.dataset.index); if(e.target.closest("[data-remove]")){const [item]=detailState.splice(i,1); if(item.kind==="existing"&&item.url)removedPaths.push(item.url); if(item.previewUrl?.startsWith("blob:"))URL.revokeObjectURL(item.previewUrl); renderDetails(); return;} const m=e.target.closest("[data-move]")?.dataset.move; if(m==="up"&&i>0)[detailState[i-1],detailState[i]]=[detailState[i],detailState[i-1]]; if(m==="down"&&i<detailState.length-1)[detailState[i+1],detailState[i]]=[detailState[i],detailState[i+1]]; renderDetails();});
["thumbMode","thumbScale","thumbX","thumbY"].forEach(n=>form.elements[n].addEventListener("input",updateCoverPreview));
form.addEventListener("submit",saveForm);
$("#delete-work").addEventListener("click",async()=>{const w=works.find(x=>x.id===editingId); if(!w||!confirm(`'${w.title}' 작업을 삭제할까요?\n이미지 파일도 로컬 폴더에서 함께 삭제됩니다.`))return; try{for(const p of [w.coverUrl,...(w.images||[]).map(x=>x.url)])await deletePath(p); works=works.filter(x=>x.id!==editingId); await persistWorks(); editingId=null; form.hidden=true; $("#empty-editor").style.display="grid"; $("#empty-editor").innerHTML="<b>삭제했어요.</b><p>GitHub Desktop에서 변경사항을 확인해주세요.</p>"; await renderList(); toast("삭제 완료. Commit → Push 해주세요.");}catch(error){alert(error.message);}});

(async()=>{
  if (!supportsFS) return;
  const saved=await loadSavedHandle();
  if (saved) {
    rootHandle=saved;
    try {
      if ((await saved.queryPermission({mode:"readwrite"}))==="granted") await connectFolder(false);
      else $("#folder-status").textContent="이전 폴더 기억됨 · 연결 버튼을 눌러주세요";
    } catch {}
  }
})();
