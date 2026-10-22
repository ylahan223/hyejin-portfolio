export const WORK_TYPES = ["실무 프로젝트", "개인 프로젝트"];
export const QUICK_TAGS = ["반응형", "웹 배너", "프로모션", "카드뉴스", "상세페이지", "뷰티", "의료", "SNS"];
export function normalizeTags(raw) {
  const tags = [...new Set((Array.isArray(raw) ? raw : []).filter(t => typeof t === "string").map(t => t.trim()).filter(Boolean))];
  return [...tags.filter(t => WORK_TYPES.includes(t)).slice(0, 1), ...tags.filter(t => !WORK_TYPES.includes(t))];
}
export function workType(tags) { return normalizeTags(tags).find(t => WORK_TYPES.includes(t)) || ""; }
export function freeTags(tags) { return normalizeTags(tags).filter(t => !WORK_TYPES.includes(t)); }
export function editTags(tags, {type, add = [], remove = []} = {}) {
  if (type && !WORK_TYPES.includes(type)) throw new Error("올바른 작업 유형을 선택해주세요.");
  return normalizeTags([type || workType(tags), ...freeTags(tags), ...freeTags(add)]).filter(t => WORK_TYPES.includes(t) || !freeTags(remove).includes(t));
}
