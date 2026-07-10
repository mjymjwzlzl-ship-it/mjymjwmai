# 🚨 긴급: 프로덕션 백엔드 연결 문제 해결 방법

## 문제
- `https://arata.co.kr/api/frontend/*` 요청이 404 오류 반환
- 프론트엔드가 백엔드 API에 접근 불가

## 즉시 해결 방법

### 1. 프로덕션 서버에 SSH 접속
```bash
ssh your-server
```

### 2. 백엔드 서버 확인
```bash
# 백엔드가 실행 중인지 확인
curl http://localhost:8000/api/health

# 백엔드가 꺼져있다면 시작
cd /path/to/backend
pm2 start server.js --name arata-backend
# 또는
npm start
```

### 3. Nginx 설정 수정
```bash
# 현재 설정 백업
sudo cp /etc/nginx/sites-available/arata.co.kr /etc/nginx/sites-available/arata.co.kr.backup

# Nginx 설정 편집
sudo nano /etc/nginx/sites-available/arata.co.kr
```

다음 내용을 server 블록 안에 추가 (location / 보다 위에):

```nginx
# /api/frontend/* → localhost:8000/frontend/*
location ~ ^/api/frontend/(.*)$ {
    proxy_pass http://localhost:8000/frontend/$1;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # CORS 헤더
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
}

# /api/* → localhost:8000/api/*
location /api/ {
    proxy_pass http://localhost:8000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    add_header 'Access-Control-Allow-Origin' '*' always;
}
```

### 4. Nginx 재시작
```bash
# 설정 테스트
sudo nginx -t

# 문제 없으면 재시작
sudo systemctl reload nginx
```

### 5. 테스트
```bash
# 서버에서 직접 테스트
curl https://arata.co.kr/api/frontend/comics
curl https://arata.co.kr/api/frontend/categories/list
```

## 대안 해결책 (Nginx 수정이 어려운 경우)

`D:\ARATA\lib\config.ts` 수정:

```typescript
// API URL 생성 헬퍼 함수
export const getApiUrl = (endpoint: string) => {
  const baseUrl = getApiBaseUrl();
  
  // 프로덕션에서는 백엔드 직접 연결
  if (baseUrl === '') {
    // 임시 해결책: api.arata.co.kr 사용
    if (endpoint.startsWith('frontend/')) {
      return `https://api.arata.co.kr/${endpoint}`;
    }
    return `https://api.arata.co.kr/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }
  
  // 로컬에서는 백엔드 직접 연결
  if (endpoint.startsWith('frontend/')) {
    return `${baseUrl}/${endpoint}`;
  }
  return `${baseUrl}/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
};
```

그리고 api.arata.co.kr을 백엔드 서버로 직접 연결:
```bash
# DNS A 레코드 설정
api.arata.co.kr → 서버 IP

# 또는 Nginx에서
server {
    server_name api.arata.co.kr;
    location / {
        proxy_pass http://localhost:8000;
    }
}
```

## 확인 사항
- [ ] 백엔드 서버가 localhost:8000에서 실행 중
- [ ] Nginx가 /api/frontend 경로를 올바르게 프록시
- [ ] CORS 헤더가 설정됨
- [ ] 방화벽이 필요한 포트를 차단하지 않음