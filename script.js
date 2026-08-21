import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ---------- Supabase 설정 (변경 금지) ----------
const SUPABASE_URL = "https://nilmeyawbzjhlgfkjvtw.supabase.co";
const SUPABASE_KEY = "sb_publishable_qSoI-dlShMJb0HK7gli8tA_X9dlzqZZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ---------- 로컬 작업용 탭 위장 ----------
// 파일로 직접 열거나 localhost로 볼 때만 탭 제목·아이콘을 평범한 문서처럼 바꿔요.
// 실제 배포된 사이트에서는 적용되지 않고 원래 제목·하트 파비콘이 그대로 나옵니다.
const STEALTH_TITLE = "업무자료_정리.docx"; // 원하는 제목으로 바꿔도 돼요
if (location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname)) {
  document.title = STEALTH_TITLE;
  const icon = document.querySelector('link[rel="icon"]');
  if (icon) icon.href = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="3" y="1" width="10" height="14" rx="1.5" fill="#e8eaed" stroke="#9aa0a6" stroke-width=".8"/><path d="M5 5h6M5 7.5h6M5 10h4" stroke="#9aa0a6" stroke-width=".9" stroke-linecap="round"/></svg>');

  // 보스 키: F9를 누르면 화면 전체가 평범한 문서 화면으로 바뀌고, 다시 F9를 누르면 돌아와요.
  let bossOverlay = null;
  window.addEventListener("keydown", (event) => {
    if (event.key !== "F9") return;
    event.preventDefault();
    if (!bossOverlay) {
      bossOverlay = document.createElement("div");
      bossOverlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:#f1f3f4;display:none;flex-direction:column;font-family:'Malgun Gothic','Segoe UI',sans-serif;color:#202124";
      bossOverlay.innerHTML = `
        <div style="background:#fff;border-bottom:1px solid #dadce0;padding:10px 20px 6px">
          <div style="font-size:15px;font-weight:600">업무자료_정리</div>
          <div style="font-size:12px;color:#5f6368;margin-top:4px;display:flex;gap:14px"><span>파일</span><span>수정</span><span>보기</span><span>삽입</span><span>서식</span><span>도구</span><span>도움말</span></div>
        </div>
        <div style="flex:1;overflow:auto;padding:36px 0">
          <div style="width:min(760px,92%);margin:0 auto;background:#fff;border:1px solid #dadce0;padding:72px 84px;line-height:1.9;font-size:13.5px">
            <h1 style="font-size:20px;margin:0 0 26px">3분기 업무 프로세스 개선안 (초안)</h1>
            <p style="margin:0 0 14px"><b>1. 개요</b><br>현재 운영 중인 콘텐츠 제작 프로세스의 단계별 소요 시간을 점검하고, 반복 업무의 효율화를 위한 개선 방향을 정리한다.</p>
            <p style="margin:0 0 14px"><b>2. 현황 분석</b><br>제작 요청 접수부터 최종 검수까지 평균 4.2일이 소요되며, 이 중 피드백 대기 시간이 전체의 38%를 차지한다. 특히 시안 확정 단계에서 평균 1.6회의 재수정이 발생하고 있다.</p>
            <p style="margin:0 0 14px"><b>3. 개선 방향</b><br>① 요청 양식 표준화를 통한 초기 커뮤니케이션 비용 절감<br>② 시안 단계 체크리스트 도입으로 재수정 횟수 최소화<br>③ 자주 사용하는 소스의 템플릿화 및 공용 라이브러리 구축</p>
            <p style="margin:0"><b>4. 기대 효과</b><br>위 개선안 적용 시 건당 평균 제작 기간을 3일 이내로 단축할 수 있을 것으로 예상되며, 세부 실행 일정은 팀 논의 후 확정 예정.</p>
          </div>
        </div>`;
      document.body.appendChild(bossOverlay);
    }
    bossOverlay.style.display = bossOverlay.style.display === "none" ? "flex" : "none";
  });
}

const categories = ["콘텐츠 디자인", "광고·캠페인", "상세·랜딩페이지", "웹디자인", "퍼블리싱", "AI·그래픽"];

// 카테고리별 배지 색상 매핑 (화면 표시 전용 — 데이터에는 영향 없음)
// 메인 Selected Works, /archive 카드, 상세 팝업에서 공통으로 사용한다.
const CATEGORY_BADGE_CLASS = {
  "콘텐츠 디자인": "cat-pink",
  "광고·캠페인": "cat-coral",
  "상세·랜딩페이지": "cat-lavender",
  "웹디자인": "cat-mint",
  "퍼블리싱": "cat-blue",
};
// 등록되지 않은 카테고리는 기본 라벤더 배지(cat-default)
const categoryBadgeClass = (category) => `cat-badge ${CATEGORY_BADGE_CLASS[category] || "cat-default"}`;
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

