# Design Guide: Airbnb-Inspired Operational UI

This project should use an Airbnb-inspired design language: warm, polished, spacious, and human, while staying practical for daily operations. Do not copy Airbnb assets, logos, or proprietary screens. Use the principles below as the design system for this assignment.

## Design Principles

- Human first: customer names, job status, and next actions should be easy to scan.
- Light but useful: avoid dense enterprise clutter, but do not create a marketing landing page.
- Confident hierarchy: each screen should make the next action obvious.
- Calm defaults: errors, overdue work, and high-value jobs should stand out without making the whole app noisy.
- Mobile-aware: Raj may check the app from a phone while visiting a site.

## Color Tokens

- Primary coral: `#FF5A5F`
- Primary coral hover: `#E0484D`
- Teal accent: `#00A699`
- Deep teal: `#008489`
- Text primary: `#222222`
- Text secondary: `#484848`
- Text muted: `#767676`
- Border: `#DDDDDD`
- Surface: `#FFFFFF`
- Background: `#F7F7F7`
- Warning: `#FFB400`
- Error: `#C13515`
- Success: `#008A05`

## Typography

- Use a modern sans-serif stack: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Page title: 28-32 px, 700 weight.
- Section title: 18-22 px, 700 weight.
- Card title: 15-17 px, 700 weight.
- Body text: 14-16 px, 400-500 weight.
- Metadata: 12-13 px, 600 weight.
- Letter spacing should be `0` except for short uppercase eyebrow labels.

## Spacing

- Base spacing unit: 4 px.
- Common gaps: 8, 12, 16, 24, 32 px.
- Page padding: 24 px desktop, 16 px mobile.
- Cards: 16-20 px internal padding.
- Form fields: at least 40 px height.

## Shape and Elevation

- Border radius: 8 px for cards, inputs, controls, and panels.
- Avoid oversized rounded pills except for counters or tags.
- Use subtle borders before shadows.
- Use shadows sparingly: `0 4px 12px rgb(0 0 0 / 0.06)` for raised cards or menus.

## Components

### Buttons

- Primary buttons use coral fill and white text.
- Secondary buttons use white fill, border, and deep teal or primary text.
- Icon buttons should use lucide icons where appropriate.
- Buttons should have visible hover, focus, disabled, and loading states.

### Forms

- Labels should be visible.
- Required fields should be clear.
- Validation errors should sit near the field.
- Inputs should use border `#B0B0B0` or darker for accessibility.

### Pipeline Board

- Stage columns should be visually balanced and usable on small screens.
- Each job card should show customer name, site, value, next action, and any urgent signal.
- Stage counts should be accurate and easy to see.
- Completed or invoice-sent work should not invite accidental movement back to Lead.

### Analytics

- Use compact metric cards.
- Charts should prioritize readable labels over decoration.
- Use coral for primary trend/value, teal for positive/complete states, warning for risk.
- Tables should support scanning with clear alignment and useful empty states.

## Accessibility Expectations

- All interactive controls must be keyboard reachable.
- Focus states must be visible.
- Color should not be the only way to communicate status.
- Text contrast should meet WCAG AA for normal text.
- Error states should be announced with visible text.

## What to Avoid

- Purple-heavy gradients.
- Decorative blobs or abstract backgrounds.
- Oversized hero sections.
- Hidden labels.
- UI copy that explains obvious controls.
- Recreating an enterprise sales app aesthetic.
