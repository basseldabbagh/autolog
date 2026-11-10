# DESIGN.md — AutoLog UI/UX Design System & Architecture

> **Document Scope**: Complete visual design specifications, color tokens, typography systems, component hierarchy, interaction patterns, and printable layout architecture for the **AutoLog** vehicle maintenance application.
> **Source of Truth**: [`index.html`](file:///e:/HTML/autolog/index.html) and [`instructions/UI-UX skill.md`](file:///e:/HTML/autolog/instructions/UI-UX%20skill.md).

---

## 1. Design Overview & Philosophy

AutoLog's design language is modeled after modern high-end automotive digital cockpits and performance telemetry dashboards. The visual design prioritizes:

- **Dark-Mode-First High Contrast**: A rich `slate-950` backdrop with subtle luminous ambient glows (`indigo-600` and `emerald-500` blurred orbs) that reduces eye strain in workshop and garage environments.
- **Information Density & Scannability**: Metric cards, monospaced odometer dials, and status indicators allow car owners and technicians to assess vehicle health in seconds.
- **Vector-First Micro-Visualizations**: High-performance inline SVG graphics (countdown progress bars and expense category donuts) with no heavy runtime dependencies.
- **Tactile Micro-Interactions**: Smooth hover elevations (`.motion-card`), fluid progress bar transitions (`.motion-bar`), and gentle entry animations (`.motion-enter`).
- **Dual Presentation Modes**: A vibrant interactive screen experience seamlessly paired with a clean, monochrome-optimized, high-contrast **A4 Printable Inspection Certificate** for physical vehicle handovers.

---

## 2. Visual Design System & Tokens

### 2.1 Design System Tokens & CSS Variables

AutoLog implements a centralized design token system declared as CSS Custom Properties in `:root`. Developers and users can re-theme the entire application (canvas, surfaces, brand colors, semantic statuses, and charts) by simply adjusting these variables in the `<style>` block of `index.html`:

```css
:root {
    /* --- Surface & Background Canvas --- */
    --color-bg-canvas: #020617;          /* Primary page backdrop (slate-950) */
    --color-bg-surface: #0f172a;         /* Card, panel, and modal containers (slate-900) */
    --color-bg-surface-elevated: #1e293b;/* Secondary buttons, headers, chips (slate-800) */
    --color-bg-input: #020617;           /* Form inputs, select fields (slate-950) */

    /* --- Borders & Dividers --- */
    --color-border-normal: #1e293b;      /* Normal borders (slate-800) */
    --color-border-subtle: #334155;      /* Inputs and secondary outlines (slate-700) */
    --color-border-focus: #6366f1;       /* Interactive focused field border (indigo-500) */

    /* --- Typography & Text --- */
    --color-text-primary: #f8fafc;       /* Highest contrast text, headings, KPIs (slate-100) */
    --color-text-secondary: #94a3b8;     /* Body secondary text, metric labels (slate-400) */
    --color-text-muted: #64748b;         /* Footers, placeholders, inactive icons (slate-500) */

    /* --- Primary Brand & Accent --- */
    --color-brand-primary: #6366f1;      /* Indigo-500 */
    --color-brand-hover: #4f46e5;        /* Indigo-600 */
    --color-brand-muted: rgba(99, 102, 241, 0.15);
    --color-brand-border: rgba(99, 102, 241, 0.4);

    /* --- Semantic Status Tokens --- */
    --color-status-good: #10b981;        /* Emerald-500: Good (>1,000 km) */
    --color-status-good-bg: rgba(16, 185, 129, 0.15);
    --color-status-good-border: rgba(16, 185, 129, 0.35);
    --color-status-good-text: #6ee7b7;   /* Emerald-300 */

    --color-status-warning: #f59e0b;     /* Amber-500: Due Soon (<=1,000 km) */
    --color-status-warning-bg: rgba(245, 158, 11, 0.15);
    --color-status-warning-border: rgba(245, 158, 11, 0.35);
    --color-status-warning-text: #fcd34d; /* Amber-300 */

    --color-status-critical: #f43f5e;    /* Rose-500: Overdue (<=0 km) */
    --color-status-critical-bg: rgba(244, 63, 94, 0.15);
    --color-status-critical-border: rgba(244, 63, 94, 0.35);
    --color-status-critical-text: #fda4af;/* Rose-300 */

    --color-status-pending: #64748b;     /* Slate-500: Unset / Pending baseline */
    --color-status-pending-bg: rgba(51, 65, 85, 0.35);
    --color-status-pending-border: #334155;
    --color-status-pending-text: #94a3b8; /* Slate-400 */

    /* --- Auxiliary Feature Accents --- */
    --color-accent-cyan: #06b6d4;        /* Cyan-500 (Share actions, paid metrics) */
    --color-accent-cyan-text: #67e8f9;   /* Cyan-300 */
    --color-accent-cyan-bg: rgba(6, 182, 212, 0.15);
}
```

```mermaid
flowchart LR
    subgraph Neutral ["Neutral Surfaces (CSS Variables)"]
        S950["--color-bg-canvas<br/>#020617 (Canvas)"]
        S900["--color-bg-surface<br/>#0f172a (Cards)"]
        S800["--color-bg-surface-elevated<br/>#1e293b (Elevated)"]
        S700["--color-border-subtle<br/>#334155 (Subtle)"]
    end
    subgraph Accents ["Status & Brand Tokens"]
        IND["--color-brand-primary<br/>#6366f1 (Brand)"]
        EME["--color-status-good<br/>#10b981 (Good)"]
        AMB["--color-status-warning<br/>#f59e0b (Due Soon)"]
        ROS["--color-status-critical<br/>#f43f5e (Overdue)"]
        PEN["--color-status-pending<br/>#64748b (Unset)"]
        CYN["--color-accent-cyan<br/>#06b6d4 (Auxiliary)"]
    end
```

| Token Variable | Default Hex / RGBA | Tailwind Alias | Usage Context |
|---|---|---|---|
| `--color-bg-canvas` | `#020617` | `canvas` | Primary document backdrop |
| `--color-bg-surface` | `#0f172a` | `surface` | Card containers, modal sheets |
| `--color-bg-surface-elevated` | `#1e293b` | `surface-elevated` | Secondary action buttons, chips, headers |
| `--color-border-normal` | `#1e293b` | — | Subtle dividers, card borders |
| `--color-border-subtle` | `#334155` | — | Input field borders, inactive borders |
| `--color-border-focus` | `#6366f1` | — | Interactive focused field ring |
| `--color-brand-primary` | `#6366f1` | `brand` | Primary CTA buttons, active state, accent |
| `--color-status-good` | `#10b981` | `status-good` | Nominal state, CSV badges, paid totals |
| `--color-status-warning` | `#f59e0b` | `status-warning` | Due soon warning (≤1,000 km) |
| `--color-status-critical` | `#f43f5e` | `status-critical` | Overdue critical status (≤0 km), reset actions |
| `--color-status-pending` | `#64748b` | `status-pending` | Unset / pending baseline requirement |
| `--color-accent-cyan` | `#06b6d4` | `accent-cyan` | Share modal, receipts & workshop labor fees |

### 2.2 Unified Vector Icon System (Zero Emojis)

In accordance with strict UI/UX Pro design standards, **emojis are not used as UI icons**. The application features a 100% unified, stroke-based SVG vector icon system:

- **Icon Geometry & Baseline**:
  - `viewBox="0 0 24 24"`
  - `fill="none"`
  - `stroke="currentColor"`
  - `stroke-width="1.75"` (or `2` for compact buttons)
  - `stroke-linecap="round"` and `stroke-linejoin="round"`
- **Vehicle Profile Icons**:
  - Dynamically rendered both in the sticky top bar and beside the profile selector:
    - **Sedan**: 4-door aerodynamic profile vector.
    - **SUV / Crossover**: Elevated roofline and chassis vector.
    - **Hatchback**: Compact dual-box hatchback silhouette.
    - **Pickup Truck**: Open-bed 4x4 pickup truck vector.
    - **Sports Car**: Low-slung performance coupe outline.
    - **Electric Vehicle (EV)**: High-voltage bolt telemetry icon.
    - **Hybrid (HEV)**: Dual powertrain loop icon.
    - **Van / MPV**: High-capacity multi-passenger van profile.
    - **Custom Car**: Plus-accented vehicle creation icon.
- **Micro Status Badges**:
  - Each periodic schedule status badge features an inline micro-SVG:
    - `Good`: Check-circle vector icon.
    - `Due Soon`: Clock / alert-timer vector icon.
    - `Overdue`: Alert-circle vector icon.
    - `Unset`: Help-circle vector icon.
- **KPI Summary Cards**:
  - `Tracked Items`: Checklist ledger icon.
  - `Next Service`: Schedule clock icon.
  - `Total Cost`: Currency card icon.
  - `Receipts & Fees`: Receipt voucher icon.
- **Modal Close Controls**:
  - Standardized unified cross vector (`M6 18L18 6M6 6l12 12`) on all 6 dialog modals.
- **Print / PDF Trigger**:
  - Crisp vector printer icon (`M17 17h2...`) replacing legacy OS printer emojis.

### 2.2 Typography

Typography is loaded dynamically via Google Fonts with robust fallbacks:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
```

- **Primary UI Font (`font-sans`)**: `Inter`, `system-ui`, `-apple-system`, `sans-serif`
  - Applied to headings, labels, button text, table descriptions, and modals.
  - Weights: `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold), `800` (ExtraBold).
