FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --quiet

COPY . .

ARG REACT_APP_API_BASE_URL
ARG REACT_APP_DEFAULT_NOTION_PAGE_ID
ARG REACT_APP_SERVER_HOST
ARG REACT_APP_SERVER_PORT
ARG REACT_APP_USERID_SECRET

# 환경변수 설정
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL \
    REACT_APP_DEFAULT_NOTION_PAGE_ID=$REACT_APP_DEFAULT_NOTION_PAGE_ID \
    REACT_APP_SERVER_HOST=$REACT_APP_SERVER_HOST \
    REACT_APP_SERVER_PORT=$REACT_APP_SERVER_PORT \
    REACT_APP_USERID_SECRET=$REACT_APP_USERID_SECRET \
    CI=false

# 프로덕션 빌드
RUN npm run build

# 2단계: 실행 스테이지 (Nginx로 정적 파일 서빙)
FROM nginx:trixie-perl

# Nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드된 파일을 Nginx 디렉토리로 복사
COPY --from=builder /app/build /usr/share/nginx/html

# 포트 노출
EXPOSE 80
# 포트 변경해야함

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]

