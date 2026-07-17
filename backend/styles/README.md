# LeadFlow Pro 2026 — Design System Documentation

## Overview

This is a premium, enterprise-grade design system built with Tailwind CSS v4 for LeadFlow Pro. It combines modern fintech aesthetics with professional data visualization.

---

## Color System

### Primary Brand Colors (Emerald Green)
```
brand-50:  #ecfdf5  (Lightest)
brand-100: #d1fae5
brand-200: #a7f3d0
brand-300: #6ee7b7
brand-400: #34d399
brand-500: #10b981  (Primary)
brand-600: #059669
brand-700: #047857
brand-800: #065f46
brand-900: #064e3b
brand-950: #022c22  (Darkest)
```

### Status Colors (Financial)
- **New**: `#3b82f6` (Blue)
- **Pending**: `#f59e0b` (Amber)
- **Approved**: `#8b5cf6` (Purple)
- **Disbursed**: `#10b981` (Green)
- **Rejected**: `#ef4444` (Red)
- **On Hold**: `#64748b` (Slate)

### Neutral Palette (Professional Slate)
```
neutral-50:   #f9fafb
neutral-100:  #f3f4f6
neutral-200:  #e5e7eb
neutral-400:  #9ca3af
neutral-500:  #6b7280
neutral-700:  #374151
neutral-900:  #111827
neutral-950:  #030712
```

---

## Components

### Buttons

#### Primary Button
```html
<button class="btn-primary">Save Changes</button>
```

#### Secondary Button
```html
<button class="btn-secondary">Cancel</button>
```

#### Ghost Button
```html
<button class="btn-ghost">More Options</button>
```

#### Button Sizes
```html
<button class="btn-primary btn-sm">Small</button>
<button class="btn-primary">Normal (Default)</button>
<button class="btn-primary btn-lg">Large</button>
```

#### Icon Button
```html
<button class="btn-icon btn-ghost">
  <svg class="w-5 h-5">...</svg>
</button>
```

---

### Cards

#### Standard Card
```html
<div class="card p-6">
  <h3 class="heading-card">Card Title</h3>
  <p class="text-muted">Card content goes here</p>
</div>
```

#### Elevated Card (Hover Effect)
```html
<div class="card-elevated p-6">
  Interactive card with hover
</div>
```

#### KPI Card (Dashboard)
```html
<div class="card-kpi">
  <div class="card-kpi-header">
    <p class="card-kpi-title">Total Leads</p>
    <div class="card-kpi-icon">📊</div>
  </div>
  <p class="card-kpi-value">1,234</p>
  <p class="card-kpi-change positive">↑ 12.5%</p>
</div>
```

---

### Badges

#### Status Badges
```html
<!-- New -->
<span class="badge-new">New</span>

<!-- Pending -->
<span class="badge-pending">Pending</span>

<!-- Approved -->
<span class="badge-approved">Approved</span>

<!-- Disbursed -->
<span class="badge-disbursed">Disbursed</span>

<!-- Rejected -->
<span class="badge-rejected">Rejected</span>

<!-- On Hold -->
<span class="badge-on-hold">On Hold</span>
```

---

### Forms

#### Form Group
```html
<div class="form-group">
  <label class="form-label form-label-required">Email Address</label>
  <input type="email" class="input" placeholder="you@example.com" />
  <p class="form-hint">We'll never share your email</p>
</div>
```

#### Form Row (2 Columns)
```html
<div class="form-row-2">
  <div class="form-group">
    <label class="form-label">First Name</label>
    <input type="text" class="input" />
  </div>
  <div class="form-group">
    <label class="form-label">Last Name</label>
    <input type="text" class="input" />
  </div>
</div>
```

#### Form Row (3 Columns)
```html
<div class="form-row">
  <div class="form-group">
    <label class="form-label">Name</label>
    <input type="text" class="input" />
  </div>
  <div class="form-group">
    <label class="form-label">Email</label>
    <input type="email" class="input" />
  </div>
  <div class="form-group">
    <label class="form-label">Phone</label>
    <input type="tel" class="input" />
  </div>
</div>
```

#### Select
```html
<div class="form-group">
  <label class="form-label">Status</label>
  <select class="select">
    <option>Choose status...</option>
    <option>Approved</option>
    <option>Pending</option>
    <option>Rejected</option>
  </select>
</div>
```

#### Textarea
```html
<div class="form-group">
  <label class="form-label">Notes</label>
  <textarea class="textarea" rows="4" placeholder="Enter notes..."></textarea>
</div>
```

#### Input States
```html
<!-- Normal -->
<input class="input" />

<!-- Error -->
<input class="input input-error" />
<p class="form-error">This field is required</p>

<!-- Success -->
<input class="input input-success" />
```

---

### Alerts

#### Success Alert
```html
<div class="alert-success">
  <svg class="alert-icon">✓</svg>
  <div class="alert-content">
    <p class="alert-title">Success</p>
    <p class="alert-message">Your changes have been saved</p>
  </div>
</div>
```

#### Error Alert
```html
<div class="alert-error">
  <svg class="alert-icon">✕</svg>
  <div class="alert-content">
    <p class="alert-title">Error</p>
    <p class="alert-message">Something went wrong</p>
  </div>
</div>
```