- **Technical & Metric Font (`font-mono`)**: `JetBrains Mono`, `Fira Code`, `monospace`
  - Applied to odometer digits, license plates, currency amounts, dates, and JSON payloads.
  - Weights: `400` (Regular), `600` (SemiBold), `700` (Bold).

### 2.3 Motion & Keyframe Animations

```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.motion-enter {
  animation: fadeSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.motion-bar {
  transition: width 0.55s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.25s ease;
}
.motion-card {
  transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.18s ease;
}
.motion-card:hover {
  transform: translateY(-2px);
}
```

---

## 3. Screen Architecture & Layout Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│  STICKY TOP BAR                                                        │
│  [Vehicle Icon] Apex Centurion 2022  [KLM 4820] (Edit)│ [Profile v] [Hub] [A4] [Share] │
├────────────────────────────────────────────────────────────────────────┤
│  TOP METRICS ROW                                                       │
│  ┌───────────────────────┐ ┌─────────┬─────────┬─────────┬───────────┐ │
│  │ ODOMETER SIMULATOR    │ │ Tracked │ Next Due│ Total   │ Receipts  │ │
│  │ 45,000 km             │ │  4 / 10 │ 5,000 km│ $ 1,450 │ $ 1,200   │ │
│  │ [+1k] [+5k] [Reset]   │ │ Items   │ Oil     │ Logged  │ Paid      │ │
│  └───────────────────────┘ └─────────┴─────────┴─────────┴───────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│  PERIODIC MAINTENANCE SCHEDULE TABLE                                   │
│  Filters: [ All ] [ Tracked ] [ Unset ] [ Due ]          [+ Add Item]  │
│  ────────────────────────────────────────────────────────────────────  │
│  Service Item   │ Interval │ Last Srv (km) │ Next Due │ Cost │ Status  │
│  Engine Oil     │ 8,000 km │ [42000] Save  │ 50,000   │ $ 65 │ [✓] Good│
├────────────────────────────────────────────────────────────────────────┤
│  VECTOR SVG VISUALIZATIONS                                             │
│  ┌────────────────────────────────────┐ ┌────────────────────────────┐ │
│  │ REMAINING DISTANCE COUNTDOWN BARS  │ │ EXPENSE BREAKDOWN DONUT    │ │
│  │ Engine Oil [████████████] 5,000 km │ │     (O) (Fluids, Brakes)   │ │
│  │ Gear Oil   [████████████] 22,000 km│ │ Total: $ 1,450             │ │
│  └────────────────────────────────────┘ └────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│  WORKSHOP MAINTENANCE & REPAIR HISTORY                                 │
│  [Search history...]                                     [+ Add Record]│
│  ────────────────────────────────────────────────────────────────────  │
│  2025-11-15 • 42,000 km • Engine Oil & Filter Service     • $ 65       │
│  2025-06-20 • 35,000 km • Front Brake Pads Replacement    • $ 140      │
├────────────────────────────────────────────────────────────────────────┤
│  VEHICLE SPECIFICATIONS FOOTER                                         │
│  Engine: 2.0L DOHC • Chassis: 1FA6P8... • Registration: 2022-03-15     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Patterns & Specifications

