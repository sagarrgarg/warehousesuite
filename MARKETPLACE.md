# Frappe Cloud Marketplace Publishing Checklist

## CRITICAL: License Requirement

Frappe Cloud Marketplace **requires open source license (MIT or GPL-compatible)**.
Current license is **Commercial** (`license.txt`).

**Options:**
1. **Change to MIT/GPL** — required for Frappe Cloud Marketplace
2. **Keep Commercial** — distribute independently (not via marketplace)
3. **Dual license** — open-source core on marketplace, premium features via separate add-on

**Decision needed before proceeding.**

## Version Compatibility

- [x] Frappe v15 — tested, production-deployed
- [x] Frappe v16 — compatible (uses standard APIs: get_doc, get_all, whitelist, get_cached_doc, get_meta, db.get_value, db.exists). No deprecated patterns. `use_serial_batch_fields` on Stock Entry Detail exists in both v15 and v16.
- [x] Python 3.10-3.12
- [x] Node.js 20+
- [x] ERPNext v15 and v16

## App Listing Requirements

### Account Setup
- [ ] Frappe Cloud account active
- [ ] "Become a Publisher" enabled in Profile settings
- [ ] App added via "+ Add App" or "Add from GitHub"

### App Metadata (hooks.py)
- [x] `app_name`: `warehousesuite`
- [x] `app_title`: `WarehouseSuite` (proper case, appears on marketplace homepage)
- [x] `app_description`: Under 80 chars, single sentence
- [x] `app_publisher`: `Sagar Ratan Garg`
- [x] `app_email`: `sagar1ratan1garg1@gmail.com`
- [x] `app_license`: `Commercial`
- [x] `required_apps`: `["erpnext"]`

### Short Description (40-80 chars, for marketplace listing)
```
Mobile-first warehouse management for ERPNext
```
- [x] Under 80 characters
- [x] Single sentence describing functionality
- [x] Does not repeat app name
- [x] Only proper nouns capitalized

### Long Description
- [x] Covers usage, features, broader functionality
- [x] Does not duplicate short description
- [x] No installation instructions (Frappe Cloud handles this)
- [x] No screenshots in text (use dedicated screenshot section)

### Logo
- [ ] **NEED TO CREATE**: Square image, minimum 200x200px
- [ ] Will be displayed in circular frame — center the icon
- [ ] No text/words in the logo
- [ ] Recommended: Simple warehouse/box icon on brand color background
- [ ] Format: PNG with transparent background or solid color
- [ ] Save to: `warehousesuite/public/images/logo.png`

### Category
- [ ] Select: **Inventory** or **Manufacturing** (whichever Frappe Cloud offers)

### Required URLs (fill in Frappe Cloud dashboard)
- [x] **Support URL**: `https://github.com/sagarrgarg/warehousesuite/issues`
- [x] **Privacy Policy URL**: `https://github.com/sagarrgarg/warehousesuite/blob/main/PRIVACY.md`

### Demo Video
- [ ] **NEED TO CREATE**: Short video (2-5 min) showing:
  - POW Dashboard overview
  - Transfer Send with batch selection
  - Transfer Receive
  - Stock Counting
  - Stock Concern + revert
  - Mobile view
- [ ] Upload to YouTube (unlisted or public)
- [ ] Add URL to Frappe Cloud listing

### Screenshots (for marketplace listing)
- [ ] **NEED TO CAPTURE**:
  1. POW Dashboard — desktop 3-column view with data
  2. POW Dashboard — mobile view
  3. Transfer Send modal with batch picker
  4. Transfer Receive with incoming items
  5. Stock Count with batch rows
  6. Stock Concerns modal
  7. Notification banner (Critical level)
  8. POW Profile setup in Frappe desk
- [ ] Recommended: 1280x800 or 1920x1080 resolution
- [ ] Light mode preferred for marketplace screenshots

### Version Compatibility
- [x] Supports Frappe v15 (current stable)
- [x] Supports ERPNext v15
- [x] Python 3.10+
- [x] Node.js 20+ (for frontend build)

## Technical Readiness

### Code Quality
- [x] Ruff lint configured in `pyproject.toml`
- [x] Pre-commit hooks configured (`.pre-commit-config.yaml`)
- [x] ESLint + Prettier for frontend
- [x] No hardcoded credentials or secrets
- [x] No test database credentials in code

### Installation
- [x] `bench get-app` works
- [x] `bench install-app` works
- [x] `bench build --app warehousesuite` works
- [x] `bench migrate` creates all doctypes and custom fields
- [x] `after_install` hook creates Stock Entry types
- [x] No manual setup steps required beyond profile creation

### Files Present
- [x] `README.md` — comprehensive, marketplace-ready
- [x] `PRIVACY.md` — privacy policy
- [x] `license.txt` — commercial license
- [x] `pyproject.toml` — Python package metadata
- [x] `package.json` — Node package metadata
- [x] `.pre-commit-config.yaml` — code quality hooks
- [x] `warehousesuite/hooks.py` — all required metadata fields
- [x] `warehousesuite/install.py` — after_install setup
- [x] `warehousesuite/modules.txt` — module declaration
- [x] `warehousesuite/patches.txt` — migration patches

### What's Missing (Action Items)
1. **Logo** — create 200x200+ square PNG, no text
2. **Demo video** — record 2-5 min walkthrough
3. **Screenshots** — capture 6-8 screens
4. **Frappe Cloud account** — enable publisher, add app
5. **Publish release** — tag a version, submit for review
6. **Wait 10 days** — Frappe team reviews before going live

## Publishing Steps

1. Go to Frappe Cloud → Profile → "Become a Publisher"
2. Add app from GitHub: `sagarrgarg/warehousesuite`
3. Go to app Overview tab → fill:
   - Short description (40-80 chars)
   - Long description (from README)
   - Upload logo
   - Upload screenshots
   - Add demo video URL
   - Set support URL
   - Set privacy policy URL
   - Select category
   - Select Frappe v15 compatibility
4. Tag a release: `git tag v1.0.0 && git push upstream v1.0.0`
5. In Frappe Cloud → publish the release
6. Submit for marketplace review
7. Wait ~10 days for approval
