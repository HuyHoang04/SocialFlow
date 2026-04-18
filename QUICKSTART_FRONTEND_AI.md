# Frontend AI Service Integration - Quick Start (5 minutes)

## Overview
This guide helps frontend developers integrate the Python AI Service (RAG) with the Next.js frontend. Complete integration takes ~1-2 hours.

---

## Files Provided

| File | Purpose | Location |
|------|---------|----------|
| `AI_SERVICE_API_INTEGRATION.md` | Complete API documentation | Root |
| `FRONTEND_AI_INTEGRATION_SETUP.md` | Setup & deployment guide | Root |
| `ai-api.ts` | TypeScript API client | `frontend/src/lib/ai-api.ts` |
| `RagComponents.tsx` | React components (3x) | `frontend/src/components/ai/RagComponents.tsx` |
| `test-ai-integration.ts` | Integration test suite | Root |

---

## Step 1: Copy Files (2 min)

```bash
# Copy TypeScript API client
cp ai-api.ts frontend/src/lib/

# Copy React components
mkdir -p frontend/src/components/ai
cp RagComponents.tsx frontend/src/components/ai/
```

---

## Step 2: Setup Environment (1 min)

**File:** `frontend/.env.local`

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_ENABLE_RAG=true
NEXT_PUBLIC_ENABLE_IMAGE_GENERATION=true
```

---

## Step 3: Create Integration Page (1 min)

**File:** `frontend/src/app/content-library/page.tsx`

```typescript
'use client';

import { useParams } from 'next/navigation';
import { RagLibraryManager, RagContentGenerator } from '@/components/ai/RagComponents';

export default function ContentLibraryPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-2 gap-6">
        <RagLibraryManager brandId={brandId} />
        <RagContentGenerator brandId={brandId} />
      </div>
    </div>
  );
}
```

---

## Step 4: Add Navigation (1 min)

**File:** `frontend/src/components/Sidebar.tsx` (update)

```typescript
import { Upload, Sparkles } from 'lucide-react';

// Inside navigation
<div className="border-t pt-4 mt-4">
  <h3 className="text-xs font-semibold uppercase px-3 mb-3">AI Features</h3>
  <NavLink href="/content-library" icon={Upload}>
    Content Library
  </NavLink>
  <NavLink href="/content-generator" icon={Sparkles}>
    Generate Content
  </NavLink>
</div>
```

---

## Step 5: Test Integration (none - automatic)

```bash
# Start services
cd backend && mvn spring-boot:run         # Terminal 1
cd ai-service && python main.py           # Terminal 2
cd frontend && npm run dev                # Terminal 3

# Open browser
http://localhost:3000/content-library
```

---

## Quick Integration Checklist

- [ ] Files copied to correct locations
- [ ] Environment variables set
- [ ] Integration page created
- [ ] Navigation updated
- [ ] Java backend running
- [ ] Python service running
- [ ] Frontend dev server running
- [ ] Can access http://localhost:3000/content-library
- [ ] File upload works
- [ ] Can generate content

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Connection refused" | Check `NEXT_PUBLIC_API_URL` in `.env.local` |
| JWT errors | Verify `getAuthToken()` works in your setup |
| File upload fails | Check `/uploads` directory exists |
| No search results | Upload files first, then search |
| Slow generation | Normal (2-10s) due to AI provider latency |

---

## API Usage Examples

### Upload File
```typescript
import { uploadToLibrary } from '@/lib/ai-api';

const response = await uploadToLibrary(
  'brand-id',
  fileInput.files[0],
  'BRAND_GUIDELINES'
);
```

### Generate Content
```typescript
import { generateContentWithRag } from '@/lib/ai-api';

const response = await generateContentWithRag({
  brand_id: 'brand-id',
  prompt: 'Create a social media post',
  rag_query: 'product features',
  rag_limit: 3,
  tone: 'professional'
});

console.log(response.content); // Generated content
console.log(response.rag_context); // Source chunks used
```

### Search Library
```typescript
import { searchLibrary } from '@/lib/ai-api';

const response = await searchLibrary({
  brand_id: 'brand-id',
  query: 'sustainability practices',
  limit: 5,
  threshold: 0.3
});

response.results.forEach(chunk => {
  console.log(chunk.chunk_text); // Matching content
  console.log(chunk.similarity_score); // 0-1 relevance score
});
```

---

## Data Models (TypeScript)

```typescript
interface RagUploadResponse {
  success: boolean;
  library_id: string;
  file_name: string;
  total_chunks: number;
  embeddings_saved: number;
}

interface RagGenerateContentResponse {
  success: boolean;
  content: string;
  rag_context: Array<{
    chunk_text: string;
    similarity_score: number;
  }>;
  rag_results_count: number;
  ai_model: string;
}

interface RagSearchResponse {
  success: boolean;
  results: Array<{
    chunk_text: string;
    similarity_score: number;
    file_name: string;
  }>;
  total_results: number;
}
```

---

## Next Steps

1. **Basic Integration** (now)
   - Copy files, setup environment, create page

2. **Enhanced UX** (1-2 hours)
   - Add loading states
   - Add error handling
   - Add progress indicators
   - Format output nicely

3. **Advanced Features** (2-4 hours)
   - Multi-file upload
   - Batch generation
   - Content versioning
   - User feedback/ratings

4. **Analytics** (4-8 hours)
   - Track generation metrics
   - Monitor RAG performance
   - A/B testing

---

## Support

### Documentation Files
- **Complete API Reference**: `AI_SERVICE_API_INTEGRATION.md`
- **Setup & Deployment**: `FRONTEND_AI_INTEGRATION_SETUP.md`
- **Component Examples**: See `RagComponents.tsx`

### Testing
```bash
# Run integration tests
npx ts-node test-ai-integration.ts
```

### Debugging
```typescript
// Add logging to ai-api.ts
console.log('Calling:', url);
console.log('Request:', JSON.stringify(body, null, 2));
console.log('Response:', data);

// Or use DevTools Network tab to inspect requests
```

---

## Architecture Overview

```
Frontend (Next.js)
    ↓
java Backend (Spring Boot 3.2.3)
    ├─ @/api/ai/rag/upload         → Python service
    ├─ @/api/ai/rag/search         → Python service
    ├─ @/api/ai/rag/generate       → Python service
    └─ @/api/ai/rag/library        → Python service
    ↓
Python AI Service (FastAPI)
    ├─ /rag/upload                 → File extraction + embedding
    ├─ /rag/search                 → Vector similarity search
    ├─ /rag/generate-content       → RAG + AI generation
    └─ /rag/library                → List uploaded files
    ↓
PostgreSQL + pgvector
    ├─ content_library_item        (files + metadata)
    └─ rag_embedding               (chunks + vectors)
```

---

## Performance Targets

| Operation | Target | Typical |
|-----------|--------|---------|
| File Upload | <5s | 2-3s |
| List Library | <100ms | <50ms |
| Search | <1s | 500ms |
| Generate | <10s | 3-8s |
| Concurrent (5x) | <15s | 5-10s |

---

## Questions?

1. Check `AI_SERVICE_API_INTEGRATION.md` for API details
2. Check `FRONTEND_AI_INTEGRATION_SETUP.md` for setup help
3. Run `test-ai-integration.ts` to verify services working
4. Check browser Console/Network tab for request details

---

**Estimated Time to Full Integration: 1-2 hours**
**Complexity: Medium**
**Impact: High** (enables AI content generation for users)

