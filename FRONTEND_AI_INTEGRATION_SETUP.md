# Frontend AI Service Integration - Setup & Deployment Guide

## 1. Environment Configuration

### Development Environment (.env.local)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_API_TIMEOUT=30000

# AI Service URLs (if direct calls needed)
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:5000
NEXT_PUBLIC_RAG_ENDPOINT=http://localhost:8080/api/ai/rag

# Feature Flags
NEXT_PUBLIC_ENABLE_RAG=true
NEXT_PUBLIC_ENABLE_IMAGE_GENERATION=true

# Analytics (optional)
NEXT_PUBLIC_TRACK_AI_USAGE=true
```

### Production Environment (.env.production)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.socialflow.com
NEXT_PUBLIC_API_TIMEOUT=30000

# AI Service
NEXT_PUBLIC_AI_SERVICE_URL=https://api.socialflow.com
NEXT_PUBLIC_RAG_ENDPOINT=https://api.socialflow.com/api/ai/rag

# Feature Flags
NEXT_PUBLIC_ENABLE_RAG=true
NEXT_PUBLIC_ENABLE_IMAGE_GENERATION=true

# Analytics
NEXT_PUBLIC_TRACK_AI_USAGE=true
```

---

## 2. File Structure Setup

Create these directories and files:

```
frontend/
├── src/
│   ├── lib/
│   │   └── ai-api.ts                    ← API client (provided)
│   │   └── api.ts                       ← Existing API client
│   │
│   ├── components/
│   │   ├── ai/
│   │   │   ├── RagComponents.tsx        ← React components (provided)
│   │   │   ├── RagLibraryManager.tsx    ← Library management
│   │   │   ├── RagContentGenerator.tsx  ← Content generation
│   │   │   └── RagSearchBrowser.tsx     ← Search interface
│   │   │
│   │   └── [existing components]
│   │
│   └── app/
│       ├── content-library/            ← NEW: Library management page
│       │   └── page.tsx
│       ├── content-generator/          ← NEW: Content generation page
│       │   └── page.tsx
│       └── [existing pages]
```

---

## 3. Creating Integration Pages

### Content Library Management Page

**Location:** `frontend/src/app/content-library/page.tsx`

```typescript
'use client';

import { useParams } from 'next/navigation';
import { RagLibraryManager } from '@/components/ai/RagLibraryManager';

export default function ContentLibraryPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  return (
    <div className="container mx-auto py-8">
      <RagLibraryManager brandId={brandId} />
    </div>
  );
}
```

### Content Generator Page

**Location:** `frontend/src/app/content-generator/page.tsx`

```typescript
'use client';

import { useParams } from 'next/navigation';
import { RagContentGenerator } from '@/components/ai/RagContentGenerator';

export default function ContentGeneratorPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  return (
    <div className="container mx-auto py-8">
      <RagContentGenerator brandId={brandId} />
    </div>
  );
}
```

---

## 4. Integration Into Existing Pages

### Add to Brand Dashboard

**Location:** `frontend/src/app/dashboard/page.tsx` (update)

```typescript
import { RagLibraryManager } from '@/components/ai/RagLibraryManager';
import { RagContentGenerator } from '@/components/ai/RagContentGenerator';

export default function DashboardPage() {
  const brandId = getBrandId(); // Your existing function

  return (
    <div className="space-y-8">
      {/* Existing dashboard content */}
      
      {/* AI Service Integration Section */}
      <div className="border-t pt-8">
        <h2 className="text-2xl font-bold mb-6">AI Content Generation</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <RagLibraryManager brandId={brandId} />
          <RagContentGenerator brandId={brandId} />
        </div>
      </div>
    </div>
  );
}
```

### Add to Post Creation Flow

**Location:** `frontend/src/app/posts/create/page.tsx` (update)

```typescript
import { RagContentGenerator } from '@/components/ai/RagContentGenerator';

export default function CreatePostPage() {
  const [postContent, setPostContent] = useState('');

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Post editor (existing) */}
      <div className="col-span-2">
        {/* Your existing post editor */}
      </div>

      {/* Right: AI Generation Sidebar */}
      <div>
        <RagContentGenerator 
          brandId={brandId}
          onContentGenerated={(content) => setPostContent(content)}
        />
      </div>
    </div>
  );
}
```

---

## 5. Sidebar Navigation Updates

**Location:** `frontend/src/components/Sidebar.tsx` (update)

```typescript
// Add to main navigation
<nav className="space-y-2">
  {/* Existing nav items */}
  
  {/* AI Features (if feature flag enabled) */}
  {process.env.NEXT_PUBLIC_ENABLE_RAG === 'true' && (
    <div className="border-t pt-4 mt-4">
      <h3 className="text-xs font-semibold text-gray-600 uppercase px-3 mb-3">
        AI Features
      </h3>
      <NavLink href="/content-library" icon={Upload}>
        Content Library
      </NavLink>
      <NavLink href="/content-generator" icon={Sparkles}>
        Generate Content
      </NavLink>
    </div>
  )}
</nav>
```

