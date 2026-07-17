# LeadFlow Pro 2026 — Quick Developer Reference

## 🚀 Quick Start (Copy & Paste)

### Import Design System
```php
<!-- Add to includes/header.php inside <head> -->
<link rel="stylesheet" href="<?php echo BASE_URL; ?>styles/design-system.css">
```

### Rebuild Tailwind
```bash
npm run build
```

---

## 📦 Component Cheat Sheet

### Buttons
```html
<!-- Primary -->
<button class="btn-primary">Save</button>
<button class="btn-primary btn-sm">Small</button>
<button class="btn-primary btn-lg">Large</button>

<!-- Secondary -->
<button class="btn-secondary">Cancel</button>

<!-- Ghost (Minimal) -->
<button class="btn-ghost">More Options</button>

<!-- Danger -->
<button class="btn-danger">Delete</button>

<!-- Success -->
<button class="btn-success">Approve</button>

<!-- Icon Only -->
<button class="btn-icon btn-ghost">
  <svg class="w-5 h-5">...</svg>
</button>
```

### Cards
```html
<!-- Standard Card -->
<div class="card p-6">
  <h3 class="heading-card">Title</h3>
  <p>Content</p>
</div>

<!-- Elevated Card (Hover Effect) -->
<div class="card-elevated p-6">Hoverable card</div>

<!-- Flat Card -->
<div class="card-flat">Subtle background</div>

<!-- KPI Card (Dashboard) -->
<div class="card-kpi">
  <div class="card-kpi-header">
    <p class="card-kpi-title">Total Leads</p>
    <div class="card-kpi-icon bg-blue-50 text-blue-600">📊</div>
  </div>
  <p class="card-kpi-value">1,234</p>
  <p class="card-kpi-change positive">↑ 12.5%</p>
</div>
```

### Status Badges
```html
<span class="badge-new">New</span>
<span class="badge-pending">Pending</span>
<span class="badge-approved">Approved</span>
<span class="badge-disbursed">Disbursed</span>
<span class="badge-rejected">Rejected</span>
<span class="badge-on-hold">On Hold</span>
```

### Forms
```html
<!-- Input -->
<div class="form-group">
  <label class="form-label form-label-required">Name</label>
  <input type="text" class="input" placeholder="Enter name" />
  <p class="form-hint">Help text here</p>
</div>

<!-- Input with Error -->
<input type="text" class="input input-error" />
<p class="form-error">This field is required</p>

<!-- Select -->
<select class="select">
  <option>Choose...</option>
  <option>Option 1</option>
</select>

<!-- Textarea -->
<textarea class="textarea" rows="4"></textarea>

<!-- 2-Column Form -->
<div class="form-row-2">
  <div class="form-group">...</div>
  <div class="form-group">...</div>
</div>

<!-- 3-Column Form -->
<div class="form-row">
  <div class="form-group">...</div>
  <div class="form-group">...</div>
  <div class="form-group">...</div>
</div>
```

### Tables
```html
<div class="table-container">
  <table class="table">
    <thead>
      <tr>
        <th>Header 1</th>
        <th>Header 2</th>
      </tr>
    </thead>
    <tbody>
      <tr class="table-row-action">
        <td>Data 1</td>
        <td>Data 2</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Alerts
```html
<!-- Success -->
<div class="alert-success">
  <svg class="alert-icon">✓</svg>
  <div class="alert-content">
    <p class="alert-title">Success!</p>
    <p class="alert-message">Operation completed</p>
  </div>
</div>

<!-- Error -->
<div class="alert-error">
  <svg class="alert-icon">✕</svg>
  <div class="alert-content">
    <p class="alert-title">Error</p>
    <p class="alert-message">Something went wrong</p>
  </div>
</div>

<!-- Warning -->
<div class="alert-warning">
  <svg class="alert-icon">⚠</svg>
  <div class="alert-content">
    <p class="alert-title">Warning</p>
    <p class="alert-message">Please check</p>
  </div>
</div>

<!-- Info -->
<div class="alert-info">
  <svg class="alert-icon">ℹ</svg>
  <div class="alert-content">
    <p class="alert-title">Info</p>
    <p class="alert-message">Important note</p>
  </div>