#### Warning Alert
```html
<div class="alert-warning">
  <svg class="alert-icon">⚠</svg>
  <div class="alert-content">
    <p class="alert-title">Warning</p>
    <p class="alert-message">Please review before proceeding</p>
  </div>
</div>
```

#### Info Alert
```html
<div class="alert-info">
  <svg class="alert-icon">ℹ</svg>
  <div class="alert-content">
    <p class="alert-title">Information</p>
    <p class="alert-message">New updates are available</p>
  </div>
</div>
```

---

### Badges & Status Indicators

#### Badge with Icon
```html
<span class="badge-new">
  <span>●</span> New
</span>
```

#### Outline Badge
```html
<span class="badge badge-outline border-brand-500 text-brand-600">
  Featured
</span>
```

---

### Progress Bars

#### Linear Progress
```html
<div class="progress-bar">
  <div class="progress-fill" style="width: 65%"></div>
</div>
```

#### Progress with Label
```html
<div class="space-y-2">
  <div class="flex justify-between">
    <span class="text-label">Upload Progress</span>
    <span class="text-caption">65%</span>
  </div>
  <div class="progress-bar">
    <div class="progress-fill" style="width: 65%"></div>
  </div>
</div>
```

---

### Loading States

#### Spinner
```html
<div class="spinner"></div>
<div class="spinner spinner-lg"></div>
```

#### Skeleton Loading
```html
<div class="card p-6 space-y-4">
  <div class="skeleton h-4 w-32"></div>
  <div class="skeleton h-8 w-full"></div>
  <div class="skeleton h-4 w-24"></div>
</div>
```

---

### Tables

#### Data Table
```html
<div class="table-container">
  <table class="table">
    <thead>
      <tr>
        <th>Lead ID</th>
        <th>Customer</th>
        <th>Amount</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr class="table-row-action">
        <td>#12345</td>
        <td>John Doe</td>
        <td>₹50,000</td>
        <td><span class="badge-pending">Pending</span></td>
        <td>
          <button class="btn-ghost btn-sm">Edit</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

### Typography

#### Headings
```html
<h1 class="heading-page">Page Title</h1>
<h2 class="heading-section">Section Heading</h2>
<h3 class="heading-subsection">Subsection Heading</h3>
<h4 class="heading-card">Card Title</h4>
```

#### Text Styles
```html
<p class="text-muted">Muted text</p>
<p class="text-label">LABEL TEXT</p>
<p class="text-hint">Helper hint text</p>
<p class="text-caption">Caption text</p>
```

---

### Modals

#### Modal Dialog
```html
<!-- Backdrop -->
<div class="modal-backdrop"></div>

<!-- Modal -->
<div class="modal">
  <div class="modal-header">
    <h2 class="modal-title">Confirm Action</h2>
    <button class="btn-icon btn-ghost">✕</button>
  </div>

  <div class="modal-content">
    <p>Are you sure you want to proceed?</p>
  </div>

  <div class="modal-footer">
    <button class="btn-secondary">Cancel</button>
    <button class="btn-primary">Confirm</button>
  </div>
</div>
```

---

## Spacing Scale

```
xs:   2px
sm:   4px
md:   8px
lg:   12px
xl:   16px
2xl:  24px
3xl:  32px
4xl:  48px
5xl:  64px
```

---

## Animations

### Fade In
```html
<div class="animate-fade-in">Content</div>
```

### Fade Up
```html
<div class="animate-fade-up">Content</div>
```

### Slide In Right
```html
<div class="animate-slide-in-right">Content</div>
```

### Bounce Subtle
```html
<div class="animate-bounce-subtle">Content</div>
```

---

## Responsive Utilities

### Hidden/Visible
```html
<!-- Hidden on mobile, visible on desktop -->
<div class="hidden-mobile">Desktop only</div>

<!-- Visible on mobile, hidden on desktop -->
<div class="visible-mobile">Mobile only</div>
```

---

## Dark Mode

All components support dark mode via the `.dark` class:

```html
<html class="dark">
  <!-- Content automatically uses dark colors -->
</html>
```

---

## Accessibility

### Focus Visible States
All interactive elements have visible focus states for keyboard navigation.

```html
<button class="focus-visible">Accessible Button</button>
```

### Screen Reader Only Text
```html
<span class="sr-only">Loading...</span>
```

---

## Best Practices

1. **Consistency**: Use component classes consistently across the application
2. **Color**: Use semantic colors (brand, success, error, warning, info)
3. **Spacing**: Use spacing scale (md, lg, xl) not arbitrary values
4. **Shadows**: Use predefined shadows for depth
5. **Transitions**: Use duration-200 or duration-300 for smooth animations
6. **Accessibility**: Always include labels and focus states

---

## File Structure

```
styles/
├── design-system.css    # Component library
├── dashboard.css        # Dashboard-specific styles
└── README.md           # This documentation
```

---

## Customization

To customize the design system, edit the `@theme` section in `input.css`:

```css
@theme {
  --color-brand-500: #your-color;
  --duration-300: 300ms;
  /* ... */
}
```

Then rebuild:
```bash
npm run build
```

---

## Support

For questions or updates to the design system, refer to the UI-UX Prompt or design specifications.
