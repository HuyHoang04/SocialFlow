================================================================================
  SocialFlow MVP - Project Summary (for AI Agents & Developers)
  Last updated: 2026-04-03
  Status: MVP Complete, 5 platforms integrated, Media Uploads, Analytics, K8s Deployed, Monitoring, AI Service Phase 1 ✅
================================================================================

1. WHAT IS THIS PROJECT?
========================
SocialFlow is a multi-platform social media post publisher.
Users create posts and publish them to Facebook, X/Twitter, LinkedIn, Bluesky, and Threads via real platform APIs.

Core Flow: Register → Create Brand → Connect Social Accounts → Create Post → Publish → View Analytics


2. TECH STACK
=============
- Frontend: Next.js 16 (App Router, TypeScript, CSS, port 3000)
- Backend:  Java Spring Boot 3.2.3 (REST API, port 8080) + Actuator/Micrometer metrics
- Database: PostgreSQL on Neon serverless
- Auth:     JWT (jjwt library, BCrypt passwords)
- HTTP:     Spring WebFlux WebClient (for platform API calls)
- Monitoring: Prometheus (metrics scraper) + Grafana (visualization)
- Container: Docker + Docker Compose (local) + K8s (Docker Desktop or EC2)


3. ARCHITECTURE
===============
Single-domain architecture:
- Only the frontend domain (port 3000) is exposed externally
- Next.js `rewrites` in next.config.ts proxy `/api/*` → backend (localhost:8080)
- This simplifies deployment and handles OAuth redirect URIs correctly

Backend proxy config in next.config.ts:
  /api/:path* → http://localhost:8080/api/:path*


4. DATA MODEL (All IDs are UUID)
================================
User (UUID id)
 └── Brand (UUID id)
      ├── Campaign (UUID id) — includes name, description, startDate, endDate
    └── SocialConnection (UUID id) — unique by (brand_id + platform + account_id), includes scopes & tokenExpiresAt
         └── SocialPage (UUID id) — unique by (connection_id + platform_page_id)
              ├── Post (UUID id) — includes scheduledTime, status, optionally belongs to a Campaign
              │    ├── PostMedia (UUID id)
              │    ├── PublishResult (UUID id)
              │    └── PostAnalytics (UUID id) — snapshots: likes, comments, shares, impressions, reach, engagedUsers, clicks, engagementRate, fetchedAt
              ├── PageAnalytics (UUID id) — page-level: followers, totalPageLikes, pageViews, newFollowers, pageImpressions, pageEngagedUsers, postsCount, avgEngagementRate
              └── InboxMessage (UUID id) — comments and replies (platformMessageId, content, authorName, parentMessageId, isRead, isFromMe)

IMPORTANT: All entity IDs use java.util.UUID with GenerationType.UUID.
Frontend uses string IDs everywhere (not numbers).
JWT stores userId as a string claim.


5. UPSERT LOGIC (Reconnect)
============================
When a user reconnects an existing account:
- SocialConnectionRepository.findByBrandIdAndPlatformAndAccountId() → finds existing → updates token
- SocialPageRepository.findByConnectionIdAndPlatformPageId() → finds existing → updates token
- No duplicate records are created on reconnect


6. SUPPORTED PLATFORMS
======================
┌──────────┬────────────────────────────────────┬──────────────────────┬───────┐
│ Platform │ Auth Method                        │ Publish API          │ Cost  │
├──────────┼────────────────────────────────────┼──────────────────────┼───────┤
│ Facebook │ FB JS SDK popup (FB.login)          │ Graph API /{page}/feed│ Free  │
│ Twitter  │ OAuth 2.0 redirect                 │ POST /2/tweets       │ $200/m│
│ LinkedIn │ OAuth 2.0 redirect                 │ POST /v2/ugcPosts    │ Free* │
│ Bluesky  │ Handle + App Password (no OAuth)   │ AT Protocol createRecord│ Free │
│ Threads  │ OAuth 2.0 redirect (Meta)          │ POST /{id}/threads   │ Free  │
└──────────┴────────────────────────────────────┴──────────────────────┴───────┘
* LinkedIn requires approved API product for some features

Platform-specific notes:
- Facebook: Uses FB JS SDK (no server redirect). App ID hardcoded in accounts/page.tsx.
- Twitter: Free tier discontinued. Requires Basic plan ($200/mo) for API access.
- LinkedIn: Webhook requires real HTTPS domain (ngrok explicitly blocked by LinkedIn).
- Bluesky: No OAuth — user provides handle + app password. Credentials verified via AT Protocol
           createSession. App password stored in refreshToken field for re-authentication.
- Threads: OAuth via Meta. Short-lived token → exchanged for long-lived token. Two-step
           publish flow (create media container → publish container).


7. BACKEND STRUCTURE (f:\SocialFlow\backend\)
=============================================
src/main/java/com/socialflow/
├── config/
│   ├── SecurityConfig.java      — Spring Security: JWT filter, CORS, public endpoints
│   └── CorsConfig.java          — CORS: allows localhost:3000, base-url, frontend-url
├── security/
│   ├── JwtUtil.java             — JWT generation/validation (UUID userId as string claim)
│   └── JwtAuthFilter.java       — Extracts JWT → loads User → sets SecurityContext
├── model/
│   ├── User.java                — UUID id, email, passwordHash, name, brands[]
│   ├── Brand.java               — UUID id, name, description, logoUrl, user, connections[]
│   ├── SocialConnection.java    — UUID id, platform, accountName, accountId, accessToken, scopes, tokenExpiresAt
│   ├── SocialPage.java          — UUID id, platformPageId, pageName, pageAccessToken, connection, posts[]
│   ├── Post.java                — UUID id, content, status, page, mediaFiles[], publishResults[], scheduledTime
│   ├── PostMedia.java           — UUID id, filename, originalFilename, contentType, url, post, uploader, createdAt
│   ├── PublishResult.java       — UUID id, platformPostId, platformPostUrl, success, errorMessage
│   ├── InboxMessage.java        — UUID id, platformMessageId, content, authorName, isRead, isFromMe, page, parentMessageId
│   ├── PostAnalytics.java       — UUID id, post(FK), platformPostId, likes, comments, shares, impressions, reach, engagedUsers, clicks, bookmarks, quotes, replies, views, engagementRate, fetchedAt
│   ├── PageAnalytics.java       — UUID id, page(FK), platform, followers, totalPageLikes, pageViews, newFollowers, pageImpressions, pageEngagedUsers, postsCount, avgEngagementRate, fetchedAt
│   └── enums/
│       ├── PlatformType.java    — FACEBOOK, TWITTER, LINKEDIN, BLUESKY, THREADS
│       └── PostStatus.java      — DRAFT, SCHEDULED, PUBLISHING, PUBLISHED, FAILED
├── repository/
│   ├── UserRepository.java              — findByEmail, existsByEmail
│   ├── BrandRepository.java             — findByUserId
│   ├── SocialConnectionRepository.java  — findByBrandId, findByBrandIdAndPlatformAndAccountId (upsert)
│   ├── SocialPageRepository.java        — findByConnectionId, findByConnectionIdAndPlatformPageId (upsert)
│   ├── PostRepository.java              — findByPageId, findByUserId, findByStatusAndScheduledTimeLessThanEqual
│   ├── PostMediaRepository.java         — findByUploaderIdOrderByCreatedAtDesc
│   ├── PublishResultRepository.java
│   ├── InboxMessageRepository.java      — findByPageConnectionBrandIdOrderByCreatedAtDesc, findByPlatformMessageIdAndPageId
│   ├── PostAnalyticsRepository.java     — findByPostId, findByPostPageId, findByPostPageConnectionBrandId (all ordered by fetchedAt desc)
│   └── PageAnalyticsRepository.java     — findByPageId, findByPageConnectionBrandId, findByPlatform (all ordered by fetchedAt desc)
├── dto/
│   ├── RegisterRequest.java     — name, email, password
│   ├── LoginRequest.java        — email, password
│   ├── LoginResponse.java       — token, email, name, userId (UUID)
│   ├── CreateBrandRequest.java  — name, description, logoUrl
│   ├── CreatePostRequest.java   — content, pageIds (List<UUID>)
│   ├── PostResponse.java        — id, content, status, page info, publishResults
│   ├── PostAnalyticsResponse.java  — post metrics DTO: likes, comments, shares, impressions, reach, engagementRate, pageName, platform
│   ├── PageAnalyticsResponse.java  — page metrics DTO: followers, pageImpressions, pageViews, postsCount, avgEngagementRate
│   └── AnalyticsOverviewResponse.java — aggregated: totalLikes, totalComments, totalShares, totalImpressions, totalReach, avgEngagementRate, topPosts[], pages[]
├── service/
│   ├── AuthService.java         — register, login (returns JWT + user info)
│   ├── BrandService.java        — CRUD for brands
│   ├── PostService.java         — CRUD + publish for posts + handle scheduledTime
│   ├── PostScheduler.java       — @Scheduled background job to publish due posts automatically
│   ├── OAuthService.java        — OAuth flows + Facebook SDK + Bluesky connect + upsert logic
│   ├── InboxService.java        — Syncs messages from Graph API, handles replies, and mark-as-read
│   ├── FacebookAnalyticsService.java — Syncs post & page analytics from Facebook Graph API (separate from FacebookPublisher)
│   └── publisher/
│       ├── PublisherService.java    — Routes to platform-specific publisher by PlatformType
│       ├── FacebookPublisher.java   — POST /{pageId}/feed via Graph API + fetchComments + replyToComment
│       ├── TwitterPublisher.java    — POST /2/tweets via Twitter API v2
│       ├── LinkedInPublisher.java   — POST /v2/ugcPosts via LinkedIn API
│       ├── BlueskyPublisher.java    — AT Protocol: createSession → createRecord (app.bsky.feed.post)
│       └── ThreadsPublisher.java    — Meta Graph API: create container → publish (two-step)
└── controller/
    ├── AuthController.java       — POST /api/auth/register, /api/auth/login
    ├── BrandController.java      — GET/POST/DELETE /api/brands
    ├── ConnectionController.java — GET /api/brands/{id}/connections, pages, DELETE
    ├── OAuthController.java      — GET /api/oauth/{platform}/url, callbacks, connect endpoints
    ├── PostController.java       — GET/POST/DELETE /api/posts, POST /api/posts/{id}/publish
    ├── MediaController.java      — POST /api/media/upload, GET/DELETE /api/media, GET /api/media/{filename}
    ├── WebhookController.java    — Facebook + LinkedIn webhook verification & event handlers
    ├── InboxController.java      — GET /api/brands/{id}/inbox, POST sync, POST reply, PUT read
    └── AnalyticsController.java  — POST sync, GET overview, GET post/page analytics & history