// thumbnail 값(DB jsonb 컬럼) 정리 — 잘못된 값이 들어와도 안전한 범위로 보정
const normalizeThumbnail = (raw) => raw && typeof raw === "object" ? ({
  mode: ["auto", "cover", "contain"].includes(raw.mode) ? raw.mode : "cover",
  scale: Math.min(3, Math.max(1, Number(raw.scale) || 1)),
  x: Math.min(50, Math.max(-50, Number(raw.x) || 0)),
  y: Math.min(50, Math.max(-50, Number(raw.y) || 0)),
}) : null;

// 새 방식(thumbnail 컬럼) 우선, 없으면 예전 방식(설명 뒤 주석 마커)에서 읽기
const parseWorkMeta = (row) => {
  const legacy = readThumbnailSettings(row.description || "");
  return { description: legacy.description, thumbnail: normalizeThumbnail(row.thumbnail) || legacy.thumbnail };
};
const thumbnailStyle = (thumbnail) => {
  // 자동 맞춤: 가운데 고정
  if (thumbnail.mode === "auto") return "object-fit:cover;object-position:50% 50%;transform:none";
  // 꽉 채우기: object-position으로 이미지 '안'을 이동 → 여백이 절대 생기지 않고, 긴 이미지도 끝까지 이동 가능
  if (thumbnail.mode === "cover") return `object-fit:cover;object-position:${50 - thumbnail.x}% ${50 - thumbnail.y}%;transform:scale(${thumbnail.scale})`;
  // 전체 보기: 기존처럼 translate 이동 (빈 공간은 흐린 배경이 채움)
  return `object-fit:contain;transform:translate(${thumbnail.x}%,${thumbnail.y}%) scale(${thumbnail.scale})`;
};
const thumbnailHTML = (url, title, thumbnail) => !url ? `<span>IMAGE COMING SOON</span>` : `${thumbnail.mode === "contain" ? `<img class="thumbnail-blur" src="${url}" alt="" aria-hidden="true" loading="lazy">` : ""}<img class="thumbnail-main" src="${url}" alt="${escapeHTML(title)}" style="${thumbnailStyle(thumbnail)}" loading="lazy">`;

// ---------- 메인 Selected Works 전용 썸네일 ----------
// 타일을 항상 꽉 채우는 cover 방식 (블러 배경·레터박스 없음).
// 아카이브·상세 팝업·관리자 편집 화면은 기존 thumbnailHTML을 그대로 사용한다.
const homeThumbnailStyle = (thumbnail) => {
  // 관리자에서 저장한 위치(초점)가 있으면 object-position에 반영, 없으면 중앙
  if (thumbnail.mode === "cover") return `object-fit:cover;object-position:${50 - thumbnail.x}% ${50 - thumbnail.y}%;transform:scale(${thumbnail.scale})`;
  if (thumbnail.mode === "contain") return `object-fit:cover;object-position:${50 - thumbnail.x}% ${50 - thumbnail.y}%;transform:none`;
  return "object-fit:cover;object-position:center;transform:none";
};
const homeThumbnailHTML = (url, title, thumbnail) => !url ? `<span>IMAGE COMING SOON</span>` : `<img class="thumbnail-main home-thumb-cover" src="${url}" alt="${escapeHTML(title)}" style="${homeThumbnailStyle(thumbnail)}" loading="lazy">`;

// ---------- Supabase 데이터 ----------
async function signedUrl(path) {
  if (!path) return "";
  const { data } = await supabase.storage.from("portfolio-images").createSignedUrl(path, 86400); // 24시간 (짧으면 탭을 오래 열어둘 때 이미지가 깨져요)
  return data?.signedUrl || "";
}

