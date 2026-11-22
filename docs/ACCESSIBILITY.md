# Accessibility status

The frontend includes keyboard-focus indicators, reduced-motion support, labels for primary inputs, a sign-in dialog with focus containment and Escape handling, and a responsive navigation bar. The active workspace navigation button exposes its pressed state. The browser's back/forward navigation can return between the landing page and workspace.

`npm run test -w @cortex/web` runs interaction tests and automated axe-core checks in jsdom for the landing page, overview, and sign-in dialog. It also checks the search navigation and focus wrapping in the sign-in dialog. Color contrast is disabled in this test because jsdom does not render pixels; automated checks cannot establish accessibility compliance.

Still required: manual testing in real browsers and with screen readers, visual color-contrast measurement in both themes, mobile and zoom testing, focus management for the search palette and document preview, upload and chat announcements, and review of all remaining screens and error states. Do not claim WCAG conformance from these checks alone.
