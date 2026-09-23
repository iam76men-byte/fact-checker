# FactRepo (팩트레포)
> **공공데이터 및 공적 기록물 기반 공익 팩트체크 아카이브**  
> *Public Open Data & Primary Source Fact-Checking Platform*

FactRepo는 인터넷과 소셜 미디어에 만연한 정파적 왜곡과 가짜뉴스를 배제하고, **국가 공공데이터·법원 판결문·공적 기록물·1차 사료**를 교차검증하여 시민들에게 객관적이고 투명한 사실 검증 보고서를 제공하는 공익 오픈 플랫폼입니다.

---

## 📌 주요 특징 (Key Features)

### 1. 시민 참여형 검증 의뢰소 (Citizen Fact-Check Request)
- 시민 누구나 왜곡이 의심되거나 검증이 필요한 사안을 자유롭게 등록할 수 있습니다.
- 제기된 의혹의 출처 링크와 구체적인 정황을 아카이빙하여 집단지성으로 검증 우선순위를 결정합니다.

### 2. AI 1차 사실조사 및 스마트 사료 분석기 (AI Fact Assistant)
- **Google Gemini 기반 팩트 엔진**: 안건 등록 시 공공데이터와 공적 기록물을 대조하여 **[배경 및 쟁점·정황]**, **[객관적 핵심 사실]**, **[1차 사료 및 근거 링크]** 초안을 자동으로 구조화합니다.
- **안건 맞춤형 지능형 Fallback**: 네트워크 제한이나 일시적 오류 시에도 안건의 핵심 키워드를 정밀 분석하여 공공기관 및 법령 정보 기반의 검증 가이드를 제시합니다.

### 3. 고품격 검증 보고서 열람 및 PDF 내보내기 (Fact Reports)
- **인앱 반응형 텍스트 보고서**: 모바일과 PC 모든 환경에서 한눈에 들어오는 가독성 높은 리포트 뷰어를 제공합니다.
- **표준 A4 공문서 PDF 인쇄/저장**: 브라우저 인쇄 설정과 완벽하게 호환되며, 1페이지는 물론 2페이지 이후까지 깔끔하게 정렬되는 인쇄 최적화 서식을 탑재했습니다.

### 4. 5단계 검증 방법론 (Methodology & Transparency)
- **About 페이지**를 통해 서비스의 운영 주체, 데이터 수집 기준, 5단계 검증 프로세스(의제 선정 → 1차 사료 확보 → 다면 교차검증 → 5단계 판정 기준 → 투명한 영구 아카이빙)를 시민들에게 투명하게 공개합니다.

### 5. 투명한 시민 반론 게시판 (Citizen Rebuttal Board)
- **팩트 연동 반론 제기**: 판정된 팩트체크 안건에 대해 시민 및 당사자가 직접 제목 및 판정 결론([대체로 사실 아님] 등)을 확인하고 반론을 제기할 수 있습니다.
- **철저한 근거 중심**: 최대 2,000자 제한과 200KB 이하 참고문헌 파일 첨부를 지원하여 허위 비방을 방지하고 실질적인 사료를 교차검증합니다.
- **개인 비밀번호 기반 정정/삭제**: 작성 시 설정한 비밀번호로 본인 글만 안전하게 수정하거나 삭제(Soft Delete, `is_deleted = true`)할 수 있습니다.

### 6. Google reCAPTCHA v3 간편 시민 로그인 (Simple Citizen Login)
- **별도 소셜 심사 없는 원터치 로그인**: 네이버 등의 복잡한 앱 검증 절차 없이도 사용자 닉네임 입력과 Google reCAPTCHA v3 봇 점수 검증(인간 판별)을 통해 1초 만에 안전하게 세션을 발급받습니다.
- **연속적 인터랙션 지원**: 비로그인 상태에서 추천/비추천 투표나 글쓰기 클릭 시, 간편 로그인 완료 즉시 누르고자 했던 동작이 자동으로 이어져 편리한 시민 참여를 보장합니다.

### 7. 관리자 검증 스튜디오 (Admin Studio)
- 접수된 의뢰의 승인/검증 전환, 팩트체크 보고서 작성 및 판정 결과 배지(사실, 대체로 사실, 절반의 사실, 대체로 사실 아님, 사실 아님)를 체계적으로 관리합니다.


---

## 🛠 기술 스택 (Tech Stack)

