# Project Pending Items

This document tracks high‑impact pending items across Admin and Ecommerce, split by APIs (backend) and UI (frontend).

## Admin – Backend (APIs)

- Products
  - GET `/api/products/[id]` → include images and category
  - PATCH images (append/remove single image; reorder)
  - Variants/options: create tables + CRUD (`product_options`, `product_variants`)
  - Bulk update stocks and soft delete
- Categories
  - PATCH `/api/categories/[id]` (name, slug, image_url)
  - DELETE `/api/categories/[id]` (soft delete)
- Orders
  - CRUD: list (filters), detail, update status with history
  - Stripe webhook: finalize order, error/retry strategy
  - Shiprocket: create shipment, label URL, tracking updates
- Customers
  - List/detail endpoints; notes/tags
- Promotions
  - Coupons CRUD + validation endpoint for checkout
- SEO/Content
  - Sitemap/robots endpoints; optional blog endpoints
- Auth/RBAC
  - Role‑guard middleware; audit logs on critical actions
- Observability
  - Health/status route; structured error JSON; consistent zod error format

## Admin – Frontend

- Products
  - List: thumbnail column; inline quick edit (price/stock); bulk actions
  - Edit: image manager (reorder/delete/set primary), category picker, slug uniqueness check
  - Variants UI: size/color grid with stock per variant
- Categories
  - List with edit/delete; image upload; link to filter products
- Orders
  - Table with filters; detail page with timeline; print invoice/label
  - Status change with note; triggers Shiprocket
- Customers
  - Table (search/filter); detail with orders/tags/notes
- Media Library
  - Grid with preview/search/pagination; select to attach to product
- Settings
  - Keys (Stripe/Shiprocket), currency/tax, email templates
- Auth/RBAC
  - Login page; hide sections by role
- UX
  - Toasts, skeletons, optimistic updates, error boundaries

## Ecommerce – Backend (shared)

- Public product query endpoints with pagination/filters/sort (optional proxy)
- Wishlist endpoints (if server‑side)
- Cart persistence endpoints (optional server model)
- Rate limiting/abuse protection for public APIs

## Ecommerce – Frontend

- Catalog (PLP)
  - Filters: price range, size, color; sort (price/newest)
  - Pagination/infinite scroll; empty states; skeletons
  - Home categories from DB `categories.image_url`
- PDP
  - Variant selection; stock per variant; gallery zoom; related products
- Cart/Checkout
  - Persistent cart (cookie + server fallback), update qty, coupons
  - Address form with validation; shipping options; order review
  - Payment success/cancel handling with clear states
- Account
  - Auth (Supabase); orders list/detail; addresses; wishlist
- SEO/Analytics
  - Head/meta/OG/schema; sitemap/robots; GA4 + Meta events

## Data/Schema

- Variants/options tables + indexes
- Promotions constraints (min spend, expiry, usage limits)
- Orders completeness: shipping address fields, payment refs
- Indexes/constraints: slug unique, FK indexes, partial index on `deleted_at IS NULL`

## Notes

- Stock control is live: `stock` drives `is_active` via trigger. Ecommerce hides inactive products; PDP disables “Add to cart” if out of stock.
- Images: product image rows stored in `public.product_images` (compat for `url` or `image_url`). UI reads either.