async function getPublicWorks(limit) {
  let query = supabase.from("works").select("*, work_images(*)").eq("is_public", true)
    .order("is_pinned", { ascending: false }).order("is_featured", { ascending: false }).order("start_date", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return Promise.all((data || []).map(async (row) => {
    const parsed = parseWorkMeta(row);
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
  bindArchiveModal(); // 홈에서도 같은 상세 팝업 사용
  getPublicWorks(4).then((works) => {
    const grid = document.querySelector("#home-work-grid");
    grid.className = "home-work-grid";
    // 카드 정보는 이미지 하단 그라데이션 오버레이 위에 배지 + 제목만 표시 (날짜·도구는 상세 팝업에서)
    grid.innerHTML = works.map((work) => `<button type="button" class="home-work-card" data-id="${work.id}"><div class="home-work-image">${homeThumbnailHTML(work.coverUrl, work.title, work.thumbnail)}<em>VIEW ↗</em><div class="home-work-overlay"><span class="${categoryBadgeClass(work.category)}">${escapeHTML(work.category)}</span><h3>${escapeHTML(work.title)}</h3></div></div></button>`).join("");
    // 카드 클릭 → 아카이브 이동이 아니라 상세 팝업 열기 (전체 보기 버튼만 아카이브로 이동)
    grid.querySelectorAll(".home-work-card").forEach((card) => card.addEventListener("click", () => openArchiveModal(works.find((work) => work.id === card.dataset.id))));
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
      grid.innerHTML = visible.length ? visible.map((work) => `<button class="archive-card" data-id="${work.id}"><div class="archive-image">${thumbnailHTML(work.coverUrl, work.title, work.thumbnail)}${work.isPinned ? '<span class="pin-label">PINNED ✦</span>' : ""}<span class="view-label">VIEW PROJECT ↗</span></div><div class="archive-card-copy"><span class="${categoryBadgeClass(work.category)}">${escapeHTML(work.category)}</span><h3>${escapeHTML(work.title)}</h3><p>${formatMonthPeriod(work.startDate, work.endDate)} · ${escapeHTML(work.tools.join(" · ") || "DESIGN")}</p></div></button>`).join("") : "이 카테고리에는 공개된 작업이 아직 없어요.";
      grid.querySelectorAll(".archive-card").forEach((card) => card.addEventListener("click", () => openArchiveModal(works.find((work) => work.id === card.dataset.id))));
      moreWrap.style.display = visibleCount < filtered.length ? "" : "none"; // 모두 표시되면 버튼 숨김
    };
    filterBox.addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; filter = button.dataset.filter; visibleCount = PAGE_SIZE; draw(); });
    document.querySelector("#archive-more").addEventListener("click", () => { visibleCount += PAGE_SIZE; draw(); });
    draw();
    // 메인 카드에서 #work-아이디 해시로 넘어온 경우: 해당 작업 상세를 바로 열기
    if (location.hash.startsWith("#work-")) {
      const target = works.find((work) => work.id === decodeURIComponent(location.hash.slice(6)));
      if (target) openArchiveModal(target);
    }
  } catch { document.querySelector("#archive-grid").textContent = "작업을 불러오지 못했어요."; }
}

function closeArchiveModal() {
  const modal = document.querySelector("#archive-modal");
  modal.hidden = true;
  document.body.style.overflow = "";
  // 닫으면 주소의 #work- 해시 제거 (새로고침 시 다시 열리지 않게)
  if (location.hash.startsWith("#work-")) history.replaceState(null, "", location.pathname + location.search);
}

function bindArchiveModal() {
  const modal = document.querySelector("#archive-modal");
  modal.querySelector(".detail-close").addEventListener("click", closeArchiveModal);
  modal.addEventListener("mousedown", (event) => { if (event.target !== modal) return; const bounds = modal.getBoundingClientRect(); const sw = modal.offsetWidth - modal.clientWidth; const sh = modal.offsetHeight - modal.clientHeight; if (!(sw > 0 && event.clientX >= bounds.right - sw) && !(sh > 0 && event.clientY >= bounds.bottom - sh)) closeArchiveModal(); });
  window.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeArchiveModal(); });
}

function openArchiveModal(work) {
  const modal = document.querySelector("#archive-modal");
  const detailCategory = modal.querySelector("#detail-category");
  detailCategory.textContent = work.category;
  detailCategory.className = categoryBadgeClass(work.category);
  modal.querySelector("#detail-heading").textContent = work.title;
  modal.querySelector("#detail-period").textContent = formatMonthPeriod(work.startDate, work.endDate);
  modal.querySelector("#detail-role").textContent = work.role || "DESIGN";
  modal.querySelector("#detail-tools").textContent = work.tools.join(" · ") || "-";
  const description = modal.querySelector("#detail-description");
  description.textContent = work.description || "";
  description.hidden = !work.description;
  modal.querySelector("#detail-images").innerHTML = `${work.coverUrl ? `<img src="${work.coverUrl}" alt="${escapeHTML(work.title)} 대표 이미지">` : ""}${work.images.map((image, index) => `<img src="${image.url}" alt="${escapeHTML(work.title)} 상세 이미지 ${index + 1}" loading="lazy">`).join("")}`;
  modal.scrollTop = 0;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  // 열려 있는 작업을 주소에 남겨서 링크 공유·새로고침에도 유지되게
  history.replaceState(null, "", `#work-${work.id}`);
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
  adminState = { session, form: blankForm(), works: [], editingId: null, coverFile: null, pendingDeletes: [], query: "", filter: "전체", page: 1, pageSize: WORKS_PAGE_SIZE, selected: new Set(), drag: null };
  await loadAdminWorks();
  showAdminView("admin");
  document.querySelector("#account-email").textContent = session.user.email || "";
  document.querySelector("#work-search").value = "";
  document.querySelector("#work-search-clear").hidden = true;
  document.querySelector("#work-filter").value = "전체";
  document.querySelector("#work-page-size").value = String(WORKS_PAGE_SIZE);
  if (!adminEventsBound) { bindAdminEvents(); adminEventsBound = true; }
  updateAdminUI();
}

