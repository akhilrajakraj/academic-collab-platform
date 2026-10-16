# Word-Inspired Editor Feature Modules

This roadmap decomposes the Microsoft Word feature inventory into independently deliverable modules for Academic Collab Platform. It targets a free, platform-owned editor based on Tiptap; it does not claim to reproduce Microsoft Word or require a Microsoft Word license.

## Delivery principles

- Ship one module at a time in small, reviewable commits.
- Preserve the current Next.js, Tiptap, NestJS, PostgreSQL and project-role architecture.
- Keep document content in a versioned, portable representation and test DOCX/PDF round-trips before calling exports complete.
- Treat Word desktop, Word for the web and mobile as different feature sets; this roadmap prioritizes common student workflows.
- Mark features as implemented only after code and behavior are verified. A toolbar control is not complete if its extension, persistence, export, keyboard accessibility or permissions are missing.
- Keep advanced features that require infrastructure (real-time coauthoring, pagination, DOCX conversion, AI, and enterprise controls) behind explicit later modules.

## Module sequence

| Module | Scope | Priority | Acceptance criteria |
|---|---|---|---|
| M01 | Core editing and formatting | P0 | Paragraphs, headings 1–3, bold, italic, strike, inline code, lists, quote, code block, divider, clear formatting, undo/redo; active states; read-only role enforcement; autosave persists valid JSON. |
| M02 | Font and text styling | P0 | Underline, text color/highlight, font family/size, subscript/superscript, case tools where supported; schema-compatible persistence and export. |
| M03 | Paragraph and list layout | P0 | Alignment, indentation, line/paragraph spacing, nested lists, list restart/continuation and paragraph borders/shading. |
| M04 | Page layout and borders | P0 | Configurable margins, paper size/orientation, document-page border settings, page breaks and section breaks; print/export respects settings. |
| M05 | Tables | P0 | Insert/edit tables, row/column operations, merge/split cells, resizing, header rows, cell alignment, borders and shading. |
| M06 | Images and visual objects | P0 | Secure image insertion/upload, resize/alt text, links, captions; shapes/charts/diagrams evaluated by feasibility. |
| M07 | Headers, footers and pagination | P1 | Header/footer regions, page numbering, first-page/section variants, print pagination and repeated table headers. |
| M08 | Styles, themes and templates | P1 | Named styles, heading outline, reusable templates and consistent theme tokens. |
| M09 | Academic references | P1 | Footnotes/endnotes, citation records, bibliography styles, captions, cross-references, table of contents and equation numbering. |
| M10 | Review and comments | P0 | Comments anchored to text ranges, threads/replies, resolve/reopen, mention-ready model, review panel and permissions. Existing general comments are not equivalent to anchored comments. |
| M11 | Track Changes and compare | P1 | Author-attributed insertions/deletions/formatting changes, accept/reject, compare revisions and clear review presentation. |
| M12 | Real-time collaboration | P0 | Yjs-based concurrent editing, presence, persistence, reconnect handling, conflict tests and multi-client E2E coverage. Presence alone is not shared editing. |
| M13 | File import/export | P0 | Genuine DOCX import/export, PDF export, HTML sanitization, supported-format disclosure, round-trip fixtures and export security. Current HTML-as-.doc download is only Word-compatible, not a genuine DOCX. |
| M14 | Search, navigation and document insights | P1 | Find/replace, heading navigation, bookmarks, word/character count, document outline and selection-aware commands. |
| M15 | Proofing and accessibility | P1 | Proofing language, spelling/grammar integration feasibility, alt text, semantic headings, keyboard support, accessible tables and an accessibility checklist. |
| M16 | AI writing assistance | P2 | Optional drafting, rewrite, summary and outline tools with explicit user action, privacy controls, and no assumption that users have paid AI accounts. |
| M17 | Forms, mail merge and automation | P2 | Structured fields, fillable forms, reusable blocks, batch document generation and integrations where appropriate. |
| M18 | Security and enterprise document controls | P1 | Sharing/permissions, safe uploads, sanitized HTML, audit events, access revocation, retention and optional organizational controls. |
| M19 | Print, PDF and release quality | P0 | Print preview, page-boundary handling, accessible output, PDF verification, responsive controls, browser compatibility and regression suite. |
| M20 | Advanced desktop-only parity review | P2 | Evaluate macros, VBA, add-ins, embedded objects, digital signatures, advanced indexing and enterprise-only features; document deliberate exclusions. |

## Current status

- M01: In progress. Existing controls cover bold, italic, strike, headings 1–3, normal paragraph, inline code, lists, blockquote, code block, horizontal rule, clear formatting, undo/redo, autosave and role-based editability. The first incremental delivery added Heading 3, Normal paragraph and Inline code controls. Additional work is still needed for keyboard/accessibility review and automated coverage.
- M02: Initial controls implemented for underline, text color, text highlight, font family, font size, subscript, superscript and clearing inline text styles. Requires typecheck/build and round-trip verification before being considered complete.
- M03: Initial editor controls added for paragraph alignment, indentation, line spacing, paragraph spacing, paragraph shading/bottom border, list nesting/promoting and ordered-list restart. These controls still require typecheck/build, reload/round-trip verification and browser interaction checks before the module is considered complete.
- M04: Initial controls added for A4/Letter/Legal paper sizing, portrait/landscape orientation, narrow/normal/wide margins, no/single/double border choices and an inserted page-break node. This is a visual/document-schema foundation; true multi-page pagination, section breaks, and verified print/export behavior remain outstanding.
- M05: Initial table node schema and toolbar controls added for 3×3 table insertion, row/column insertion and deletion, header-row toggling, adjacent-cell merge/split, cell alignment, shading and border-color metadata. Resizing, robust table-grid transformations, keyboard navigation, and end-to-end persistence/export validation remain outstanding.
- M10: Partial. General document comments and resolve/reopen exist; text-range anchoring and threaded replies are not complete.
- M12: Partial. Authenticated presence exists; concurrent text synchronization and durable Yjs persistence are not complete.
- M13: Partial. PDF uses browser print; the current Word download is HTML with a .doc extension, not a genuine .docx.

## Definition of done for every module

1. UI works with keyboard and pointer, has accessible names, clear active/disabled states and responsive behavior.
2. Editing is blocked for users without OWNER/EDITOR permission, with server-side authorization remaining authoritative.
3. Changes survive reload and are compatible with the persisted document schema.
4. Export/print includes the feature where applicable, or explicitly communicates the limitation.
5. Typecheck, lint and production build pass; add automated tests for parsing, permissions, persistence and edge cases where applicable.
6. Update this document with shipped status and known limitations after verification.
