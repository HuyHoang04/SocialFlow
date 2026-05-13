# 🎯 Brand Creation Process - Comprehensive Standardization

## Tóm tắt các thay đổi / Summary of Changes

Quy trình tạo brand đã được chuẩn hóa hoàn toàn với đầy đủ các trường thông tin và tính năng gợi ý tự động (auto-fill).

---

## Backend Changes

### 1. **Brand Model Expansion**
📁 `backend/src/main/java/com/socialflow/model/Brand.java`

**Thêm các trường mới:**
- `website` - URL website của brand
- `contactEmail` - Email liên hệ chính
- `phone` - Số điện thoại
- `industry` - Ngành công nghiệp (Technology, E-commerce, Food & Beverage, v.v.)
- `country` - Quốc gia
- `brandSlogan` - Slogan/Tagline của brand
- `primaryColor` - Màu chính (hex color code)
- `secondaryColor` - Màu phụ (hex color code)

### 2. **Brand Suggestion Service (Mới)**
📁 `backend/src/main/java/com/socialflow/service/BrandSuggestionService.java`

**Tính năng gợi ý thông minh:**

- **Industry Detection**: Tự động phát hiện ngành công nghiệp dựa trên tên brand
  - Keywords: tech, soft, app → Technology
  - Keywords: shop, store, commerce → E-commerce
  - Keywords: cafe, restaurant, food → Food & Beverage
  - ... và 13+ ngành khác