</div>
```

### Progress Bars
```html
<!-- Simple Progress -->
<div class="progress-bar">
  <div class="progress-fill" style="width: 65%"></div>
</div>

<!-- With Label -->
<div class="space-y-2">
  <div class="flex justify-between">
    <span class="text-label">Upload</span>
    <span class="text-caption">65%</span>
  </div>
  <div class="progress-bar">
    <div class="progress-fill" style="width: 65%"></div>
  </div>
</div>
```

### Loading States
```html
<!-- Spinner -->
<div class="spinner"></div>
<div class="spinner spinner-lg"></div>

<!-- Skeleton (Placeholder) -->
<div class="skeleton h-4 w-32"></div>
<div class="skeleton h-8 w-full"></div>
```

### Modals
```html
<!-- Backdrop -->
<div class="modal-backdrop" onclick="closeModal()"></div>

<!-- Modal -->
<div class="modal">
  <div class="modal-header">
    <h2 class="modal-title">Title</h2>
    <button class="btn-icon btn-ghost" onclick="closeModal()">✕</button>
  </div>

  <div class="modal-content">
    <p>Modal content</p>
  </div>

  <div class="modal-footer">
    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn-primary" onclick="confirm()">Confirm</button>
  </div>
</div>
```

### Typography
```html
<!-- Headings -->
<h1 class="heading-page">Page Title</h1>
<h2 class="heading-section">Section Title</h2>
<h3 class="heading-subsection">Subsection</h3>
<h4 class="heading-card">Card Title</h4>

<!-- Text Styles -->
<p class="text-muted">Muted text</p>
<p class="text-label">LABEL TEXT</p>
<p class="text-hint">Helper text</p>
<p class="text-caption">Caption</p>

<!-- Text Gradient -->
<p class="text-gradient">Gradient text</p>
```

---

## 🎨 Color Classes

### Brand Colors (Primary)
```html
<div class="bg-brand-50">...</div>   <!-- Lightest -->
<div class="bg-brand-500">...</div>  <!-- Primary -->
<div class="bg-brand-900">...</div>  <!-- Darkest -->

<button class="bg-brand-600 text-white">Button</button>
<span class="text-brand-600">Text</span>
<div class="border-brand-200">Border</div>
```

### Neutral Colors (Background/Text)
```html
<div class="bg-neutral-50">...</div>
<div class="bg-neutral-900">...</div>
<p class="text-neutral-600">Text</p>
```

### Status Colors
```html
<!-- Blue (New) -->
<span class="bg-blue-100 text-blue-700">New</span>

<!-- Amber (Pending) -->
<span class="bg-amber-100 text-amber-700">Pending</span>

<!-- Purple (Approved) -->
<span class="bg-purple-100 text-purple-700">Approved</span>

<!-- Green (Disbursed) -->
<span class="bg-green-100 text-green-700">Disbursed</span>

<!-- Red (Rejected) -->
<span class="bg-red-100 text-red-700">Rejected</span>

<!-- Slate (On Hold) -->
<span class="bg-slate-100 text-slate-700">On Hold</span>
```

---

## 🔲 Layout Classes

### Grids
```html
<!-- KPI Grid (Responsive) -->
<div class="kpi-grid">
  <div class="card-kpi">...</div>
  <div class="card-kpi">...</div>
  <div class="card-kpi">...</div>
  <div class="card-kpi">...</div>
</div>

<!-- Generic Responsive Grid -->
<div class="grid-responsive">
  <div class="card">...</div>
  <div class="card">...</div>
  <div class="card">...</div>
</div>

<!-- Manual Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

### Containers
```html
<!-- Responsive Container -->
<div class="container-fluid">
  <div class="max-w-7xl mx-auto">Content</div>
</div>

<!-- Sidebar Layout -->
<div class="layout-sidebar">
  <aside class="sidebar">Navigation</aside>
  <main class="main-content">Content</main>
</div>
```