async function loadAdminWorks() {
  const { data, error } = await supabase.from("works").select("*, work_images(*)").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  adminState.works = await Promise.all((data || []).map(async (row) => { const parsed = parseWorkMeta(row); return { id: row.id, title: row.title, category: row.category, date: row.start_date, endDate: row.end_date || "", tools: row.tools || [], role: row.role || "", description: parsed.description, image: await signedUrl(row.cover_image_path), coverImagePath: row.cover_image_path || "", detailImages: await Promise.all((row.work_images || []).sort((a, b) => a.sort_order - b.sort_order).map(async (image) => ({ id: image.id, kind: "existing", path: image.storage_path, url: await signedUrl(image.storage_path), sortOrder: image.sort_order }))), isPublic: row.is_public, isFeatured: row.is_featured, isPinned: row.is_pinned, thumbnail: parsed.thumbnail }; }));
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
  document.querySelector("#detail-grid").innerHTML = f.detailImages.map((image, index) => `<div draggable="true" data-drag-id="${image.id}"><img src="${image.kind === "pending" ? image.preview : image.url}" alt="상세 이미지 ${index + 1}" draggable="false">${image.kind === "pending" ? '<em class="new-tag">NEW</em>' : ""}<button type="button" data-remove-image="${image.id}" aria-label="이미지 제거">×</button><div class="img-order"><button type="button" data-move-image="${image.id}" data-dir="-1" aria-label="앞으로" ${index === 0 ? "disabled" : ""}>◀</button><button type="button" data-move-image="${image.id}" data-dir="1" aria-label="뒤로" ${index === f.detailImages.length - 1 ? "disabled" : ""}>▶</button></div></div>`).join("");
  document.querySelector("#works-count").textContent = adminState.works.length;
  drawWorksTable();
}

const WORKS_PAGE_SIZE = 10; // 목록 한 페이지에 보여줄 기본 개수
let worksTableVisibleIds = []; // 현재 페이지에 보이는 작업 id (전체 선택용)

function drawWorksTable() {
  // 삭제 등으로 사라진 작업은 선택 목록에서 정리
  adminState.selected = new Set([...adminState.selected].filter(id => adminState.works.some(w => w.id === id)));
  const q = adminState.query.trim().toLowerCase();
  // 검색: 제목 + 사용 도구 + 설명
  const rows = adminState.works.filter(w =>
    (adminState.filter === "전체" || w.category === adminState.filter) &&
    (!q || [w.title, w.description, ...w.tools].join(" ").toLowerCase().includes(q)));
  // 페이지 계산 (pageSize 0 = 전체 보기 / 삭제 등으로 페이지가 넘치면 마지막 페이지로 보정)
  const size = adminState.pageSize === 0 ? Math.max(rows.length, 1) : adminState.pageSize;
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  adminState.page = Math.min(Math.max(1, adminState.page || 1), totalPages);
  const visible = rows.slice((adminState.page - 1) * size, adminState.page * size);
  worksTableVisibleIds = visible.map(w => w.id);
  document.querySelector("#works-table").innerHTML = visible.map(w => `<tr><td><input type="checkbox" data-check="${w.id}" aria-label="${escapeHTML(w.title)} 선택" ${adminState.selected.has(w.id) ? "checked" : ""}></td><td><div class="work-name"><div class="mini-thumb">${w.image ? `<img src="${w.image}" alt="">` : "IMG"}</div><strong>${escapeHTML(w.title)}</strong></div></td><td><span class="table-category">${escapeHTML(w.category)}</span></td><td>${formatPeriod(w.date, w.endDate)}</td>${[["isPublic", "공개"], ["isFeatured", "메인"], ["isPinned", "고정"]].map(([key, label]) => `<td><button class="toggle ${w[key] ? "on" : ""}" data-toggle="${key}" data-id="${w.id}" aria-pressed="${w[key]}" aria-label="${escapeHTML(w.title)} ${label} ${w[key] ? "끄기" : "켜기"}"><i></i></button></td>`).join("")}<td><div class="row-actions"><button data-edit="${w.id}">수정</button><button class="danger" data-delete="${w.id}">삭제</button></div></td></tr>`).join("");
  document.querySelector("#works-empty").textContent = rows.length ? "" : "등록된 작업이 없어요.";
  // 전체 선택 체크박스·일괄 작업 바 상태
  const selectAll = document.querySelector("#select-all");
  selectAll.checked = visible.length > 0 && visible.every(w => adminState.selected.has(w.id));
  selectAll.indeterminate = !selectAll.checked && visible.some(w => adminState.selected.has(w.id));
  document.querySelector("#bulk-bar").hidden = adminState.selected.size === 0;
  document.querySelector("#bulk-count").textContent = adminState.selected.size;
  const pager = document.querySelector("#works-pagination");
  pager.hidden = totalPages <= 1;
  // 숫자 버튼을 10개 단위 블록으로 표시: 1~10 → ▶ 누르면 11~20 …
  const BLOCK = 10;
  const blockStart = Math.floor((adminState.page - 1) / BLOCK) * BLOCK + 1;
  const blockEnd = Math.min(blockStart + BLOCK - 1, totalPages);
  let numButtons = "";
  for (let i = blockStart; i <= blockEnd; i++) numButtons += `<button type="button" data-page-go="${i}" ${i === adminState.page ? 'class="current" aria-current="page"' : ""}>${i}</button>`;
  pager.innerHTML = totalPages <= 1 ? "" : `<button type="button" data-page-go="${blockStart - 1}" aria-label="이전 10페이지" ${blockStart === 1 ? "disabled" : ""}>◀</button>${numButtons}<button type="button" data-page-go="${blockEnd + 1}" aria-label="다음 10페이지" ${blockEnd === totalPages ? "disabled" : ""}>▶</button><span>총 ${rows.length}건</span>`;
}

