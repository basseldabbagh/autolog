# autolog — Car Maintenance & Service Tracker

> **Universal interactive vehicle maintenance schedule, live odometer simulator, workshop expense logger, and printable A4 vehicle condition report.**
> Built as a zero-dependency, single-file modern web application for car owners, DIY mechanics, workshop owners, and fleet managers. Free, open-source, and public for all developers under the MIT License.

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

**AutoLog** is a lightweight, high-performance vehicle lifecycle and maintenance tracking application. Unlike bulky enterprise fleet management systems or mobile apps gated behind logins and subscriptions, AutoLog runs directly in any modern browser without servers, databases, or build pipelines.

All data is stored client-side in the browser's `localStorage` and can be exported, imported, or backed up at any time in standard **CSV** (for Microsoft Excel and Google Sheets) or **JSON** formats.

---

## ⚡ Key Features

- **📱 Progressive Web App (PWA)**: Installable directly to home screens on iOS, Android, macOS, and Windows via [`manifest.json`](file:///e:/HTML/autolog/manifest.json) and [`sw.js`](file:///e:/HTML/autolog/sw.js) with full offline caching.
- **🔍 Global Dashboard Filters**: Slice analytics and expense charts by time period (*This Year*, *Last Year*, *Last 6 Months*, *All Time*, or *Custom Date Range*) and service category with instant recalculation.
- **🚗 Multi-Car Profile Management**: Pre-configured sample vehicle profiles (e.g., Demo Sedan, Sample Compact) and a blank template for registering new vehicles. Custom vehicles are automatically registered and saved in browser storage.
- **⏱️ Live Odometer Simulation**: Update mileage manually or increment quickly with `+1k` and `+5k` buttons. Recalculates every service interval and countdown in real time.
- **🛠️ Periodic Maintenance Schedule**: Track engine oil, transmission fluid, spark plugs, timing belt/chain, coolant, drive belts, and filters with status badges:
  - 🟢 **Good**: > 1,000 km remaining.
  - 🟡 **Due Soon**: ≤ 1,000 km remaining.
  - 🔴 **Overdue**: Past due mileage (≤ 0 km).
  - ⚪ **Unset / Pending**: Awaiting baseline odometer entry.
- **📊 Interactive SVG Charts**:
  - Horizontal countdown bar chart showing distance remaining per service item.
  - Donut chart breaking down workshop expenses by category (Fluids, Overhaul, Drivetrain, Electrical, etc.).
- **🧾 Workshop Expense & History Log**: Full ledger of maintenance services, repair dates, odometer readings, parts costs, workshop fees, payment methods (Cash, Transfer, Touch 'n Go eWallet, DuitNow QR), and mechanic notes. Search history dynamically by keyword.
- **📁 Unified Data Hub**:
  - **CSV Tab**: Download blank CSV template, export current car to CSV, and import spreadsheet files with auto-save.
  - **JSON Tab**: In-browser JSON editor with syntax validation, blank template generator, direct file import, and export.
- **📄 Printable A4 Vehicle Condition Report**: Opens a cleanly formatted vehicle condition certificate in a new browser tab with print styling (`@media print`), workshop letterhead, schedule health summary, and signature lines.
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

### 1. Multi-Vehicle Profiles
Select between preloaded vehicle profiles or choose **➕ New Car** to load a blank vehicle profile. When editing vehicle specifications (make, model, year, registration date, engine code, chassis number, transmission, workshop contact, parts supplier), changes persist immediately to `localStorage`.

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
    "workshop": {
      "mechanicName": "Metro Auto Care",
      "location": "Industrial Park, Metro City",
      "partsSupplier": "Grand Auto Parts (+1 555-0142)"
    }
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
      "estimatedCostMyr": 65
    }
  ],
  "maintenanceHistory": [
    {
      "id": "rec-2025-11-15",
      "date": "2025-11-15",
      "mileageKm": 42000,
      "title": "Engine Oil & Filter Service",
      "category": "Periodic & Fluids",
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
1. `METADATA`: Key-value pairs for vehicle specs (Make, Model, Year, Plate Number, Engine Number, Workshop).
2. `SCHEDULE`: Periodic maintenance intervals and baseline odometer readings.
3. `HISTORY`: Individual service log records.

---

## 🛠️ Development & Customization

- **No Node.js or Build Tools**: No `npm install`, `webpack`, or `vite` required.
- **Styling**: Uses Tailwind CSS via CDN (`https://cdn.tailwindcss.com`) configured with dark mode and custom fonts.
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
