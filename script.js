import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://nilmeyawbzjhlgfkjvtw.supabase.co";
const SUPABASE_KEY = "sb_publishable_qSoI-dlShMJb0HK7gli8tA_X9dlzqZZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const app = document.querySelector("#app");
const categories = ["콘텐츠 디자인", "광고·캠페인", "상세·랜딩페이지", "웹디자인", "퍼블리싱", "AI·그래픽"];
const quickTools = ["Figma", "Photoshop", "Illustrator", "ChatGPT"];
const defaultThumbnail = { mode: "contain", scale: 1, x: 0, y: 0 };
const thumbnailMarker = "\n\n<!--HYEJIN_THUMBNAIL:";

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
const thumbnailStyle = (thumbnail) => `object-fit:${thumbnail.mode === "contain" ? "contain" : "cover"};transform:${thumbnail.mode === "auto" ? "none" : `translate(${thumbnail.x}%,${thumbnail.y}%) scale(${thumbnail.scale})`}`;
const thumbnailHTML = (url, title, thumbnail) => !url ? `<span>IMAGE COMING SOON</span>` : `${thumbnail.mode === "contain" ? `<img class="thumbnail-blur" src="${url}" alt="" aria-hidden="true">` : ""}<img class="thumbnail-main" src="${url}" alt="${escapeHTML(title)}" style="${thumbnailStyle(thumbnail)}">`;

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

function renderHome() {
  document.title = "HYEJIN PORTFOLIO";
  app.innerHTML = `<main class="portfolio-home">
    <div class="home-glow home-glow-a"></div><div class="home-glow home-glow-b"></div>
    <header class="home-nav"><a href="#top" class="home-logo">HYEJIN <span>✦</span></a><nav aria-label="포트폴리오 메뉴"><a href="#work">WORK</a><a href="#about">ABOUT</a><a href="#career">CAREER</a><a href="#skills">SKILLS</a><a href="#contact">CONTACT</a><a href="/archive">ARCHIVE</a></nav></header>
    <section class="home-hero" id="top"><p>WELCOME TO MY LITTLE DESIGN WORLD</p><h1><strong>WORK</strong><i>ARCHIVE</i><span>✦</span></h1><div class="home-hero-copy">콘텐츠 디자인부터 웹과 퍼블리싱까지,<br>제가 만들고 경험한 작업을 모았습니다.</div><a class="home-scroll" href="#work">SCROLL TO EXPLORE ↓</a><b class="home-deco deco-heart">♡</b><b class="home-deco deco-star">✦</b><b class="home-deco deco-spark">✧</b></section>
    <section class="home-work" id="work"><div class="home-section-head"><div><span>SELECTED WORK ✦</span><h2>Recent Projects</h2></div><p>최근 작업 중 대표 작업을 모았습니다.</p></div><div id="home-work-grid" class="home-loading">작업을 불러오는 중이에요 ✦</div><a class="home-more" href="/archive">전체 작업 보기 <span>↗</span></a></section>
    ${aboutSection()}${careerSection()}${skillsSection()}${contactSection()}
  </main>`;
  getPublicWorks(4).then((works) => {
    const grid = document.querySelector("#home-work-grid");
    grid.className = "home-work-grid";
    grid.innerHTML = works.map((work) => `<a class="home-work-card" href="/archive"><div class="home-work-image">${thumbnailHTML(work.coverUrl, work.title, work.thumbnail)}<em>VIEW ↗</em></div><div class="home-work-copy"><span>${escapeHTML(work.category)}</span><h3>${escapeHTML(work.title)}</h3><p>${month(work.startDate)} · ${escapeHTML(work.tools.join(" · ") || "DESIGN")}</p></div></a>`).join("");
  }).catch(() => { document.querySelector("#home-work-grid").textContent = "작업을 불러오지 못했어요."; });
}

