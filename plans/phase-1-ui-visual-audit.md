# Phase 1 UI Visual Audit

## Scope

This audit covers the current React/Vite frontend with emphasis on the routes named in the UI refresh plan:

- Public: `/`, tenant home, `/login`, `/register`, `/request-portal`.
- Portal shell: `/portal` and shared dashboard navigation/topbar.
- Portal modules: feed, alumni directory, events, jobs, groups, gallery, newsroom, business directory, messages, notifications, settings.
- Admin surfaces: institute settings, content moderation, super admin, shared portal primitives.

The goal for Phase 1 is not to redesign yet. It is to identify where the existing interface already has reusable visual structure and where the app feels muted, inconsistent, or under-expressive.

## High-Level Findings

The app is functionally broad and already has a modern base: rounded cards, responsive grids, Material Symbols, route-level code splitting, shared primitives, and several feature-specific page namespaces. The main visual issue is that most screens depend on the same white card, slate text, light gray border, and indigo action color. That makes the product feel consistent in a basic way, but it also flattens the personality of distinct alumni workflows.

There are also two styling systems living side by side:

- Token/Tailwind/shared component layer in `frontend/src/design-tokens.js`, `frontend/src/styles.css`, and `frontend/src/components/ui/`.
- Large custom CSS namespaces such as `dl-*`, `hp-*`, `th-*`, `feed-*`, `ad-*`, `ev-*`, `jb-*`, `gl-*`, `nr-*`, `bd-*`, `st-*`, and chat-specific classes.

The refresh should work with these namespaces first instead of forcing a full rewrite. A token-driven color upgrade can give the whole app a more vibrant feel while keeping implementation risk contained.

## Current Strengths To Preserve

- Clear page namespace conventions for major modules.
- Existing token file with brand, semantic, surface, ink, spacing, radius, shadow, transition, and z-index definitions.
- Reusable UI components for buttons, cards, badges, inputs, and loading indicators.
- Shared portal primitives such as `portal-page-header`, `portal-segmented-tabs`, `portal-search-field`, and `portal-metric-card`.
- Good use of feature icons through Material Symbols.
- Portal sidebar collapse behavior and mobile overlay are already present.
- Tenant branding exists through `useTenantBranding` and tenant CSS variables.
- Several modules already use domain color arrays for avatars, logos, skills, statuses, and metrics.
- Messages UI is more visually expressive than most modules and can be used as a reference for warmer, richer surfaces.

## Main Visual Problems

### 1. One Accent Color Does Too Much Work

Most primary actions, active tabs, focus states, badges, icon backgrounds, links, and hover states use indigo or brand blue. This is visible across dashboard, feed, alumni, events, jobs, gallery, newsroom, business directory, settings, and shared UI components.

Effect: individual modules do not feel distinct. Jobs, events, alumni, business listings, and gallery all read as variants of the same screen.

### 2. Page Surfaces Are Too Flat

Most module roots sit on a neutral dashboard background with white cards and low-contrast borders. Cards are clean but not especially memorable.

Common pattern:

- white card
- `#e2e8f0` or `#e8edf3` border
- slate title
- gray subtitle
- indigo active/primary state

Effect: the app feels tidy but not vibrant.

### 3. Page Headers Are Underused

Feature pages usually have a title, subtitle, and one action button. They do not carry much visual identity.

Affected modules:

- Feed
- Alumni directory
- Events
- Jobs
- Gallery
- Newsroom
- Business directory
- Settings

Opportunity: page headers can become lightweight color anchors with icon wells, tinted background bands, or accent chips without becoming marketing-style hero sections.

### 4. Cards Repeat The Same Treatment

Cards are consistent, but many card types are visually interchangeable:

- metrics
- composer cards
- filters
- list rows
- sidebars
- profile cards
- business cards
- settings panels

Opportunity: assign reusable card roles:

- metric card
- action card
- content card
- media card
- form panel
- sidebar panel
- empty state panel

Each role can get a shared vibrant treatment.

### 5. Empty States Are Muted

Empty states usually use gray text and a simple icon or text block. They do not guide the user strongly or create a polished product feel.