- **Color Palette Generation**: Tạo gợi ý màu sắc dựa trên ngành
  - Technology: Blue (#0066FF) & Cyan (#00D9FF)
  - E-commerce: Orange (#FF6B35) & Dark Orange (#F7931E)
  - Food & Beverage: Red (#D4145A) & Gold (#FBB03B)
  - v.v.

- **Brand Slogan Generation**: Tạo slogan thích hợp
  - Sử dụng templates khác nhau cho từng ngành
  - Tích hợp tên brand vào slogan

- **Website Domain Suggestion**: Gợi ý domain tự động
  - Ví dụ: "My Brand" → "https://www.mybrand.com"

### 3. **Create Brand Request DTO**
📁 `backend/src/main/java/com/socialflow/dto/CreateBrandRequest.java`

**Cập nhật** để bao gồm tất cả các trường mới

### 4. **Brand Suggestion DTOs (Mới)**
📁 `backend/src/main/java/com/socialflow/dto/BrandSuggestionRequest.java`
📁 `backend/src/main/java/com/socialflow/dto/BrandSuggestionResponse.java`

### 5. **Brand Service Updates**
📁 `backend/src/main/java/com/socialflow/service/BrandService.java`

**Cập nhật `createBrand()` và `updateBrand()`** để xử lý tất cả các trường mới

### 6. **Brand Controller**
📁 `backend/src/main/java/com/socialflow/controller/BrandController.java`

**Thêm:**
- Injection của `BrandSuggestionService`
- **Endpoint mới:** `POST /api/brands/suggestions/generate`
  - Request: `{ "brandName": "string" }`
  - Response: Auto-filled suggestions (slogan, industry, colors, website)
- **Cập nhật** `toMap()` method để include tất cả các trường mới

### 7. **Database Migration**
📁 `backend/src/main/resources/db/migration/V2__add_brand_comprehensive_fields.sql`

SQL migration để thêm các cột mới vào table `brands`

---

## Frontend Changes

### 1. **Brand Content Form Component**
📁 `frontend/src/app/settings/brand-content.tsx`

**Hoàn toàn được tái cấu trúc với:**

✨ **Tính năng Auto-Fill Suggestions:**
- Nút "✨ Generate Auto-Fill Suggestions" (dễ nhận biết)
- Nhập brand name → Click "Generate"
- Tự động điền các trường:
  - Industry (dựa trên keywords)
  - Brand Slogan
  - Primary & Secondary Colors
  - Website

📋 **Form được chia thành 3 phần rõ ràng:**
1. **Basic Information**
   - Brand Name (required)
   - Industry
   - Country
   - Description
   - Brand Slogan

2. **Contact Information**
   - Website
   - Email
   - Phone

3. **Visual Identity**
   - Logo URL
   - Primary Color (with color picker + hex input)
   - Secondary Color (with color picker + hex input)

🎨 **UI Improvements:**
- Chia nhóm các trường liên quan
- Color picker input (visual + text)
- Reset button để khôi phục dữ liệu gốc
- Grid layout responsive
- Emoji icons để dễ nhận biết các section

### 2. **Brand Context**
📁 `frontend/src/lib/brand-context.tsx`

**Cập nhật Brand interface** để bao gồm tất cả các trường mới

### 3. **API Library**
📁 `frontend/src/lib/api.ts`

**Thêm:**
- Cập nhật `updateBrand()` signature để include tất cả trường mới
- **Thêm method mới:** `generateBrandSuggestions(brandName)`
  - Call: `POST /brands/suggestions/generate`

---

## 📊 Quy trình tạo Brand hoàn chỉnh

### Tạo Brand MỚI:
1. Nhập **Brand Name** (required)
2. Click **"✨ Generate Auto-Fill Suggestions"**
3. Các trường tự động được điền:
   - Industry
   - Brand Slogan
   - Colors (Primary & Secondary)
   - Website suggestion
4. Điều chỉnh / thêm thông tin liên hệ:
   - Website
   - Email
   - Phone
5. Upload logo và hoàn tất các trường khác
6. Click **"✅ Save Changes"**

### Cập nhật Brand HiỆN TẠI:
1. Chỉnh sửa bất kỳ trường nào
2. Click **"✅ Save Changes"**
3. Có thể click **"✨ Generate Auto-Fill Suggestions"** bất kỳ lúc nào để cập nhật các gợi ý

---

## 🔍 API Endpoints

### Tạo/Cập nhật Brand
```
POST /api/brands
PUT /api/brands/{id}

Request Body:
{
  "name": "string" (required),
  "description": "string",
  "logoUrl": "string",
  "website": "string",
  "contactEmail": "string",
  "phone": "string",
  "industry": "string",
  "country": "string",
  "brandSlogan": "string",
  "primaryColor": "string",
  "secondaryColor": "string"
}
```

### Tạo Auto-Fill Suggestions (MỚI)
```
POST /api/brands/suggestions/generate

Request Body:
{
  "brandName": "string" (required)
}

Response:
{
  "brandSlogan": "string",
  "suggestedIndustry": "string",
  "primaryColor": "string",
  "secondaryColor": "string",
  "website": "string"
}
```

---

## 🚀 Các Ngành được hỗ trợ

1. **Technology** - Blue & Cyan
2. **E-commerce** - Orange & Dark Orange
3. **Food & Beverage** - Red & Gold
4. **Beauty & Wellness** - Rose & Pink
5. **Health & Fitness** - Green & Orange
6. **Sports** - Black & Red
7. **Travel & Tourism** - Green & Sky Blue
8. **Education** - Navy & White
9. **Real Estate** - Brown & Tan
10. **Media & Entertainment** - Purple
11. **Finance & Banking** - Navy & Gold
12. **Consulting** - Navy & Gray

---

## ✅ Kiểm tra & Test

### Backend Build:
```bash
cd backend
mvn clean install
```

### Frontend Dev Server:
```bash
cd frontend
npm install
npm run dev
```

### Test Auto-Fill:
1. Mở Settings → Brand Settings
2. Nhập brand name như "TechFlow"
3. Click "Generate Auto-Fill Suggestions"
4. Verify suggestions được điền tự động

---

## 📝 Ghi chú

- Tất cả các trường mới không bắt buộc (optional) ngoại trừ `name`
- Màu sắc sử dụng hex color code (e.g., #0066FF)
- Suggestion service tự động phát hiện ngành dựa trên tên brand
- Có thể regenerate suggestions bất kỳ lúc nào
- Database migration tự động chạy khi ứng dụng khởi động