function addTool(raw) { const tool = raw.trim().replace(/,+$/, ""); if (tool && !adminState.form.tools.some(t => t.toLowerCase() === tool.toLowerCase())) adminState.form.tools.push(tool); const input = document.querySelector("#tool-input"); if (input) input.value = ""; refreshAdminDynamic(); }

function bindAdminEvents() {
  document.querySelector("#logout").addEventListener("click", async () => { await supabase.auth.signOut(); showLogin(); }); document.querySelector("#admin-notice").addEventListener("click", () => document.querySelector("#admin-notice").innerHTML = "");
  document.querySelector("#work-form").addEventListener("input", (event) => { if (event.target.id === "tool-input" || event.target.type === "file") return; syncFormFromInputs(); refreshAdminDynamic(); });
  document.querySelector("#work-form").addEventListener("submit", submitAdminWork); document.querySelector("#cancel-edit").addEventListener("click", () => { adminState.form = blankForm(); adminState.editingId = null; adminState.coverFile = null; adminState.pendingDeletes = []; updateAdminUI(); });
  document.querySelector("#add-tool").addEventListener("click", () => addTool(document.querySelector("#tool-input").value)); document.querySelector("#tool-input").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTool(e.target.value); } }); document.querySelector("#tool-input").addEventListener("blur", e => addTool(e.target.value));
  document.querySelector("#tool-tags").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; adminState.form.tools.splice(Number(b.dataset.removeTool), 1); refreshAdminDynamic(); }); document.querySelector("#tool-suggestions").addEventListener("click", e => { const b = e.target.closest("button"); if (b) addTool(b.dataset.addTool); });
  document.querySelector("#cover-input").addEventListener("change", e => { const file = e.target.files[0]; e.target.value = ""; if (!file) return; if (file.size > 20_000_000) return showNotice("이미지는 한 장당 20MB 이하로 올려 주세요."); adminState.coverFile = file; adminState.form.image = URL.createObjectURL(file); adminState.form.thumbnail = { ...defaultThumbnail }; updateAdminUI(); }); document.querySelector("#remove-cover").addEventListener("click", () => { adminState.coverFile = null; adminState.form.image = ""; adminState.form.coverImagePath = ""; updateAdminUI(); });
  document.querySelector("#detail-input").addEventListener("change", e => {
    const files = [...(e.target.files || [])];
    const oversized = files.filter(f => f.size > 20_000_000);
    if (oversized.length) showNotice(`20MB가 넘는 이미지 ${oversized.length}장은 제외했어요. 한 장당 20MB 이하로 올려 주세요.`);
    files.filter(f => f.size <= 20_000_000).forEach(file => adminState.form.detailImages.push({ id: `${Date.now()}-${Math.random()}`, kind: "pending", file, preview: URL.createObjectURL(file) }));
    e.target.value = "";
    refreshAdminDynamic();
  }); document.querySelector("#detail-grid").addEventListener("click", handleDetailGrid); bindDetailGridDrag();
  document.querySelectorAll(".thumbnail-mode button").forEach(b => b.addEventListener("click", () => { adminState.form.thumbnail = { mode: b.dataset.mode, scale: 1, x: 0, y: 0 }; refreshAdminDynamic(); })); document.querySelector("#zoom-range").addEventListener("input", e => { adminState.form.thumbnail.scale = Number(e.target.value); refreshAdminDynamic(); }); document.querySelector("#zoom-out").addEventListener("click", () => { adminState.form.thumbnail.scale = Math.max(1, Math.round((adminState.form.thumbnail.scale - .1) * 10) / 10); refreshAdminDynamic(); }); document.querySelector("#zoom-in").addEventListener("click", () => { adminState.form.thumbnail.scale = Math.min(3, Math.round((adminState.form.thumbnail.scale + .1) * 10) / 10); refreshAdminDynamic(); }); document.querySelector("#thumb-reset").addEventListener("click", () => { Object.assign(adminState.form.thumbnail, { scale: 1, x: 0, y: 0 }); refreshAdminDynamic(); }); bindThumbnailDrag();
  document.querySelector("#work-search").addEventListener("input", e => { adminState.query = e.target.value; adminState.page = 1; document.querySelector("#work-search-clear").hidden = !e.target.value; drawWorksTable(); });
  document.querySelector("#work-search-clear").addEventListener("click", () => { const input = document.querySelector("#work-search"); input.value = ""; adminState.query = ""; adminState.page = 1; document.querySelector("#work-search-clear").hidden = true; drawWorksTable(); input.focus(); });
  document.querySelector("#work-filter").addEventListener("change", e => { adminState.filter = e.target.value; adminState.page = 1; drawWorksTable(); }); document.querySelector("#works-table").addEventListener("click", handleWorkTable);
  document.querySelector("#works-pagination").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.pageGo) adminState.page = Number(b.dataset.pageGo); else if (b.dataset.pageMove) adminState.page += Number(b.dataset.pageMove); else return; drawWorksTable(); });
  document.querySelector("#work-page-size").addEventListener("change", e => { adminState.pageSize = Number(e.target.value); adminState.page = 1; drawWorksTable(); });
  // 체크박스 선택 + 카테고리 일괄 변경
  document.querySelector("#works-table").addEventListener("change", e => { const box = e.target.closest("input[data-check]"); if (!box) return; box.checked ? adminState.selected.add(box.dataset.check) : adminState.selected.delete(box.dataset.check); drawWorksTable(); });
  document.querySelector("#select-all").addEventListener("change", e => { worksTableVisibleIds.forEach(id => e.target.checked ? adminState.selected.add(id) : adminState.selected.delete(id)); drawWorksTable(); });
  document.querySelector("#bulk-clear").addEventListener("click", () => { adminState.selected.clear(); drawWorksTable(); });
  const bulkSetPublic = async (value) => {
    const ids = [...adminState.selected];
    if (!ids.length) return;
    if (!(await askConfirm(`선택한 ${ids.length}개 작업을 ${value ? "공개" : "비공개"}로 바꿀까요?`, "변경할게요", false))) return;
    const { error } = await supabase.from("works").update({ is_public: value }).in("id", ids);
    if (error) return showNotice(`변경하지 못했어요: ${error.message}`);
    adminState.selected.clear();
    await loadAdminWorks();
    refreshAdminDynamic();
    showNotice(`${ids.length}개 작업을 ${value ? "공개" : "비공개"}로 변경했어요.`);
  };
  document.querySelector("#bulk-public").addEventListener("click", () => bulkSetPublic(true));
  document.querySelector("#bulk-private").addEventListener("click", () => bulkSetPublic(false));
  document.querySelector("#bulk-apply").addEventListener("click", async () => {
    const ids = [...adminState.selected];
    if (!ids.length) return;
    const category = document.querySelector("#bulk-category").value;
    if (!(await askConfirm(`선택한 ${ids.length}개 작업의 카테고리를 '${category}'(으)로 바꿀까요?`, "변경할게요", false))) return;
    const { error } = await supabase.from("works").update({ category }).in("id", ids);
    if (error) return showNotice(`카테고리를 변경하지 못했어요: ${error.message}`);
    adminState.selected.clear();
    await loadAdminWorks();
    refreshAdminDynamic();
    showNotice(`${ids.length}개 작업의 카테고리를 '${category}'(으)로 변경했어요.`);
  });
  // 작성 중 내용이 있으면 새로고침·페이지 이탈 전에 경고
  window.addEventListener("beforeunload", (event) => { if (!adminFormDirty()) return; event.preventDefault(); event.returnValue = ""; });
}