8. API ENDPOINTS
================
PUBLIC:
  POST /api/auth/register           — Register new user
  POST /api/auth/login              — Login, returns JWT
  GET  /api/oauth/*/callback        — OAuth redirect callbacks (Facebook, Twitter, LinkedIn, Threads)
  GET  /api/webhook/facebook        — Facebook webhook verification (hub.verify_token)
  POST /api/webhook/facebook        — Facebook webhook events
  GET  /api/webhook/linkedin        — LinkedIn webhook verification (HMAC-SHA256 challengeCode)
  POST /api/webhook/linkedin        — LinkedIn webhook events (X-LI-Signature verification)
  GET  /api/media/{filename}        — Serve uploaded media files

PROTECTED (Bearer JWT):
  GET    /api/brands                           — List user's brands
  POST   /api/brands                           — Create brand
  DELETE /api/brands/{id}                      — Delete brand
  GET    /api/brands/{brandId}/connections      — List connections for brand
  GET    /api/brands/{brandId}/pages            — List all pages across connections
  GET    /api/connections/{connId}/pages         — List pages for connection
  DELETE /api/connections/{id}                   — Delete connection
  GET    /api/oauth/{platform}/url?brandId=...   — Get OAuth URL for platform
  POST   /api/oauth/facebook/connect             — Facebook SDK token connect {accessToken, brandId}
  POST   /api/oauth/bluesky/connect              — Bluesky credential connect {handle, appPassword, brandId}
  GET    /api/posts                              — List user's posts
  GET    /api/posts/{id}                         — Get post detail
  POST   /api/posts                              — Create post {content, pageIds[], mediaIds[], scheduledTime}
  POST   /api/posts/{id}/publish                 — Publish post
  DELETE /api/posts/{id}                         — Delete post
  POST   /api/media/upload                       — Multipart file upload for image/video
  GET    /api/media                              — List user's media library
  DELETE /api/media/{id}                         — Delete user's media asset
  POST   /api/brands/{brandId}/inbox/sync        — Fetch new messages from social networks
  GET    /api/brands/{brandId}/inbox             — Get all unified inbox messages for brand
  POST   /api/inbox/{id}/reply                   — Reply to a specific comment
  PUT    /api/inbox/{id}/read                    — Mark a message as read
  POST   /api/analytics/{brandId}/sync           — Sync post & page analytics from Facebook
  GET    /api/analytics/{brandId}/overview       — Aggregated analytics overview (totals + top posts + pages)
  GET    /api/analytics/{brandId}/posts          — List latest analytics per post for brand
  GET    /api/analytics/posts/{postId}           — Get latest analytics for a single post
  GET    /api/analytics/posts/{postId}/history   — Get analytics history (all snapshots) for a post
  GET    /api/analytics/pages/{pageId}           — Get latest analytics for a page
  GET    /api/analytics/pages/{pageId}/history   — Get analytics history for a page


9. FRONTEND STRUCTURE (f:\SocialFlow\frontend\)
===============================================
src/
├── lib/
│   └── api.ts                   — Centralized API client, JWT handling, all IDs are string (UUID)
├── components/
│   ├── AppShell.tsx             — Layout wrapper with auth guard (redirects to /login if no token)
│   └── Sidebar.tsx              — Navigation sidebar
└── app/
    ├── layout.tsx               — Root layout
    ├── globals.css              — Dark theme design system (all CSS variables and components)
    ├── page.tsx                 — Dashboard: brands list + recent posts
    ├── login/page.tsx           — Login form
    ├── register/page.tsx        — Registration form
    ├── accounts/page.tsx        — Social account connections (5 platforms, Bluesky credential form)
    ├── create/page.tsx          — Create post: select brand → select pages → write content → pick Schedule Time → publish
    ├── assets/page.tsx          — Media Asset Library: upload, view, and delete images/videos
    ├── inbox/page.tsx           — Unified Inbox: view comments by thread and reply directly
    ├── analytics/page.tsx       — Analytics dashboard: 3 tabs (Overview, Posts, Pages) with sync button
    └── posts/[id]/page.tsx      — Post detail: status, content, publish results, media, scheduled time

Connect flows by platform:
  Facebook:  FB.login() popup → accessToken → POST /api/oauth/facebook/connect
  Twitter:   OAuth redirect → callback → auto-connect
  LinkedIn:  OAuth redirect → callback → auto-connect
  Bluesky:   Form (handle + app password) → POST /api/oauth/bluesky/connect
  Threads:   OAuth redirect → callback → auto-connect


10. PLATFORM APP CONFIGURATION
===============================
Facebook:
  - App ID: 1867627970477000 (hardcoded in accounts/page.tsx)
  - Products: "Facebook Login" (standard)
  - Permissions: pages_manage_posts, pages_read_engagement, pages_show_list, read_insights
  - Webhook verify token: socialflow_webhook_verify_2026

Twitter/X:
  - OAuth 2.0 Client ID + Secret configured in application.properties
  - Also stores OAuth 1.0a Consumer Key/Secret + Bearer Token
  - Requires paid Basic plan ($200/mo) for tweet posting

LinkedIn:
  - Client ID + Secret in application.properties
  - Webhook requires real HTTPS (ngrok blocked by LinkedIn)

Bluesky:
  - No app registration needed
  - Users create App Passwords at bsky.app/settings/app-passwords

Threads:
  - Uses same Meta app or separate Threads app
  - OAuth redirect with threads_basic + threads_content_publish scopes
  - Config defaults to Facebook app credentials if not separately configured


11. CONFIGURATION (application.properties)
==========================================
- Database: Neon PostgreSQL connection string
- JWT: secret key + expiration (86400000ms = 24h)
- OAuth: client-id, client-secret, redirect-uri for Facebook, Twitter, LinkedIn, Threads
- Base URLs: app.base-url (external domain), app.frontend-url (for OAuth redirects)
- Webhook: webhook.verify-token
- Bluesky: No server-side config needed (credentials per-user)


12. HOW TO RUN
==============
LOCAL DEVELOPMENT (Without Docker):
  1. Configure application.properties with DB + OAuth credentials
  2. Start Backend:  cd backend  && mvn spring-boot:run    (port 8080)
  3. Start Frontend: cd frontend && npm run dev             (port 3000)
  4. Access: http://localhost:3000

WITH DOCKER (Recommended):
  1. Ensure Docker Desktop is running
  2. Configure application.properties with DB + OAuth credentials
  3. Run: docker-compose up --build
     - PostgreSQL starts on localhost:5432
     - Backend starts on localhost:8080
     - Frontend starts on localhost:3000
     - Frontend auto-proxies /api/* → backend via next.config.ts rewrites
  4. To rebuild: docker-compose down && docker-compose up --build
  5. To stop: docker-compose down


13. DOCKER SETUP
================
Files:
  - docker-compose.yml       — Service orchestration (postgres, backend, frontend)
  - backend/Dockerfile       — Java Spring Boot image (alpine-based for small size)
  - frontend/Dockerfile      — Next.js standalone image (multi-stage build)

Architecture:
  postgres (5432)     — Always-on database
  backend (8080)      — Java Spring Boot
  frontend (3000)     — Next.js web server

Network:
  - All services communicate via internal Docker network
  - Frontend environment: API_URL=http://backend:8080, NEXT_PUBLIC_API_URL=http://backend:8080
  - No service is exposed internally; only external ports (5432, 8080, 3000) are mapped
  - Frontend next.config.ts rewrites /api/:path* → backend:8080/api/:path*

Database Persistence:
  - PostgreSQL data stored in named volume: socialflow-postgres-data
  - Data persists across docker-compose down/up cycles
  - To reset database: docker-compose down -v (removes all volumes)

Healthchecks:
  - postgres: pg_isready check every 10s
  - backend: curl healthcheck every 30s (requires curl installed in image)
  - frontend: wget healthcheck every 30s
  - backend depends_on postgres (waits for postgres to be healthy)
  - frontend depends_on backend (but starts immediately, no health condition)

Tips:
  - Use `docker-compose logs -f` to stream logs
  - Use `docker-compose logs backend` to view only backend logs
  - Frontend logs show Next.js starting, compilation, and API proxy requests
  - Backend logs show Spring Boot startup, database initialization, and request handling


14. KNOWN LIMITATIONS / NEXT STEPS
===================================
- Twitter API requires paid plan ($200/mo) — free tier discontinued
- LinkedIn webhook requires real HTTPS domain (ngrok explicitly blocked)
- Tokens expire: the app now displays expiry and requires manual reconnect (no auto-refresh logic yet)
- File uploads are stored locally in the `/uploads` directory (not S3/cloud storage)
- No pagination for lists
- LinkedIn publisher may need org vs personal URN adjustments
- No unit tests

15. TROUBLESHOOTING & LESSONS LEARNED
=====================================
- Spring Boot 3 & Security 6 Error Handling: By default, Spring Boot forwards 500 Internal Server Errors to the `/error` dispatcher. If this dispatcher is not permitted in `SecurityConfig`, the app masks the 500 error and returns a misleading `403 Forbidden`. Solution: Add `.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()` to the security filter chain.
- Hibernate Schema Updates: When adding a `NOT NULL` column (like `@ManyToOne` for a User relationship) to an existing table that already contains data, Hibernate will fail to alter the table and throw a 500 error. A practical workaround during MVP development is to rename the `@Table(name = "new_table_name")` to force a clean schema creation.
- Spring UriBuilder vs Facebook API: Facebook Graph API fields use curly braces `{id,message}` and parentheses `likes.summary(true)`. Spring's UriBuilder treats `{...}` as URI template variables and may encode `()` incorrectly, causing 400 errors. Solution: Build the full URL as a string and use `URI.create(url)` instead of `uriBuilder.queryParam()`.
- Facebook reactions vs likes: For Page posts, use `reactions.summary(true)` instead of `likes.summary(true)` to get the total reaction count (Graph API v18.0+).
- Analytics uses URI.create() for all Facebook API calls to avoid encoding issues with commas, parentheses, and curly braces in query parameters.

================================================================================
16. AI SERVICE - PHASE 1 (Patch 2.0 Feature) ✅ COMPLETE
=====================================================

STATUS: ✅ COMPLETE - Python FastAPI service with dual-provider AI + Image Generation (2026-04-05)
  - Service: Running on http://localhost:5000
  - Text Generation: Groq (primary) + OpenRouter (fallback)
  - Image Generation: Pixazo (100% FREE) + OpenRouter (paid fallback)
  - Fallback Configurable: Via ENABLE_FALLBACK and ENABLE_IMAGE_FALLBACK env vars
  - Architecture: Clean MVC pattern (20+ files, production-ready)
  - Dynamic Models: Live fetching from all provider APIs with graceful degradation
  - Logging: Clean (no emoji), structured, easy to debug

PURPOSE: Generate social media content (text + images) using AI with dual-provider architecture
  - TEXT: Primary Groq (LLaMA, Mixtral, Gemma) $0.05-0.59/1M tokens + Free fallback
  - IMAGES: Primary Pixazo (Flux, SDXL, SD) 100% FREE + OpenRouter fallback ($0.10/image)
  - Tone Support: professional, casual, humorous, inspirational, technical
  - Cost Tracking: Per-request cost calculation, guaranteed $0 path available

PROJECT STRUCTURE (f:\SocialFlow\ai-service\):
  ├── main.py                              — Thin entry point (Uvicorn runner)
  ├── requirements.txt                     — FastAPI, Uvicorn, Pydantic, Groq, OpenAI, httpx
  ├── .env.example                         — Configuration template (API keys)
  ├── Dockerfile                           — Python 3.11 slim, non-root user, health check
  ├── app/
  │   ├── __init__.py
  │   ├── main.py                          — FastAPI app definition + route registration
  │   ├── config.py                        — Centralized config: API keys, models, pricing, fallback flags
  │   ├── models/
  │   │   └── __init__.py                  — Pydantic DTOs: ContentRequest, ImageGenerationRequest, etc.
  │   ├── prompts.py                       — Centralized prompt templates & formatters (NEW Phase 1A)
  │   ├── providers/
  │   │   ├── __init__.py
  │   │   ├── base.py                      — Abstract interface (fetch_models, generate, calculate_cost)
  │   │   ├── groq_provider.py             — Groq SDK implementation
  │   │   ├── openrouter_provider.py       — OpenAI SDK w/ OpenRouter + Chat Completions image API
  │   │   └── pixazo_provider.py           — Pixazo FREE Stable Diffusion image generation (NEW)
  │   ├── services/
  │   │   ├── __init__.py
  │   │   └── ai_service.py                — Dual-provider orchestrator (text + image generation)
  │   ├── routes/
  │   │   ├── __init__.py
  │   │   ├── health.py                    — GET /health
  │   │   ├── models.py                    — GET /models, POST /refresh-models (text)
  │   │   └── generation.py                — POST /generate-content, POST /generate-image, GET /image-models
  │   └── utils/
  │       ├── __init__.py
  │       ├── logger.py                    — Centralized logging configuration
  │       └── formatting.py                — Price formatting (5.9e-07 → $0.59/1M tokens)

ARCHITECTURE PATTERN: MVC Microservice
  ┌─────────────────────────────────────────────────────────────┐
  │ HTTP Requests (Frontend/Java Backend)                       │
  └─────────┬───────────────────────────────────────────────────┘
            │
  ┌─────────▼───────────────────────────────────────────────────┐
  │ ROUTES LAYER (app/routes/)                                  │
  │ - health.py: GET /health                                    │
  │ - models.py: GET /models, POST /refresh-models              │
  │ - generation.py: POST /generate-content, POST /test         │
  │ Responsibilities: HTTP validation, request parsing          │
  └─────────┬───────────────────────────────────────────────────┘
            │
  ┌─────────▼───────────────────────────────────────────────────┐
  │ SERVICE LAYER (app/services/ai_service.py)                  │
  │ Responsibilities:                                            │
  │ - Dual-provider orchestration                                │
  │ - Fallback logic (Groq → OpenRouter free)                    │
  │ - Model list refresh (parallel API calls)                    │
  │ - Error handling & recovery                                  │
  └─────────┬───────────────────────────────────────────────────┘
            │
  ┌─────────▴───────────────────────────────────────────────────┐
  │ PROVIDER LAYER (app/providers/)                              │
  │ ├─ base.py: Abstract interface                               │
  │ ├─ groq_provider.py: Groq API client                          │
  │ └─ openrouter_provider.py: OpenRouter client                  │
  │ Responsibilities: API calls, pricing lookup, error handling   │
  └─────────┬───────────────────────────────────────────────────┘
            │
  ┌─────────▼───────────────────────────────────────────────────┐
  │ EXTERNAL APIs                                                │
  │ ├─ Groq: https://api.groq.com/openai/v1/*                    │
  │ └─ OpenRouter: https://openrouter.ai/api/v1/*                │
  └──────────────────────────────────────────────────────────────┘

ENDPOINTS & RESPONSES:

1. GET /health
  Response: HealthResponse
  {
    "status": "ok",
    "service": "ai-service",
    "version": "2.0.0"
  }

2. GET /models
  Response: ModelsResponse (all available models with pricing)
  {
    "groq": {
      "mixtral-8x7b-32768": {
        "name": "Mixtral 8x7B 32k",
        "input_cost_display": "$0.27/1M tokens",
        "output_cost_display": "$0.81/1M tokens"
      },
      "llama-3-70b-8192": { ... }
    },
    "openrouter": {
      "qwen/qwen3.6-plus:free": {
        "name": "Qwen 3.6 Plus (FREE)",
        "input_cost_display": "$0.00/1M tokens",
        "output_cost_display": "$0.00/1M tokens"
      },
      "anthropic/claude-3.5-sonnet": { ... }
    }
  }

3. POST /refresh-models
  Response: RefreshModelsResponse
  {
    "status": "success",
    "groq_models": 5,
    "openrouter_models": 350,
    "last_updated": "2026-04-03T16:45:00Z"
  }

4. POST /generate-content
  Request: ContentRequest
  {
    "prompt": "Write a funny post about...",
    "tone": "humorous",
    "platform": "twitter",
    "provider": "groq" | "openrouter" (optional)
    "model": "mixtral-8x7b-32768" (optional)
  }
  
  Response: ContentResponse
  {
    "content": "Generated post text...",
    "provider": "groq",
    "model": "mixtral-8x7b-32768",
    "cost": 0.00023,
    "tokens": {
      "input": 25,
      "output": 145
    },
    "success": true,
    "error": null
  }

5. POST /test
  Response: Simple test endpoint
  {
    "message": "hello"
  }

6. GET /image-models
  Response: ImageModelsResponse (all available image models with pricing)
  {
    "pixazo": {
      "flux-1-schnell": {
        "name": "Flux 1 Schnell - FREE",
        "description": "Fast Flux model - ultra-fast image generation",
        "cost_per_image": 0.0,
        "free": true
      },
      "sd-xl-1-0": {...},
      "sd-inpainting": {...},
      "sdxl-base-1-0": {...}
    },
    "openrouter": {
      "bytedance-seed/seedream-4.5": {
        "name": "ByteDance Seedream 4.5",
        "cost_per_image": 0.001,
        "description": "High-quality image model via OpenRouter"
      }
    }
  }

7. POST /generate-image (NEW - Phase 1A)
  Request: ImageGenerationRequest
  {
    "prompt": "beautiful sunset over mountains",
    "style": "photorealistic" | "illustration" | "anime" | "abstract" | "3d" | "sketch",
    "platform": "instagram",
    "width": 1024,
    "height": 1024,
    "count": 1,
    "provider": "pixazo" | "openrouter" (optional, defaults to "pixazo")
    "model": "flux-1-schnell" (optional, defaults based on provider)
  }
  
  Response: ImageGenerationResponse
  {
    "images": [
      {
        "url": "https://...",
        "seed": 42,
        "finish_reason": "success"
      }
    ],
    "provider": "pixazo",
    "model": "flux-1-schnell",
    "cost": 0.0,
    "image_count": 1,
    "success": true,
    "error": null
  }

DUAL-PROVIDER STRATEGY (TEXT & IMAGES):

TEXT GENERATION:
  Strategy: Groq Primary → OpenRouter Free Fallback
    1. Request arrives with prompt
    2. Try Groq first (fast, cheap: $0.0002/request)
    3. If Groq fails (auth, rate limit, timeout, server error) → fallback to free OpenRouter Qwen
    4. Return result from whichever succeeded
    5. If both fail → return error dict with failure reason
  
  Cost Control:
    - Groq: ~$0.0002 per typical request
    - OpenRouter fallback: $0.00 (free Qwen 3.6 Plus)
    - Guarantee: No failed request costs money
  
  Fallback Configuration:
    ENABLE_FALLBACK=true (default) — fallback enabled
    ENABLE_FALLBACK=false — Groq only, fails if Groq unavailable

IMAGE GENERATION:
  Strategy: Pixazo Primary (FREE) → OpenRouter (paid fallback)
    1. Request arrives with prompt
    2. Try Pixazo first (100% FREE: Flux, SDXL, SD models)
    3. If Pixazo fails (auth, API error, model not found) → fallback to OpenRouter (paid)
    4. Return result from whichever succeeded
    5. If both fail → return error dict with failure reason
  
  Cost Control:
    - Pixazo: $0.00 (100% FREE - 4 image models)
    - OpenRouter: $0.001-0.10 per image (user-selectable models)
    - Default: Always tries FREE path first
    - Configurable: User can force OpenRouter via "provider": "openrouter" in request
  
  Pixazo FREE Models:
    - flux-1-schnell (default): Ultra-fast Flux model, 4 steps
    - sd-xl-1-0: Standard quality SDXL v1.0
    - sdxl-base-1-0: Alternative SDXL Base v1.0
    - sd-inpainting: Inpainting/editing model
  
  Fallback Configuration:
    ENABLE_IMAGE_FALLBACK=true (default) — fallback to OpenRouter enabled
    ENABLE_IMAGE_FALLBACK=false — Pixazo only, fails if Pixazo unavailable

MODEL FETCHING (Dynamic):
  Groq Models (5-8 models):
    - API: https://api.groq.com/openai/v1/models
    - Fallback: Hardcoded list if API timeout
    - Models: LLaMA 3 70B, LLaMA 3 8B, Mixtral 8x7B, Gemma 7B, Gemma 2 9B
  
  OpenRouter Models (350+ models):
    - API: https://openrouter.ai/api/v1/models
    - Fallback: Hardcoded free + Claude 3.5 Sonnet if API timeout
    - Models: All major providers (Anthropic, OpenAI, Meta, Qwen, Mistral, etc.)
    - Free Options: Qwen 3.6 Plus ($0/$0)
  
  Graceful Degradation:
    - Service starts even if APIs unreachable (uses hardcoded fallback)
    - Manual refresh: POST /refresh-models
    - Auto-refresh every 24h (configurable)

CONFIGURATION (app/config.py):
  Environment Variables (from .env):
    GROQ_API_KEY=gsk_...                    (Groq API key)
    OPENROUTER_API_KEY=sk-or-v1-...         (OpenRouter API key)
    PIXAZO_API_KEY=...                      (Pixazo API key for FREE images)
    ENABLE_FALLBACK=true|false              (Text generation fallback, default: true)
    ENABLE_IMAGE_FALLBACK=true|false        (Image generation fallback, default: true)
  
  Fallback Control:
    # Enable/disable fallback strategies
    ENABLE_FALLBACK=false               # Disable Groq→OpenRouter fallback for text
    ENABLE_IMAGE_FALLBACK=false         # Disable Pixazo→OpenRouter fallback for images
  
  Image Defaults:
    DEFAULT_IMAGE_MODEL = "flux-1-schnell"  # Fastest FREE Pixazo model
    DEFAULT_IMAGE_PROVIDER = "pixazo"       # PRIMARY: 100% FREE
  
  Hardcoded Models (used as fallback if APIs unreachable):
    PIXAZO_MODELS = {
      "flux-1-schnell": {"name": "...", "cost": 0.0, "endpoint": ".../flux-1-schnell/v1/getData"},
      "sd-xl-1-0": {...},
      "sdxl-base-1-0": {...},
      "sd-inpainting": {...}
    }
    
    GROQ_MODELS = {
      "mixtral-8x7b-32768": {"input": 0.27, "output": 0.81, ...},
      "llama-3-70b-8192": {...},
      ...
    }
    
    OPENROUTER_MODELS = {
      "qwen/qwen3.6-plus:free": {"input": 0, "output": 0},
      ...
    }

ERROR HANDLING & FALLBACK:
  Groq Scenarios:
    - Auth error (401 Unauthorized) → Try OpenRouter
    - Rate limit (429 Too Many Requests) → Try OpenRouter
    - Server error (500+) → Try OpenRouter
    - Network timeout → Try OpenRouter
    - Success → Return Groq result
  
  OpenRouter Scenarios:
    - Any error → Return error dict
    - Success → Return OpenRouter result
  
  Response on Total Failure:
    {
      "success": false,
      "error": "All providers failed: Groq error..., OpenRouter error...",
      "provider": "none",
      "content": null,
      "cost": 0
    }

TECH STACK:
  Framework: FastAPI 0.109.0 (modern async/await ASGI)
  Server: Uvicorn (ASGI server, production-ready)
  Validation: Pydantic 2.6.0 (type-safe DTOs)
  Environment: python-dotenv 1.0.0 (.env file support)
  AI Clients: groq 0.4.2, openai 1.3.9 (compatible with OpenRouter)
  HTTP: httpx 0.25.0 (async HTTP for model fetching)
  Python: 3.11+

CODE QUALITY:
  Logging: Centralized logging in app/utils/logger.py
    - Format: "timestamp - logger_name - level - message"
    - Clean: No emoji (removed for production readiness)
    - Setup: Called once per module, prevents duplicate logs
    - Usage: logger = setup_logger(__name__)
  
  Prompt Management: Centralized in app/prompts.py (NEW Phase 1A)
    - Tone descriptions: professional, casual, humorous, inspirational, technical
    - Prompt formatters: format_content_generation_prompt(), format_rewrite_prompt(), format_optimization_prompt()
    - Easy maintenance: Single source of truth for all prompt templates
  
  Formatting: app/utils/formatting.py
    - Converts scientific notation to human-readable
    - Example: 5.9e-07 → "$0.59/1M tokens"
    - Applied to all model responses
  
  Type Safety: All DTOs in app/models/__init__.py via Pydantic
    - Request validation: ContentRequest, ImageGenerationRequest
    - Response format: ContentResponse, ImageGenerationResponse
    - Type hints on all functions
  
  Dependency Injection: FastAPI's Depends() for AIService injection
    - Route handlers receive ai_service via DI
    - Single AIService instance per FastAPI app
    - Clean separation of concerns

DEPLOYMENT:
  Docker: Dockerfile (Python 3.11 slim alpine base)
    - Non-root user for security
    - Health check: curl http://localhost:5000/health
    - Production-ready Uvicorn configuration
  
  docker-compose.yml: Updated to include ai-service
    ai-service (port 5000):
      - Environment: GROQ_API_KEY, OPENROUTER_API_KEY (from .env)
      - Health check: /health endpoint
      - Depends on: Nothing (standalone)
      - Restarts: Always
  
  Local Run:
    python main.py
    Access: http://localhost:5000

TESTING (Manual):
  1. Start service: python main.py
  2. Test health: curl http://localhost:5000/health
  3. List models: curl http://localhost:5000/models | python -m json.tool
  4. Generate content:
     curl -X POST http://localhost:5000/generate-content \
       -H "Content-Type: application/json" \
       -d '{"prompt":"Write a funny post","tone":"humorous","platform":"twitter"}'
  5. Test endpoint: curl -X POST http://localhost:5000/test

FILES CREATED IN PHASE 1:
  ✅ app/__init__.py
  ✅ app/main.py (FastAPI app definition)
  ✅ app/config.py (centralized configuration + fallback flags)
  ✅ app/models/__init__.py (Pydantic DTOs for text + image)
  ✅ app/prompts.py (centralized prompt templates - Phase 1A NEW)
  ✅ app/providers/__init__.py
  ✅ app/providers/base.py (abstract interface)
  ✅ app/providers/groq_provider.py
  ✅ app/providers/openrouter_provider.py (updated with chat completions image API - Phase 1A)
  ✅ app/providers/pixazo_provider.py (Pixazo FREE image generation - Phase 1A NEW)
  ✅ app/services/__init__.py
  ✅ app/services/ai_service.py (dual-provider text + image orchestration)
  ✅ app/routes/__init__.py
  ✅ app/routes/health.py
  ✅ app/routes/models.py
  ✅ app/routes/generation.py (updated with /generate-image + /image-models - Phase 1A)
  ✅ app/utils/__init__.py
  ✅ app/utils/logger.py (production-clean, no emoji)
  ✅ app/utils/formatting.py
  ✅ main.py (entry point)
  ✅ requirements.txt
  ✅ .env.example
  ✅ Dockerfile
  ✅ TEST_IMAGE_GENERATION.md (test guide for image endpoints - Phase 1A NEW)
  ✅ TEST_IMAGE_GENERATION.json (Postman import format - Phase 1A NEW)

PHASE 1A UPDATES (2026-04-05):
  ✅ Image Generation: Pixazo (100% FREE) + OpenRouter (fallback)
  ✅ Prompts Centralization: Extracted to app/prompts.py
  ✅ Default Model: Fixed to "flux-1-schnell" (valid Pixazo model)
  ✅ Fallback Config: ENABLE_FALLBACK, ENABLE_IMAGE_FALLBACK env vars
  ✅ OpenRouter Format: Chat completions with image modality (native API)
  ✅ Logging Clean: Removed all emoji for production readiness
  ✅ Model Handling: Defensive defaults in all providers
  ✅ Testing: Comprehensive test request bodies provided

NEXT PHASE: Phase 2 - Java Integration (READY TO START)
  Description: Connect Java backend to Python AI service for end-to-end AI content generation
  Timeline: ~2 weeks
  
  1. Create Java DTOs:
     - ContentGenerationRequest.java, ContentGenerationResponse.java
     - ImageGenerationRequest.java, ImageGenerationResponse.java
  
  2. Create Java client: AiServiceClient.java
     - REST client to http://localhost:5000 (configurable via application.properties)
     - Retry logic + timeout handling
     - Logging integration
  
  3. Create Java service: AiService.java
     - Wraps client, adds business logic
     - Cost tracking + database logging
     - Error handling
  
  4. Create Java controller: AiController.java
     - Endpoints: POST /api/generate-content, POST /api/generate-image
     - JWT protection (BearerToken required)
     - Request validation
  
  5. Update application.properties:
     - ai.service.url=http://localhost:5000
     - ai.service.timeout=30s
  
  6. Testing:
     - End-to-end: Java backend → Python AI service → Groq/OpenRouter
     - Validate: JWT, error handling, cost tracking
  
  Expected Result:
    POST /api/generate-content → Python service → Groq/OpenRouter → JSON response
    POST /api/generate-image → Python service → Pixazo/OpenRouter → JSON response with image URL

================================================================================
17. KUBERNETES DEPLOYMENT (Docker Desktop K8s + EC2)
====================================================

STATUS: ✅ COMPLETE - Full K8s stack with monitoring (2026-04-03)
  - PostgreSQL 1/1 Ready, Backend 1/1 Ready, Frontend 1/1 Ready
  - Prometheus 1/1 Ready, Grafana 1/1 Ready (monitoring stack)
  - All services: backend (ClusterIP:8080), frontend (NodePort:30000), postgres (Headless:5432)
  - Prometheus (ClusterIP:9090), Grafana (NodePort:30001)
  - Persistent storage: 1Gi PVC bound, data survives pod restarts
  - SSL/TLS: Cert-Manager + Let's Encrypt + Traefik Ingress (production EC2)

K8s Manifests (Location: f:\SocialFlow\k8s\):
  01-namespace.yaml              — socialflow namespace
  02-storageclass.yaml           — rancher.io/local-path provisioner (was docker.io/hostpath)
  03-postgres-pvc.yaml           — 1Gi persistent volume claim
  03-postgres-configmap.yaml     — PostgreSQL environment: POSTGRES_DB, POSTGRES_USER
  04-postgres-secret.yaml        — POSTGRES_PASSWORD (base64 encoded)
  05-postgres-statefulset.yaml   — PostgreSQL pod with volumes, probes
  07-postgres-service.yaml       — Headless service (DNS: postgres:5432)
  08-backend-configmap.yaml      — Backend config: datasource URL, server port, actuator metrics
  09-backend-deployment.yaml     — 1 replica, health probes (90s/120s delay), resource limits (256Mi/512Mi)
  10-backend-service.yaml        — ClusterIP service (DNS: backend:8080)
  11-frontend-deployment.yaml    — 1 replica, API_URL env, health probes
  12-frontend-service.yaml       — NodePort service (localhost:30000)
  13-ingress.yaml                — Traefik Ingress: socialflow.io.vn + prometheus.socialflow.io.vn + grafana.socialflow.io.vn (EC2 only)
  14-prometheus-configmap.yaml   — Prometheus config with K8s service discovery + backend metrics scrape job
  15-prometheus-service.yaml     — ClusterIP service (DNS: prometheus:9090)
  16-prometheus-deployment.yaml  — Prometheus pod with 15s scrape interval
  17-prometheus-service-account.yaml — RBAC ClusterRole for service discovery
  18-prometheus-cluster-role.yaml    — RBAC permissions for nodes, pods, services, endpoints
  19-grafana-configmap.yaml     — Grafana datasource provisioning + Prometheus datasource pre-configured
  20-grafana-service.yaml        — NodePort service (localhost:30001)
  21-grafana-deployment.yaml     — Grafana pod + auto-datasource provisioning

Quick Start (LOCAL DOCKER DESKTOP):
  Deploy all: kubectl apply -f k8s/
  Verify: kubectl get pods -n socialflow
  Access: 
    - Frontend:  http://localhost:30000
    - Prometheus: http://localhost:9090
    - Grafana: http://localhost:30001 (admin/admin123)

OR use docker-compose (RECOMMENDED for development):
  docker-compose up
  Access:
    - Frontend: http://localhost:3000
    - Backend: http://localhost:8080
    - Prometheus: http://localhost:9090
    - Grafana: http://localhost:3001 (admin/admin123)
    - Postgres: localhost:5432

Networking:
  Internal (pod-to-pod):
    Frontend → backend.socialflow.svc.cluster.local:8080
    Backend → postgres.socialflow.svc.cluster.local:5432
  
  External (localhost):
    http://localhost:30000 → frontend (NodePort)
    Backend has no external route (internal only, secure)
  
  Frontend uses: API_URL=http://backend:8080 env var → next.config.ts rewrites /api/* to backend

Security:
  SecurityConfig.java:
    - /actuator/health permitAll() for K8s health probes (no JWT)
    - All other endpoints require JWT token
  
  CorsConfig.java:
    - Allows: http://localhost:3000, http://localhost:30000, app.base-url, app.frontend-url
    - Prevents CORS errors from frontend
  
  Secrets:
    - POSTGRES_PASSWORD stored in K8s Secret (base64)
    - Backend references via valueFrom.secretKeyRef

Environment Variables:
  Backend ConfigMap:
    SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/socialflow

================================================================================
18. AI SERVICE - PHASE 2 (RAG Module) ✅ COMPLETE
==================================================

STATUS: ✅ COMPLETE - Retrieval-Augmented Generation with brand content (2026-04-09)
  - Service: Running on http://localhost:5000 (shared with Phase 1)
  - RAG Database: PostgreSQL with pgvector extension (2048-dim embeddings)
  - File Formats: PDF, DOCX, TXT, Markdown, Images (with OCR)
  - Similarity Search: Cosine distance via pgvector, threshold 0.3
  - Content Generation: RAG-augmented with brand guidelines
  - Test Status: ✅ All RAG operations working, on-brand content generated
  - Cost: $0 (local text extraction, pgvector operations)

PURPOSE: Enable AI to learn from user-uploaded brand content
  - Users upload: Brand guidelines, FAQ, previous posts, competitor analysis, media assets
  - AI learns: Brand voice, tone, values, messaging patterns
  - Generation: Creates content matching brand identity via RAG context augmentation
  - Example: Upload "brand_guidelines.txt" → AI learns tone → generates on-brand tweets

ARCHITECTURE (Phase 2 - RAG Module):

Database Schema (PostgreSQL tables):
├── content_library_item
│   ├── id: UUID (primary key)
│   ├── brand_id: UUID (index for per-brand filtering)
│   ├── file_name: VARCHAR (original filename)
│   ├── file_type: ENUM (PDF, DOCX, TXT, MD, IMAGE)
│   ├── category: ENUM (BRAND_GUIDELINES, FAQ, POSTS, COMPETITOR_ANALYSIS, etc.)
│   ├── file_size: BIGINT (bytes)
│   ├── storage_url: VARCHAR (local path: /uploads/rag-library/{brand_id}_{hash})
│   ├── extracted_text: TEXT (full text after OCR/PDF extraction)
│   ├── metadata: JSONB (extraction details, timestamps)
│   └── created_at, updated_at: TIMESTAMP

├── rag_embedding
│   ├── id: UUID (primary key)
│   ├── brand_id: UUID (for brand-specific search)
│   ├── library_item_id: UUID → content_library_item
│   ├── chunk_id: BIGINT (sequence number)
│   ├── chunk_text: TEXT (512-token chunk from file)
│   ├── embedding: vector(2048) ← pgvector 2048-dimensional embedding
│   ├── metadata: JSONB (source file, position, timestamp)
│   └── created_at: TIMESTAMP
│   └── Indexes: brand_id, library_item_id (for fast queries)

└── rag_index
    ├── id: UUID (primary key)
    ├── brand_id: UUID (unique per brand)
    ├── total_files: INTEGER
    ├── indexed_chunks: INTEGER
    ├── last_updated: TIMESTAMP
    ├── status: ENUM (PENDING, INDEXING, COMPLETE, FAILED)
    └── error_message: TEXT (if status=FAILED)

Services (Python ai-service/app/services/):
├── RagService (800+ lines)
│   ├── chunk_text(text, chunk_size=512, overlap=0.2)
│   │   - Splits text into 512-token chunks with 20% overlap
│   │   - Handles remaining text gracefully
│   │   - Returns list of (chunk_id, chunk_text) tuples
│   │
│   ├── save_library_item(brand_id, file_name, extracted_text, ...)
│   │   - Saves file metadata to content_library_item table
│   │   - Uses fresh database connection (async-safe)
│   │   - Returns library_item_id
│   │
│   ├── generate_embeddings_for_file(brand_id, library_item_id, text)
│   │   - Async method: chunks text, generates embeddings, stores in DB
│   │   - Calls OpenRouter nvidia/llama-nemotron-embed-vl-1b-v2 (2048-dim multimodal)
│   │   - Saves chunks+embeddings to rag_embedding table
│   │   - Returns count of successfully stored embeddings
│   │
│   ├── _save_chunk_embeddings(chunks_with_embeddings)
│   │   - Internal method to save embeddings with debug logging
│   │   - Shows: brand_id, library_item_id, chunk_count, storage status
│   │   - Catches & logs any database errors
│   │
│   ├── search_similar_chunks(brand_id, query_text, limit=5, threshold=0.3)
│   │   - Embeds user query using same multimodal model
│   │   - Uses pgvector cosine distance: embedding <-> query_vector
│   │   - Returns top N chunks sorted by similarity (highest first)
│   │   - Default threshold 0.3 (optimized for multimodal embeddings)
│   │   - Debug logging shows: query, chunk_count, all similarity scores
│   │
│   └── get_rag_status(brand_id)
│       - Returns indexing status from rag_index table
│       - Fields: total_files, indexed_chunks, last_updated, status

└── ContentLibraryService (350+ lines)
    ├── save_uploaded_file(brand_id, file, category)
    │   - Saves file to: /uploads/rag-library/{brand_id}_{content_hash}_{filename}
    │   - Prevents duplicates via content_hash
    │   - Returns (file_path, file_size)
    │
    ├── extract_text_from_file(file_path)
    │   - Multi-format support:
    │     • PDF: pypdf library (text + page numbers)
    │     • DOCX: python-docx (structured paragraphs)
    │     • TXT: Plain text read (encoding auto-detect)
    │     • Markdown: Parsed as plain text
    │     • Images: pytesseract + Pillow (OCR text extraction)
    │   - Returns: (extracted_text, metadata)
    │
    ├── get_file_category(filename, mime_type)
    │   - Auto-detects file category from extension + MIME type
    │   - Maps to: BRAND_GUIDELINES, FAQ, POSTS, COMPETITOR_ANALYSIS, MEDIA_ASSETS, OTHER
    │
    └── generate_file_hash(file_content)
        - Content-based SHA256 hash for deduplication
        - Prevents duplicate uploads

API Endpoints (Python ai-service/app/routes/rag.py):

1. POST /rag/upload
   Request: {brand_id, category, file}
   - Upload brand asset (PDF, DOCX, TXT, Image, etc.)
   - Auto-extract text using ContentLibraryService
   - Auto-chunk text (512 tokens, 20% overlap)
   - Auto-generate embeddings (2048-dim)
   - Auto-store in database
   Response: {success, library_item_id, file_name, chunks_created, embeddings_saved}

2. POST /rag/search
   Request: {brand_id, query, limit=5, threshold=0.3}
   - Search user's uploaded documents by similarity
   - Embed query → cosine similarity search → return top N chunks
   Response: {success, results_count, results[]}
     Each result: {similarity_score, chunk_text, source_file, chunk_id}

3. POST /rag/generate-content (NEW - RAG-Augmented Generation)
   Request: {brand_id, prompt, rag_query, rag_limit=3, rag_threshold=0.3, model}
   - Search RAG index for brand guidelines matching rag_query (or prompt if empty)
   - Build augmented prompt: "Brand context: [top 3 chunks]. User request: [prompt]"
   - Call AI generation service (text generation with augmented prompt)
   - Return generated content + RAG metadata
   Response: {success, content, rag_context, rag_results_count, model_used, tokens_used}

4. GET /rag/library/{brand_id}
   - List all uploaded files for a brand
   Response: {success, brand_id, total_files, files[]}
     Each file: {library_item_id, file_name, category, file_size, created_at, chunks, embeddings}

5. GET /rag/status/{brand_id}
   - Check RAG indexing status per brand
   Response: {success, brand_id, total_files, indexed_chunks, status, last_updated}

6. DELETE /rag/library/{brand_id}/{library_id}
   - Remove uploaded file + all associated chunks & embeddings
   Response: {success, message}

Similarity Search Details:
- Threshold: 0.3 (default, configurable per search)
- Score Range: 0.0-1.0 (1.0 = exact match)
- Typical Score Range (Multimodal): 0.2-0.6 (not like single-modality: 0.8-1.0)
- Database Query: Uses pgvector <-> operator (cosine distance)
- Performance: <500ms per query
- Default Result Count: 5 chunks (configurable via limit parameter)

Text Chunking Strategy:
- Chunk Size: 512 tokens (typical = ~2000-3000 characters)
- Overlap: 20% (ensures context continuity between chunks)
- Stop Point: If remainder <50 tokens, append to last chunk (no orphan chunks)
- Rationale: Balances context window (512 tokens ≈ 2-4 medium paragraphs)

Embedding Model:
- Provider: OpenRouter (fallback to primary if needed)
- Model: nvidia/llama-nemotron-embed-vl-1b-v2
- Dimensions: 2048-dim (multimodal: text + image embeddings)
- Type: Multimodal (can embed both text descriptions and images)
- Cost: Included in Phase 1 embedding usage

Database Migrations:
- V3__RagModule.sql: Creates 3 tables + indexes
- Indexes: brand_id, library_item_id on rag_embedding (fast lookups)
- No ivfflat indexes (PostgreSQL 2000-dim limit, embeddings are 2048-dim)
- Cosine similarity still works via <-> operator without index

File Upload Processing (End-to-End):
1. User uploads "brand_guidelines.txt" via POST /rag/upload
2. File saved to /uploads/rag-library/{brand_id}_{hash}.txt
3. ContentLibraryService.extract_text_from_file() → reads file → 848 characters
4. RagService.chunk_text() → splits into 1 chunk (512 tokens)
5. RagService.generate_embeddings_for_file() → async embedding generation
6. OpenRouter call → 2048-dim embedding vector
7. RagService._save_chunk_embeddings() → INSERT to rag_embedding table
8. RagService.get_rag_status() → UPDATE rag_index table
9. Response: {success: true, chunks_created: 1, embeddings_saved: 1}

Content Generation with RAG (End-to-End):
1. User calls POST /rag/generate-content {brand_id, prompt: "Announce new feature", model: "llama..."}
2. AI Service embeds prompt → search RAG index
3. pgvector query returns 3 matching chunks (similarity > 0.3)
4. Augment prompt: "Brand guidelines: [3 chunks]. User request: Announce new feature"
5. Call Groq (or OpenRouter fallback) with augmented prompt
6. LLaMA model generates: "🚀 Exciting news! SocialFlow now includes AI-powered content..."
7. Response: {success: true, content: "... generated post...", rag_context: [...], rag_results_count: 3}

Test Results (April 9, 2026):
✅ File Upload: 2/2 files uploaded successfully
   - brand_guidelines.txt: 848 bytes → 1 chunk → 1 embedding saved
   - faq.md: 1115 bytes → 1 chunk → 1 embedding saved

✅ Text Extraction: 100% success rate
   - brand_guidelines: 848 characters extracted
   - faq: 1115 characters extracted

✅ Embedding Generation: 2048-dim verified
   - Model: nvidia/llama-nemotron-embed-vl-1b-v2
   - Dimensions: 2048 (correct)
   - Storage: Both embeddings in rag_embedding table

✅ Similarity Search: 3-4 results per query
   - Test queries: 4 different prompts
   - Average score: 0.32-0.44 (all above threshold 0.3)
   - Quality: Highly relevant matches to user queries

✅ RAG-Augmented Content Generation:
   - Input: "Create a social media post"
   - RAG Context: FAQ about SocialFlow features + pricing
   - Generated: "🚀 Ready to level up your social game? With SocialFlow's AI-powered platform you can generate, optimize, and manage content across all your channels—core features are FREE..."
   - Quality: On-brand, informative, incorporates brand guidelines

Performance Metrics:
- File upload: <2 seconds
- Text extraction: <1 second (multi-format)
- Embedding generation: 1-2 seconds per file
- Similarity search: <500ms per query
- Content generation: 2-5 seconds (AI call time)
- Total per file: ~5-10 seconds end-to-end

Cost Analysis:
- File extraction: $0 (local - pytesseract, pypdf, python-docx)
- Text chunking: $0 (local - tokenizer)
- Embedding generation: Included in Phase 1 multimodal embedding cost
- Similarity search: $0 (pgvector local operation)
- Content generation: Covered by Phase 1 AI service cost (Groq + fallback)
- TOTAL RAG COST: $0/month (completely free)

Bug Fixes Applied (10 Critical Issues):
1. ✅ "connection already closed" → Fresh connection per operation
2. ✅ "relation does not exist" → Fixed SQL migration INDEX syntax
3. ✅ Foreign key constraint failed → Removed constraints (follows V2 pattern)
4. ✅ UUID type mismatch → Proper UUID format validation
5. ✅ Embedding dimension error → vector(1536) → vector(2048)
6. ✅ ivfflat index limit → Removed problematic indexes (2000-dim limit)
7. ✅ Similarity search zero results → Threshold 0.7 → 0.3 (multimodal score range)
8. ✅ JSON parsing error → Removed json.loads() (psycopg2 auto-converts JSONB)
9. ✅ Deprecated Groq model → mixtral-8x7b-32768 → llama-3.1-70b-versatile
10. ✅ Response format mismatch → Handle both dict and Pydantic models

Integration with Phase 1:
- Shared Python FastAPI service (port 5000)
- Shared database: PostgreSQL (same Neon serverless instance)
- Shared AI providers: Groq, OpenRouter (text generation reuses Phase 1)
- Shared embedding model: OpenRouter multimodal (same 2048-dim model)
- Fallback chains: Text generation uses Phase 1 fallback logic

Deployment:
- Python service: Added to docker-compose.yml (ai-service service)
- Database: Migrations applied via Flyway (Java backend)
- Storage: /uploads/rag-library/ local directory (or cloud S3 in production)
- K8s ready: Can deploy to Kubernetes alongside backend/frontend

Files Created/Modified in Phase 2:
✅ app/services/rag_service.py (800+ lines, new)
✅ app/services/content_library_service.py (350+ lines, new)
✅ app/routes/rag.py (400+ lines, new)
✅ test_rag_module.py (250+ lines, new)
✅ V3__RagModule.sql (database migration, new)
✅ app/config.py (updated: Groq model fix)

================================================================================
18A. AI SERVICE - PHASE 2B (Code Refactoring - Clean Architecture) ✅ COMPLETE
====================================================================

STATUS: ✅ COMPLETE - Python code refactored for clean architecture (2026-04-14)
  - Architecture: Clean separation of concerns (routes → services → models)
  - Type Safety: All endpoints use Pydantic DTOs for requests/responses
  - Code Quality: No mixed models+routes, proper HTTP handler isolation
  - Syntax: ✅ All files validated successfully

PURPOSE: Clean up messy Python code, achieve proper separation of concerns matching Java backend
  - Problem (Before): Routes handled business logic, inline model definitions, type mismatches
  - Solution (After): Routes = HTTP only, services = business logic, models = DTOs with validation

FILES CREATED/MODIFIED:

1. ✅ app/models/rag_models.py (NEW - 250+ lines)
   Purpose: Centralized Pydantic DTOs for all RAG endpoints
   Models Created:
   - RagSearchRequest: brand_id, query, limit, threshold, model (with Field validation)
   - RagSearchResponse: success, results[], query, total_results, error
   - RagStatusResponse: success, brand_id, status_data, error
   - RagLibraryResponse: success, brand_id, files[], total_files, error
   - RagUploadResponse: success, library_id, file_name, file_type, category, extracted_chars, text_preview, total_chunks, embeddings_saved, error
   - RagDeleteResponse: success, message, error
   - RagGenerateContentRequest: brand_id, prompt, rag_query, rag_limit, rag_threshold, provider, model, tone
   - RagGenerateContentResponse: success, content, rag_context[], rag_query_used, rag_results_count, tokens_used, ai_model, error
   Feature: All models include Field() validation, JSON schema examples, proper typing

2. ✅ app/routes/rag.py (REFACTORED - 300+ lines)
   Before: 293+ lines with mixed BaseModel definitions, business logic, and routes (spaghetti code)
   After: Clean separation - HTTP handlers only, all logic delegated to services
   Architecture:
   - Each endpoint: Parse request → Call service → Wrap result in DTO → Return
   - Dependency injection via Depends(get_*_service())
   - No inline business logic, no duplicate model definitions
   Endpoints (7 total):
   - POST /upload → upload_file()
   - POST /search → RagService.search_similar_chunks()
   - GET /library → RagService.get_library_files()
   - GET /status → RagService.get_rag_status_sync()
   - DELETE /library/{id} → RagService.delete_library_file_sync()
   - POST /generate-content → RagService.generate_content_with_rag()
   - POST /generate-content-with-images → RagService.generate_content_with_rag_and_images()
   Validation: ✅ Python syntax verified successfully

3. ✅ app/services/rag_service.py (EXTENDED - 900+ lines)
   Added 6 new helper methods for business logic:
   
   Async Methods:
   - upload_file(brand_id, file_content, file_name, category, library_service)
     * Complete workflow: save → extract → chunk → embed
     * Returns: RagUploadResponse DTO
     * Handles errors gracefully with detailed error messages
   
   - generate_embeddings_for_file(brand_id, library_item_id, text, model)
     * Chunks text (512 tokens with 20% overlap)
     * Generates embeddings via OpenRouter (multimodal 2048-dim)
     * Saves chunks+vectors to rag_embedding table
     * Returns: (total_chunks, embeddings_saved)
   
   - generate_content_with_rag(request, ai_service)
     * RAG + AI generation workflow
     * Embeds user prompt, searches similar chunks
     * Augments prompt with RAG context
     * Calls AI provider (Groq/OpenRouter)
     * Returns: RagGenerateContentResponse with content + context + metrics
   
   - generate_content_with_rag_and_images(request, ai_service)
     * Image variant - delegates to generate_content_with_rag()
     * Returns: RagGenerateContentResponse
   
   Sync Methods (avoid async naming conflicts):
   - get_rag_status_sync(brand_id)
     * Queries rag_index table for status/metrics
     * Returns: status_data dict or None
   
   - get_library_files(brand_id, limit=10, offset=0)
     * Paginated file listing from content_library_item
     * Returns: List[Dict] for DTO wrapping
   
   - count_library_files(brand_id)
     * Quick count query for pagination
     * Returns: int count
   
   - delete_library_file_sync(brand_id, library_id)
     * Soft delete: mark item deleted, remove embeddings
     * Returns: bool success

Syntax Fixes:
- Fixed unmatched ')' at line 798 (missing 'async def upload_file(' declaration)
- Result: ✅ All files pass py_compile validation

ARCHITECTURE BEFORE vs AFTER:

BEFORE (Messy):
  rag.py (293+ lines)
  ├── @app.post("/upload") → [6 inline validation lines]
  ├── class RagSearchRequest (definition)  ← duplicate from somewhere
  ├── @app.post("/search") → [15 lines of business logic]
  ├── class RagSearchResponse (definition) ← another duplicate
  ├── @app.get("/library") → [12 lines of query logic]
  ├── class RagLibraryResponse (definition) ← ❌ same pattern
  └── ... more mixed definitions and routes

AFTER (Clean):
  app/models/rag_models.py (250+ lines)
  ├── RagSearchRequest (Pydantic with Field validation)
  ├── RagSearchResponse (Pydantic with defaults)
  ├── RagStatusResponse (Pydantic)
  ├── RagLibraryResponse (Pydantic)
  ├── RagUploadResponse (Pydantic)
  ├── RagDeleteResponse (Pydantic)
  ├── RagGenerateContentRequest (Pydantic)
  └── RagGenerateContentResponse (Pydantic)
  
  app/routes/rag.py (300+ lines)
  ├── @app.post("/upload") → request = RagUploadRequest() → service.upload_file() → RagUploadResponse()
  ├── @app.post("/search") → request = RagSearchRequest() → service.search_similar_chunks() → RagSearchResponse()
  ├── @app.get("/library") → params parsed → service.get_library_files() → RagLibraryResponse()
  ├── @app.get("/status") → service.get_rag_status_sync() → RagStatusResponse()
  ├── @app.delete("/library/{id}") → service.delete_library_file_sync() → RagDeleteResponse()
  └── @app.post("/generate-content") → request = RagGenerateContentRequest() → service.generate_content_with_rag() → RagGenerateContentResponse()
  
  app/services/rag_service.py (900+ lines)
  ├── upload_file() → Complete workflow, returns DTO-compatible dict
  ├── search_similar_chunks() → Returns results for wrapping
  ├── generate_content_with_rag() → Returns content + metrics
  ├── delete_library_file_sync() → Soft delete logic
  └── [existing methods unchanged]

BENEFITS:
✅ Type Safety: All requests/responses typed with Pydantic validation
✅ Separation of Concerns: Routes handle HTTP only, services handle logic
✅ Testability: Each layer (routes, services, models) independently testable
✅ Maintainability: Changes to business logic don't require route changes
✅ Code Reuse: Multiple routes can call same service methods
✅ Error Handling: Consistent error responses across all endpoints
✅ Documentation: Pydantic models auto-generate OpenAPI schemas

TESTING STATUS:
✅ rag_models.py: Syntax validated
✅ rag.py: Syntax validated
✅ rag_service.py: Syntax validated (after fix)
✅ Python app import: Verified successfully

NEXT ACTION:
Run end-to-end tests with test_rag_endpoints.py to verify all 7 endpoints working correctly

================================================================================

================================================================================
19. FRONTEND INTEGRATION DOCUMENTATION (Phase 3 - READY FOR FE) ✅ PREPARED
===========================================================================

STATUS: ✅ COMPLETE - Comprehensive frontend integration guide prepared (2026-04-14)
  - API Documentation: Complete with examples and error handling
  - TypeScript Client: Full-featured api-client with type safety
  - React Components: 3 pre-built components for library, search, generation
  - Setup Guides: Step-by-step integration instructions
  - Testing: Integration test suite with 15+ test cases

PURPOSE: Enable frontend developers to integrate Python AI Service (RAG) with Next.js

DELIVERABLES (Available in project root):

1. ✅ AI_SERVICE_API_INTEGRATION.md (7000+ lines)
   Complete API documentation with:
   - All 7 RAG endpoints documented
   - Request/response examples
   - JavaScript/TypeScript code samples
   - cURL examples
   - Error handling patterns
   - Data model TypeScript interfaces
   - Performance guidelines
   - Troubleshooting guide

2. ✅ FRONTEND_AI_INTEGRATION_SETUP.md (3000+ lines)
   Comprehensive setup guide with:
   - Environment configuration (.env.local/.env.production)
   - File structure setup
   - Creating integration pages
   - Adding to existing pages
   - Sidebar navigation updates
   - Error boundaries
   - Caching strategy
   - Testing checklist
   - Deployment checklist
   - Performance optimization
   - Troubleshooting

3. ✅ QUICKSTART_FRONTEND_AI.md (300 lines)
   Quick start guide for rapid integration:
   - 5-minute setup
   - Step-by-step instructions
   - Common issues & fixes
   - API examples
   - Data models
   - Quick reference

4. ✅ frontend/src/lib/ai-api.ts (500+ lines)
   TypeScript API client with:
   - Type definitions (8 interfaces)
   - 6 main API functions
   - Helper functions (format, color, validation)
   - Error handling
   - JWT token support
   - Request/response typing
   - Utility functions

5. ✅ frontend/src/components/ai/RagComponents.tsx (600+ lines)
   Ready-to-use React components:
   
   RagLibraryManager:
   - Upload files with category selection
   - Display uploaded files with metadata
   - Delete files with confirmation
   - Show RAG status (READY/INDEXING/EMPTY)
   - Auto-refresh every 5 seconds
   - Loading states and error handling
   
   RagContentGenerator:
   - Input form for content requests
   - RAG search query (optional/auto)
   - Parameter controls: tone, chunks, threshold, provider
   - Loading indicator during generation
   - Display generated content
   - Show source context chunks
   - Copy-to-clipboard button
   - Relevance score color coding
   
   RagSearchBrowser:
   - Search interface with query input
   - Threshold control
   - Display results with relevance scores
   - Similarity color coding
   - Chunk preview

6. ✅ test-ai-integration.ts (500+ lines)
   Complete integration test suite:
   - Service health checks (Java, Python, PostgreSQL)
   - All 7 RAG endpoints tested
   - Performance tests (concurrent requests, response time)
   - Error handling validation
   - Data model validation
   - Test summary with statistics
   - Category breakdown reporting

INTEGRATION FLOW:

Frontend Application (Next.js)
    ↓ (AI API Client)
    ├─ RagLibraryManager component
    ├─ RagContentGenerator component
    └─ RagSearchBrowser component
    ↓ (HTTP Requests with JWT)
Java Backend (Spring Boot 3.2.3)
    ├─ @PostMapping /api/ai/rag/upload
    ├─ @PostMapping /api/ai/rag/search
    ├─ @PostMapping /api/ai/rag/generate-content
    ├─ @GetMapping /api/ai/rag/library
    ├─ @GetMapping /api/ai/rag/status
    └─ @DeleteMapping /api/ai/rag/library/{id}
    ↓ (REST Proxy)
Python AI Service (FastAPI)
    ├─ POST /rag/upload
    ├─ POST /rag/search
    ├─ POST /rag/generate-content
    ├─ GET /rag/library
    ├─ GET /rag/status
    └─ DELETE /rag/library/{id}
    ↓
PostgreSQL + pgvector
    ├─ content_library_item (files)
    └─ rag_embedding (embeddings)

QUICK START FOR FRONTEND DEVS:

1. Copy files:
   - ai-api.ts → frontend/src/lib/
   - RagComponents.tsx → frontend/src/components/ai/

2. Setup environment (.env.local):
   NEXT_PUBLIC_API_URL=http://localhost:8080
   NEXT_PUBLIC_ENABLE_RAG=true

3. Create page:
   frontend/src/app/content-library/page.tsx
   (Template provided in QUICKSTART doc)

4. Add navigation:
   Update Sidebar.tsx with links to new pages

5. Test:
   npm run dev
   Visit http://localhost:3000/content-library

Time to integrate: 1-2 hours

REACT COMPONENT API:

RagLibraryManager Props:
  - brandId: string (required)
  - onFileUploaded?: () => void (callback)
  Features: Upload, list, delete files, status polling

RagContentGenerator Props:
  - brandId: string (required)
  - onContentGenerated?: (content: string) => void (callback)
  Features: Generate with RAG, display context, copy content

RagSearchBrowser Props:
  - brandId: string (required)
  Features: Search library, show relevance scores

TYPESCRIPT INTERFACES PROVIDED:

RagUploadResponse, RagSearchResponse, RagSearchResult,
RagStatusData, RagStatusResponse, LibraryFile, RagLibraryResponse,
RagDeleteResponse, RagContextChunk, RagGenerateContentResponse,
SearchParams, ListLibraryParams, GenerateContentParams

API FUNCTIONS PROVIDED:

uploadToLibrary(brandId, file, category?)
searchLibrary(params)
listLibrary(params)
getRagStatus(brandId)
deleteLibraryFile(brandId, libraryId)
generateContentWithRag(params)
generateContentWithRagAndImages(params)
waitForRagReady(brandId, maxWaitMs?)
getFileTypeLabel(fileType)
formatFileSize(bytes)
formatDate(dateString)
getSimilarityColor(score)

TESTING & VALIDATION:

Use test-ai-integration.ts to verify:
✅ Java backend health
✅ Python service health
✅ PostgreSQL connection
✅ All 7 RAG endpoints accessible
✅ Performance benchmarks
✅ Error handling
✅ Data model validation
✅ Concurrent request handling

Run: npx ts-node test-ai-integration.ts

DEPLOYMENT CHECKLIST:

Frontend:
  [ ] All files copied to correct locations
  [ ] Environment variables set
  [ ] Components imported and used
  [ ] Navigation updated
  [ ] Error boundaries added
  [ ] Loading states implemented
  [ ] Tests passing
  [ ] Lighthouse scores > 80
  [ ] Mobile responsive

Backend:
  [ ] Java backend running on :8080
  [ ] Python service running on :5000
  [ ] PostgreSQL connected
  [ ] All endpoints tested
  [ ] JWT authentication working
  [ ] CORS configured

Production:
  [ ] API URLs updated to production
  [ ] Error monitoring (Sentry) configured
  [ ] Performance monitoring enabled
  [ ] Rate limiting implemented
  [ ] Database backups tested
  [ ] CDN configured (if needed)
  [ ] Security headers added

NEXT STEPS FOR FRONTEND:

1. Copy provided files to frontend
2. Create content library page
3. Implement in dashboard
4. Add to post creation flow
5. Test with real brand data
6. Deploy to staging
7. User acceptance testing
8. Deploy to production

Timeline: 1-2 weeks (depending on other priorities)

FILES LOCATION:
- AI_SERVICE_API_INTEGRATION.md → project root
- FRONTEND_AI_INTEGRATION_SETUP.md → project root
- QUICKSTART_FRONTEND_AI.md → project root
- test-ai-integration.ts → project root
- ai-api.ts → frontend/src/lib/ai-api.ts
- RagComponents.tsx → frontend/src/components/ai/RagComponents.tsx

================================================================================

Previous Phase Status:
✅ Phase 1: AI Service Core (Text + Image Generation)
  - Groq + OpenRouter dual provider
  - Pixazo + OpenRouter image generation
  - Cost tracking and fallback logic

✅ Phase 2A: RAG Module (Retrieval-Augmented Generation)
  - File upload + text extraction
  - Embedding generation (2048-dim multimodal)
  - Vector similarity search
  - Content generation with RAG context
  - Database schema and migrations

✅ Phase 2B: Python Code Refactoring (Clean Architecture)
  - Separated concerns: routes, services, models
  - Pydantic DTOs for type safety
  - Fixed syntax errors
  - All components validated

✅ Phase 3: Frontend Integration Documentation (CURRENT)
  - Complete API documentation
  - TypeScript client library
  - React components ready-to-use
  - Setup and deployment guides
  - Integration testing suite

Next Phase: Phase 4 - Frontend Implementation
- Integrate provided components into Next.js
- Add to existing pages (dashboard, post creation)
- User testing and feedback
- Performance optimization
- Production deployment

================================================================================
    SPRING_DATASOURCE_USERNAME=socialflow
    SPRING_DATASOURCE_PASSWORD=<from secret>
    SERVER_PORT=8080
    SPRING_JPA_HIBERNATE_DDL_AUTO=update
  
  Frontend Deployment:
    API_URL=http://backend:8080
    NEXT_PUBLIC_API_URL=http://backend:8080

Database:
  PostgreSQL 16-alpine StatefulSet:
    - Persistent: /var/lib/postgresql/data → PVC (1Gi)
    - Schema auto-created by Hibernate (DDL_AUTO=update)
    - Access externally: kubectl port-forward -n socialflow svc/postgres 5432:5432

Resource Limits (Optimized for t3.small EC2 - 2GB RAM):
  Backend: 256Mi/512Mi RAM, 200m/500m CPU (1 replica)
  Frontend: 128Mi/256Mi RAM, 100m/250m CPU (1 replica)
  PostgreSQL: 128Mi/256Mi RAM, 100m/250m CPU
  Prometheus: 100Mi/256Mi RAM, 100m/200m CPU
  Grafana: 100Mi/128Mi RAM, 100m/200m CPU
  Total: ~832Mi memory (40% of 2GB available on t3.small)

Health Checks:
  Backend: HTTP GET /actuator/health (liveness: 120s delay, readiness: 90s delay)
    - JwtAuthFilter bypasses /actuator paths to allow unauthenticated health checks
    - Spring Boot startup time: 128-140 seconds (Hibernate initialization)
  Frontend: HTTP GET / (liveness: 10s, readiness: 10s)
  PostgreSQL: Command pg_isready (liveness: 5s, readiness: 5s)
  Prometheus: HTTP GET /-/healthy (liveness: 30s, readiness: 30s)
  Grafana: HTTP GET /api/health (liveness: 10s, readiness: 10s)

Debugging:
  Logs: kubectl logs -f -n socialflow <pod-name>
  Details: kubectl describe pod -n socialflow <pod-name>
  Status: kubectl get all -n socialflow
  Port-forward: kubectl port-forward -n socialflow svc/frontend 3000:3000
  
  Common fixes:
  - Pods not Ready: kubectl describe pod (check events)
  - CORS errors: Add localhost:30000 to CorsConfig.java
  - Health probe fail: Ensure /actuator/health returns 200 (no auth required)
  - PVC stuck Pending: StorageClass needs volumeBindingMode: Immediate

Production Configuration (EC2 - socialflow.io.vn):
  ✅ COMPLETED:
    - SSL/TLS: Cert-Manager + Let's Encrypt + Traefik Ingress
    - Domain: socialflow.io.vn with Cloudflare DNS
    - Subdomains: prometheus.socialflow.io.vn, grafana.socialflow.io.vn
    - Monitoring: Prometheus + Grafana deployed on K3s EC2
    - ImageRegistry: Docker on EC2 with containerd image import (docker save | k3s ctr images import)
    - StorageClass: rancher.io/local-path with WaitForFirstConsumer
    - Backend health probes: 90s/120s delay for slow Spring Boot startup
  
  NEXT CONSIDERATIONS:
    - Replace StatefulSet PostgreSQL with managed database (AWS RDS)
    - Use LoadBalancer instead of NodePort for public access
    - Configure HPA (Horizontal Pod Autoscaler) when resource constraints allow
    - Use AWS Secrets Manager for credentials
    - Enable Network Policies for pod-to-pod security
    - Setup log aggregation (CloudWatch, Datadog)
    - Add alerting rules to Prometheus (CPU, memory, request latency)
    - Configure automated backups for PostgreSQL

Local Development Convenience:
  - Script: port-forward.ps1 (PowerShell) — auto port-forward Prometheus + Grafana
  - Shortcut: port-forward.cmd (batch) — double-click to run both port-forwards in new windows
  - Usage: Runs kubectl port-forward in background terminals

Local Development with Port-Forward:
  Manual (one-by-one):
    kubectl port-forward -n socialflow svc/frontend 3000:3000 &
    kubectl port-forward -n socialflow svc/prometheus 9090:9090 &
    kubectl port-forward -n socialflow svc/grafana 3001:3000 &
  
  Auto (Windows):
    Run: port-forward.cmd (or pwsh port-forward.ps1)
    Opens 2 new PowerShell windows with Prometheus + Grafana port-forwards
  
  Then access: 
    - http://localhost:3000 (frontend)
    - http://localhost:9090 (prometheus)
    - http://localhost:3001 (grafana - admin/admin123)
  
  Stop: pkill -f "port-forward" (in PowerShell/WSL)

