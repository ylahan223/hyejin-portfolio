import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ---------- Supabase 설정 (변경 금지) ----------
const SUPABASE_URL = "https://nilmeyawbzjhlgfkjvtw.supabase.co";
const SUPABASE_KEY = "sb_publishable_qSoI-dlShMJb0HK7gli8tA_X9dlzqZZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const categories = ["콘텐츠 디자인", "광고·캠페인", "상세·랜딩페이지", "웹디자인", "퍼블리싱", "AI·그래픽"];
const quickTools = ["Figma", "Photoshop", "Illustrator", "ChatGPT"];
const defaultThumbnail = { mode: "contain", scale: 1, x: 0, y: 0 };
const thumbnailMarker = "\n\n<!--HYEJIN_THUMBNAIL:";

// ---------- 공통 유틸 ----------
const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character]);
const month = (value = "") => value.slice(0, 7).replace("-", ".");
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const formatPeriod = (start, end) => !start ? "제작일 미입력" : end && end !== start ? `${start} – ${end}` : start;
const formatMonthPeriod = (start, end) => month(end) && month(end) !== month(start) ? `${month(start)} — ${month(end)}` : month(start);

function readThumbnailSettings(description = "") {
  const markerIndex = description.lastIndexOf(thumbnailMarker);
  if (markerIndex < 0) return { description, thumbnail: { ...defaultThumbnail } };
  const raw = description.slice(markerIndex + thumbnailMarker.length, description.endsWith("-->") ? -3 : undefined);
  try {
    const parsed = JSON.parse(raw);
    return {
      description: description.slice(0, markerIndex),
      thumbnail: {
        mode: ["auto", "cover", "contain"].includes(parsed.mode) ? parsed.mode : "cover",
        scale: Math.min(3, Math.max(1, Number(parsed.scale) || 1)),
        x: Math.min(50, Math.max(-50, Number(parsed.x) || 0)),
        y: Math.min(50, Math.max(-50, Number(parsed.y) || 0)),
      },
    };
  } catch {
    return { description, thumbnail: { ...defaultThumbnail } };
  }
}
const writeThumbnailSettings = (description, thumbnail) => `${description.trim()}${thumbnailMarker}${JSON.stringify(thumbnail)}-->`;
const thumbnailStyle = (thumbnail) => {
  // 자동 맞춤: 가운데 고정
  if (thumbnail.mode === "auto") return "object-fit:cover;object-position:50% 50%;transform:none";
  // 꽉 채우기: object-position으로 이미지 '안'을 이동 → 여백이 절대 생기지 않고, 긴 이미지도 끝까지 이동 가능
  if (thumbnail.mode === "cover") return `object-fit:cover;object-position:${50 - thumbnail.x}% ${50 - thumbnail.y}%;transform:scale(${thumbnail.scale})`;
  // 전체 보기: 기존처럼 translate 이동 (빈 공간은 흐린 배경이 채움)
  return `object-fit:contain;transform:translate(${thumbnail.x}%,${thumbnail.y}%) scale(${thumbnail.scale})`;
};
const thumbnailHTML = (url, title, thumbnail) => !url ? `<span>IMAGE COMING SOON</span>` : `${thumbnail.mode === "contain" ? `<img class="thumbnail-blur" src="${url}" alt="" aria-hidden="true">` : ""}<img class="thumbnail-main" src="${url}" alt="${escapeHTML(title)}" style="${thumbnailStyle(thumbnail)}">`;

// ---------- Supabase 데이터 ----------
async function signedUrl(path) {
  if (!path) return "";
  const { data } = await supabase.storage.from("portfolio-images").createSignedUrl(path, 3600);
  return data?.signedUrl || "";
}