### Responsive Utilities
```html
<!-- Hidden on mobile, visible on desktop -->
<div class="hidden-mobile">Desktop Content</div>

<!-- Visible on mobile, hidden on desktop -->
<div class="visible-mobile">Mobile Content</div>

<!-- Full width on mobile, auto on desktop -->
<div class="mobile-full">Content</div>
```

---

## 🎭 Micro-Interactions

### Hover Effects
```html
<!-- Scale on hover -->
<div class="hover-scale">Hover me</div>

<!-- Shadow on hover -->
<div class="hover-shadow">Hover me</div>

<!-- Lift on hover (up + shadow) -->
<div class="hover-lift">Hover me</div>

<!-- Glow on hover -->
<div class="hover-glow">Hover me</div>
```

### State Effects
```html
<!-- Scale on click -->
<button class="active-scale">Click me</button>

<!-- Color transition -->
<div class="color-transition hover:bg-blue-100">Color</div>

<!-- Opacity transition -->
<div class="opacity-transition hover:opacity-50">Opacity</div>
```

### Animations
```html
<!-- Fade In -->
<div class="animate-fade-in">Fades in</div>

<!-- Fade Up -->
<div class="animate-fade-up">Slides up and fades</div>

<!-- Slide In Right -->
<div class="animate-slide-in-right">Slides from right</div>

<!-- Bounce Subtle -->
<div class="animate-bounce-subtle">Bounces gently</div>

<!-- Spin Slow -->
<div class="animate-spin-slow">Spins slowly</div>
```

---

## 🌙 Dark Mode

### Global
```html
<!-- Enable dark mode for entire page -->
<html class="dark">
```

### Per Component
```html
<!-- Dark mode specific styles -->
<button class="bg-white dark:bg-neutral-900">
  Button
</button>

<div class="text-neutral-900 dark:text-neutral-100">
  Text
</div>
```

---

## ♿ Accessibility

### Focus States
```html
<button class="focus-visible">Accessible Button</button>

<!-- Or manual -->
<input type="text" class="focus:outline-none focus:ring-2 focus:ring-brand-500" />
```

### Screen Reader Only
```html
<span class="sr-only">Loading...</span>
```

### Form Labels
```html
<label for="email" class="form-label">Email</label>
<input id="email" type="email" class="input" />

<!-- Required indicator -->
<label class="form-label form-label-required">Password</label>
```

---

## 🎯 Common Patterns

### Loading State
```html
<div class="flex items-center gap-3">
  <div class="spinner"></div>
  <span class="text-muted">Loading...</span>
</div>
```

### Empty State
```html
<div class="text-center py-12">
  <p class="heading-card mb-2">No results found</p>
  <p class="text-muted mb-6">Try adjusting your filters</p>
  <button class="btn-primary">Clear Filters</button>
</div>
```

### Error State
```html
<div class="alert-error">
  <svg class="alert-icon">✕</svg>
  <div>
    <p class="alert-title">Error</p>
    <p class="alert-message">Failed to load data</p>
  </div>
</div>
```

### Success State
```html
<div class="alert-success">
  <svg class="alert-icon">✓</svg>
  <div>
    <p class="alert-title">Success</p>
    <p class="alert-message">Changes saved successfully</p>
  </div>
</div>
```

### Disabled State
```html
<button class="btn-primary" disabled>Disabled</button>
<input class="input opacity-50 cursor-not-allowed" disabled />
```

---

## 📝 HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LeadFlow Pro</title>
  <link rel="stylesheet" href="assets/css/tailwind.css">
  <link rel="stylesheet" href="styles/design-system.css">
</head>
<body>
  <nav><!-- Navigation --></nav>
  
  <main>
    <h1 class="heading-page">Page Title</h1>
    <!-- Content -->
  </main>
</body>
</html>
```

---

## 🔗 File References

- **Components**: `styles/design-system.css`
- **Documentation**: `styles/README.md`
- **Template**: `styles/dashboard-template.html`
- **Guide**: `styles/IMPLEMENTATION_GUIDE.md`
- **Theme**: `input.css`

---

## 💾 Save This Reference!

Keep this guide handy while developing. Copy component snippets and customize them for your use case.

---

**Version:** 1.0  
**Last Updated:** 2026-06-20  
**Status:** Ready for Development ✅
