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
4. [+ 새 작업] → 제목/기간/툴/설명/이미지 입력 → [저장].
5. admin이 자동으로 아래를 수정합니다.
   - works-data.js
   - assets/portfolio/covers/
   - assets/portfolio/details/
6. GitHub Desktop을 열면 변경 파일이 표시됩니다.
7. Commit → Push 합니다. Vercel이 자동 배포합니다.

수정/삭제도 동일
- admin에서 기존 작업 클릭 → 수정 → 저장 → GitHub Desktop Commit/Push
- 삭제하면 연결된 로컬 이미지 파일도 함께 삭제됩니다.

브라우저
- 최신 Whale / Chrome / Edge 권장
- File System Access API를 쓰므로 Safari/Firefox에서는 동작하지 않을 수 있습니다.

중요
- 공개 OFF는 사이트 UI에서 숨김일 뿐입니다.
- GitHub에 Push한 works-data.js와 이미지 파일은 '보안 비공개'가 아닙니다.
- 공개 전 비밀 작업/클라이언트 기밀 자료는 이 구조에 넣지 마세요.
