# payment-approval (지급결의서)

웹/앱 동일 기능 구현을 목표로 한 **TypeScript 모노레포** 초기 셋업입니다.

## 구성

- `packages/shared`: 도메인 타입/검증 스키마(Zod) — 웹/앱/API가 함께 사용
- `apps/api`: 지급결의서 API 서버(Hono)
- `apps/web`: Next.js(웹) — API 연동(목록/생성)

## 개발 실행

터미널 2개에서 아래를 실행합니다.

```bash
pnpm -C apps/api dev
```

```bash
pnpm -C apps/web dev
```

## 기본 관리자 계정(개발용)

API를 처음 실행하면 `apps/api/data/users.json`에 **기본 관리자 계정이 자동 생성**됩니다.

- **email**: `admin@example.com`
- **password**: `admin1234`

필요하면 아래 환경변수로 바꿀 수 있습니다:

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin1234
JWT_SECRET=dev-secret-please-change
```

기본 API 주소는 `http://localhost:3001` 입니다. 필요하면 `apps/web/.env.local`에 아래를 설정하세요:

```bash
API_BASE_URL=http://localhost:3001
```