async function getPublicWorks(limit) {
  let query = supabase.from("works").select("*, work_images(*)").eq("is_public", true)
    .order("is_pinned", { ascending: false }).order("is_featured", { ascending: false }).order("start_date", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return Promise.all((data || []).map(async (row) => {
    const parsed = readThumbnailSettings(row.description || "");
    return {
      id: row.id, title: row.title, category: row.category, startDate: row.start_date, endDate: row.end_date || "",
      tools: row.tools || [], role: row.role || "", description: parsed.description, thumbnail: parsed.thumbnail,
      coverUrl: await signedUrl(row.cover_image_path), isPinned: row.is_pinned,
      images: await Promise.all((row.work_images || []).sort((a, b) => a.sort_order - b.sort_order)
        .map(async (image) => ({ id: image.id, url: await signedUrl(image.storage_path), sortOrder: image.sort_order }))),
    };
  }));
}

// ---------- 메인 페이지 (index.html) ----------
function initHomeNav() {
  const nav = document.querySelector("#home-nav");
  if (!nav) return;
  const links = [...nav.querySelectorAll("nav a")];
  const burger = document.querySelector("#nav-burger");
  const pairs = links.map((link) => ({ link, section: document.querySelector(link.hash) })).filter((pair) => pair.section);

  const onScroll = () => {
    // 스크롤하면 compact 상태 (높이·여백만 살짝 축소, 숨기지 않음)
    nav.classList.toggle("compact", window.scrollY > 40);
    // 현재 보고 있는 섹션 표시
    const marker = window.scrollY + 170;
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    let current = pairs[0];
    pairs.forEach((pair) => {
      const top = pair.section.getBoundingClientRect().top + window.scrollY;
      if (top <= marker) {
        const currentTop = current.section.getBoundingClientRect().top + window.scrollY;
        if (top >= currentTop) current = pair;
      }
    });
    if (atBottom) current = pairs[pairs.length - 1];
    links.forEach((link) => link.classList.toggle("is-active", link === current.link));
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // 모바일 햄버거 메뉴
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  });
  links.forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("menu-open");
    burger.setAttribute("aria-expanded", "false");
  }));
}

function initHome() {
  initHomeNav();
  getPublicWorks(4).then((works) => {
    const grid = document.querySelector("#home-work-grid");
    grid.className = "home-work-grid";
    grid.innerHTML = works.map((work) => `<a class="home-work-card" href="archive.html"><div class="home-work-image">${thumbnailHTML(work.coverUrl, work.title, work.thumbnail)}<em>VIEW ↗</em></div><div class="home-work-copy"><span>${escapeHTML(work.category)}</span><h3>${escapeHTML(work.title)}</h3><p>${month(work.startDate)} · ${escapeHTML(work.tools.join(" · ") || "DESIGN")}</p></div></a>`).join("");
  }).catch(() => { document.querySelector("#home-work-grid").textContent = "작업을 불러오지 못했어요."; });
}