| 구분 | 기술 스택 | 설명 |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15** (App Router) | 고성능 서버 사이드 렌더링 및 모던 웹 아키텍처 |
| **Library** | **React 19** / **TypeScript** | 안정적인 정적 타입 시스템 및 컴포넌트 기반 UI |
| **Styling** | **Modern CSS** / **Lucide React** | 다크모드/글래스모피즘 기반 프리미엄 반응형 디자인 |
| **Database** | **Supabase** (PostgreSQL) | 실시간 데이터 동기화 및 안전한 RLS 데이터 관리 |
| **AI Engine** | **Google Gemini 1.5** | 1차 사료 교차분석 및 검증 초안 생성 |

---

## 🚀 시작 가이드 (Getting Started)

### 1. 저장소 클론 (Clone Repository)
```bash
git clone https://github.com/iam76men-byte/fact-checker.git
cd fact-checker
```

### 2. 패키지 설치 (Install Dependencies)
```bash
npm install
```

### 3. 환경 변수 설정 (Environment Variables)
프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 다음 필수 환경 변수를 입력합니다:

```env
# Supabase 연동 정보
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API 키 (AI 초안 생성용)
GEMINI_API_KEY=your_gemini_api_key

# Google reCAPTCHA v3 (간편 로그인 및 봇 방지)
# https://www.google.com/recaptcha/admin 에서 v3 키 발급 (미입력 시 개발 모드로 자동 동작)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

# 관리자 비밀번호 (옵션)
ADMIN_PASSWORD=your_admin_password
```


### 4. 로컬 개발 서버 실행 (Run Dev Server)
```bash
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 실행 상태를 확인합니다.

---

## 📁 프로젝트 구조 (Project Structure)

```text
fact-checker/
├── app/
│   ├── about/             # 5단계 검증 방법론 및 운영 원칙 페이지
│   ├── rebuttals/         # 시민 반론(이의제기) 게시판 페이지
│   ├── api/
│   │   ├── admin/         # 관리자 API (검증 안건 관리 등)
│   │   ├── fact-check/    # AI 팩트체크 초안 생성 엔드포인트
│   │   ├── rebuttals/     # 반론 등록/조회/수정/삭제(소프트딜리트) API
│   │   └── capture-screenshot/ # 자동 캡처 엔드포인트
│   ├── layout.tsx         # 글로벌 레이아웃 및 폰트 설정
│   └── page.tsx           # 메인 홈 페이지
├── components/
│   ├── AboutSection.tsx   # 공신력 및 방법론 소개 컴포넌트
│   ├── AdminFactModal.tsx # 관리자 검증 작성 및 편집 모달
│   ├── ClientHome.tsx     # 메인 대시보드 뷰어
│   ├── FactTabs.tsx       # 팩트체크 리스트 및 텍스트/PDF 보고서 뷰어
│   ├── Header.tsx         # 상단 네비게이션 (반론 게시판 링크 포함)
│   ├── RebuttalModal.tsx  # 반론 작성/수정 모달 (2000자, 200KB 첨부, 비번 인증)
│   ├── RequestList.tsx    # 모바일 최적화 시민 의뢰 목록
│   └── RequestModal.tsx   # 검증 의뢰 작성 모달
├── lib/
│   └── supabase.ts        # Supabase 클라이언트 설정
├── schema_rebuttals.sql   # 반론 게시판 DB 테이블 생성 SQL 스크립트
└── public/                # 파비콘 및 정적 리소스
```

---

## ⚖️ 운영 원칙 및 윤리 강령 (Principles)

1. **1차 사료 최우선의 원칙**: 2차 가공 기사나 해석 대신 정부 관보, 통계청 데이터, 법원 확정 판결문, 공공기관 알리오 공시자료 등 원천 데이터를 기반으로 검증합니다.
2. **비당파성 및 중립성**: 특정 정치 집단이나 진영의 유불리를 고려하지 않으며, 오직 검증 가능한 사실(Fact)만을 다룹니다.
3. **투명한 출처 공개**: 시민 누구나 원문을 직접 확인할 수 있도록 교차검증에 사용된 출처 URL과 공적 문서 번호를 100% 공개합니다.

---

## 📄 라이선스 (License)
본 프로젝트는 [MIT License](LICENSE)에 따라 자유롭게 이용 및 기여할 수 있습니다.