function aboutSection() { return `<section class="home-about" id="about"><div class="about-heading"><div><span>MORE ABOUT ME ✦</span><h2>Designing with<br><i>clarity & speed</i></h2></div><p>Experience shaped my strengths</p></div><div class="about-layout"><article class="about-profile"><div class="about-window"><div><i></i><i></i><i></i></div><span>profile / han-hyejin</span><b>♡</b></div><div class="about-profile-body"><div class="about-avatar" aria-hidden="true"><span>H</span><i>✦</i></div><div class="about-intro"><small>WEB DESIGNER · PUBLISHER</small><h3>안녕하세요,<br>웹디자이너 한혜진입니다.</h3><p>중요한 정보는 한눈에 파악할 수 있도록 정리하고,<br>디자인과 퍼블리싱 경험을 바탕으로 빠르고 안정적으로 구현합니다.</p><div class="about-status"><i></i> AVAILABLE FOR NEW OPPORTUNITIES</div></div></div><div class="about-tags"><span>CONTENT DESIGN</span><span>WEB DESIGN</span><span>PUBLISHING</span><span>AI WORKFLOW</span></div></article><div class="about-strengths"><article><span>01</span><div><small>FAST</small><h3>빠른 제작과 정확한 정리</h3><p>업무의 핵심과 우선순위를 빠르게 파악해 안정적인 속도로 결과물을 완성합니다.</p></div><b>↗</b></article><article><span>02</span><div><small>DESIGN + PUBLISHING</small><h3>디자인부터 구현까지</h3><p>시각적인 완성도뿐 아니라 실제 웹에서 자연스럽게 작동하는 방식까지 함께 생각합니다.</p></div><b>↗</b></article><article><span>03</span><div><small>VERSATILE</small><h3>폭넓은 실무 경험</h3><p>콘텐츠·배너·상세페이지·웹디자인을 오가며 목적에 맞는 표현을 유연하게 찾아냅니다.</p></div><b>↗</b></article></div></div><span class="about-deco about-deco-a">♡</span><span class="about-deco about-deco-b">✦</span></section>`; }

function careerSection() { const items = [["2026.04", "— PRESENT", "WEB DESIGNER", "의료·SNS 콘텐츠 디자인", "블로그 콘텐츠를 중심으로 상세페이지, 광고 배너와 이벤트 이미지를 제작합니다.", "CONTENT DESIGN|DETAIL PAGE|BANNER"], ["2024.10", "— 2025.10", "WEB PUBLISHER", "디지털 콘텐츠 퍼블리싱", "HTML·CSS 기반의 디지털 콘텐츠를 구현하고 반응형 대응과 오류 수정을 담당했습니다.", "HTML / CSS|RESPONSIVE|QA"], ["2023.05", "— 2023.07", "WEB DESIGNER", "자사몰·SNS 디자인", "자사몰 배너와 상품 상세페이지, SNS 광고 소재를 목적에 맞게 디자인했습니다.", "WEB BANNER|DETAIL PAGE|SNS ADS"], ["2020.01", "— 2020.12", "WEB DESIGNER", "온라인 스토어 디자인·운영", "상품 상세페이지와 배너를 제작하고 스토어 상품 등록 및 발주 업무를 함께 경험했습니다.", "E-COMMERCE|STORE OPERATION|DESIGN"]]; return `<section class="home-career" id="career"><div class="career-heading"><div><span>MY JOURNEY ✦</span><h2>Career<br><i>Timeline</i></h2></div><p>Designing, publishing and growing<br>through every experience.</p></div><div class="career-browser"><div class="career-window"><div><i></i><i></i><i></i></div><span>career / experience-log</span><b>✦</b></div><div class="career-list">${items.map((item, index) => `<article class="career-item ${index === 0 ? "current" : ""}"><div class="career-period"><strong>${item[0]}</strong><span>${item[1]}</span><i></i></div><div class="career-card"><div><small>${item[2]}</small>${index === 0 ? "<em>NOW</em>" : ""}</div><h3>${item[3]}</h3><p>${item[4]}</p><ul>${item[5].split("|").map(tag => `<li>${tag}</li>`).join("")}</ul></div></article>`).join("")}</div></div><span class="career-deco career-deco-a">♡</span><span class="career-deco career-deco-b">✧</span></section>`; }

function skillsSection() { return `<section class="home-skills" id="skills"><div class="skills-heading"><div><span>MY TOOLKIT ✦</span><h2>Skills <i>& Tools</i></h2></div><p>Tools I use to design, build and create</p></div><div class="skills-browser"><div class="skills-window"><div><i></i><i></i><i></i></div><span>toolbox / creative-workflow</span><b>♡</b></div><div class="skills-grid"><article class="skill-card skill-design"><div class="skill-card-top"><span>01</span><i>✦</i></div><small>DESIGN TOOLS</small><h3>Visual Design</h3><div class="skill-pills"><span><b>Fi</b>Figma</span><span><b>Ps</b>Photoshop</span><span><b>Ai</b>Illustrator</span></div></article><article class="skill-card skill-publishing"><div class="skill-card-top"><span>02</span><i>⌁</i></div><small>PUBLISHING</small><h3>Web Build</h3><div class="skill-pills"><span><b>H</b>HTML</span><span><b>C</b>CSS</span><span><b>JS</b>JavaScript</span><span><b>G</b>GSAP</span></div></article><article class="skill-card skill-ai"><div class="skill-card-top"><span>03</span><i>✧</i></div><small>AI WORKFLOW</small><h3>Creative AI</h3><div class="skill-pills"><span>ChatGPT</span><span>Generative Image</span><span>Prompt Design</span><span>AI-assisted Content Creation</span></div></article><article class="skill-card skill-experience"><div class="skill-card-top"><span>04</span><i>♡</i></div><small>EXPERIENCE</small><h3>What I Create</h3><div class="skill-pills"><span>Content Design</span><span>Banner Design</span><span>Detail Page</span><span>Web Design</span><span>Responsive Web</span><span>Publishing</span></div></article></div><div class="skills-note"><span>DESIGN</span><i>→</i><span>BUILD</span><i>→</i><span>CREATE</span><b>Always learning, always making ✦</b></div></div><span class="skills-deco skills-deco-a">✦</span><span class="skills-deco skills-deco-b">♡</span></section>`; }

