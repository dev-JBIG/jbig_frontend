#!/bin/bash
# JBIG 로컬 개발 환경 원키 실행 스크립트
# 사용법: ./run-local.sh

set -e

# .env가 있어도 강제로 로컬 모드로 실행
export FORCE_LOCAL=1

# 이 스크립트는 jbig_frontend/ 안에 있음
# 백엔드는 ../jbig_backend/ 에 있다고 가정
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../jbig_backend" 2>/dev/null && pwd)"

if [ -z "$BACKEND_DIR" ] || [ ! -f "$BACKEND_DIR/manage.py" ]; then
    echo "ERROR: ../jbig_backend/ 디렉토리를 찾을 수 없습니다."
    echo "  jbig_backend와 jbig_frontend를 같은 디렉토리에 clone하세요."
    exit 1
fi

# Python 3.10+ 찾기 (Django 5.x 필수)
PYTHON=""
for cmd in python3.13 python3.12 python3.11 python3.10; do
    if command -v "$cmd" &>/dev/null; then
        PYTHON="$cmd"
        break
    fi
done
if [ -z "$PYTHON" ]; then
    echo "ERROR: Python 3.10 이상이 필요합니다. (brew install python@3.12)"
    exit 1
fi
echo "Python: $($PYTHON --version)"

# 색상
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}==============================${NC}"
echo -e "${CYAN}  JBIG 로컬 개발 환경 시작${NC}"
echo -e "${CYAN}==============================${NC}"
echo ""

# ── 백엔드 설정 ──────────────────────────────────────────────────
echo -e "${GREEN}[백엔드] 설정 중...${NC}"
cd "$BACKEND_DIR"

# venv 생성 (없으면)
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}  venv 생성 중... ($PYTHON)${NC}"
    $PYTHON -m venv .venv
fi

source .venv/bin/activate

# 의존성 설치 (requirements.txt가 venv보다 새로우면)
if [ requirements.txt -nt .venv/.installed ]; then
    echo -e "${YELLOW}  패키지 설치 중...${NC}"
    pip install -r requirements.txt -q
    touch .venv/.installed
fi

# DB 마이그레이션
echo -e "${YELLOW}  DB 마이그레이션...${NC}"
python manage.py migrate --run-syncdb -v 0

# 초기 데이터 (최초 1회: 관리자 + 테스트유저 + 게시판 + 샘플 게시글)
python manage.py shell -c "
from boards.models import Post
from users.models import User
if not User.objects.exists() and not Post.objects.exists():
    import django.core.management
    django.core.management.call_command('seed_data')
else:
    print('  초기 데이터 이미 존재 (스킵)')
" 2>/dev/null

# 백엔드 실행 (백그라운드)
echo -e "${GREEN}[백엔드] 시작 → http://localhost:8000${NC}"
python manage.py runserver 8000 &
BACKEND_PID=$!

deactivate

# ── 프론트엔드 설정 ──────────────────────────────────────────────
echo -e "${GREEN}[프론트엔드] 설정 중...${NC}"
cd "$FRONTEND_DIR"

# 의존성 설치 (없으면)
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  npm install 중...${NC}"
    npm install --silent
fi

# 로컬 백엔드 연결 .env
if [ ! -f ".env" ]; then
    echo "REACT_APP_API_BASE_URL=http://localhost:8000" > .env
    echo -e "${YELLOW}  .env 생성 (백엔드 → localhost:8000)${NC}"
fi

# 프론트엔드 실행 (백그라운드)
echo -e "${GREEN}[프론트엔드] 시작 → http://localhost:3000${NC}"
BROWSER=none npm start &
FRONTEND_PID=$!

# ── 종료 처리 ────────────────────────────────────────────────────
cleanup() {
    echo ""
    echo -e "${CYAN}서버 종료 중...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}종료 완료${NC}"
}
trap cleanup EXIT INT TERM

echo ""
echo -e "${CYAN}==============================${NC}"
echo -e "${CYAN}  백엔드:   http://localhost:8000${NC}"
echo -e "${CYAN}  프론트:   http://localhost:3000${NC}"
echo -e "${CYAN}  Swagger:  http://localhost:8000/swagger/${NC}"
echo -e "${CYAN}  Admin:    http://localhost:8000/django-admin/${NC}"
echo -e "${CYAN}  관리자:   admin / admin1234${NC}"
echo -e "${CYAN}==============================${NC}"
echo -e "${YELLOW}  Ctrl+C 로 전체 종료${NC}"
echo ""

# 두 프로세스 모두 살아있는 동안 대기
wait