// 저장하지 않은 내용이 있는지 (이탈 경고·수정 불러오기 확인에 사용)
function adminFormDirty() {
  if (!adminState || !adminState.form) return false;
  const f = adminState.form;
  return Boolean(adminState.editingId || f.title.trim() || f.description.trim() || f.tools.length || adminState.coverFile || f.detailImages.some(i => i.kind === "pending") || adminState.pendingDeletes.length);
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

// 작업 행 저장 — thumbnail 컬럼(jsonb)이 있으면 컬럼에, 없으면(예전 DB) 설명 뒤 주석 마커로 저장
async function saveWorkRow(basePayload, f, editingId) {
  const attempt = async (payload) => {
    if (editingId) {
      const { error } = await supabase.from("works").update(payload).eq("id", editingId);
      if (error) throw error;
      return editingId;
    }
    const { data, error } = await supabase.from("works").insert(payload).select("id").single();
    if (error) throw error;
    return data.id;
  };
  try {
    return await attempt({ ...basePayload, description: f.description.trim(), thumbnail: f.thumbnail });
  } catch (error) {
    if (!String(error.message || "").includes("thumbnail")) throw error;
    return attempt({ ...basePayload, description: writeThumbnailSettings(f.description, f.thumbnail) });
  }
}

async function submitAdminWork(event) {
  event.preventDefault();
  syncFormFromInputs();
  const f = adminState.form;
  if (!f.title.trim()) {
    showNotice("작업 제목을 입력해 주세요.");
    // 비어 있는 제목 입력칸으로 이동 + 강조
    const titleInput = document.querySelector("#work-form").title;
    titleInput.scrollIntoView({ behavior: "smooth", block: "center" });
    titleInput.focus({ preventScroll: true });
    titleInput.classList.add("input-error");
    titleInput.addEventListener("input", () => titleInput.classList.remove("input-error"), { once: true });
    return;
  }
  const button = event.currentTarget.querySelector('[type="submit"]');
  const wasEditing = Boolean(adminState.editingId);
  button.disabled = true;
  button.textContent = "저장 중…";
  try {
    const basePayload = { title: f.title.trim(), category: f.category, start_date: f.date, end_date: f.endDate || null, tools: f.tools, role: f.role || null, is_public: f.isPublic, is_featured: f.isFeatured, is_pinned: f.isPinned };
    const id = await saveWorkRow(basePayload, f, adminState.editingId);

    // 대표 이미지 업로드
    if (adminState.coverFile) {
      button.textContent = "대표 이미지 업로드 중…";
      const path = `${id}/cover-${Date.now()}.webp`;
      await uploadImage(adminState.coverFile, path);
      const { error } = await supabase.from("works").update({ cover_image_path: path }).eq("id", id);
      if (error) throw error;
      if (f.coverImagePath) await supabase.storage.from("portfolio-images").remove([f.coverImagePath]);
    }

    // 삭제 표시된 상세 이미지를 이 시점에 실제로 삭제 (그 전까진 취소로 되돌릴 수 있어요)
    if (adminState.pendingDeletes.length) {
      button.textContent = "이미지 정리 중…";
      const { error } = await supabase.from("work_images").delete().in("id", adminState.pendingDeletes.map(d => d.id));
      if (error) throw error;
      await supabase.storage.from("portfolio-images").remove(adminState.pendingDeletes.map(d => d.path));
    }

    // 상세 이미지: 새 이미지 업로드 + 화면 순서대로 sort_order 반영
    const pendingCount = f.detailImages.filter(i => i.kind === "pending").length;
    let uploaded = 0;
    for (let index = 0; index < f.detailImages.length; index++) {
      const image = f.detailImages[index];
      if (image.kind === "pending") {
        uploaded += 1;
        button.textContent = `상세 이미지 업로드 중… (${uploaded}/${pendingCount})`;
        const path = `${id}/detail-${Date.now()}-${index}.webp`;
        await uploadImage(image.file, path);
        const { error } = await supabase.from("work_images").insert({ work_id: id, storage_path: path, sort_order: index });
        if (error) throw error;
      } else if (image.sortOrder !== index) {
        const { error } = await supabase.from("work_images").update({ sort_order: index }).eq("id", image.id);
        if (error) throw error;
      }
    }

    adminState.form = blankForm();
    adminState.editingId = null;
    adminState.coverFile = null;
    adminState.pendingDeletes = [];
    await loadAdminWorks();
    updateAdminUI(wasEditing ? "작업을 수정했어요." : "작업을 저장했어요.");
  } catch (error) {
    showNotice(`저장하지 못했어요: ${error.message || "알 수 없는 오류"}`);
    button.disabled = false;
    button.textContent = wasEditing ? "수정 완료" : "작업 등록하기";
  }
}

// 상세 이미지 드래그 정렬 — 놓으면 화면 순서를 상태에 반영 (저장 시 sort_order 저장)
function bindDetailGridDrag() {
  const grid = document.querySelector("#detail-grid");
  let draggingEl = null;
  grid.addEventListener("dragstart", (event) => {
    const tile = event.target.closest("[data-drag-id]");
    if (!tile) return;
    draggingEl = tile;
    tile.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", tile.dataset.dragId);
  });
  grid.addEventListener("dragover", (event) => {
    if (!draggingEl) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const over = event.target.closest("[data-drag-id]");
    if (!over || over === draggingEl) return;
    const tiles = [...grid.querySelectorAll("[data-drag-id]")];
    grid.insertBefore(draggingEl, tiles.indexOf(draggingEl) < tiles.indexOf(over) ? over.nextSibling : over);
  });
  grid.addEventListener("drop", (event) => event.preventDefault());
  grid.addEventListener("dragend", () => {
    if (!draggingEl) return;
    draggingEl.classList.remove("dragging");
    draggingEl = null;
    const order = [...grid.querySelectorAll("[data-drag-id]")].map(tile => tile.dataset.dragId);
    adminState.form.detailImages.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    refreshAdminDynamic();
  });
}

// 상세 이미지 ×(제거)·◀▶(순서 이동) — 저장을 눌러야 실제 반영
function handleDetailGrid(event) {
  const button = event.target.closest("button");
  if (!button) return;
  const list = adminState.form.detailImages;
  if (button.dataset.moveImage) {
    const from = list.findIndex(i => i.id === button.dataset.moveImage);
    const to = from + Number(button.dataset.dir);
    if (from < 0 || to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]];
    return refreshAdminDynamic();
  }
  if (!button.dataset.removeImage) return;
  const index = list.findIndex(i => i.id === button.dataset.removeImage);
  if (index < 0) return;
  const image = list[index];
  if (image.kind === "existing") adminState.pendingDeletes.push({ id: image.id, path: image.path });
  else URL.revokeObjectURL(image.preview);
  list.splice(index, 1);
  refreshAdminDynamic();
}

