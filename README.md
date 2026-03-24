# JBIG CAFE - 2025

---

## 로컬 개발 환경

`.env` 없이 로컬에서 프론트엔드 + 백엔드를 한번에 실행할 수 있습니다.

### 사전 요구사항
- **Python 3.10+** (`brew install python@3.12`)
- **Node.js / npm**

### 디렉토리 구조
```
어딘가/
├── jbig_backend/    # git clone
└── jbig_frontend/   # git clone
```

### 실행
```bash
cd jbig_frontend
./run-local.sh
```

자동으로 처리되는 것:
- Python venv 생성 + 패키지 설치
- SQLite DB 생성 + 마이그레이션
- 관리자 계정 생성 (`admin` / `admin1234`)
- 테스트 유저 + 게시판 + 샘플 게시글 생성
- 백엔드 실행 (http://localhost:8000)
- npm install + 프론트엔드 실행 (http://localhost:3000)

### 로컬 환경 접속 정보
| 항목 | URL / 정보 |
|------|-----------|
| 메인 사이트 | http://localhost:3000 |
| API 문서 (Swagger) | http://localhost:8000/swagger/ |
| 관리자 페이지 | http://localhost:8000/django-admin/ |
| 관리자 계정 | `admin` / `admin1234` |
| 테스트 계정 | `testuser` / `@test1234` |

### 참고
- `Ctrl+C`로 백엔드/프론트엔드 동시 종료
- DB 초기화: `rm -f ../jbig_backend/db.sqlite3` 후 재실행
- 업로드 파일 초기화: `rm -rf ../jbig_backend/media/`
- 로컬에서 생성되는 `db.sqlite3`, `media/`, `.venv/`는 `.gitignore`에 포함되어 GitHub에 올라가지 않음

---

### .env 구성요소 (배포용)
    REACT_APP_SERVER_HOST=서버호스트 IP
    REACT_APP_SERVER_PORT=서버 포트
    DB_NAME=데이터베이스 이름
    DB_USER=데이터베이스 사용자명
    DB_USER_PASSWORD=데이터베이스 비밀번호
    REACT_APP_USERID_SECRET=유저 아이디 암호화용 문자열

---