### 4.1 Sticky Top Navigation Bar
- **Position**: `sticky top-0 z-30` with `backdrop-blur-xl bg-slate-950/85` and bottom border `border-slate-800/80`.
- **Vehicle Identifier**: Dynamic vehicle category SVG icon pill, bold vehicle title, license plate badge with monospaced font, and inline `(Edit)` trigger button.
- **Action Toolbar (Configured strictly in left-to-right sequence)**:
  1. **Saved Cars Dropdown (`#carProfileSelect`)**: Unified dropdown listing all saved vehicles (Local & Drive synced).
  2. **Share Button (`#openShareModalBtn`)**: Cyan vector icon pill for Web Share API and WhatsApp-ready maintenance summaries.
  3. **Settings Button (`#openSettingsBtn`)**: Opens the Settings modal housing cloud & export tools (A4 Report, Import/Export, Google Account Sync), Add Custom Vehicle with flat preset select, and saved cars management.

### 4.2 Global Dashboard Filters Bar
- **Visual Container**: Rounded card (`bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl`) sitting directly beneath the sticky top navigation.
- **Filter Header & Status**: Indigo icon badge with uppercase title and live active filter summary string (`#filterSummaryText`), e.g. "Showing This Year (2026) • All Categories".
- **Date Period Presets**: Dropdown (`#filterDatePreset`) supporting `This Year (2026)`, `Last Year (2025)`, `Last 6 Months`, `All Time`, and `Custom Range...`.
- **Custom Range Controls**: Revealed conditionally when `Custom Range...` is chosen, featuring twin date pickers (`#filterDateStart` and `#filterDateEnd`).
- **Category Filter Dropdown**: Dynamically populated dropdown (`#filterCategorySelect`) listing all active maintenance categories.
- **Filter Reset Button**: One-click reset pill reverting the view to the current year and all categories.