Opportunity: standardize empty states with colorful icon wells, helpful copy, and a clear action.

### 6. Typography Is Mostly Consistent But Split

The global token system uses Outfit, while feed and alumni directory import Inter directly. This is not fatal, but it creates a subtle mismatch across adjacent portal modules.

Opportunity: keep one main type system unless a specific module has a strong reason to differ.

### 7. Border Radius Is Often Larger Than Needed

Some shared components use `rounded-3xl` or 24-30px radii. This works in public/brand moments but can feel soft and less efficient in operational screens.

Opportunity: use 8-16px for dense dashboards and reserve larger radius for expressive public/auth surfaces.

### 8. Global CSS Contains Duplicate Or Legacy Portal Rules

`frontend/src/styles.css` contains early `portal-*` rules near the top and later fuller definitions. That increases risk when updating shared portal styles.

Opportunity: before large implementation, decide which block is authoritative and remove or override carefully.

## Route And Surface Audit

### Public Home `/`

Files:

- `frontend/src/pages/HomePage.jsx`
- `frontend/src/styles.css` under `hp-*`

Current feel:

- More visually designed than portal modules.
- Uses product mockup, floating notification, trust strip, cards, and indigo/violet accents.
- Has decorative blob backgrounds.

Refresh notes:

- Keep the product mockup idea.
- Reduce reliance on generic blobs.
- Introduce a richer multi-accent palette across feature cards and trust areas.
- Ensure public page is vibrant but not visually disconnected from the portal.

Priority: Medium. Public page is already stronger than most portal pages.

### Tenant Home

Files:

- `frontend/src/pages/TenantHomePage.jsx`
- `frontend/src/styles/TenantHome.css`
- `frontend/src/hooks/useTenantBranding.js`

Current feel:

- Clean and centered.
- Uses tenant primary/secondary/accent variables.
- Hero is mostly white with soft branded glow.

Refresh notes:

- Preserve tenant branding.
- Add complementary accents derived from tenant colors.
- Improve feature cards and CTA section with richer but still brand-safe color.

Priority: Medium.

### Auth And Onboarding

Files:

- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/RegisterPage.jsx`
- `frontend/src/pages/PortalRequestPage.jsx`
- `frontend/src/styles.css` under `login-*` and `auth-*`

Current feel:

- More built-out than many dashboard pages.
- Has a broad auth shell and panel system.
- Uses strong blue/indigo emphasis.

Refresh notes:

- Make auth surfaces warmer and more welcoming.
- Use colorful provider states and form focus states.
- Keep validation and redirect logic untouched.

Priority: Medium.

### Portal Shell

Files:

- `frontend/src/components/DashboardLayout.jsx`
- `frontend/src/styles/Dashboard.css`

Current feel:

- Functional dark navy sidebar.
- Topbar is clean but quiet.
- Active nav uses indigo background and left inset stripe.

Refresh notes:

- This should be the first implementation target after tokens because every portal route benefits.
- Add richer sidebar color depth, stronger active state, and more expressive icon/notification treatment.
- Improve topbar search, avatar, and action buttons.
- Avoid adding visual noise to repeated work surfaces.

Priority: Very High.

### Portal Dashboard

Files:

- `frontend/src/pages/TenantDashboardPage.jsx`
- `frontend/src/styles/Dashboard.css`
- shared `portal-*` classes in `frontend/src/styles.css`

Current feel:

- Uses metric cards, activity lists, event blocks, and charts/progress visuals.
- Already contains multiple hardcoded colors for metrics.

Refresh notes:

- Good candidate for colorful metric-card system.
- Replace one-off inline colors with tokenized accent roles.
- Improve card headers and trend badges.

Priority: Very High.

### Feed

Files:

- `frontend/src/pages/FeedPage.jsx`
- `frontend/src/styles/Feed.css`
- `frontend/src/components/PostComposer.jsx`
- `frontend/src/components/FeedPostCard.jsx`

Current feel:

- LinkedIn-like clean feed.
- White composer and post cards with indigo post button.
- Uses Inter instead of global Outfit.

Refresh notes:

- Composer should become a lively creation surface.
- Add colored post-type chips.
- Use warmer reaction/action states.
- Keep reading surface calm.

Priority: High.

### Alumni Directory

Files:

- `frontend/src/pages/TenantAlumniPage.jsx`
- `frontend/src/styles/AlumniDirectory.css`
- `frontend/src/components/AlumniCard.jsx`
- `frontend/src/components/AdvancedAlumniFilters.jsx`

Current feel:

- Rich search/filter UI with a card shell.
- Alumni cards have avatar gradients and skill tags.
- Several hardcoded skill colors already exist.

Refresh notes:

- Strong candidate for vibrant profile cards and availability badges.
- Search engine card can become a polished colorful centerpiece.
- Use consistent accent tokens for skill/category colors.

Priority: High.

### Events

Files:

- `frontend/src/pages/EventsPage.jsx`
- `frontend/src/pages/CreateEventPage.jsx`
- `frontend/src/styles/Events.css`

Current feel:

- Solid operational layout.
- Cards, composer, toolbar, tabs, and sidebar all use the same neutral/indigo system.

Refresh notes:

- Give events a warm amber/coral identity.
- Date cards, category tabs, and event CTAs should carry most of the color.
- Preserve readability for event details.

Priority: High.

### Jobs

Files:

- `frontend/src/pages/JobsPage.jsx`
- `frontend/src/styles/Jobs.css`

Current feel:

- Dense and practical.
- Stats, search, filters, list rows, sidebars, modal.
- Mostly white/slate with indigo actions.

Refresh notes:

- Give careers a green/emerald + blue identity.
- Improve company logo placeholders, job badges, status colors, and application tracker.
- Keep density high.

Priority: High.

### Gallery

Files:

- `frontend/src/pages/GalleryPage.jsx`
- `frontend/src/styles/Gallery.css`

Current feel:

- Image-first layout is a strength.
- Toolbar and sidebar are subdued.
- Empty/upload states are plain.

Refresh notes:

- Use cyan/rose accents around media and upload actions.
- Improve upload/drop zone as a colorful call-to-action.
- Keep image tiles visually dominant.

Priority: Medium.

### Groups

Files:

- `frontend/src/pages/CommunityGroupsPage.jsx`
- `frontend/src/styles/Groups.css`
- `frontend/src/components/groups/GroupPortal.css`

Current feel:

- Modal styling is polished.
- Group portal likely has richer module-specific surfaces, but needs unification with the wider refresh.

Refresh notes:

- Give groups a teal/community identity.
- Make group cards more expressive through covers, avatars, member chips, and category accents.

Priority: Medium.

### Newsroom

Files:

- `frontend/src/pages/NewsroomPage.jsx`
- `frontend/src/styles/Newsroom.css`

Current feel:

- Featured hero is one of the more visual portal surfaces.
- Article cards are image-led and already support category badges.

Refresh notes:

- Give newsroom a rose/violet editorial identity.
- Improve category tabs, featured badge, and sidebar cards.

Priority: Medium.

### Business Directory

Files:

- `frontend/src/pages/BusinessDirectoryPage.jsx`
- `frontend/src/styles/BusinessDirectory.css`

Current feel:

- Good structure with stats, search, filters, cards, sidebars, promo panel.
- Has colorful logo placeholders already.

Refresh notes:

- Give business directory a teal/amber identity.
- Improve category list and verified states.
- Make promo panel less indigo-only.

Priority: Medium.

### Messages

Files:

- `frontend/src/pages/ConnectionsPage.jsx`
- `frontend/src/components/connections/*.jsx`
- `frontend/src/components/connections/Connections.css`

Current feel:

- Richer than most modules.
- Uses chat-specific CSS variables, warm mist/cream backgrounds, panels, and more dimensional cards.

Refresh notes:

- Use this as proof that the app can handle warmer surfaces.
- Align with global tokens without flattening it.
- Keep chat usability and message contrast intact.

Priority: Medium.

### Settings

Files:

- `frontend/src/pages/InstitutionSettingsPage.jsx`
- `frontend/src/pages/AlumniSettingsPage.jsx`
- `frontend/src/styles/Settings.css`
- `frontend/src/styles/AlumniSettings.css`

Current feel:

- Dense settings panels, tabs, sidebar nav, toggles, branding controls.
- Very neutral.

Refresh notes:

- Improve scanability through colored section icons and soft tinted panels.
- Keep forms calm and predictable.
- Branding settings should visually preview theme choices more strongly.

Priority: Medium.

## Repeated UI Pattern Inventory

These patterns should be refreshed once, then rolled through pages.

- App shell: page background, dashboard sidebar, topbar, main content padding.
- Page header: title, subtitle, action row, optional eyebrow/icon.
- Primary action button: currently mostly indigo.
- Secondary button: white/gray border.
- Search field: white or gray surface, gray icon, indigo focus.
- Filter select/chip/tabs: neutral default, indigo active.
- Metric card: white card, icon well, value, label, trend.
- Content card/list row: white surface, gray border, subtle hover shadow.
- Sidebar card: white surface, small title, link/action.
- Composer card: feed/event/job/newsroom form surfaces.
- Modal: white surface, high shadow, neutral header.
- Empty state: centered gray icon/text.
- Badge/chip: indigo, green, amber, red variants but not tokenized consistently.
- Avatar/logo placeholder: gradients or hardcoded arrays.
- Form field: gray background, indigo focus.
- Toggle/switch: gray off, indigo on.

## Recommended Color Roles For Phase 2

Use brand blue as the anchor, then assign module accents:

- Platform/primary: blue/indigo.
- Alumni/network: violet.
- Feed/social: coral or rose with violet support.
- Events: amber/coral.
- Jobs/careers: emerald/teal.
- Groups/community: teal.
- Gallery/media: cyan/rose.
- Newsroom/editorial: rose/violet.
- Business directory: teal/amber.
- Settings/admin: blue with small accent highlights.
- Warnings/errors/success: keep semantic colors distinct from decorative accents.

## Files Most Likely To Change In Phase 2

Foundation:

- `frontend/src/design-tokens.js`
- `frontend/src/styles.css`
- `frontend/src/components/ui/Button.jsx`
- `frontend/src/components/ui/Card.jsx`
- `frontend/src/components/ui/Badge.jsx`
- `frontend/src/components/ui/Input.jsx`

Shell:

- `frontend/src/styles/Dashboard.css`
- `frontend/src/components/DashboardLayout.jsx` if markup needs small class hooks.

High-impact modules:

- `frontend/src/styles/Feed.css`
- `frontend/src/styles/AlumniDirectory.css`
- `frontend/src/styles/Events.css`
- `frontend/src/styles/Jobs.css`
- `frontend/src/styles/BusinessDirectory.css`
- `frontend/src/styles/Gallery.css`
- `frontend/src/styles/Newsroom.css`
- `frontend/src/styles/Settings.css`
- `frontend/src/styles/TenantHome.css`

Public/auth:

- `frontend/src/pages/HomePage.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/RegisterPage.jsx`
- `frontend/src/pages/PortalRequestPage.jsx`
- `frontend/src/styles.css` auth and home sections.

## Implementation Priorities For The Refresh

1. Add color tokens and global vibrant utilities.
2. Refresh shared buttons, cards, badges, and inputs.
3. Refresh dashboard shell, topbar, and portal background.
4. Refresh shared `portal-*` primitives and metric cards.
5. Refresh dashboard, feed, alumni, events, and jobs.
6. Refresh business directory, gallery, newsroom, groups, settings, and messages.
7. Polish public and tenant home pages after the portal style is settled.

## Risks And Guardrails

- Do not make every card brightly colored. Use color for hierarchy, category, status, and action.
- Keep operational screens dense and readable.
- Preserve tenant branding behavior.
- Check dark mode after token changes.
- Watch for duplicate `portal-*` definitions in `styles.css`.
- Prefer tokens and shared utilities over adding more hardcoded hex values.
- Preserve user work in `frontend/dist`; the current worktree already has unrelated generated asset changes.

## Phase 1 Completion Criteria

- Main surfaces reviewed: complete.
- Repeated UI patterns identified: complete.
- Current strengths and weak spots documented: complete.
- Phase 2 target files and priorities defined: complete.