---

## 6. Error Handling & User Feedback

### Global Error Boundary for AI Features

**Location:** `frontend/src/components/ai/AiErrorBoundary.tsx`

```typescript
'use client';

import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AiErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('AI Feature Error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Something went wrong</h3>
            <p className="text-sm text-red-800">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-sm text-red-600 hover:text-red-700 font-medium mt-2"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrap AI components
<AiErrorBoundary>
  <RagContentGenerator brandId={brandId} />
</AiErrorBoundary>
```

---

## 7. Performance Optimization

### Caching RAG Results

**Location:** `frontend/src/lib/ai-cache.ts`

```typescript
interface CachedResult {
  data: any;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CachedResult>();

export function getCachedResult<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  const isExpired = Date.now() - cached.timestamp > cached.ttl;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
}

export function setCachedResult<T>(
  key: string,
  data: T,
  ttl: number = 3600000 // 1 hour
): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

// Usage
import { getCachedResult, setCachedResult } from '@/lib/ai-cache';

async function getLibraryWithCache(brandId: string) {
  const cacheKey = `library-${brandId}`;
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  const response = await listLibrary({ brand_id: brandId });
  setCachedResult(cacheKey, response);
  return response;
}
```

---

## 8. Testing Checklist

### Local Testing

- [ ] **Setup**: Environment variables configured
- [ ] **Dependencies**: ai-api.ts created in lib/
- [ ] **Components**: All RAG components rendering
- [ ] **API Calls**: Can reach Java backend on http://localhost:8080
- [ ] **JWT**: Tokens being sent with requests
- [ ] **File Upload**: Can upload files to library
- [ ] **Library List**: Can view uploaded files
- [ ] **Search**: Can search content library
- [ ] **Generation**: Can generate content with RAG
- [ ] **Errors**: Error messages display properly
- [ ] **Loading States**: Loading indicators show during async operations

### E2E Testing

```bash
# Start backend services
cd backend && mvn spring-boot:run

# Start Python AI service
cd ai-service && python main.py

# Start frontend
cd frontend && npm run dev

# Run tests
npm run test

# Manual testing
# 1. Login to http://localhost:3000
# 2. Create or select a brand
# 3. Navigate to Content Library
# 4. Upload a test file (brand_guidelines.txt)
# 5. Verify file appears in library
# 6. Navigate to Content Generator
# 7. Enter prompt
# 8. Click Generate
# 9. Verify RAG context appears
```

---

## 9. Deployment Checklist

- [ ] **Environment Variables**: Set in production platform
- [ ] **API URLs**: Updated to production endpoints
- [ ] **Feature Flags**: Enable/disable RAG features
- [ ] **Error Monitoring**: Sentry/LogRocket configured
- [ ] **Performance**: Lighthouse scores > 80
- [ ] **Security**: No sensitive data in client logs
- [ ] **Accessibility**: ARIA labels on all interactive elements
- [ ] **Mobile**: Responsive design tested on mobile
- [ ] **Browser Compatibility**: Tested on Chrome, Firefox, Safari
- [ ] **Load Testing**: Can handle 100 concurrent uploads
- [ ] **Rate Limiting**: Implement on Java backend
- [ ] **Backups**: Database and file storage backed up

---

## 10. Troubleshooting

### "Connection refused" on API calls
- Check Java backend is running: `curl http://localhost:8080/actuator/health`
- Check Python service is running: `curl http://localhost:5000/health`
- Verify NEXT_PUBLIC_API_URL in .env.local

### "Invalid JWT token" error
- Verify getAuthToken() is retrieving token from localStorage/cookie
- Check token not expired (24 hours)
- Clear browser storage and re-login

### File uploads fail
- Check file size < 10MB
- Verify file type is supported (PDF, DOCX, TXT, MD)
- Check /uploads directory exists and has write permissions

### Generated content is generic
- Upload more specific brand content
- Lower RAG threshold (0.2 instead of 0.3)
- Include more context chunks (5 instead of 3)

### Slow generation time (>10s)
- Default behavior due to AI provider latency
- Monitor network tab to see where delays occur
- Consider showing progress indicator

---

## 11. Future Enhancements

1. **Bulk Upload**: Multi-file upload with progress
2. **Content Versioning**: Track different versions of generated content
3. **Feedback**: Users rate generated content quality (improves RAG)
4. **Scheduling**: Queue generations for off-peak hours
5. **Templates**: Pre-configured generation templates by post type
6. **Webhooks**: Notify when generation completes
7. **Export**: Download library files in different formats
8. **Analytics**: Track most-used content chunks, generation metrics
9. **Collaboration**: Share content library between team users
10. **Mobile App**: Native iOS/Android app with offline RAG search

