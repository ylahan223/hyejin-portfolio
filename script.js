import { worksData } from "./works-data.js";

// ---------- 로컬 작업용 탭 위장 ----------
const STEALTH_TITLE = "업무자료_정리.docx";
if (location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname)) {
  document.title = STEALTH_TITLE;
  const icon = document.querySelector('link[rel="icon"]');
  if (icon) icon.href = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="3" y="1" width="10" height="14" rx="1.5" fill="#e8eaed" stroke="#9aa0a6" stroke-width=".8"/><path d="M5 5h6M5 7.5h6M5 10h4" stroke="#9aa0a6" stroke-width=".9" stroke-linecap="round"/></svg>');

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
            <p style="margin:0 0 14px"><b>2. 현황 분석</b><br>제작 요청 접수부터 최종 검수까지 평균 4.2일이 소요되며, 이 중 피드백 대기 시간이 전체의 38%를 차지한다.</p>
            <p style="margin:0"><b>3. 개선 방향</b><br>① 요청 양식 표준화<br>② 체크리스트 도입<br>③ 공용 라이브러리 구축</p>
          </div>
        </div>`;
      document.body.appendChild(bossOverlay);
    }
    bossOverlay.style.display = bossOverlay.style.display === "none" ? "flex" : "none";
  });
}

const CATEGORY_BADGE_CLASS = {
  "콘텐츠 디자인": "cat-pink",
  "광고·캠페인": "cat-coral",
  "상세·랜딩페이지": "cat-lavender",
  "웹디자인": "cat-mint",
  "퍼블리싱": "cat-blue",
};
const categoryBadgeClass = (category) => `cat-badge ${CATEGORY_BADGE_CLASS[category] || "cat-default"}`;
const defaultThumbnail = { mode: "contain", scale: 1, x: 0, y: 0 };

const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character]);
const month = (value = "") => value.slice(0, 7).replace("-", ".");
const formatMonthPeriod = (start, end) => month(end) && month(end) !== month(start) ? `${month(start)} — ${month(end)}` : month(start);
const normalizeThumbnail = (raw) => raw && typeof raw === "object" ? ({
  mode: ["auto", "cover", "contain"].includes(raw.mode) ? raw.mode : "cover",
  scale: Math.min(3, Math.max(1, Number(raw.scale) || 1)),
  x: Math.min(50, Math.max(-50, Number(raw.x) || 0)),
  y: Math.min(50, Math.max(-50, Number(raw.y) || 0)),
}) : { ...defaultThumbnail };
const thumbnailStyle = (thumbnail) => {
  if (thumbnail.mode === "auto") return "object-fit:cover;object-position:50% 50%;transform:none";
  if (thumbnail.mode === "cover") return `object-fit:cover;object-position:${50 - thumbnail.x}% ${50 - thumbnail.y}%;transform:scale(${thumbnail.scale})`;
  return `object-fit:contain;transform:translate(${thumbnail.x * thumbnail.scale}%,${thumbnail.y * thumbnail.scale}%) scale(${thumbnail.scale})`;
};
const thumbnailHTML = (url, title, thumbnail) => !url ? `<span>IMAGE COMING SOON</span>` : `${thumbnail.mode === "contain" ? `<img class="thumbnail-blur" src="${url}" alt="" aria-hidden="true" loading="lazy">` : ""}<img class="thumbnail-main" src="${url}" alt="${escapeHTML(title)}" style="${thumbnailStyle(thumbnail)}" loading="lazy">`;
const homeThumbnailStyle = (thumbnail) => {
  if (thumbnail.mode === "cover") return `object-fit:cover;object-position:${50 - thumbnail.x}% ${50 - thumbnail.y}%;transform:scale(${thumbnail.scale})`;
  if (thumbnail.mode === "contain") return `object-fit:cover;object-position:${50 - thumbnail.x}% ${50 - thumbnail.y}%;transform:none`;
  return "object-fit:cover;object-position:center;transform:none";
};
const homeThumbnailHTML = (url, title, thumbnail) => !url ? `<span>IMAGE COMING SOON</span>` : `<img class="thumbnail-main home-thumb-cover" src="${url}" alt="${escapeHTML(title)}" style="${homeThumbnailStyle(thumbnail)}" loading="lazy">`;

// ---------- 정적 작품 데이터 ----------
function getPublicWorks(limit) {
  const works = worksData
    .filter((work) => work.isPublic)
    .map((work) => ({ ...work, thumbnail: normalizeThumbnail(work.thumbnail), images: [...(work.images || [])].sort((a, b) => a.sortOrder - b.sortOrder) }))
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.isPinned && b.isPinned) {
        const pinA = a.pinOrder ?? Number.MAX_SAFE_INTEGER;
        const pinB = b.pinOrder ?? Number.MAX_SAFE_INTEGER;
        if (pinA !== pinB) return pinA - pinB;
      }
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return (b.startDate || "").localeCompare(a.startDate || "");
    });
  return Promise.resolve(limit ? works.slice(0, limit) : works);
}

function initHomeNav() {
  const nav = document.querySelector("#home-nav");
  if (!nav) return;
  const links = [...nav.querySelectorAll("nav a")];
  const burger = document.querySelector("#nav-burger");
  const pairs = links.map((link) => ({ link, section: link.hash ? document.querySelector(link.hash) : null })).filter((pair) => pair.section);
  const onScroll = () => {
    nav.classList.toggle("compact", window.scrollY > 40);
    const marker = window.scrollY + 170;
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    if (!pairs.length) return;
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
  if (burger) {
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
}

function initHome() {
  initHomeNav();
  bindArchiveModal();
  getPublicWorks(4).then((works) => {
    const grid = document.querySelector("#home-work-grid");
    grid.className = "home-work-grid";
    grid.innerHTML = works.map((work) => `<button type="button" class="home-work-card" data-id="${work.id}"><div class="home-work-image">${homeThumbnailHTML(work.coverUrl, work.title, work.thumbnail)}<div class="home-work-overlay"><span class="${categoryBadgeClass(work.category)}">${escapeHTML(work.category)}</span><h3>${escapeHTML(work.title)}</h3></div></div></button>`).join("");
    grid.querySelectorAll(".home-work-card").forEach((card) => card.addEventListener("click", () => openArchiveModal(works.find((work) => work.id === card.dataset.id))));
  }).catch((error) => {
    console.error(error);
    document.querySelector("#home-work-grid").textContent = "작업을 불러오지 못했어요.";
  });
}

async function initArchive() {
  initHomeNav();
  bindArchiveModal();
  try {
    const works = await getPublicWorks();
    const PAGE_SIZE = 12;
    let filter = "ALL";
    let year = "all";
    let selectedMonth = "all";
    let sort = "new";
    let visibleCount = PAGE_SIZE;
    const CATEGORY_ORDER = ["콘텐츠 디자인", "광고·캠페인", "상세·랜딩페이지", "웹디자인", "퍼블리싱", "AI·그래픽"];
    const cats = [...new Set(works.map((work) => work.category))].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
    const filters = ["ALL", ...cats];
    const filterBox = document.querySelector("#archive-filters");
    const grid = document.querySelector("#archive-grid");
    const countBox = document.querySelector("#archive-count");
    const moreWrap = document.querySelector("#archive-more-wrap");
    const yearSelect = document.querySelector("#archive-year");
    const monthSelect = document.querySelector("#archive-month");
    const sortSelect = document.querySelector("#archive-sort");
    const years = [...new Set(works.map((work) => (work.startDate || "").slice(0, 4)).filter(Boolean))].sort().reverse();
    yearSelect.innerHTML = `<option value="all">전체 연도</option>` + years.map((y) => `<option value="${y}">${y}</option>`).join("");

    const draw = () => {
      filterBox.innerHTML = filters.map((category) => `<button class="${filter === category ? "active" : ""}" data-filter="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join("");
      const monthsInYear = year === "all" ? [] : [...new Set(works.filter((work) => (work.startDate || "").startsWith(year)).map((work) => (work.startDate || "").slice(5, 7)).filter(Boolean))].sort();
      if (year === "all" || !monthsInYear.includes(selectedMonth)) selectedMonth = "all";
      monthSelect.disabled = year === "all" || !monthsInYear.length;
      monthSelect.innerHTML = `<option value="all">전체 월</option>` + monthsInYear.map((m) => `<option value="${m}">${Number(m)}월</option>`).join("");
      monthSelect.value = selectedMonth;

      let filtered = works.filter((work) => (filter === "ALL" || work.category === filter)
        && (year === "all" || (work.startDate || "").startsWith(year))
        && (selectedMonth === "all" || (work.startDate || "").slice(5, 7) === selectedMonth));

      if (sort === "old") {
        filtered = filtered.slice().sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
      } else {
        const pinned = filtered.filter((work) => work.isPinned).sort((a, b) => (a.pinOrder ?? Number.MAX_SAFE_INTEGER) - (b.pinOrder ?? Number.MAX_SAFE_INTEGER) || (b.startDate || "").localeCompare(a.startDate || ""));
        const normal = filtered.filter((work) => !work.isPinned).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
        filtered = [...pinned, ...normal];
      }

      const visible = filtered.slice(0, visibleCount);
      countBox.textContent = `${filtered.length} PROJECTS`;
      grid.className = visible.length ? "archive-grid" : "archive-state";
      grid.innerHTML = visible.length ? visible.map((work) => `<button class="archive-card" data-id="${work.id}"><div class="archive-image">${thumbnailHTML(work.coverUrl, work.title, work.thumbnail)}</div><div class="archive-card-copy"><span class="${categoryBadgeClass(work.category)}">${escapeHTML(work.category)}</span><h3>${escapeHTML(work.title)}</h3><p>${formatMonthPeriod(work.startDate, work.endDate)} · ${escapeHTML(work.tools.join(" · ") || "DESIGN")}</p></div></button>`).join("") : "조건에 맞는 작업이 아직 없어요.";
      grid.querySelectorAll(".archive-card").forEach((card) => card.addEventListener("click", () => openArchiveModal(works.find((work) => work.id === card.dataset.id))));
      moreWrap.style.display = visibleCount < filtered.length ? "" : "none";
    };

    filterBox.addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; filter = button.dataset.filter; visibleCount = PAGE_SIZE; draw(); });
    yearSelect.addEventListener("change", () => { year = yearSelect.value; selectedMonth = "all"; visibleCount = PAGE_SIZE; draw(); });
    monthSelect.addEventListener("change", () => { selectedMonth = monthSelect.value; visibleCount = PAGE_SIZE; draw(); });
    sortSelect.addEventListener("change", () => { sort = sortSelect.value; visibleCount = PAGE_SIZE; draw(); });
    document.querySelector("#archive-more").addEventListener("click", () => { visibleCount += PAGE_SIZE; draw(); });
    draw();

    if (location.hash.startsWith("#work-")) {
      const target = works.find((work) => work.id === decodeURIComponent(location.hash.slice(6)));
      if (target) openArchiveModal(target);
    }
  } catch (error) {
    console.error(error);
    document.querySelector("#archive-grid").textContent = "작업을 불러오지 못했어요.";
  }
}