// ---------- 아카이브 페이지 (archive.html) ----------
async function initArchive() {
  bindArchiveModal();
  try {
    const works = await getPublicWorks(); // 정렬: 상단 고정 → 메인 노출 → 제작 시작일 최신순 (Supabase 쿼리 그대로)
    const PAGE_SIZE = 12;
    let filter = "ALL";
    let visibleCount = PAGE_SIZE;
    const filters = ["ALL", ...new Set(works.map((work) => work.category))];
    const filterBox = document.querySelector("#archive-filters");
    const grid = document.querySelector("#archive-grid");
    const countBox = document.querySelector("#archive-count");
    const moreWrap = document.querySelector("#archive-more-wrap");
    const draw = () => {
      filterBox.innerHTML = filters.map((category) => `<button class="${filter === category ? "active" : ""}" data-filter="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join("");
      const filtered = filter === "ALL" ? works : works.filter((work) => work.category === filter);
      const visible = filtered.slice(0, visibleCount); // 처음 12개, VIEW MORE마다 +12
      countBox.textContent = `${String(visible.length).padStart(2, "0")} / ${String(filtered.length).padStart(2, "0")} PROJECTS`;
      grid.className = visible.length ? "archive-grid" : "archive-state";
      grid.innerHTML = visible.length ? visible.map((work) => `<button class="archive-card" data-id="${work.id}"><div class="archive-image">${thumbnailHTML(work.coverUrl, work.title, work.thumbnail)}${work.isPinned ? '<span class="pin-label">PINNED ✦</span>' : ""}<span class="view-label">VIEW PROJECT ↗</span></div><div class="archive-card-copy"><span>${escapeHTML(work.category)}</span><h3>${escapeHTML(work.title)}</h3><p>${formatMonthPeriod(work.startDate, work.endDate)} · ${escapeHTML(work.tools.join(" · ") || "DESIGN")}</p></div></button>`).join("") : "이 카테고리에는 공개된 작업이 아직 없어요.";
      grid.querySelectorAll(".archive-card").forEach((card) => card.addEventListener("click", () => openArchiveModal(works.find((work) => work.id === card.dataset.id))));
      moreWrap.style.display = visibleCount < filtered.length ? "" : "none"; // 모두 표시되면 버튼 숨김
    };
    filterBox.addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; filter = button.dataset.filter; visibleCount = PAGE_SIZE; draw(); });
    document.querySelector("#archive-more").addEventListener("click", () => { visibleCount += PAGE_SIZE; draw(); });
    draw();
  } catch { document.querySelector("#archive-grid").textContent = "작업을 불러오지 못했어요."; }
}

function closeArchiveModal() {
  const modal = document.querySelector("#archive-modal");
  modal.hidden = true;
  document.body.style.overflow = "";
}

function bindArchiveModal() {
  const modal = document.querySelector("#archive-modal");
  modal.querySelector(".detail-close").addEventListener("click", closeArchiveModal);
  modal.addEventListener("mousedown", (event) => { if (event.target !== modal) return; const bounds = modal.getBoundingClientRect(); const sw = modal.offsetWidth - modal.clientWidth; const sh = modal.offsetHeight - modal.clientHeight; if (!(sw > 0 && event.clientX >= bounds.right - sw) && !(sh > 0 && event.clientY >= bounds.bottom - sh)) closeArchiveModal(); });
  window.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeArchiveModal(); });
}

function openArchiveModal(work) {
  const modal = document.querySelector("#archive-modal");
  modal.querySelector("#detail-category").textContent = work.category;
  modal.querySelector("#detail-heading").textContent = work.title;
  modal.querySelector("#detail-period").textContent = formatMonthPeriod(work.startDate, work.endDate);
  modal.querySelector("#detail-role").textContent = work.role || "DESIGN";
  modal.querySelector("#detail-tools").textContent = work.tools.join(" · ") || "-";
  const description = modal.querySelector("#detail-description");
  description.textContent = work.description || "";
  description.hidden = !work.description;
  modal.querySelector("#detail-images").innerHTML = `${work.coverUrl ? `<img src="${work.coverUrl}" alt="${escapeHTML(work.title)} 대표 이미지">` : ""}${work.images.map((image, index) => `<img src="${image.url}" alt="${escapeHTML(work.title)} 상세 이미지 ${index + 1}">`).join("")}`;
  modal.scrollTop = 0;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

// ---------- 관리자 페이지 (admin.html) ----------
let adminState = null;
let adminEventsBound = false;
const blankForm = () => ({ title: "", category: categories[0], date: today(), endDate: "", tools: [], role: "디자인 100%", description: "", image: "", coverImagePath: "", detailImages: [], isPublic: true, isFeatured: false, isPinned: false, thumbnail: { ...defaultThumbnail } });

function showAdminView(name) {
  const views = { loading: "#admin-loading", login: "#login-view", admin: "#admin-view" };
  Object.entries(views).forEach(([key, selector]) => {
    document.querySelector(selector).style.display = key === name ? "" : "none";
  });
}

async function initAdmin() {
  bindLoginForm();
  const { data } = await supabase.auth.getSession();
  if (!data.session) return showLogin();
  await startAdmin(data.session);
}

function showLogin(notice = "") {
  showAdminView("login");
  document.querySelector("#login-notice").innerHTML = notice ? `<div class="login-notice">${escapeHTML(notice)}</div>` : "";
  const button = document.querySelector("#login-form button");
  button.disabled = false;
  button.textContent = "관리자로 로그인";
}

function bindLoginForm() {
  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true; button.textContent = "로그인 중…";
    const values = new FormData(event.currentTarget);
    const { data, error } = await supabase.auth.signInWithPassword({ email: values.get("email"), password: values.get("password") });
    if (error) showLogin("이메일 또는 비밀번호를 확인해 주세요.");
    else await startAdmin(data.session);
  });
}

async function startAdmin(session) {
  adminState = { session, form: blankForm(), works: [], editingId: null, coverFile: null, pendingImages: [], query: "", filter: "전체", drag: null };
  await loadAdminWorks();
  showAdminView("admin");
  document.querySelector("#account-email").textContent = session.user.email || "";
  document.querySelector("#work-search").value = "";
  document.querySelector("#work-filter").value = "전체";
  if (!adminEventsBound) { bindAdminEvents(); adminEventsBound = true; }
  updateAdminUI();
}

async function loadAdminWorks() {
  const { data, error } = await supabase.from("works").select("*, work_images(*)").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  adminState.works = await Promise.all((data || []).map(async (row) => { const parsed = readThumbnailSettings(row.description || ""); return { id: row.id, title: row.title, category: row.category, date: row.start_date, endDate: row.end_date || "", tools: row.tools || [], role: row.role || "", description: parsed.description, image: await signedUrl(row.cover_image_path), coverImagePath: row.cover_image_path || "", detailImages: await Promise.all((row.work_images || []).sort((a, b) => a.sort_order - b.sort_order).map(async (image) => ({ id: image.id, path: image.storage_path, url: await signedUrl(image.storage_path), sortOrder: image.sort_order }))), isPublic: row.is_public, isFeatured: row.is_featured, isPinned: row.is_pinned, thumbnail: parsed.thumbnail }; }));
}

// 폼 입력값을 상태(adminState.form)에서 화면으로 채우기
function fillFormFromState() {
  const form = document.querySelector("#work-form");
  const f = adminState.form;
  form.title.value = f.title;
  form.category.value = f.category;
  form.date.value = f.date;
  form.endDate.value = f.endDate;
  form.role.value = f.role;
  form.description.value = f.description;
  form.isPublic.checked = f.isPublic;
  form.isFeatured.checked = f.isFeatured;
  form.isPinned.checked = f.isPinned;
  document.querySelector("#tool-input").value = "";
  document.querySelector("#form-mode-title").textContent = adminState.editingId ? "작업 수정" : "새 작업 등록";
  const submit = document.querySelector("#submit-work");
  submit.disabled = false;
  submit.textContent = adminState.editingId ? "수정 완료" : "작업 등록하기";
  document.querySelector("#cancel-edit").style.display = adminState.editingId ? "" : "none";
  document.querySelector("#cover-box").classList.toggle("has-image", Boolean(f.image));
  document.querySelector("#cover-preview").innerHTML = f.image ? `<img src="${f.image}" alt="대표 이미지 미리보기">` : `<div><strong>대표 이미지 선택</strong><span>JPG·PNG·WebP · 최대 20MB</span></div>`;
  document.querySelector("#remove-cover").style.display = f.image ? "" : "none";
}

function updateAdminUI(notice = "") {
  document.querySelector("#admin-notice").innerHTML = notice ? `<button class="notice">${escapeHTML(notice)}<span>닫기 ×</span></button>` : "";
  fillFormFromState();
  refreshAdminDynamic();
}

function syncFormFromInputs() { const form = document.querySelector("#work-form"); if (!form) return; const values = new FormData(form); Object.assign(adminState.form, { title: values.get("title") || "", category: values.get("category") || categories[0], date: values.get("date") || today(), endDate: values.get("endDate") || "", role: values.get("role") || "", description: values.get("description") || "", isPublic: form.isPublic.checked, isFeatured: form.isFeatured.checked, isPinned: form.isPinned.checked }); }

function refreshAdminDynamic() {
  const f = adminState.form;
  document.querySelectorAll(".thumbnail-mode button").forEach(b => b.classList.toggle("active", b.dataset.mode === f.thumbnail.mode));
  const crop = document.querySelector("#thumbnail-crop"); crop.classList.toggle("locked", f.thumbnail.mode === "auto"); crop.innerHTML = f.image ? `${thumbnailHTML(f.image, "썸네일 편집 미리보기", f.thumbnail)}<small>${f.thumbnail.mode === "auto" ? "이미지를 자동으로 가운데 맞춰요" : "이미지를 드래그해 위치를 옮겨보세요"}</small>` : `<span>IMAGE PREVIEW</span>`;
  const card = document.querySelector("#card-thumbnail"); card.innerHTML = f.image ? thumbnailHTML(f.image, "", f.thumbnail) : "<span>IMAGE PREVIEW</span>"; if (f.isPinned) card.insertAdjacentHTML("beforeend", "<em>PIN</em>");
  document.querySelector("#zoom-range").value = f.thumbnail.scale;["#zoom-range", "#zoom-out", "#zoom-in", "#thumb-reset"].forEach(s => document.querySelector(s).disabled = f.thumbnail.mode === "auto");
  document.querySelector("#preview-category").textContent = f.category; document.querySelector("#preview-title").textContent = f.title || "작업 제목이 여기에 표시됩니다"; document.querySelector("#preview-meta").textContent = `${formatPeriod(f.date, f.endDate)} · ${f.tools.join(" · ") || "사용 도구"}`;
  document.querySelector("#tool-tags").innerHTML = f.tools.length ? f.tools.map((tool, index) => `<button type="button" data-remove-tool="${index}">${escapeHTML(tool)}<span>×</span></button>`).join("") : "<small>아직 추가한 도구가 없어요.</small>";
  const counts = new Map(); adminState.works.forEach(w => new Set(w.tools).forEach(t => counts.set(t, (counts.get(t) || 0) + 1))); const suggestions = [...quickTools, ...[...counts].filter(([, n]) => n >= 3).map(([t]) => t).filter(t => !quickTools.includes(t))]; document.querySelector("#tool-suggestions").innerHTML = suggestions.map(t => `<button type="button" data-add-tool="${escapeHTML(t)}" ${f.tools.some(x => x.toLowerCase() === t.toLowerCase()) ? "disabled" : ""}>+ ${escapeHTML(t)}</button>`).join("");
  document.querySelector("#detail-grid").innerHTML = [...f.detailImages.map(i => `<div><img src="${i.url}" alt="등록된 상세 이미지"><button type="button" data-existing-image="${i.id}">×</button></div>`), ...adminState.pendingImages.map(i => `<div><img src="${i.preview}" alt="추가할 상세 이미지"><button type="button" data-pending-image="${i.id}">×</button></div>`)].join("");
  document.querySelector("#works-count").textContent = adminState.works.length;
  drawWorksTable();
}

function drawWorksTable() { const rows = adminState.works.filter(w => (adminState.filter === "전체" || w.category === adminState.filter) && w.title.toLowerCase().includes(adminState.query.toLowerCase())); document.querySelector("#works-table").innerHTML = rows.map(w => `<tr><td><div class="work-name"><div class="mini-thumb">${w.image ? `<img src="${w.image}" alt="">` : "IMG"}</div><strong>${escapeHTML(w.title)}</strong></div></td><td><span class="table-category">${escapeHTML(w.category)}</span></td><td>${formatPeriod(w.date, w.endDate)}</td>${[["isPublic", "공개"], ["isFeatured", "메인"], ["isPinned", "고정"]].map(([key]) => `<td><button class="toggle ${w[key] ? "on" : ""}" data-toggle="${key}" data-id="${w.id}"><i></i></button></td>`).join("")}<td><div class="row-actions"><button data-edit="${w.id}">수정</button><button class="danger" data-delete="${w.id}">삭제</button></div></td></tr>`).join(""); document.querySelector("#works-empty").textContent = rows.length ? "" : "등록된 작업이 없어요."; }

function addTool(raw) { const tool = raw.trim().replace(/,+$/, ""); if (tool && !adminState.form.tools.some(t => t.toLowerCase() === tool.toLowerCase())) adminState.form.tools.push(tool); const input = document.querySelector("#tool-input"); if (input) input.value = ""; refreshAdminDynamic(); }

function bindAdminEvents() {
  document.querySelector("#logout").addEventListener("click", async () => { await supabase.auth.signOut(); showLogin(); }); document.querySelector("#admin-notice").addEventListener("click", () => document.querySelector("#admin-notice").innerHTML = "");
  document.querySelector("#work-form").addEventListener("input", (event) => { if (event.target.id === "tool-input" || event.target.type === "file") return; syncFormFromInputs(); refreshAdminDynamic(); });
  document.querySelector("#work-form").addEventListener("submit", submitAdminWork); document.querySelector("#cancel-edit").addEventListener("click", () => { adminState.form = blankForm(); adminState.editingId = null; adminState.coverFile = null; adminState.pendingImages = []; updateAdminUI(); });
  document.querySelector("#add-tool").addEventListener("click", () => addTool(document.querySelector("#tool-input").value)); document.querySelector("#tool-input").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTool(e.target.value); } }); document.querySelector("#tool-input").addEventListener("blur", e => addTool(e.target.value));
  document.querySelector("#tool-tags").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; adminState.form.tools.splice(Number(b.dataset.removeTool), 1); refreshAdminDynamic(); }); document.querySelector("#tool-suggestions").addEventListener("click", e => { const b = e.target.closest("button"); if (b) addTool(b.dataset.addTool); });
  document.querySelector("#cover-input").addEventListener("change", e => { const file = e.target.files[0]; e.target.value = ""; if (!file) return; if (file.size > 20_000_000) return showNotice("이미지는 한 장당 20MB 이하로 올려 주세요."); adminState.coverFile = file; adminState.form.image = URL.createObjectURL(file); adminState.form.thumbnail = { ...defaultThumbnail }; updateAdminUI(); }); document.querySelector("#remove-cover").addEventListener("click", () => { adminState.coverFile = null; adminState.form.image = ""; adminState.form.coverImagePath = ""; updateAdminUI(); });
  document.querySelector("#detail-input").addEventListener("change", e => { [...(e.target.files || [])].filter(f => f.size <= 20_000_000).forEach(file => adminState.pendingImages.push({ id: `${Date.now()}-${Math.random()}`, file, preview: URL.createObjectURL(file) })); e.target.value = ""; refreshAdminDynamic(); }); document.querySelector("#detail-grid").addEventListener("click", removeDetailImage);
  document.querySelectorAll(".thumbnail-mode button").forEach(b => b.addEventListener("click", () => { adminState.form.thumbnail = { mode: b.dataset.mode, scale: 1, x: 0, y: 0 }; refreshAdminDynamic(); })); document.querySelector("#zoom-range").addEventListener("input", e => { adminState.form.thumbnail.scale = Number(e.target.value); refreshAdminDynamic(); }); document.querySelector("#zoom-out").addEventListener("click", () => { adminState.form.thumbnail.scale = Math.max(1, Math.round((adminState.form.thumbnail.scale - .1) * 10) / 10); refreshAdminDynamic(); }); document.querySelector("#zoom-in").addEventListener("click", () => { adminState.form.thumbnail.scale = Math.min(3, Math.round((adminState.form.thumbnail.scale + .1) * 10) / 10); refreshAdminDynamic(); }); document.querySelector("#thumb-reset").addEventListener("click", () => { Object.assign(adminState.form.thumbnail, { scale: 1, x: 0, y: 0 }); refreshAdminDynamic(); }); bindThumbnailDrag();
  document.querySelector("#work-search").addEventListener("input", e => { adminState.query = e.target.value; drawWorksTable(); }); document.querySelector("#work-filter").addEventListener("change", e => { adminState.filter = e.target.value; drawWorksTable(); }); document.querySelector("#works-table").addEventListener("click", handleWorkTable);
}

function bindThumbnailDrag() {
  const crop = document.querySelector("#thumbnail-crop");
  crop.style.touchAction = "none"; // 터치 기기에서 스크롤 대신 드래그가 되도록
  crop.style.userSelect = "none";
  // 드래그 중에는 DOM을 다시 만들지 않고 이미지 스타일만 갱신 → 부드럽고 끊기지 않음
  const applyLive = () => {
    const style = thumbnailStyle(adminState.form.thumbnail);
    const cropImg = crop.querySelector(".thumbnail-main");
    if (cropImg) cropImg.style.cssText = style;
    const cardImg = document.querySelector("#card-thumbnail .thumbnail-main");
    if (cardImg) cardImg.style.cssText = style;
  };
  crop.addEventListener("pointerdown", e => {
    if (!adminState.form.image || adminState.form.thumbnail.mode === "auto") return; // 자동 맞춤에서는 드래그 비활성화
    e.preventDefault();
    crop.setPointerCapture(e.pointerId);
    adminState.drag = { pointerX: e.clientX, pointerY: e.clientY, x: adminState.form.thumbnail.x, y: adminState.form.thumbnail.y };
  });
  const DRAG_SENSITIVITY = 0.5; // 낮출수록 드래그가 덜 민감해져요 (1 = 원래 속도)
  crop.addEventListener("pointermove", e => {
    if (!adminState.drag) return;
    const bounds = crop.getBoundingClientRect();
    adminState.form.thumbnail.x = Math.min(50, Math.max(-50, adminState.drag.x + (e.clientX - adminState.drag.pointerX) / bounds.width * 100 * DRAG_SENSITIVITY));
    adminState.form.thumbnail.y = Math.min(50, Math.max(-50, adminState.drag.y + (e.clientY - adminState.drag.pointerY) / bounds.height * 100 * DRAG_SENSITIVITY));
    applyLive();
  });
  ["pointerup", "pointercancel"].forEach(name => crop.addEventListener(name, () => {
    if (!adminState.drag) return;
    adminState.drag = null;
    refreshAdminDynamic(); // 드래그가 끝나면 전체 미리보기 동기화
  }));
}

async function optimizeImage(file) { const bitmap = await createImageBitmap(file); const isLong = bitmap.height / bitmap.width > 3; const scale = Math.min(1, (isLong ? 1600 : 1920) / bitmap.width, isLong ? 1 : 1920 / bitmap.height); const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale)); canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close(); return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("이미지 변환에 실패했어요.")), "image/webp", .84)); }
async function uploadImage(file, path) { const blob = await optimizeImage(file); const { error } = await supabase.storage.from("portfolio-images").upload(path, blob, { contentType: "image/webp", upsert: false }); if (error) throw error; return path; }

async function submitAdminWork(event) { event.preventDefault(); syncFormFromInputs(); const f = adminState.form; if (!f.title.trim()) return showNotice("작업 제목을 입력해 주세요."); const button = event.currentTarget.querySelector('[type="submit"]'); button.disabled = true; button.textContent = "저장 중…"; try { const payload = { title: f.title.trim(), category: f.category, start_date: f.date, end_date: f.endDate || null, tools: f.tools, role: f.role || null, description: writeThumbnailSettings(f.description, f.thumbnail), is_public: f.isPublic, is_featured: f.isFeatured, is_pinned: f.isPinned }; let id = adminState.editingId; if (id) { const { error } = await supabase.from("works").update(payload).eq("id", id); if (error) throw error; } else { const { data, error } = await supabase.from("works").insert(payload).select("id").single(); if (error) throw error; id = data.id; } if (adminState.coverFile) { const path = `${id}/cover-${Date.now()}.webp`; await uploadImage(adminState.coverFile, path); const { error } = await supabase.from("works").update({ cover_image_path: path }).eq("id", id); if (error) throw error; if (f.coverImagePath) await supabase.storage.from("portfolio-images").remove([f.coverImagePath]); } for (let index = 0; index < adminState.pendingImages.length; index++) { const path = `${id}/detail-${Date.now()}-${index}.webp`; await uploadImage(adminState.pendingImages[index].file, path); const { error } = await supabase.from("work_images").insert({ work_id: id, storage_path: path, sort_order: f.detailImages.length + index }); if (error) throw error; } const edited = Boolean(adminState.editingId); adminState.form = blankForm(); adminState.editingId = null; adminState.coverFile = null; adminState.pendingImages = []; await loadAdminWorks(); updateAdminUI(edited ? "작업을 수정했어요." : "작업을 Supabase에 저장했어요."); } catch (error) { showNotice(`저장하지 못했어요: ${error.message || "알 수 없는 오류"}`); button.disabled = false; button.textContent = adminState.editingId ? "수정 완료" : "작업 등록하기"; } }

async function removeDetailImage(event) { const button = event.target.closest("button"); if (!button) return; if (button.dataset.pendingImage) { adminState.pendingImages = adminState.pendingImages.filter(i => i.id !== button.dataset.pendingImage); return refreshAdminDynamic(); } const image = adminState.form.detailImages.find(i => i.id === button.dataset.existingImage); if (!image || !confirm("이 상세 이미지를 삭제할까요?")) return; const { error } = await supabase.from("work_images").delete().eq("id", image.id); if (error) return showNotice(`이미지를 삭제하지 못했어요: ${error.message}`); await supabase.storage.from("portfolio-images").remove([image.path]); adminState.form.detailImages = adminState.form.detailImages.filter(i => i.id !== image.id); await loadAdminWorks(); refreshAdminDynamic(); }

async function handleWorkTable(event) { const button = event.target.closest("button"); if (!button) return; const id = button.dataset.id || button.dataset.edit || button.dataset.delete; const work = adminState.works.find(w => w.id === id); if (!work) return; if (button.dataset.edit) { adminState.form = structuredClone(work); adminState.editingId = id; adminState.coverFile = null; adminState.pendingImages = []; updateAdminUI("수정할 내용을 불러왔어요."); scrollTo({ top: 0, behavior: "smooth" }); return; } if (button.dataset.delete) { if (!confirm("이 작업과 연결된 이미지를 모두 삭제할까요?")) return; const paths = [work.coverImagePath, ...work.detailImages.map(i => i.path)].filter(Boolean); if (paths.length) await supabase.storage.from("portfolio-images").remove(paths); const { error } = await supabase.from("works").delete().eq("id", id); if (error) return showNotice(`작업을 삭제하지 못했어요: ${error.message}`); await loadAdminWorks(); updateAdminUI("작업을 삭제했어요."); return; } if (button.dataset.toggle) { const key = button.dataset.toggle; const dbKey = { isPublic: "is_public", isFeatured: "is_featured", isPinned: "is_pinned" }[key]; const { error } = await supabase.from("works").update({ [dbKey]: !work[key] }).eq("id", id); if (error) return showNotice(`설정을 변경하지 못했어요: ${error.message}`); await loadAdminWorks(); refreshAdminDynamic(); } }
function showNotice(message) { const box = document.querySelector("#admin-notice"); if (box) box.innerHTML = `<button class="notice">${escapeHTML(message)}<span>닫기 ×</span></button>`; else alert(message); }

// ---------- 현재 페이지 확인 후 초기화 ----------
const page = document.body.dataset.page;
if (page === "admin") initAdmin();
else if (page === "archive") initArchive();
else if (page === "home") initHome();
