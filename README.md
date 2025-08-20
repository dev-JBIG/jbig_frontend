# JBIG CAFE - 2025

*본 프로젝트는 전북대학교 중앙동아리 JBNU Bigdata & AI Group(이하 JBIG)의 **커뮤니티 게시판 서비스**를 목표로 진행되었습니다.*

---

## 구현 기능
- 기본 카페의 기능(게시글 작성 및 열람 등)
- 노션(교안) 페이지 열람
- 회원가입 / 로그인 / 로그아웃
- 이메일 인증(jbnu.ac.kr 한정)
- 구글폼 퀴즈 URL 지원
- 배너 이미지 및 수상경력
- 게시글 검색 및 페이지네이션
- 기타 등등

---

## 기술 스택
- **Frontend:** React, TypeScript, React Router, React Quill 등
- **Backend:** Django (REST API) 등
- **Database:** PostgreSQL
- **Auth:** JWT (Access Token / Refresh Token)

---
### .env 구성요소 (root)
    REACT_APP_SERVER_HOST=서버호스트 IP
    REACT_APP_SERVER_PORT=서버 포트
    DB_NAME=데이터베이스 이름
    DB_USER=데이터베이스 사용자명
    DB_USER_PASSWORD=데이터베이스 비밀번호
    REACT_APP_USERID_SECRET=유저 아이디 암호화용 문자열

---

### 부가설명
* 본 프로젝트는 GPT 등 생성형 AI의 도움을 받아 진행되었습니다.


* 코드 및 구조를 세분화하고, 재사용 가능성을 염두하고 작성하였지만 여전히 부족한 부분이 많습니다. 
특히 PostList는 현재 경로별 UI와 API endpoint가 상이하므로 조건이 많아 다소 난잡합니다.
개선을 위해 페이지별 기본 컴포넌트에서 데이터를 요청 후 PostList에게 Prop으로 넘겨주는 방향도 좋을 듯 합니다.


* 기본적으로 css는 각 컴포넌트별 (컴포넌트 이름).css 로 동일 디렉토리에 위치하지만, 캘린더 제외 Utils 컴포넌트의 css는 Home.css에 작성되어 있습니다.


* 카페가 사용됨에 따라 게시글(HTML + Image 등)로 인해 서버측 용량에 부하가 있을 수 있습니다.
그런 경우에는 HTML과 Image를 분리하여 저장하도록 조치하면 조금이나마 도움이 될 것으로 예상됩니다.


* 게시글을 호출해야하는 일부 컴포넌트를 제외한 대부분의 컴포넌트에서는 서버에 데이터 요청 시 src/API/req.tsx 에 위치한 export 함수들을 거칩니다.