function contactSection() { return `<section class="home-contact" id="contact"><div class="contact-browser"><div class="contact-window"><div><i></i><i></i><i></i></div><span>hello / let's-create-together</span><b>♡</b></div><div class="contact-body"><span class="contact-kicker">LET'S MAKE SOMETHING SHINE</span><h2>THANKS FOR VISITING<br><i>MY WORLD</i> <em>✦</em></h2><p>저의 작은 디자인 세계를 구경해주셔서 감사합니다.</p><p>함께 반짝이는 무언가를 만들고 싶다면<br>언제든지 편하게 연락해 주세요.</p><div class="contact-actions"><span class="contact-action is-pink"><small>SEND A MESSAGE</small><strong>이메일 보내기</strong><b>↗</b></span><span class="contact-action is-purple"><small>VISIT GITHUB</small><strong>GitHub 보러가기</strong><b>↗</b></span><span class="contact-action is-mint"><small>DOWNLOAD RESUME</small><strong>PDF 이력서 다운로드</strong><b>↓</b></span></div><small class="contact-link-note">연결 주소는 준비 중입니다.</small></div><div class="contact-bottom"><span>© 2026 Han Hyejin</span><b>Designed & Published with ♡</b><a href="#top">BACK TO TOP ↑</a></div></div><span class="contact-deco contact-deco-a">♡</span><span class="contact-deco contact-deco-b">✦</span><span class="contact-deco contact-deco-c">✧</span></section>`; }