async function handleWorkTable(event) {
  const button = event.target.closest("button");
  if (!button) return;
  const id = button.dataset.id || button.dataset.edit || button.dataset.delete;
  const work = adminState.works.find(w => w.id === id);
  if (!work) return;
  if (button.dataset.edit) {
    // 작성 중인 내용이 있으면 덮어쓰기 전에 확인
    if (adminFormDirty() && !(await askConfirm("작성 중인 내용이 있어요. 이 작업을 불러오면 지금 내용은 사라져요.", "불러오기", false))) return;
    adminState.form = structuredClone(work);
    adminState.editingId = id;
    adminState.coverFile = null;
    adminState.pendingDeletes = [];
    updateAdminUI("수정할 내용을 불러왔어요.");
    scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if (button.dataset.delete) {
    if (!(await askConfirm("이 작업과 연결된 이미지를 모두 삭제할까요? 되돌릴 수 없어요."))) return;
    const paths = [work.coverImagePath, ...work.detailImages.map(i => i.path)].filter(Boolean);
    if (paths.length) await supabase.storage.from("portfolio-images").remove(paths);
    const { error } = await supabase.from("works").delete().eq("id", id);
    if (error) return showNotice(`작업을 삭제하지 못했어요: ${error.message}`);
    await loadAdminWorks();
    updateAdminUI("작업을 삭제했어요.");
    return;
  }
  if (button.dataset.toggle) {
    const key = button.dataset.toggle;
    const dbKey = { isPublic: "is_public", isFeatured: "is_featured", isPinned: "is_pinned" }[key];
    const { error } = await supabase.from("works").update({ [dbKey]: !work[key] }).eq("id", id);
    if (error) return showNotice(`설정을 변경하지 못했어요: ${error.message}`);
    await loadAdminWorks();
    refreshAdminDynamic();
  }
}
function showNotice(message) { const box = document.querySelector("#admin-notice"); if (box) box.innerHTML = `<button class="notice">${escapeHTML(message)}<span>닫기 ×</span></button>`; else alert(message); }

// 브라우저 confirm() 대신 사이트 톤에 맞는 확인 모달 (true/false 반환)
function askConfirm(message, confirmLabel = "삭제할게요", danger = true) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `<div class="confirm-card" role="alertdialog" aria-modal="true" aria-label="확인"><p>${escapeHTML(message)}</p><div><button type="button" data-cancel>취소</button><button type="button" class="ok ${danger ? "danger" : ""}" data-ok>${escapeHTML(confirmLabel)}</button></div></div>`;
    const onKey = (event) => { if (event.key === "Escape") close(false); };
    const close = (result) => { window.removeEventListener("keydown", onKey); overlay.remove(); resolve(result); };
    window.addEventListener("keydown", onKey);
    overlay.addEventListener("click", (event) => {
      if (event.target.closest("[data-ok]")) return close(true);
      if (event.target === overlay || event.target.closest("[data-cancel]")) close(false);
    });
    document.body.appendChild(overlay);
    overlay.querySelector("[data-cancel]").focus();
  });
}

// ---------- 현재 페이지 확인 후 초기화 ----------
const page = document.body.dataset.page;
if (page === "admin") initAdmin();
else if (page === "archive") initArchive();
else if (page === "home") initHome();

// ---------- 이름 글린트: 한 번 반짝일 때마다 랜덤 위치로 이동 ----------
document.querySelectorAll(".name-glint").forEach((glint) => {
  const move = () => {
    glint.style.left = 6 + Math.random() * 84 + "%"; // 글자 영역 안 가로 6~90%
    glint.style.right = "auto";
    glint.style.top = 16 + Math.random() * 52 + "%"; // 세로 16~68%
  };
  move();
  glint.addEventListener("animationiteration", move);
});
