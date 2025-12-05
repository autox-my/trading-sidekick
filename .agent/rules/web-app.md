---
trigger: always_on
---

1. Stateless Design: All session data, user state, and transient information must be stored externally (e.g., distributed cache or database); application servers must be fundamentally stateless to enable true horizontal scaling.
2. Architecture: Implement either a Microservices or a Modular Monolith pattern to ensure components can scale and deploy independently.
3. Caching Foundation: Lazy Caching (Cache-Aside) must be the primary strategy, populating the cache only on data request/miss. Prohibit caching of sensitive data.
4. Content Delivery: Mandatory use of a Content Delivery Network (CDN) for static asset distribution, server load reduction, and reduced latency globally.
5. CWV Targets: Maintain field performance targets: LCP $\leq 2.5s$, CLS $< 0.1$, and INP $\leq 200ms$.
6. Asset Optimization: Compress all images and videos, serving them in modern formats (e.g., WebP/AVIF). Compress all text assets (HTML, CSS, JS) via Gzip or Brotli.
7. CLS Mitigation: Always specify explicit width and height attributes for all images, videos, and dynamic embeds (ads/iFrames) to reserve space and prevent layout shifts.
8. LCP/INP Optimization: Use Code Splitting (dynamic imports) and defer non-critical JavaScript to prevent main thread blocking. Do not lazy load content that determines the Largest Contentful Paint (LCP element) above the fold.
9. Font Loading: Use the CSS rule font-display: swap for all web fonts to ensure text displays immediately with a fallback font, minimizing font-loading CLS.
10. WCAG Compliance: All user interface components and content must conform to WCAG 2.2 Level AA accessibility standards.
11. Keyboard Accessibility: The entire site functionality must be operable and navigable using the keyboard alone, with clearly visible focus indicators.
12. Contrast and Readability: Maintain a minimum contrast ratio of 4.5:1 for all body text against its background. Limit typography to a maximum of three different typefaces for consistency.
13. Design Principle: Adopt a simple, functional, and minimalist design, leveraging clear Visual Hierarchy (via size, contrast, and ample whitespace) to guide the user to critical elements.
14. Input Validation: Rigorously validate and sanitize all user-submitted data (input, forms, URLs) and use parameterized queries for database interaction (mitigating Injection/XSS/SSRF).
15. Access Control: Enforce strict server-side validation using Authorization Tokens for all privileged requests to prevent unauthorized access and privilege escalation (Broken Access Control).
16. Data Encryption: All sensitive data (PII, credentials) must be encrypted at rest and in transit (TLS/SSL).
17. Authentication: Require Multi-Factor Authentication (MFA) for all critical user accounts and implement Rate Limiting on login attempts (Authentication Failures).