### 4.3 Odometer Simulator
- **Visual Structure**: Multi-tone gradient card (`from-slate-900 via-slate-900 to-indigo-950/60`).
- **Live Status Indicator**: Pulsing emerald orb with uppercase tracking text.
- **Odometer Input**: Extra-large monospaced numerical input (`text-2xl sm:text-3xl font-bold`) accented with an absolute "km" unit label.
- **Quick Steppers**: Dedicated `+1k` and `+5k` buttons with active hover styles and a subtle `Reset` button.
- **Footer Metadata**: Displays Last Service date alongside the most recent service record's Workshop/Mechanic.

### 4.4 KPI Summary Cards
- 4 grid cards displaying high-level vehicle health:
  1. **Tracked Items**: Count of items with established baseline vs. total schedule items.
  2. **Next Service**: Shortest remaining distance and service name.
  3. **Total Cost**: Cumulative sum of all maintenance logs in local currency with log and workshop counts.
  4. **Receipts & Fees**: Total cash paid out including workshop labor and diagnostic fees.

### 4.5 Periodic Schedule Table
- **Interactive Inline Editing**: The "Last Serviced At (km)" column contains inline numerical inputs. Modifying an input immediately displays a green "Save" button to commit the new baseline.
- **Filter Pills**: Multi-state pill filter (`All`, `Tracked`, `Unset`, `Due`) that dynamically recalculates without page reload.
- **Status Badges**:
  - `Good`: Rounded pill with emerald background, dot indicator, and remaining km.
  - `Due Soon`: Rounded pill with amber background and countdown warning.
  - `Overdue`: Rounded pill with rose background and exclamation badge.
  - `Unset`: Rounded pill with neutral slate background indicating missing baseline.

### 4.6 Vector SVG Visualizations
- **Horizontal Countdown Bars**:
  - Dynamic SVG viewBox scaled to container width.
  - Gradient-filled bars animated with `.motion-bar`.
  - Color transitions dynamically driven by remaining km thresholds.
- **Expense Donut Chart**:
  - Segmented mode switch: toggle smoothly between **By Category** and **By Mechanic**.
  - SVG circle element with computed `stroke-dasharray` and `stroke-dashoffset`.
  - Centered aggregate total text.
  - Adjacent flex legend with category/mechanic swatches, monetary values, percentages, and service counts.
  - Dynamic workshop counter displayed in the chart footer.

