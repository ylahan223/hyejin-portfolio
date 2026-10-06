HYEJIN PORTFOLIO — SUPABASE 제거용 파일

백업 확인
- 작품: 205개
- 공개 작품: 204개
- 커버 이미지: 205장
- 상세 이미지: 1305장
- 이미지 누락: 0장

적용 방법
1. GitHub의 hyejin-portfolio 저장소를 PC에 clone/download 합니다.
2. 이 ZIP을 풀고 안의 파일/폴더를 저장소 루트에 그대로 덮어씁니다.
   - script.js 교체
   - admin.html 교체 (Supabase 관리자 페이지 제거)
   - works-data.js 추가
   - assets/portfolio/ 추가
3. git add . / commit / push 합니다.
4. Vercel이 GitHub와 연결돼 있으면 자동 배포됩니다.

앞으로 작품 추가하기
- assets/portfolio/covers/ 에 커버 이미지 추가
- assets/portfolio/details/ 에 상세 이미지 추가
- works-data.js 배열에 작품 객체 1개 추가
- commit + push

중요
- index.html, archive.html, style.css는 건드리지 않습니다. 기존 디자인을 그대로 씁니다.
- 새 script.js에는 Supabase URL, key, Auth, DB, Storage 호출이 없습니다.
- 기존 Supabase 프로젝트는 사이트 정상 배포 확인 후 삭제/방치해도 됩니다.
