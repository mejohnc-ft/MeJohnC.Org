# Style Guide Feature Module

A standalone modular feature for managing brand identities, design tokens, asset libraries, and style guidelines.

**Issue:** [#110](https://github.com/mejohnc-ft/MeJohnC.Org/issues/110)
**Version:** 1.0.0
**Prefix:** `style`

---

## Overview

The Style Guide module provides comprehensive brand and design system management capabilities:

- **Brand Management**: Create and manage multiple brand identities
- **Design Tokens**: Extract and manage colors, typography, spacing from Figma
- **Asset Library**: Organize logos, icons, images, and brand assets
- **Style Guidelines**: Document component patterns and usage guidelines
- **Figma Integration**: Sync design tokens directly from Figma files

---

## Standalone Value

MSPs and agencies managing multiple client brands can use this module independently for:

1. **Multi-Brand Management**: Manage design systems for multiple clients
2. **Design Token Extraction**: Automatically sync design tokens from Figma
3. **Asset Organization**: Centralized brand asset library with tagging
4. **Documentation**: Generate and maintain style guide documentation
5. **Team Collaboration**: Share brand guidelines with team members

---

## Architecture

```
src/features/style-guide/
├── index.ts                # Public API
├── module.ts               # FeatureModule definition
├── schemas.ts              # Zod schemas for all entities
├── README.md               # This file
├── adapters/
│   └── figma-adapter.ts    # Figma API integration
├── components/
│   ├── index.ts
│   ├── ColorPalette.tsx    # Color swatch grid
│   ├── TypographyScale.tsx # Typography preview
│   ├── ComponentShowcase.tsx # Component guidelines
│   └── AssetLibrary.tsx    # Asset grid with search
└── pages/
    ├── index.ts
    ├── BrandPage.tsx       # Brand management
    ├── ColorsPage.tsx      # Color palette viewer
    ├── TypographyPage.tsx  # Typography scale viewer
    └── ComponentsPage.tsx  # Component guidelines

src/services/style/
├── index.ts
├── style-service.interface.ts  # IStyleService contract
└── style-service.supabase.ts   # Supabase implementation
```

---

## Database Schema

### Tables

All tables use the `style_` prefix and include standard fields:
- `id` (UUID, primary key)
- `tenant_id` (UUID, for multi-tenancy)
- `created_at`, `updated_at`, `deleted_at`

#### `app.style_brands`
Stores brand identity information.

```sql
CREATE TABLE app.style_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES app.tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url TEXT,
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  design_tokens JSONB,
  figma_file_key VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

#### `app.style_assets`
Stores brand assets (logos, icons, images, etc.).

```sql
CREATE TABLE app.style_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES app.tenants(id),
  brand_id UUID REFERENCES app.style_brands(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- logo, icon, image, etc.
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

#### `app.style_guidelines`
Stores style guidelines and documentation.

```sql
CREATE TABLE app.style_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES app.tenants(id),
  brand_id UUID REFERENCES app.style_brands(id),
  category VARCHAR(50) NOT NULL, -- logo-usage, color-palette, etc.
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  examples TEXT[] DEFAULT '{}',
  do_examples TEXT[] DEFAULT '{}',
  dont_examples TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

---

## Service Interface

### `IStyleService`

The service interface provides all CRUD operations for brands, assets, and guidelines:

```typescript
interface IStyleService {
  // Brands
  getBrands(ctx: ServiceContext): Promise<Brand[]>;
  getBrandById(ctx: ServiceContext, id: string): Promise<Brand | null>;
  createBrand(ctx: ServiceContext, data: CreateBrandInput): Promise<Brand>;
  updateBrand(ctx: ServiceContext, id: string, data: UpdateBrandInput): Promise<Brand>;
  deleteBrand(ctx: ServiceContext, id: string): Promise<void>;

  // Design Tokens
  getDesignTokens(ctx: ServiceContext, brandId: string): Promise<DesignTokens | null>;
  updateDesignTokens(ctx: ServiceContext, brandId: string, tokens: DesignTokens): Promise<Brand>;
  syncFromFigma(ctx: ServiceContext, brandId: string, fileKey: string, token: string): Promise<DesignTokens>;

  // Assets
  getAssets(ctx: ServiceContext, filters?: { brandId?: string; type?: AssetType }): Promise<Asset[]>;
  getAssetById(ctx: ServiceContext, id: string): Promise<Asset | null>;
  createAsset(ctx: ServiceContext, data: CreateAssetInput): Promise<Asset>;
  updateAsset(ctx: ServiceContext, id: string, data: UpdateAssetInput): Promise<Asset>;
  deleteAsset(ctx: ServiceContext, id: string): Promise<void>;
  searchAssets(ctx: ServiceContext, query: string): Promise<Asset[]>;

  // Guidelines
  getGuidelines(ctx: ServiceContext, filters?: { brandId?: string; category?: GuidelineCategory }): Promise<Guideline[]>;
  getGuidelineById(ctx: ServiceContext, id: string): Promise<Guideline | null>;
  createGuideline(ctx: ServiceContext, data: CreateGuidelineInput): Promise<Guideline>;
  updateGuideline(ctx: ServiceContext, id: string, data: UpdateGuidelineInput): Promise<Guideline>;
  deleteGuideline(ctx: ServiceContext, id: string): Promise<void>;
  searchGuidelines(ctx: ServiceContext, query: string): Promise<Guideline[]>;
}
```

---

## Usage Examples

### Extract Design Tokens from Figma

```typescript
import { StyleServiceSupabase } from '@/services/style';
import { useSupabase } from '@/lib/supabase-client';

const supabase = useSupabase();
const service = new StyleServiceSupabase();

// Sync tokens from Figma
const tokens = await service.syncFromFigma(
  { client: supabase },
  brandId,
  'figma-file-key',
  'figma-access-token'
);

console.log(`Extracted ${tokens.colors.length} colors`);
```

### Display Color Palette

```tsx
import { ColorPalette } from '@/features/style-guide';

function MyComponent() {
  const colors = [
    { name: 'Primary', value: '#3b82f6', rgba: { r: 59, g: 130, b: 246, a: 1 }, category: 'primary' },
    { name: 'Secondary', value: '#8b5cf6', rgba: { r: 139, g: 92, b: 246, a: 1 }, category: 'secondary' },
  ];

  return <ColorPalette colors={colors} groupByCategory />;
}
```

### Manage Brand Assets

```typescript
// Create an asset
const asset = await service.createAsset(
  { client: supabase },
  {
    brand_id: brandId,
    name: 'Company Logo',
    type: 'logo',
    url: 'https://example.com/logo.svg',
    tags: ['logo', 'primary', 'dark-mode'],
  }
);

// Search assets
const results = await service.searchAssets(
  { client: supabase },
  'logo'
);
```

---

## Routes

All routes require `style:read` permission:

- `/admin/style` - Brand management
- `/admin/style/colors` - Color palette viewer
- `/admin/style/typography` - Typography scale
- `/admin/style/components` - Component guidelines

---

## Figma Integration

The Figma adapter (`FigmaAdapter`) encapsulates all Figma API interactions:

```typescript
import { FigmaAdapter } from '@/features/style-guide';

const adapter = new FigmaAdapter();

// Validate token
const isValid = await adapter.validateToken(token);

// Get file info
const info = await adapter.getFileInfo(fileKey, token);

// Extract design tokens
const tokens = await adapter.extractDesignTokens(fileKey, token);
```

---

## Permissions

- `style:read` - View style guide, brands, and assets
- `style:write` - Create and edit brands, assets, and guidelines
- `style:delete` - Delete brands, assets, and guidelines

---

## Agent Tools

When integrated with CentrexAI, the following tools are available:

```typescript
tools: [
  { name: 'style_get_brand', permission: 'style:read' },
  { name: 'style_list_assets', permission: 'style:read' },
  { name: 'style_search_guidelines', permission: 'style:read' },
]
```

---

## Migration Guide

### From Monolithic App

If migrating from the existing style guide page:

1. **Design Tokens**: Stored in `design_tokens` JSONB field on brands
2. **Figma Integration**: Encapsulated in `FigmaAdapter`
3. **Components**: Extracted to `src/features/style-guide/components/`
4. **Pages**: Migrated to `src/features/style-guide/pages/`

### For New Implementations

1. Create database tables using migrations
2. Instantiate `StyleServiceSupabase`
3. Import components as needed
4. Register routes via `styleGuideModule.frontendRoutes`

---

## Future Enhancements

- [ ] Asset upload to Azure Blob Storage
- [ ] Design token versioning
- [ ] Brand guideline PDF export
- [ ] Figma plugin for direct sync
- [ ] Multi-language support for guidelines
- [ ] Component usage analytics
- [ ] Collaborative editing with real-time updates

---

## Dependencies

- **Internal**: `@/lib/figma-api`, `@/lib/tailwind-generator`, `@/components/ui/*`
- **External**: `zod`, `@supabase/supabase-js`, `framer-motion`, `lucide-react`

---

## Testing

```bash
# Unit tests
npm test src/features/style-guide

# Integration tests
npm test src/services/style

# E2E tests
npm run e2e -- --spec "style-guide/**"
```

---

## Support

For questions or issues:
- GitHub Issues: [#110](https://github.com/mejohnc-ft/MeJohnC.Org/issues/110)
- Documentation: [docs/modular-app-design-spec.md](../../../docs/modular-app-design-spec.md)

---

## License

Part of MeJohnC.Org - See root LICENSE file.