### 4.7 Modals
All modals use fixed-position backdrop overlays (`fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm`):
1. **Settings & Tools Modal (`#settingsCarModal`)**: Opened via the header Settings button. Features quick action triggers for A4 Report, Import/Export Hub, and Google Account Sync; a flat `<select id="modalNewCarBaseSelect">` (without `<optgroup>`) providing presets (Sedan, SUV, Hatchback, Truck, Sports, EV, Hybrid, Van, Blank Car); vehicle identity inputs; and a management list for switching and deleting saved local & Drive vehicles.
2. **Data Hub Modal (`#dataHubModal`)**: Dual-tab interface (`CSV` tab in emerald, `JSON` tab in indigo). Includes raw JSON textarea with immediate syntax checking.
3. **Vehicle Specs Editor (`#editCarModal`)**: Clean form for Make, Model, Year, Registration, Plate, Engine, and Transmission.
4. **Google Drive Sync Modal (`#driveSyncModal`)**: Google OAuth 2.0 configuration, manual Push/Pull, and auto-sync toggle.
5. **Share Modal (`#shareModal`)**: Clean preview with copy and Web Share triggers.
6. **Add Maintenance Record Modal (`#addRecordModal`)**: Service log entry with dynamic Workshop/Mechanic selector, linked maintenance interval recalculation, and custom notes.
7. **Add Schedule Item Modal (`#addScheduleModal`)**: Periodic interval creator.

---

## 5. Printable A4 Vehicle Condition Report

When **A4 Report** is clicked, a dedicated window opens containing a specialized HTML document designed specifically for A4 paper output:

- **Page Constraints**: Formatted with standard print styling:
  ```css
  @page { size: A4 portrait; margin: 12mm 15mm; }
  @media print {
    body { background: #fff !important; color: #0f172a !important; }
    .no-print { display: none !important; }
  }
  ```
- **Monochrome & High-Contrast Typography**: Uses black and dark slate text against pure white backgrounds to ensure crisp printing on all standard office laser and inkjet printers.
- **Letterhead & Identity**: Displays vehicle make, model, registration date, chassis number, engine number, license plate, and current odometer reading.
- **Schedule Audit Table**: Prints all periodic maintenance items with clean table borders and bold status markers (`GOOD`, `DUE SOON`, `OVERDUE`, `UNSET`).
- **Complete Workshop Ledger**: Lists all recorded maintenance history entries with dates, mileage, descriptions, categories, and costs.
- **Sign-off Block**: Contains dual verification signature lines for the Workshop Mechanic and the Vehicle Owner.

---

## 6. Accessibility & Responsive Breakpoints

### 6.1 Contrast & Accessibility
- **WCAG AA Compliance**: High-contrast text colors (`text-slate-100` and `text-white` on `bg-slate-900`) exceed the minimum 4.5:1 contrast ratio.
- **Form Controls**: All inputs have visible label tags or explicit `aria-label` attributes (e.g., `#carProfileSelect`).
- **Focus Rings**: Focusable elements feature high-visibility outline rings (`focus:outline-none focus:border-indigo-400`).

### 6.2 Responsive Breakpoints

| Breakpoint | Width | Layout Adjustments |
|---|---|---|
| **Mobile** | `< 640px` | Single-column layout. Top bar actions wrap compactly. KPI cards render 2x2. Table becomes horizontally scrollable (`overflow-x-auto`). |
| **Tablet (`sm`)** | `640px - 1023px` | KPI cards expand to 4 columns. Action buttons show icons and text labels. Modals size to `max-w-xl`. |
| **Desktop (`lg`)** | `1024px - 1279px` | 12-column layout. Odometer occupies 5 columns, KPI cards occupy 7 columns. Charts display side-by-side (7 cols countdown, 5 cols donut). |
| **Widescreen (`xl`)** | `≥ 1280px` | Centered maximum container (`max-w-7xl mx-auto`). Generous padding and maximum visual breathing room. |

---

## 7. Guidelines for Future Design Changes

1. **Retain Tailwind Utility Classes**: Do not introduce external CSS stylesheets or CSS-in-JS libraries. Leverage existing Tailwind utility classes and extend `tailwind.config` if new tokens are needed.
2. **Preserve Dark Cockpit Aesthetic**: Any new cards, forms, or controls must follow the `slate-950` / `slate-900` / `slate-800` visual hierarchy.
3. **Monospaced Technical Data**: Always use `font-mono` for numeric data, odometers, currencies, license plates, and timestamps.
4. **SVG Visualizations**: When adding new charts, implement them as lightweight native SVG DOM nodes rather than importing external graphics libraries.
5. **Print Stylesheet Integrity**: When adjusting table structures or data fields in the main app, verify that `generateA4Report()` is updated to reflect the new fields in the printable A4 certificate.