async function renderArchive() {
  document.title = "WORK ARCHIVE | HYEJIN";
  app.innerHTML = `<main class="archive-shell"><div class="archive-glow glow-one"></div><div class="archive-glow glow-two"></div><header class="archive-nav"><a href="/" class="archive-logo">HYEJIN <span>✦</span></a></header><section class="archive-hero"><p class="archive-kicker">WELCOME TO MY LITTLE DESIGN WORLD</p><h1>WORK<br><i>ARCHIVE</i><span>✦</span></h1><p class="archive-intro">콘텐츠 디자인부터 웹과 퍼블리싱까지,<br>제가 만들고 경험한 작업을 모았습니다.</p><div class="archive-spark spark-a">♡</div><div class="archive-spark spark-b">✦</div><div class="archive-spark spark-c">✧</div></section><section class="archive-browser" id="works"><div class="browser-top"><div><i></i><i></i><i></i></div><span>hyejin.portfolio / work-archive</span><b>♡</b></div><div class="archive-heading"><div><span>SELECTED & RECENT</span><h2>My Works <i>✦</i></h2></div><p id="archive-count">00 PROJECTS</p></div><div id="archive-filters" class="archive-filters"></div><div id="archive-grid" class="archive-state">작업을 불러오는 중이에요 ✦</div></section><footer class="archive-footer"><span>THANKS FOR VISITING MY WORLD ✦</span><small>© 2026 Han Hyejin</small></footer></main>`;
  try {
    const works = await getPublicWorks();
    let filter = "ALL";
    const filters = ["ALL", ...new Set(works.map((work) => work.category))];
    document.querySelector("#archive-count").textContent = `${String(works.length).padStart(2, "0")} PROJECTS`;
    const filterBox = document.querySelector("#archive-filters");
    const grid = document.querySelector("#archive-grid");
    const draw = () => {
      filterBox.innerHTML = filters.map((category) => `<button class="${filter === category ? "active" : ""}" data-filter="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join("");
      const visible = filter === "ALL" ? works : works.filter((work) => work.category === filter);
      grid.className = visible.length ? "archive-grid" : "archive-state";
      grid.innerHTML = visible.length ? visible.map((work) => `<button class="archive-card" data-id="${work.id}"><div class="archive-image">${thumbnailHTML(work.coverUrl, work.title, work.thumbnail)}${work.isPinned ? '<span class="pin-label">PINNED ✦</span>' : ""}<span class="view-label">VIEW PROJECT ↗</span></div><div class="archive-card-copy"><span>${escapeHTML(work.category)}</span><h3>${escapeHTML(work.title)}</h3><p>${formatMonthPeriod(work.startDate, work.endDate)} · ${escapeHTML(work.tools.join(" · ") || "DESIGN")}</p></div></button>`).join("") : "이 카테고리에는 공개된 작업이 아직 없어요.";
      grid.querySelectorAll(".archive-card").forEach((card) => card.addEventListener("click", () => openArchiveModal(works.find((work) => work.id === card.dataset.id))));
    };
    filterBox.addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; filter = button.dataset.filter; draw(); });
    draw();
  } catch { document.querySelector("#archive-grid").textContent = "작업을 불러오지 못했어요."; }
}

function openArchiveModal(work) {
  const modal = document.createElement("div");
  modal.className = "archive-modal"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `<article class="archive-detail"><button class="detail-close" aria-label="상세 보기 닫기">×</button><div class="detail-title"><span>${escapeHTML(work.category)}</span><h2>${escapeHTML(work.title)}</h2><p>${formatMonthPeriod(work.startDate, work.endDate)}</p></div><div class="detail-info"><div><b>ROLE</b><span>${escapeHTML(work.role || "DESIGN")}</span></div><div><b>TOOLS</b><span>${escapeHTML(work.tools.join(" · ") || "-")}</span></div></div>${work.description ? `<p class="detail-description">${escapeHTML(work.description)}</p>` : ""}<div class="detail-images">${work.coverUrl ? `<img src="${work.coverUrl}" alt="${escapeHTML(work.title)} 대표 이미지">` : ""}${work.images.map((image, index) => `<img src="${image.url}" alt="${escapeHTML(work.title)} 상세 이미지 ${index + 1}">`).join("")}</div></article>`;
  const close = () => { modal.remove(); document.body.style.overflow = ""; window.removeEventListener("keydown", keyClose); };
  const keyClose = (event) => event.key === "Escape" && close();
  modal.querySelector(".detail-close").addEventListener("click", close);
  modal.addEventListener("mousedown", (event) => { if (event.target !== modal) return; const bounds = modal.getBoundingClientRect(); const sw = modal.offsetWidth - modal.clientWidth; const sh = modal.offsetHeight - modal.clientHeight; if (!(sw > 0 && event.clientX >= bounds.right - sw) && !(sh > 0 && event.clientY >= bounds.bottom - sh)) close(); });
  window.addEventListener("keydown", keyClose); document.body.style.overflow = "hidden"; document.body.append(modal);
}

let adminState = null;
const blankForm = () => ({ title: "", category: categories[0], date: today(), endDate: "", tools: [], role: "디자인 100%", description: "", image: "", coverImagePath: "", detailImages: [], isPublic: true, isFeatured: false, isPinned: false, thumbnail: { ...defaultThumbnail } });

async function renderAdmin() {
  document.title = "WORK ADMIN | HYEJIN";
  const { data } = await supabase.auth.getSession();
  if (!data.session) return renderLogin();
  adminState = { session: data.session, form: blankForm(), works: [], editingId: null, coverFile: null, pendingImages: [], query: "", filter: "전체", drag: null };
  await loadAdminWorks(); renderAdminShell();
}

function renderLogin(notice = "") {
  app.innerHTML = `<main class="login-shell"><form class="login-card" id="login-form"><p class="eyebrow">HYEJIN PORTFOLIO</p><h1>ADMIN LOGIN</h1><p>Supabase에서 만든 관리자 계정으로 로그인하세요.</p>${notice ? `<div class="login-notice">${escapeHTML(notice)}</div>` : ""}<label><span>이메일</span><input name="email" type="email" required></label><label><span>비밀번호</span><input name="password" type="password" required></label><button class="button primary">관리자로 로그인</button></form></main>`;
  document.querySelector("#login-form").addEventListener("submit", async (event) => { event.preventDefault(); const button = event.currentTarget.querySelector("button"); button.disabled = true; button.textContent = "로그인 중…"; const values = new FormData(event.currentTarget); const { error } = await supabase.auth.signInWithPassword({ email: values.get("email"), password: values.get("password") }); if (error) renderLogin("이메일 또는 비밀번호를 확인해 주세요."); else renderAdmin(); });
}

async function loadAdminWorks() {
  const { data, error } = await supabase.from("works").select("*, work_images(*)").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  adminState.works = await Promise.all((data || []).map(async (row) => { const parsed = readThumbnailSettings(row.description || ""); return { id: row.id, title: row.title, category: row.category, date: row.start_date, endDate: row.end_date || "", tools: row.tools || [], role: row.role || "", description: parsed.description, image: await signedUrl(row.cover_image_path), coverImagePath: row.cover_image_path || "", detailImages: await Promise.all((row.work_images || []).sort((a, b) => a.sort_order - b.sort_order).map(async (image) => ({ id: image.id, path: image.storage_path, url: await signedUrl(image.storage_path), sortOrder: image.sort_order }))), isPublic: row.is_public, isFeatured: row.is_featured, isPinned: row.is_pinned, thumbnail: parsed.thumbnail }; }));
}

function renderAdminShell(notice = "") {
  const f = adminState.form;
  app.innerHTML = `<main class="admin-shell"><header class="topbar"><div><p class="eyebrow">HYEJIN PORTFOLIO</p><h1>WORK ADMIN</h1><a class="archive-link" href="/archive">WORK ARCHIVE 보기 ↗</a></div><div class="account-box"><span>Supabase 연결됨</span><small>${escapeHTML(adminState.session.user.email || "")}</small><button id="logout">로그아웃</button></div></header><div id="admin-notice">${notice ? `<button class="notice">${escapeHTML(notice)}<span>닫기 ×</span></button>` : ""}</div><div class="workspace"><section class="panel form-panel"><div class="panel-heading"><div><span class="step">01</span><h2>${adminState.editingId ? "작업 수정" : "새 작업 등록"}</h2></div><p>필수 항목은 제목 하나뿐이에요.</p></div>${adminFormHTML()}</section><aside class="preview-column">${thumbnailEditorHTML()}</aside></div>${adminListHTML()}</main>`;
  bindAdminEvents(); refreshAdminDynamic();
}

function adminFormHTML() { const f = adminState.form; return `<form id="work-form"><div class="form-section"><h3>기본 정보</h3><label class="field full"><span>작업 제목 <b>*</b></span><input name="title" value="${escapeHTML(f.title)}" placeholder="예: 피부과 여름 프로모션 콘텐츠"></label><div class="field-grid"><label class="field"><span>카테고리</span><select name="category">${categories.map(c => `<option ${c === f.category ? "selected" : ""}>${c}</option>`).join("")}</select></label><div class="field"><span>제작 기간</span><div class="date-range-inputs native-dates"><label><small>시작일</small><input name="date" type="date" value="${f.date}"></label><i>→</i><label><small>종료일 <em>선택</em></small><input name="endDate" type="date" value="${f.endDate}"></label></div></div><div class="field tools-field"><span>사용 도구</span><div class="tool-entry"><input id="tool-input" placeholder="도구 입력 후 쉼표 또는 Enter"><button type="button" id="add-tool">추가</button></div><div class="tool-tags" id="tool-tags"></div><div class="tool-suggestions"><small>자주 쓰는 도구</small><div id="tool-suggestions"></div></div></div><label class="field"><span>담당 범위</span><input name="role" value="${escapeHTML(f.role)}" placeholder="디자인 100%"></label></div></div><div class="form-section"><h3>이미지</h3><div class="image-fields"><div><span class="sub-label">대표 이미지</span><label class="upload-box ${f.image ? "has-image" : ""}" id="cover-box">${f.image ? `<img src="${f.image}" alt="대표 이미지 미리보기">` : `<div><strong>대표 이미지 선택</strong><span>JPG·PNG·WebP · 최대 20MB</span></div>`}<input id="cover-input" type="file" accept="image/jpeg,image/png,image/webp"></label>${f.image ? '<button type="button" class="text-button" id="remove-cover">이미지 제거</button>' : ""}</div><div><span class="sub-label">상세 이미지 · 여러 장 가능</span><label class="detail-upload"><strong>상세 이미지 추가</strong><span>선택하면 웹용 WebP로 자동 최적화돼요.</span><input id="detail-input" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><div class="detail-grid" id="detail-grid"></div></div></div><p class="optimization-note">일반 이미지는 긴 변 1920px, 긴 상세페이지는 폭 1600px 기준으로 줄이고 WebP 품질 84%로 저장합니다.</p></div><div class="form-section"><h3>작업 설명</h3><label class="field full"><span>간단한 설명</span><textarea name="description" rows="4" placeholder="작업 목적과 맡은 부분을 짧게 기록해 주세요.">${escapeHTML(f.description)}</textarea></label></div><div class="form-section"><h3>노출 설정</h3><div class="checks"><label class="check-card"><input name="isPublic" type="checkbox" ${f.isPublic ? "checked" : ""}><span><strong>아카이브에 공개</strong><small>전체 작업 목록에 표시</small></span></label><label class="check-card"><input name="isFeatured" type="checkbox" ${f.isFeatured ? "checked" : ""}><span><strong>메인에 노출</strong><small>Selected Works 후보</small></span></label><label class="check-card"><input name="isPinned" type="checkbox" ${f.isPinned ? "checked" : ""}><span><strong>상단에 고정</strong><small>아카이브 맨 위에 표시</small></span></label></div></div><div class="actions">${adminState.editingId ? '<button type="button" class="button secondary" id="cancel-edit">취소</button>' : ""}<button type="submit" class="button primary">${adminState.editingId ? "수정 완료" : "작업 등록하기"}</button></div></form>`; }

function thumbnailEditorHTML() { return `<section class="panel sticky-panel"><div class="panel-heading compact"><div><span class="step">02</span><h2>썸네일 편집</h2></div></div><div class="thumbnail-editor"><div class="thumbnail-mode"><button data-mode="contain">전체 보기</button><button data-mode="auto">자동 맞춤</button><button data-mode="cover">꽉 채우기</button></div><div class="thumbnail-crop" id="thumbnail-crop"></div><div class="zoom-control"><button type="button" id="zoom-out">−</button><label><span>확대·축소</span><input id="zoom-range" type="range" min="1" max="3" step=".05"></label><button type="button" id="zoom-in">＋</button></div><button type="button" class="thumbnail-reset" id="thumb-reset">위치·확대 초기화</button></div><article class="work-card preview-card"><div class="thumbnail" id="card-thumbnail"></div><div class="card-copy"><span class="category" id="preview-category"></span><h3 id="preview-title"></h3><p id="preview-meta"></p></div></article><p class="save-note">전체 보기는 같은 이미지를 흐린 배경으로 채워 빈 공간을 자연스럽게 보여줘요.</p></section>`; }

function adminListHTML() { return `<section class="panel list-panel"><div class="panel-heading list-heading"><div><span class="step">03</span><h2>등록된 작업</h2><mark>${adminState.works.length}</mark></div><div class="filters"><input id="work-search" value="${escapeHTML(adminState.query)}" placeholder="제목 검색"><select id="work-filter"><option>전체</option>${categories.map(c => `<option ${c === adminState.filter ? "selected" : ""}>${c}</option>`).join("")}</select></div></div><div class="table-wrap"><table><thead><tr><th>작업</th><th>카테고리</th><th>제작일</th><th>공개</th><th>메인</th><th>고정</th><th>관리</th></tr></thead><tbody id="works-table"></tbody></table><div id="works-empty" class="empty"></div></div></section>`; }

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
  drawWorksTable();
}

function drawWorksTable() { const rows = adminState.works.filter(w => (adminState.filter === "전체" || w.category === adminState.filter) && w.title.toLowerCase().includes(adminState.query.toLowerCase())); document.querySelector("#works-table").innerHTML = rows.map(w => `<tr><td><div class="work-name"><div class="mini-thumb">${w.image ? `<img src="${w.image}" alt="">` : "IMG"}</div><strong>${escapeHTML(w.title)}</strong></div></td><td><span class="table-category">${escapeHTML(w.category)}</span></td><td>${formatPeriod(w.date, w.endDate)}</td>${[["isPublic", "공개"], ["isFeatured", "메인"], ["isPinned", "고정"]].map(([key]) => `<td><button class="toggle ${w[key] ? "on" : ""}" data-toggle="${key}" data-id="${w.id}"><i></i></button></td>`).join("")}<td><div class="row-actions"><button data-edit="${w.id}">수정</button><button class="danger" data-delete="${w.id}">삭제</button></div></td></tr>`).join(""); document.querySelector("#works-empty").textContent = rows.length ? "" : "등록된 작업이 없어요."; }

function addTool(raw) { const tool = raw.trim().replace(/,+$/, ""); if (tool && !adminState.form.tools.some(t => t.toLowerCase() === tool.toLowerCase())) adminState.form.tools.push(tool); const input = document.querySelector("#tool-input"); if (input) input.value = ""; refreshAdminDynamic(); }

function bindAdminEvents() {
  document.querySelector("#logout").addEventListener("click", async () => { await supabase.auth.signOut(); renderLogin(); }); document.querySelector("#admin-notice")?.addEventListener("click", () => document.querySelector("#admin-notice").innerHTML = "");
  document.querySelector("#work-form").addEventListener("input", (event) => { if (event.target.id === "tool-input" || event.target.type === "file") return; syncFormFromInputs(); refreshAdminDynamic(); });
  document.querySelector("#work-form").addEventListener("submit", submitAdminWork); document.querySelector("#cancel-edit")?.addEventListener("click", () => { adminState.form = blankForm(); adminState.editingId = null; adminState.coverFile = null; adminState.pendingImages = []; renderAdminShell(); });
  document.querySelector("#add-tool").addEventListener("click", () => addTool(document.querySelector("#tool-input").value)); document.querySelector("#tool-input").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTool(e.target.value); } }); document.querySelector("#tool-input").addEventListener("blur", e => addTool(e.target.value));
  document.querySelector("#tool-tags").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; adminState.form.tools.splice(Number(b.dataset.removeTool), 1); refreshAdminDynamic(); }); document.querySelector("#tool-suggestions").addEventListener("click", e => { const b = e.target.closest("button"); if (b) addTool(b.dataset.addTool); });
  document.querySelector("#cover-input").addEventListener("change", e => { const file = e.target.files[0]; if (!file) return; if (file.size > 20_000_000) return showNotice("이미지는 한 장당 20MB 이하로 올려 주세요."); adminState.coverFile = file; adminState.form.image = URL.createObjectURL(file); adminState.form.thumbnail = { ...defaultThumbnail }; renderAdminShell(); }); document.querySelector("#remove-cover")?.addEventListener("click", () => { adminState.coverFile = null; adminState.form.image = ""; adminState.form.coverImagePath = ""; renderAdminShell(); });
  document.querySelector("#detail-input").addEventListener("change", e => { [...(e.target.files || [])].filter(f => f.size <= 20_000_000).forEach(file => adminState.pendingImages.push({ id: `${Date.now()}-${Math.random()}`, file, preview: URL.createObjectURL(file) })); refreshAdminDynamic(); }); document.querySelector("#detail-grid").addEventListener("click", removeDetailImage);
  document.querySelectorAll(".thumbnail-mode button").forEach(b => b.addEventListener("click", () => { adminState.form.thumbnail = { mode: b.dataset.mode, scale: 1, x: 0, y: 0 }; refreshAdminDynamic(); })); document.querySelector("#zoom-range").addEventListener("input", e => { adminState.form.thumbnail.scale = Number(e.target.value); refreshAdminDynamic(); }); document.querySelector("#zoom-out").addEventListener("click", () => { adminState.form.thumbnail.scale = Math.max(1, Math.round((adminState.form.thumbnail.scale - .1) * 10) / 10); refreshAdminDynamic(); }); document.querySelector("#zoom-in").addEventListener("click", () => { adminState.form.thumbnail.scale = Math.min(3, Math.round((adminState.form.thumbnail.scale + .1) * 10) / 10); refreshAdminDynamic(); }); document.querySelector("#thumb-reset").addEventListener("click", () => { Object.assign(adminState.form.thumbnail, { scale: 1, x: 0, y: 0 }); refreshAdminDynamic(); }); bindThumbnailDrag();
  document.querySelector("#work-search").addEventListener("input", e => { adminState.query = e.target.value; drawWorksTable(); }); document.querySelector("#work-filter").addEventListener("change", e => { adminState.filter = e.target.value; drawWorksTable(); }); document.querySelector("#works-table").addEventListener("click", handleWorkTable);
}

function bindThumbnailDrag() { const crop = document.querySelector("#thumbnail-crop"); crop.addEventListener("pointerdown", e => { if (!adminState.form.image || adminState.form.thumbnail.mode === "auto") return; crop.setPointerCapture(e.pointerId); adminState.drag = { pointerX: e.clientX, pointerY: e.clientY, x: adminState.form.thumbnail.x, y: adminState.form.thumbnail.y }; }); crop.addEventListener("pointermove", e => { if (!adminState.drag) return; const bounds = crop.getBoundingClientRect(); adminState.form.thumbnail.x = Math.min(50, Math.max(-50, adminState.drag.x + (e.clientX - adminState.drag.pointerX) / bounds.width * 100)); adminState.form.thumbnail.y = Math.min(50, Math.max(-50, adminState.drag.y + (e.clientY - adminState.drag.pointerY) / bounds.height * 100)); refreshAdminDynamic(); });["pointerup", "pointercancel"].forEach(name => crop.addEventListener(name, () => adminState.drag = null)); }

async function optimizeImage(file) { const bitmap = await createImageBitmap(file); const isLong = bitmap.height / bitmap.width > 3; const scale = Math.min(1, (isLong ? 1600 : 1920) / bitmap.width, isLong ? 1 : 1920 / bitmap.height); const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale)); canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close(); return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("이미지 변환에 실패했어요.")), "image/webp", .84)); }
async function uploadImage(file, path) { const blob = await optimizeImage(file); const { error } = await supabase.storage.from("portfolio-images").upload(path, blob, { contentType: "image/webp", upsert: false }); if (error) throw error; return path; }

async function submitAdminWork(event) { event.preventDefault(); syncFormFromInputs(); const f = adminState.form; if (!f.title.trim()) return showNotice("작업 제목을 입력해 주세요."); const button = event.currentTarget.querySelector('[type="submit"]'); button.disabled = true; button.textContent = "저장 중…"; try { const payload = { title: f.title.trim(), category: f.category, start_date: f.date, end_date: f.endDate || null, tools: f.tools, role: f.role || null, description: writeThumbnailSettings(f.description, f.thumbnail), is_public: f.isPublic, is_featured: f.isFeatured, is_pinned: f.isPinned }; let id = adminState.editingId; if (id) { const { error } = await supabase.from("works").update(payload).eq("id", id); if (error) throw error; } else { const { data, error } = await supabase.from("works").insert(payload).select("id").single(); if (error) throw error; id = data.id; } if (adminState.coverFile) { const path = `${id}/cover-${Date.now()}.webp`; await uploadImage(adminState.coverFile, path); const { error } = await supabase.from("works").update({ cover_image_path: path }).eq("id", id); if (error) throw error; if (f.coverImagePath) await supabase.storage.from("portfolio-images").remove([f.coverImagePath]); } for (let index = 0; index < adminState.pendingImages.length; index++) { const path = `${id}/detail-${Date.now()}-${index}.webp`; await uploadImage(adminState.pendingImages[index].file, path); const { error } = await supabase.from("work_images").insert({ work_id: id, storage_path: path, sort_order: f.detailImages.length + index }); if (error) throw error; } const edited = Boolean(adminState.editingId); adminState.form = blankForm(); adminState.editingId = null; adminState.coverFile = null; adminState.pendingImages = []; await loadAdminWorks(); renderAdminShell(edited ? "작업을 수정했어요." : "작업을 Supabase에 저장했어요."); } catch (error) { showNotice(`저장하지 못했어요: ${error.message || "알 수 없는 오류"}`); button.disabled = false; button.textContent = adminState.editingId ? "수정 완료" : "작업 등록하기"; } }

async function removeDetailImage(event) { const button = event.target.closest("button"); if (!button) return; if (button.dataset.pendingImage) { adminState.pendingImages = adminState.pendingImages.filter(i => i.id !== button.dataset.pendingImage); return refreshAdminDynamic(); } const image = adminState.form.detailImages.find(i => i.id === button.dataset.existingImage); if (!image || !confirm("이 상세 이미지를 삭제할까요?")) return; const { error } = await supabase.from("work_images").delete().eq("id", image.id); if (error) return showNotice(`이미지를 삭제하지 못했어요: ${error.message}`); await supabase.storage.from("portfolio-images").remove([image.path]); adminState.form.detailImages = adminState.form.detailImages.filter(i => i.id !== image.id); await loadAdminWorks(); refreshAdminDynamic(); }

async function handleWorkTable(event) { const button = event.target.closest("button"); if (!button) return; const id = button.dataset.id || button.dataset.edit || button.dataset.delete; const work = adminState.works.find(w => w.id === id); if (!work) return; if (button.dataset.edit) { adminState.form = structuredClone(work); adminState.editingId = id; adminState.coverFile = null; adminState.pendingImages = []; renderAdminShell("수정할 내용을 불러왔어요."); scrollTo({ top: 0, behavior: "smooth" }); return; } if (button.dataset.delete) { if (!confirm("이 작업과 연결된 이미지를 모두 삭제할까요?")) return; const paths = [work.coverImagePath, ...work.detailImages.map(i => i.path)].filter(Boolean); if (paths.length) await supabase.storage.from("portfolio-images").remove(paths); const { error } = await supabase.from("works").delete().eq("id", id); if (error) return showNotice(`작업을 삭제하지 못했어요: ${error.message}`); await loadAdminWorks(); renderAdminShell("작업을 삭제했어요."); return; } if (button.dataset.toggle) { const key = button.dataset.toggle; const dbKey = { isPublic: "is_public", isFeatured: "is_featured", isPinned: "is_pinned" }[key]; const { error } = await supabase.from("works").update({ [dbKey]: !work[key] }).eq("id", id); if (error) return showNotice(`설정을 변경하지 못했어요: ${error.message}`); await loadAdminWorks(); refreshAdminDynamic(); } }
function showNotice(message) { const box = document.querySelector("#admin-notice"); if (box) box.innerHTML = `<button class="notice">${escapeHTML(message)}<span>닫기 ×</span></button>`; else alert(message); }

const path = location.pathname.replace(/\/+$/, "") || "/";
if (path === "/admin") renderAdmin();
else if (path === "/archive") renderArchive();
else renderHome();

// renderAdmin();
// renderArchive();