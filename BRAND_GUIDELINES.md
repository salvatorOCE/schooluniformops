# School Uniform Solutions - Brand Design System

## 1. Brand DNA
**Core Identity**: Professional, Institutional, Reliable, Efficient.
**Visual Metaphor**: "School Infrastructure Software" — structured, high-contrast, engineered.

## 2. Color System
Based on the extracted brand profile and operational requirements.

### Primary Brand
- **Brand Green**: `#19966D` (Main Action, Primary Buttons, Active States)
- **Deep Anchor**: `#002D2B` (Sidebar, Headers, Strong Text)
- **Soft Accent**: `#31B98E` (Highlight, Focus Rings)

### Operational Surfaces
- **App Background**: `#F8FAFC` (Slate-50 - Clean, low fatigue)
- **Card Surface**: `#FFFFFF` (White - Crisp data containers)
- **Sidebar Surface**: `#002D2B` (Brand Deep Green - Professional anchor) or `#1e293b` (Slate-900 - standard SaaS dark) -> *Decision: Use Brand Deep Green `#002D2B`*

### Functional Colors
- **Success**: `#19966D` (Brand Green - Double duty as success)
- **Warning**: `#F59E0B` (Amber-500 - Standard industrial warning)
- **Error**: `#DC2626` (Red-600 - High contrast alert)
- **Info**: `#0F766E` (Teal-700 - Aligned with brand palette)

### Text Hierarchy
- **Primary Text**: `#0f172a` (Slate-900 - Sharp, readable)
- **Secondary Text**: `#475569` (Slate-600 - Soft contrast)
- **Tertiary Text**: `#94a3b8` (Slate-400 - Meta data)
- **Inverse Text**: `#FFFFFF` (On dark backgrounds/buttons)

## 3. Typography
**Font Family**: `Poppins` (Headings & UI)
**Weights**:
- **Regular (400)**: Body text, data cells.
- **Medium (500)**: Labels, navigation, button text.
- **Bold (700)**: Page titles, KPIs, Alerts.
**Size Scale**:
- **XS**: 11px (Meta tags)
- **SM**: 13px (Dense data)
- **Base**: 15px (Standard body - slightly larger for readability)
- **LG**: 18px (Section headers)
- **XL**: 24px (Page titles)

## 4. Component Styling
**Corner Radius**:
- **Buttons**: `rounded-md` (6px) or `rounded-lg` (8px). *Avoid full pill `rounded-full` for complex apps, strict "Engineered" feel.*
- **Cards**: `rounded-lg` (8px).
- **Inputs**: `rounded-md` (6px).
- **Badges**: `rounded` (4px) or `rounded-md` (6px).

**Shadows**:
- **Cards**: `shadow-sm` (Subtle definition).
- **Dropdowns**: `shadow-lg` (Clear layering).
- **Focus**: `ring-2 ring-emerald-500/20`.

**Borders**:
- **Default**: `border-slate-200`
- **Active**: `border-emerald-500`

## 5. UI/UX Philosophy: "Operational Calm"
- **Density Modes**: Support **Comfort** (Office) and **High Density** (Warehouse).
- **Visual Weight**: Primary metric (Count/Time) must be dominant (2x size/weight of label).
- **Grouping**: Organize by **Workflow Phase** (Ready -> In Prod -> Dispatch), NOT data type.
- **Motion**: Minimal, purposeful state changes only (150ms). No decoration.
- **Empty States**: Guidance-driven ("No batches active - Next cutoff Thursday").

## 6. Status Color System ("Muted Confidence")
Avoid bright startup neon. use grounded, reliable tones.
- **Grey** (Not Started): `bg-slate-100 text-slate-600 border-slate-200`
- **Blue** (In Progress): `bg-blue-50 text-blue-700 border-blue-200`
- **Amber** (Attention): `bg-amber-50 text-amber-700 border-amber-200`
- **Red** (Immediate Action): `bg-red-50 text-red-700 border-red-200`
- **Green** (Completed): `bg-emerald-50 text-emerald-700 border-emerald-200`

## 7. Operational Environment
- **High Contrast**: Text must be readable in bright warehouse lighting (Slate-900 primary).
- **Engineered Feel**: Tighter border radius (4px-6px), crisp borders, low shadow.
- **Supervisor Presence**: Strong section headers, clear command hierarchy.
