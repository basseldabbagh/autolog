# MotoFolio — Car Maintenance & Service Tracker

> **Universal interactive vehicle maintenance schedule, live odometer simulator, workshop expense logger, and printable A4 vehicle condition report.**
> Built as a zero-dependency, single-file modern web application for car owners, DIY mechanics, workshop owners, and fleet managers. Free, open-source, and public for all developers under the MIT License.
>
> 🌐 **Live Website**: [https://motofolio.pages.dev/](https://motofolio.pages.dev/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Live Demo & Quick Start](#-live-demo--quick-start)
- [Project Architecture & Structure](#-project-architecture--structure)
- [How It Works](#-how-it-works)
  - [1. Multi-Vehicle Profiles](#1-multi-vehicle-profiles)
  - [2. Live Odometer Simulation](#2-live-odometer-simulation)
  - [3. Periodic Maintenance Intervals](#3-periodic-maintenance-intervals)
  - [4. SVG Visualizations](#4-svg-visualizations)
  - [5. Workshop Maintenance & Expense Log](#5-workshop-maintenance--expense-log)
  - [6. Unified Data Hub (CSV & JSON)](#6-unified-data-hub-csv--json)
  - [7. Printable A4 Condition Report (PDF)](#7-printable-a4-condition-report-pdf)
  - [8. One-Click WhatsApp & Social Sharing](#8-one-click-whatsapp--social-sharing)
- [Data Schemas & Specifications](#-data-schemas--specifications)
  - [JSON Schema (v2.0)](#json-schema-v20)
  - [CSV Import / Export Format](#csv-import--export-format)
- [Development & Customization](#-development--customization)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🌟 Overview

**MotoFolio** is a lightweight, high-performance vehicle lifecycle and maintenance tracking application. Unlike bulky enterprise fleet management systems or mobile apps gated behind logins and subscriptions, MotoFolio runs directly in any modern browser without servers, databases, or build pipelines.

All data is stored client-side in the browser's `localStorage` and can be exported, imported, or backed up at any time in standard **CSV** (for Microsoft Excel and Google Sheets) or **JSON** formats.

---

## ⚡ Key Features

- **📱 Progressive Web App (PWA)**: Installable directly to home screens on iOS, Android, macOS, and Windows via [`manifest.json`](file:///e:/HTML/autolog/manifest.json) and [`sw.js`](file:///e:/HTML/autolog/sw.js) with full offline caching.
- **🔍 Global Dashboard Filters**: Slice analytics and expense charts by time period (*This Year*, *Last Year*, *Last 6 Months*, *All Time*, or *Custom Date Range*) and service category with instant recalculation.
- **🚗 Clean Slate & Ad-Free Vehicle Onboarding**: No default vehicles seeded and zero commercial vehicle advertisements or fake data. When starting fresh or when no cars exist in storage, MotoFolio displays an onboarding hub of vehicle archetype templates (Sedan, SUV, Hatchback, Truck 4x4, Sports Coupe, EV, Hybrid, MPV, or Blank) to pick and customize with your own make and model, alongside quick Google Sign-In and CSV/JSON Import/Export actions.
- **🔗 Sharable Filter Sync in URL**: Active vehicle profile, dashboard date period preset, custom date ranges, category filters, periodic schedule status tabs, and history search queries are automatically synchronized with the URL query parameters (`?car=...&period=...&cat=...&sched=...&q=...`) for instant bookmarking and one-click shareable filtered views.
- **⏱️ Live Odometer Simulation**: Update mileage manually or increment quickly with `+1k` and `+5k` buttons. Recalculates every service interval and countdown in real time.
- **🕒 Distance & Time Dual-Tracking**: Periodic schedule tracks by both distance (KM) and calendar time (`intervalMonths`). The system calculates `nextDueDate` alongside `nextDueKm`, triggering warnings based on whichever comes first (KM or Date).
- **🛞 Tire Management Hub**: Specialized maintenance rows for Tire Rotation (every 10,000 km / 6 mo), Wheel Alignment (every 10,000 km / 12 mo), and Tire Replacement (every 50,000 km / 36 mo).
- **📑 Official Documents Widget**: Dedicated dashboard countdown widget next to Total Cost tracking Road Tax and Insurance expiry dates with real-time days-remaining indicators, warning color transitions, and an interactive edit modal.
- **⛽ Fuel Efficiency & Powertrain Diagnostics**: Interactive KM/L consumption analytics and early ignition health diagnostics. Includes native SVG trend charting, fuel receipt logger modal, and fuel log ledger.
- **🏷️ OEM Part Numbers Reference**: Quick reference column and badges across the maintenance schedule and printable reports displaying manufacturer OEM part numbers (e.g. spark plugs, transmission fluids, filters).
- **🌓 Light / Dark Mode Toggle**: Instant theme switching in Settings between System (OS auto-detection), Light, and Dark modes without screen flash.
- **☁️ Google Drive Sync & Multi-Car Backup**: Sign in with Google to backup vehicle profiles directly to Google Drive. Includes custom Drive folder naming and a one-click "Sync All Local Cars to Drive" button to sync your entire local garage to Drive.
- **🛠️ Periodic Maintenance Schedule**: Track engine oil, transmission fluid, spark plugs, timing belt/chain, coolant, drive belts, and filters with status badges:
  - 🟢 **Good**: > 1,000 km and > 30 days remaining.
  - 🟡 **Due Soon**: ≤ 1,000 km or ≤ 30 days remaining.
  - 🔴 **Overdue**: Past due mileage (≤ 0 km) or past expiry date.
  - ⚪ **Unset / Pending**: Awaiting baseline odometer entry.
- **📊 Interactive SVG Charts**:
  - Horizontal countdown bar chart showing distance remaining per service item.
  - Donut chart breaking down workshop expenses by category (Fluids, Overhaul, Drivetrain, Electrical, etc.).
- **🧾 Workshop Expense & History Log**: Full ledger of maintenance services, repair dates, odometer readings, parts costs, workshop fees, payment methods (Cash, Transfer, Touch 'n Go eWallet, DuitNow QR), and mechanic notes. Search history dynamically by keyword.
- **📁 Unified Data Hub**:
  - **CSV Tab**: Download blank CSV template, export current car to CSV, and import spreadsheet files with auto-save.
  - **JSON Tab**: In-browser JSON editor with syntax validation, blank template generator, direct file import, and export.
- **📄 Dual Printable A4 Reports**: Dedicated print-ready reports opened in clean tabs with specialized `@media print` styling:
  - **Vehicle Status Report (A4)**: Comprehensive condition certificate showing current vehicle specifications, document expiry dates, and full periodic schedule health matrix without cluttering maintenance logs.
  - **Service History Report (A4)**: Filter-aware maintenance and expense ledger detailing parts vs. labor costs, mechanic attributions, and workshop receipts matching current dashboard filters.
- **📲 Instant Report Sharing**: Native Web Share API integration with automatic fallback to one-click WhatsApp text summary copying.
- **🔒 Zero-Tracking & 100% Privacy**: Client-side execution with origin-isolated storage. No backend, no telemetry, no tracking cookies.

---

## 🚀 Live Demo & Quick Start

### Option 1: Open Directly in Browser
Double-click [`index.html`](file:///e:/HTML/autolog/index.html) or open it with any web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Apple Safari). No web server required!

### Option 2: Run with a Local Static Server

```bash
# Using Python (standard on Windows, macOS, Linux)
python -m http.server 8000

# Using Node.js npx (if Node is installed)
npx serve .

# Using PHP
php -S localhost:8000
```

Open your browser at `http://localhost:8000` to access the application.

---

## 📂 Project Architecture & Structure

```
autolog/
├── index.html               # Monolithic standalone web application (UI, CSS, JS, SVGs)
├── favicon.svg              # Scalable vector favicon & PWA icon
├── og-image.svg             # High-resolution (1200x630) social share Open Graph & Twitter Card banner
├── manifest.json            # PWA Web App Manifest (installable on desktop & mobile)
├── sw.js                    # Service Worker (offline asset caching & background sync)
├── README.md                # Developer documentation and quick start guide
├── AGENTS.md                # AI coding agent instructions and architectural contracts
├── DESIGN.md                # UI/UX design specifications, tokens, and component guidelines
├── LICENSE.md               # MIT Open Source License
├── .gitignore               # Git ignore configuration
├── cars/                    # Standalone JSON vehicle profiles
│   ├── sample-sedan.json    # Sample vehicle profile
│   └── sample-compact.json  # Sample vehicle profile
├── instructions/            # AI assistant skills & architecture guidelines (git-ignored)
│   ├── project-documentation-architect.md
│   ├── attached-file-documentation-architect.md
│   └── UI-UX skill.md
└── Reference/               # Historical receipts, invoices, workshop voice notes, and media
```

---

## 💡 How It Works

### 1. Multi-Vehicle Profiles & Settings
- **Vehicle Switcher**: Select between saved vehicles (both local `localStorage` and Google Drive synced) or explore factory sample profiles directly from the header dropdown.
- **Settings & Add New Car**: Click the **Settings** button in the header toolbar to open the Add Vehicle modal. Select from flat template presets (Sedan, SUV, Hatchback, Truck, Sports, EV, Hybrid, Van, or Blank Template) without nested option groups, enter vehicle specifications, and immediately switch to your new vehicle.
- **Vehicle Management**: The Settings modal also lists all custom saved vehicles with fast one-click switching and deletion options.

### 2. Live Odometer Simulation
The odometer display tracks the vehicle's active mileage:
- Entering an odometer value recalculates the entire periodic table and countdown charts instantly.
- The `+1k` and `+5k` buttons simulate future driving scenarios to inspect upcoming service demands.
- The `Reset` button reverts the odometer to the profile's saved baseline.

### 3. Periodic Maintenance Intervals
Each maintenance item defines:
- A service interval (e.g., 7,000 km for engine oil, 40,000 km for spark plugs, 80,000 km for coolant).
- The odometer reading when it was last serviced.
- The calculated next due odometer reading (`lastServicedKm + intervalKm`).
- The remaining distance (`nextDueKm - currentMileageKm`).

### 4. SVG Visualizations
All charts are written in pure vector SVG rendered programmatically via vanilla JavaScript:
- **Countdown Bars**: Dynamically scaled progress bars color-coded by health status.
- **Cost Donut Chart**: Arc geometry generated with SVG `stroke-dasharray` and `stroke-dashoffset` calculations with an interactive legend.

### 5. Workshop Maintenance & Expense Log
Chronological ledger tracking repairs and routine maintenance. Includes cost breakdown (estimated parts cost vs. total paid including labor and workshop fees), payment methods, and live text search across titles, categories, and notes.

### 6. Unified Data Hub (CSV & JSON)
- **CSV Support**: Designed for non-technical users to edit service intervals or repair records in Excel or Google Sheets. The custom CSV parser handles multi-section data, escaped quotes, and commas.
- **JSON Support**: Complete round-trip serialization matching the internal application state. An in-browser editor allows editing raw JSON with immediate schema validation.

### 7. Printable A4 Condition Report (PDF)
Clicking **A4 Report** generates a self-contained, print-optimized HTML document in a new window:
- Includes high-contrast vehicle specifications, workshop contact details, and current odometer.
- Formats both the periodic service schedule and historical workshop ledger into clean A4 tables.
- Includes physical sign-off lines for the mechanic and vehicle owner.
- Use `Ctrl+P` (or `Cmd+P`) to print or save as a PDF.

### 8. One-Click WhatsApp & Social Sharing
Clicking **Share** opens a modal containing:
- Native Web Share API integration (on mobile or supported browsers).
- Formatted plain-text breakdown ready to paste into WhatsApp messages to mechanics, parts suppliers, or prospective buyers.

### 9. Google Account & Cloud Sync
The header features a real-time Google Account button with connection status:
- **Connection Status Indicator**: Displays an emerald status dot and "Connected" when signed in via Google OAuth 2.0, or a slate dot and "Not Connected" when disconnected.
- **Drive Sync Modal**: Configure Google OAuth Client ID, toggle auto-sync on changes, push current vehicle records to your personal Google Drive folder (`MotoFolio`), or pull and restore vehicles across browsers.

---

## 📐 Data Schemas & Specifications

### JSON Schema (v2.0)

```json
{
  "schemaVersion": "2.0",
  "lastUpdated": "YYYY-MM-DD",
  "currency": "USD",
  "vehicle": {
    "id": "sample-sedan-2022",
    "make": "Apex Motors",
    "model": "Centurion 2.0L",
    "year": 2022,
    "registrationDate": "2022-03-15",
    "engine": "2.0L 4-Cylinder DOHC",
    "engineNumber": "ENG-48201948",
    "chassisNumber": "1FA6P8CF5H5000000",
    "transmission": "6-Speed Automatic",
    "plateNumber": "KLM-4820",
    "currentMileageKm": 45000,
    "latestServiceDate": "2026-01-15",
    "roadTaxExpiry": "2027-01-20",
    "insuranceExpiry": "2027-01-20"
  },
  "periodicSchedule": [
    {
      "id": "engine-oil",
      "name": "Engine Oil & Oil Filter",
      "category": "Fluids",
      "intervalKm": 8000,
      "intervalMonths": 6,
      "lastServicedKm": 42000,
      "lastServicedDate": "2025-11-15",
      "estimatedCostMyr": 65,
      "oemPartNumber": "15400-RAF-T01"
    }
  ],
  "fuelLogs": [
    {
      "id": "fuel-101",
      "date": "2026-10-18",
      "odometerKm": 44500,
      "liters": 34.2,
      "costMyr": 70.11,
      "fullTank": true,
      "station": "Petronas Primax 95"
    }
  ],
  "maintenanceHistory": [
    {
      "id": "rec-2025-11-15",
      "date": "2025-11-15",
      "mileageKm": 42000,
      "title": "Engine Oil & Filter Service",
      "category": "Periodic & Fluids",
      "mechanic": "Metro Auto Care",
      "costMyr": 65,
      "paidMyr": 65,
      "paymentMethod": "Credit Card",
      "status": "Completed",
      "notes": "Routine oil and filter replacement performed at 42,000 km"
    }
  ]
}
```

### CSV Import / Export Format

The application exports a unified CSV document containing three logical record sections identified by the `Record_Type` column:
1. `METADATA`: Key-value pairs for vehicle specs (Make, Model, Year, Plate Number, Engine Number, Transmission, Currency).
2. `SCHEDULE`: Periodic maintenance intervals and baseline odometer readings.
3. `HISTORY`: Individual service log records including Title, Category, Mileage, Date, Cost, Paid, Method, Notes, and Mechanic/Workshop.

---

## 🛠️ Development & Customization

- **Design System Tokens (CSS Variables)**: All theme colors (backgrounds, surfaces, borders, brand colors, semantic statuses `Good`, `Due Soon`, `Overdue`, and chart palettes) are defined as CSS Custom Properties in `:root`. You can re-theme the entire application without touching HTML markup by modifying the `:root` variables in [`index.html`](file:///e:/HTML/autolog/index.html).
- **Unified SVG Icon System (Zero Emojis)**: The UI adheres to professional design standards by using unified stroke-based SVG vector icons (`viewBox="0 0 24 24"`, `stroke="currentColor"`) for all vehicle types, status badges, action buttons, and modal dialogs.
- **No Node.js or Build Tools**: No `npm install`, `webpack`, or `vite` required. Runs directly from `file://` or any static HTTP server.
- **Styling**: Uses Tailwind CSS via CDN (`https://cdn.tailwindcss.com`) configured with dark mode and theme aliases for design tokens.
- **Typography**: Uses Google Fonts (`Inter` and `JetBrains Mono`).
- **Editing**: Open [`index.html`](file:///e:/HTML/autolog/index.html) in your editor (VS Code, Cursor, etc.), edit markup or JavaScript, and refresh your browser.

---

## ❓ Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| **A4 Report doesn't open** | Pop-up blocker in browser | Allow pop-ups for `localhost` or the local file URL when clicking "A4 Report". |
| **Fonts or Tailwind styling looks broken** | No Internet connection on initial load | Ensure internet access so Google Fonts and Tailwind CDN can load, or bundle them locally for full offline usage. |
| **Changes not saving across sessions** | Browser in Private / Incognito mode | LocalStorage is cleared upon closing Incognito windows. Use normal browsing mode to retain data. |
| **Resetting to defaults** | Want to clear test data | Open the **Data Hub** modal (JSON tab) and click **Reset Default** to reload factory profiles. |

---

## 📄 License

This project is licensed under the **MIT License** — free and open for personal, commercial, and educational use by all developers worldwide. See [`LICENSE.md`](file:///e:/HTML/autolog/LICENSE.md) for full terms.