function closeArchiveModal() {
  const modal = document.querySelector("#archive-modal");
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
  if (location.hash.startsWith("#work-")) history.replaceState(null, "", location.pathname + location.search);
}

function bindArchiveModal() {
  const modal = document.querySelector("#archive-modal");
  if (!modal || modal.dataset.bound === "true") return;
  modal.dataset.bound = "true";
  modal.querySelector(".detail-close").addEventListener("click", closeArchiveModal);
  modal.addEventListener("mousedown", (event) => {
    if (event.target !== modal) return;
    const bounds = modal.getBoundingClientRect();
    const sw = modal.offsetWidth - modal.clientWidth;
    const sh = modal.offsetHeight - modal.clientHeight;
    if (!(sw > 0 && event.clientX >= bounds.right - sw) && !(sh > 0 && event.clientY >= bounds.bottom - sh)) closeArchiveModal();
  });
  window.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeArchiveModal(); });
}

function openArchiveModal(work) {
  if (!work) return;
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
  modal.querySelector("#detail-images").innerHTML = `${work.coverUrl ? `<img src="${work.coverUrl}" alt="${escapeHTML(work.title)} 대표 이미지">` : ""}${(work.images || []).map((image, index) => `<img src="${image.url}" alt="${escapeHTML(work.title)} 상세 이미지 ${index + 1}" loading="lazy">`).join("")}`;
  modal.scrollTop = 0;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  history.replaceState(null, "", `#work-${work.id}`);
}

const page = document.body.dataset.page;
if (page === "archive") initArchive();
else if (page === "home") initHome();

// ---------- 이름 글린트 ----------
document.querySelectorAll(".name-glint").forEach((glint) => {
  const move = () => {
    glint.style.left = 6 + Math.random() * 84 + "%";
    glint.style.right = "auto";
    glint.style.top = 16 + Math.random() * 52 + "%";
  };
  move();
  glint.addEventListener("animationiteration", move);
});
