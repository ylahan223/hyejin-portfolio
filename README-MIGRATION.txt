HYEJIN PORTFOLIO — SUPABASE 제거 + 로컬 관리자 버전

백업 변환 결과
- 작품: 205개
- 커버 이미지: 205장
- 상세 이미지: 1305장
- 이미지 누락: 0장

최초 적용
1. GitHub Desktop에서 ylahan223/hyejin-portfolio 저장소를 PC에 Clone/Pull 합니다.
2. 이 ZIP 안의 파일/폴더를 저장소 루트에 그대로 덮어씁니다.
3. GitHub Desktop에서 Commit → Push 합니다.
4. Vercel 자동 배포가 끝난 뒤 메인/아카이브/상세 팝업을 확인합니다.
5. 정상 확인 전까지 Supabase는 삭제하지 마세요.

앞으로 작품 1개 올리는 방법
1. 배포된 사이트의 /admin.html 을 Whale/Chrome/Edge로 엽니다.
2. [포트폴리오 폴더 연결]을 누릅니다.
3. GitHub Desktop이 Clone해 둔 hyejin-portfolio 폴더를 선택합니다.
4. [새 작업 등록] 폼에 제목/기간/툴/설명/이미지 입력 → [작업 등록하기]. 저장 후 다음 등록 폼으로 돌아갑니다.
5. admin이 자동으로 아래를 수정합니다.
   - works-data.js
   - assets/portfolio/covers/
   - assets/portfolio/details/
6. GitHub Desktop을 열면 변경 파일이 표시됩니다.
7. Commit → Push 합니다. Vercel이 build-public.cjs를 실행해 공개 작품과 연결 이미지만 dist에 생성하고 배포합니다.

수정/삭제도 동일
- admin에서 기존 작업 클릭 → 수정 → 저장 → GitHub Desktop Commit/Push
- 삭제하면 연결된 로컬 이미지 파일도 함께 삭제됩니다.

브라우저
- 최신 Whale / Chrome / Edge 권장
- File System Access API를 쓰므로 Safari/Firefox에서는 동작하지 않을 수 있습니다.

중요
- 공개 OFF 작품과 전용 이미지는 새 Vercel 배포본에서 제외됩니다. 원본 works-data.js에는 편집용으로 남습니다.
- GitHub에 Push한 works-data.js와 이미지 파일은 '보안 비공개'가 아닙니다.
- 공개 전 비밀 작업/클라이언트 기밀 자료는 이 구조에 넣지 마세요.
- Git 이력과 과거 배포는 자동 삭제되지 않습니다. 자세한 공개 범위는 README-PUBLISH.md를 확인하세요.
