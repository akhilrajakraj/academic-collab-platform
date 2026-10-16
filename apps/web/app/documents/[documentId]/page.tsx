'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import { Extension, Mark, Node, type JSONContent } from '@tiptap/core';
import TextStyle from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CollaborationPresence from '../../../components/collaboration-presence';

type Role = 'OWNER' | 'EDITOR' | 'REVIEWER' | 'VIEWER';
type ApiUser = { id: string; displayName: string; email: string };
type ApiProject = { id: string; name: string };
type ApiDocument = {
  id: string; projectId: string; title: string; status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'ARCHIVED';
  content: Record<string, unknown>; updatedAt: string; project: ApiProject;
  _count?: { revisions: number; comments: number };
};
type ApiRevision = { id: string; title: string; createdAt: string; author?: { displayName: string } };
type ApiComment = { id: string; body: string; createdAt: string; resolvedAt?: string | null; author?: { displayName: string } };
type ApiError = { message?: string | string[]; code?: string; currentUpdatedAt?: string };

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');
const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

const UnderlineMark = Mark.create({
  name: 'underline',
  parseHTML() { return [{ tag: 'u' }]; },
  renderHTML({ HTMLAttributes }) { return ['u', HTMLAttributes, 0]; },
});

const SubscriptMark = Mark.create({
  name: 'subscript',
  parseHTML() { return [{ tag: 'sub' }]; },
  renderHTML({ HTMLAttributes }) { return ['sub', HTMLAttributes, 0]; },
});

const SuperscriptMark = Mark.create({
  name: 'superscript',
  parseHTML() { return [{ tag: 'sup' }]; },
  renderHTML({ HTMLAttributes }) { return ['sup', HTMLAttributes, 0]; },
});

const TextStyleAttributes = Extension.create({
  name: 'textStyleAttributes',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        color: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.color || null,
          renderHTML: (attributes: Record<string, unknown>) => attributes.color ? { style: `color: ${attributes.color}` } : {},
        },
        backgroundColor: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
          renderHTML: (attributes: Record<string, unknown>) => attributes.backgroundColor ? { style: `background-color: ${attributes.backgroundColor}` } : {},
        },
        fontFamily: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.fontFamily || null,
          renderHTML: (attributes: Record<string, unknown>) => attributes.fontFamily ? { style: `font-family: ${attributes.fontFamily}` } : {},
        },
        fontSize: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.fontSize || null,
          renderHTML: (attributes: Record<string, unknown>) => attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
        },
      },
    }];
  },
});


const ParagraphLayoutAttributes = Extension.create({
  name: 'paragraphLayoutAttributes',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        textAlign: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.textAlign || null,
          renderHTML: (attributes: Record<string, unknown>) => attributes.textAlign ? { style: `text-align: ${attributes.textAlign}` } : {},
        },
        textIndent: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.textIndent || null,
          renderHTML: (attributes: Record<string, unknown>) => attributes.textIndent ? { style: `text-indent: ${attributes.textIndent}` } : {},
        },
        lineHeight: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
          renderHTML: (attributes: Record<string, unknown>) => attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight}` } : {},
        },
        paragraphSpacing: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-paragraph-spacing') || null,
          renderHTML: (attributes: Record<string, unknown>) => attributes.paragraphSpacing ? { 'data-paragraph-spacing': attributes.paragraphSpacing, style: `margin-bottom: ${attributes.paragraphSpacing}` } : {},
        },
        paragraphShading: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
          renderHTML: (attributes: Record<string, unknown>) => attributes.paragraphShading ? { style: `background-color: ${attributes.paragraphShading}` } : {},
        },
        paragraphBorder: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-paragraph-border') || null,
          renderHTML: (attributes: Record<string, unknown>) => attributes.paragraphBorder ? { 'data-paragraph-border': attributes.paragraphBorder, style: `border-bottom: 1px solid ${attributes.paragraphBorder}; padding-bottom: .25em` } : {},
        },
      },
    }];
  },
});


const PageLayoutAttributes = Extension.create({
  name: 'pageLayoutAttributes',
  addGlobalAttributes() {
    return [{
      types: ['doc'],
      attributes: {
        pageSize: { default: 'A4', parseHTML: () => 'A4', renderHTML: () => ({}) },
        pageOrientation: { default: 'portrait', parseHTML: () => 'portrait', renderHTML: () => ({}) },
        pageMargins: { default: 'normal', parseHTML: () => 'normal', renderHTML: () => ({}) },
        pageBorder: { default: 'none', parseHTML: () => 'none', renderHTML: () => ({}) },
      },
    }];
  },
});

const PageBreakNode = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML() { return [{ tag: 'div[data-page-break]' }]; },
  renderHTML() { return ['div', { 'data-page-break': 'true', 'aria-label': 'Page break' }]; },
});


const TableCellNode = Node.create({
  name: 'tableCell',
  content: 'block+',
  tableRole: 'cell',
  isolating: true,
  addAttributes() {
    return {
      colspan: { default: 1, parseHTML: (el: HTMLElement) => Number(el.getAttribute('colspan') || 1), renderHTML: (attrs: Record<string, unknown>) => Number(attrs.colspan) > 1 ? { colspan: attrs.colspan } : {} },
      rowspan: { default: 1, parseHTML: (el: HTMLElement) => Number(el.getAttribute('rowspan') || 1), renderHTML: (attrs: Record<string, unknown>) => Number(attrs.rowspan) > 1 ? { rowspan: attrs.rowspan } : {} },
      colwidth: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-colwidth')?.split(',').map(Number) || null, renderHTML: (attrs: Record<string, unknown>) => attrs.colwidth ? { 'data-colwidth': (attrs.colwidth as number[]).join(',') } : {} },
      textAlign: { default: 'left', parseHTML: (el: HTMLElement) => el.style.textAlign || 'left', renderHTML: (attrs: Record<string, unknown>) => ({ style: `text-align: ${attrs.textAlign || 'left'}; vertical-align: middle` }) },
      backgroundColor: { default: null, parseHTML: (el: HTMLElement) => el.style.backgroundColor || null, renderHTML: (attrs: Record<string, unknown>) => attrs.backgroundColor ? { style: `background-color: ${attrs.backgroundColor}; text-align: ${attrs.textAlign || 'left'}; vertical-align: middle` } : { style: `text-align: ${attrs.textAlign || 'left'}; vertical-align: middle` } },
      borderColor: { default: '#cbd5c5', parseHTML: (el: HTMLElement) => el.getAttribute('data-border-color') || '#cbd5c5', renderHTML: (attrs: Record<string, unknown>) => ({ 'data-border-color': attrs.borderColor || '#cbd5c5' }) },
    };
  },
  parseHTML() { return [{ tag: 'td' }]; },
  renderHTML({ HTMLAttributes }) { return ['td', HTMLAttributes, 0]; },
});

const TableHeaderNode = TableCellNode.extend({
  name: 'tableHeader',
  tableRole: 'header_cell',
  parseHTML() { return [{ tag: 'th' }]; },
  renderHTML({ HTMLAttributes }) { return ['th', HTMLAttributes, 0]; },
});

const TableRowNode = Node.create({
  name: 'tableRow',
  content: '(tableCell | tableHeader)+',
  tableRole: 'row',
  parseHTML() { return [{ tag: 'tr' }]; },
  renderHTML({ HTMLAttributes }) { return ['tr', HTMLAttributes, 0]; },
});

const TableNode = Node.create({
  name: 'table',
  group: 'block',
  content: 'tableRow+',
  tableRole: 'table',
  isolating: true,
  selectable: true,
  parseHTML() { return [{ tag: 'table' }]; },
  renderHTML({ HTMLAttributes }) { return ['table', { ...HTMLAttributes, class: 'academic-editor-table' }, ['tbody', 0]]; },
});

function messageOf(error: ApiError | null, fallback: string) {
  return Array.isArray(error?.message) ? error.message.join(' ') : error?.message || fallback;
}

export default function DocumentEditorPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId;
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [document, setDocument] = useState<ApiDocument | null>(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ApiDocument['status']>('DRAFT');
  const [role, setRole] = useState<Role>('VIEWER');
  const [revisions, setRevisions] = useState<ApiRevision[]>([]);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'failed' | 'conflict'>('saved');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [canEditTitle, setCanEditTitle] = useState(false);
  const contentRef = useRef<Record<string, unknown>>(EMPTY_DOC);
  const baselineRef = useRef('');
  const updatedAtRef = useRef('');
  const titleRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const editorRef = useRef<ReturnType<typeof useEditor> | null>(null);
  const saveDocumentRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    setToken(sessionStorage.getItem('academic-collab-access-token'));
    setAuthReady(true);
  }, []);

  const apiFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    });
    if (response.status === 401) {
      sessionStorage.removeItem('academic-collab-access-token');
      router.replace('/');
    }
    return response;
  }, [router, token]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      TextStyleAttributes,
      ParagraphLayoutAttributes,
      PageLayoutAttributes,
      PageBreakNode,
      TableNode,
      TableRowNode,
      TableCellNode,
      TableHeaderNode,
      UnderlineMark,
      SubscriptMark,
      SuperscriptMark,
      Placeholder.configure({ placeholder: 'Start writing your ideas here…' }),
    ],
    content: EMPTY_DOC,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        'aria-label': 'Document content editor',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: current }) => {
      const next = current.getJSON() as Record<string, unknown>;
      contentRef.current = next;
      setSaveState('dirty');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { void saveDocumentRef.current(); }, 900);
    },
  });
  editorRef.current = editor;

  const loadDocument = useCallback(async () => {
    if (!token || !documentId) return;
    setLoading(true);
    setError('');
    try {
      const [docResponse, revisionResponse, commentResponse] = await Promise.all([
        apiFetch(`${API_BASE}/documents/${documentId}`, { cache: 'no-store' }),
        apiFetch(`${API_BASE}/documents/${documentId}/revisions`, { cache: 'no-store' }),
        apiFetch(`${API_BASE}/documents/${documentId}/comments`, { cache: 'no-store' }),
      ]);
      if (!docResponse.ok) throw new Error('Could not load this document. Check your project access and API connection.');
      const doc: ApiDocument = await docResponse.json();
      const membershipResponse = await apiFetch(`${API_BASE}/projects/${doc.projectId}/members`, { cache: 'no-store' });
      const members: Array<{ userId?: string; user?: { id: string }; role: Role }> = membershipResponse.ok ? await membershipResponse.json() : [];
      const meResponse = await apiFetch(`${API_BASE}/auth/me`, { cache: 'no-store' });
      const me: ApiUser | null = meResponse.ok ? await meResponse.json() : null;
      const membership = members.find((member) => member.userId === me?.id || member.user?.id === me?.id);
      setRole(membership?.role || 'VIEWER');
      setDocument(doc);
      setTitle(doc.title);
      titleRef.current = doc.title;
      setStatus(doc.status);
      contentRef.current = doc.content && typeof doc.content === 'object' ? doc.content : EMPTY_DOC;
      baselineRef.current = JSON.stringify({ title: doc.title, content: contentRef.current, status: doc.status });
      updatedAtRef.current = doc.updatedAt;
      if (editor) {
        editor.commands.setContent(contentRef.current as never, false);
        editor.setEditable(Boolean(membership && ['OWNER', 'EDITOR'].includes(membership.role)));
      }
      setSaveState('saved');
      if (revisionResponse.ok) setRevisions(await revisionResponse.json());
      else setRevisions([]);
      if (commentResponse.ok) setComments(await commentResponse.json());
      else setComments([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Document could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, documentId, editor, token]);

  useEffect(() => {
    if (token && editor) void loadDocument();
  }, [token, editor, loadDocument]);

  const canEdit = role === 'OWNER' || role === 'EDITOR';
  const canReview = ['OWNER', 'EDITOR', 'REVIEWER'].includes(role);

  const saveDocument = useCallback(async () => {
    if (!token || !document || !editorRef.current || saveInFlightRef.current || saveState === 'conflict') {
      if (saveInFlightRef.current) pendingRef.current = true;
      return;
    }
    const currentEditor = editorRef.current;
    const nextContent = currentEditor.getJSON() as Record<string, unknown>;
    const nextTitle = titleRef.current.trim();
    const payload = { title: nextTitle, content: nextContent, status };
    const signature = JSON.stringify(payload);
    if (signature === baselineRef.current) {
      setSaveState('saved');
      return;
    }
    if (!nextTitle) {
      setError('Document title cannot be blank.');
      setSaveState('failed');
      return;
    }
    saveInFlightRef.current = true;
    pendingRef.current = false;
    setSaving(true);
    setSaveState('saving');
    setError('');
    try {
      const response = await apiFetch(`${API_BASE}/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, expectedUpdatedAt: updatedAtRef.current }),
      });
      const result = await response.json().catch(() => ({})) as ApiDocument & ApiError;
      if (response.status === 409 || result.code === 'DOCUMENT_VERSION_CONFLICT') {
        setSaveState('conflict');
        setError('Another collaborator saved a newer version. Your local text is still here; compare or reload before saving again.');
        return;
      }
      if (!response.ok) throw new Error(messageOf(result, 'Save failed.'));
      updatedAtRef.current = result.updatedAt;
      setDocument((current) => current ? { ...current, ...result, project: current.project } : current);
      baselineRef.current = JSON.stringify({ title: result.title, content: result.content, status: result.status });
      if (pendingRef.current || JSON.stringify({ title: titleRef.current.trim(), content: currentEditor.getJSON(), status }) !== baselineRef.current) {
        pendingRef.current = false;
        setSaveState('dirty');
        timerRef.current = setTimeout(() => { void saveDocumentRef.current(); }, 300);
      } else {
        setSaveState('saved');
        setNotice('All changes saved.');
      }
    } catch (cause) {
      setSaveState('failed');
      setError(cause instanceof Error ? cause.message : 'Save failed. Your edits remain on this page.');
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
      if (pendingRef.current) {
        pendingRef.current = false;
        timerRef.current = setTimeout(() => { void saveDocumentRef.current(); }, 250);
      }
    }
  }, [apiFetch, document, saveState, status, token]);

  saveDocumentRef.current = saveDocument;

  useEffect(() => {
    if (!editor || !document || !canEdit) return;
    const current = JSON.stringify({ title: title.trim(), content: editor.getJSON(), status });
    if (current === baselineRef.current) return;
    setSaveState('dirty');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void saveDocument(); }, 900);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [canEdit, document, editor, saveDocument, status, title]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function updateParagraphLayout(attributes: Record<string, unknown>) {
    if (!editor || !canEdit) return;
    const chain = editor.chain().focus();
    if (editor.isActive('heading')) chain.updateAttributes('heading', attributes).run();
    else chain.updateAttributes('paragraph', attributes).run();
  }

  function changeIndent(direction: -1 | 1) {
    if (!editor || !canEdit) return;
    const node = editor.isActive('heading') ? editor.getAttributes('heading') : editor.getAttributes('paragraph');
    const current = Number.parseFloat(String(node.textIndent || '0')) || 0;
    const next = Math.max(0, Math.min(8, current + direction * 1.5));
    updateParagraphLayout({ textIndent: next ? `${next}em` : null });
  }

  function toggleParagraphBorder() {
    if (!editor || !canEdit) return;
    const node = editor.isActive('heading') ? editor.getAttributes('heading') : editor.getAttributes('paragraph');
    updateParagraphLayout({ paragraphBorder: node.paragraphBorder ? null : '#b9c5b3' });
  }

  const pageLayout = editor?.getAttributes('doc') as { pageSize?: string; pageOrientation?: string; pageMargins?: string; pageBorder?: string } | undefined;

  function updatePageLayout(attribute: 'pageSize' | 'pageOrientation' | 'pageMargins' | 'pageBorder', value: string) {
    if (!editor || !canEdit) return;
    editor.chain().focus().command(({ tr, dispatch }) => {
      if (dispatch) {
        tr.setDocAttribute(attribute, value);
      }
      return true;
    }).run();
  }

  function insertPageBreak() {
    if (!editor || !canEdit) return;
    editor.chain().focus().insertContent({ type: 'pageBreak' }).run();
  }


  function insertTable() {
    if (!editor || !canEdit) return;
    const rows = Array.from({ length: 3 }, (_, rowIndex) => ({
      type: 'tableRow',
      content: Array.from({ length: 3 }, (_, colIndex) => ({
        type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: rowIndex === 0 ? `Header ${colIndex + 1}` : ' ' }] }],
      })),
    }));
    editor.chain().focus().insertContent({ type: 'table', content: rows }).run();
  }

  function selectedTable() {
    if (!editor) return null;
    const { $from } = editor.state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if ($from.node(depth).type.name === 'table') return { node: $from.node(depth), pos: $from.before(depth), depth };
    }
    return null;
  }

  function updateSelectedTable(transform: (rows: JSONContent[]) => JSONContent[]) {
    const table = selectedTable();
    if (!editor || !table) return;
    const json = table.node.toJSON() as JSONContent;
    const rows = transform(json.content || []);
    editor.chain().focus().insertContentAt(
      { from: table.pos, to: table.pos + table.node.nodeSize },
      { ...json, content: rows },
    ).run();
  }

  function modifyTable(action: 'row-after' | 'row-before' | 'row-delete' | 'column-after' | 'column-before' | 'column-delete' | 'header-toggle' | 'merge-right' | 'split-cell') {
    if (!editor || !canEdit) return;
    const { $from } = editor.state.selection;
    let cellDepth = $from.depth;
    while (cellDepth > 0 && !['tableCell', 'tableHeader'].includes($from.node(cellDepth).type.name)) cellDepth -= 1;
    const table = selectedTable();
    if (!table) return;
    const rowDepth = cellDepth - 1;
    const rowIndex = rowDepth > 0 ? $from.index(rowDepth) : 0;
    const cellIndex = cellDepth > 0 ? $from.index(cellDepth) : 0;
    const cellType = $from.node(cellDepth)?.type.name;
    updateSelectedTable((rows) => {
      const safeRows = rows.map((row) => ({ ...row, content: [...(row.content || [])] }));
      const currentRow = safeRows[rowIndex];
      if (!currentRow) return rows;
      if (action === 'row-before' || action === 'row-after') {
        const template = currentRow.content || [];
        const newRow = { type: 'tableRow', content: template.map((cell) => ({ type: cell.type, attrs: { ...(cell.attrs || {}), colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph' }] })) };
        safeRows.splice(rowIndex + (action === 'row-after' ? 1 : 0), 0, newRow);
      } else if (action === 'row-delete') {
        if (safeRows.length > 1) safeRows.splice(rowIndex, 1);
      } else if (action === 'column-before' || action === 'column-after') {
        safeRows.forEach((row) => {
          const cells = row.content || [];
          const template = cells[Math.min(cellIndex, cells.length - 1)] || cells[0];
          if (template) cells.splice(cellIndex + (action === 'column-after' ? 1 : 0), 0, { type: rowIndex === 0 && template.type === 'tableHeader' ? 'tableHeader' : 'tableCell', content: [{ type: 'paragraph' }] });
        });
      } else if (action === 'column-delete') {
        if ((currentRow.content || []).length > 1) safeRows.forEach((row) => { if ((row.content || []).length > 1) row.content?.splice(cellIndex, 1); });
      } else if (action === 'header-toggle') {
        safeRows[0]?.content?.forEach((cell) => { cell.type = cell.type === 'tableHeader' ? 'tableCell' : 'tableHeader'; });
      } else if (action === 'merge-right') {
        const cells = currentRow.content || [];
        if (cells[cellIndex] && cells[cellIndex + 1]) {
          const first = cells[cellIndex];
          const second = cells[cellIndex + 1];
          first.attrs = { ...(first.attrs || {}), colspan: Number(first.attrs?.colspan || 1) + Number(second.attrs?.colspan || 1) };
          first.content = [...(first.content || []), ...(second.content || [])];
          cells.splice(cellIndex + 1, 1);
        }
      } else if (action === 'split-cell') {
        const cell = currentRow.content?.[cellIndex];
        const span = Number(cell?.attrs?.colspan || 1);
        if (cell && span > 1) {
          cell.attrs = { ...(cell.attrs || {}), colspan: 1 };
          for (let i = 1; i < span; i += 1) currentRow.content?.splice(cellIndex + i, 0, { type: cellType === 'tableHeader' ? 'tableHeader' : 'tableCell', content: [{ type: 'paragraph' }] });
        }
      }
      return safeRows;
    });
  }

  function styleSelectedCells(attribute: 'textAlign' | 'backgroundColor' | 'borderColor', value: string) {
    if (!editor || !canEdit) return;
    const { $from } = editor.state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      if (['tableCell', 'tableHeader'].includes($from.node(depth).type.name)) {
        const pos = $from.before(depth);
        const node = $from.node(depth);
        editor.chain().focus().command(({ tr, dispatch }) => {
          if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, [attribute]: value });
          return true;
        }).run();
        return;
      }
    }
  }

  function downloadWordDocument() {
    if (!editor || !document) return;
    const safeTitle = (title.trim() || 'Academic-Collab-Document').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').slice(0, 120);
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
      safeTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
      '</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:#222;margin:2.5cm}h1{font-size:22pt}h2{font-size:16pt}h3{font-size:13pt}blockquote{border-left:3px solid #888;padding-left:12px;color:#555}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px}ul,ol{padding-left:24px}pre{white-space:pre-wrap}</style></head><body>' +
      editor.getHTML() + '</body></html>';
    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = safeTitle + '.doc';
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setNotice('Word-compatible document downloaded. You can open the .doc file in Microsoft Word.');
  }

  function downloadPdf() {
    if (!editor || !document) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Your browser blocked the PDF print window. Allow pop-ups for this site and try again.');
      return;
    }
    const safeTitle = (title.trim() || 'Academic Collab document').replace(/[<>]/g, '');
    printWindow.document.open();
    printWindow.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
      safeTitle + '</title><style>@page{size:A4;margin:20mm}body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.65;color:#202820}h1{font-size:24pt}h2{font-size:18pt}h3{font-size:14pt}blockquote{border-left:3px solid #8ca477;padding-left:12px;color:#536052}pre{white-space:pre-wrap}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #b8c0b4;padding:6px}a{color:inherit;text-decoration:underline}</style></head><body>' +
      editor.getHTML() + '<script>window.onload=function(){window.focus();window.print();};<\/script></body></html>');
    printWindow.document.close();
    setNotice('Print dialog opened. Choose “Save as PDF” as the destination.');
  }

  async function updateStatus(nextStatus: ApiDocument['status']) {
    if (!document || !canEdit) return;
    if (saveState !== 'saved') {
      setError('Save your current edits before changing the document status.');
      return;
    }
    setSaveState('saving');
    setNotice('');
    const response = await apiFetch(`${API_BASE}/documents/${document.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus, expectedUpdatedAt: updatedAtRef.current }),
    });
    const result = await response.json().catch(() => ({})) as ApiDocument & ApiError;
    if (response.status === 409 || result.code === 'DOCUMENT_VERSION_CONFLICT') {
      setSaveState('conflict');
      setError('The document changed elsewhere. Reload the latest version before changing its status.');
      return;
    }
    if (!response.ok) {
      setError(messageOf(result, 'Could not update document status.'));
      setSaveState('failed');
      return;
    }
    updatedAtRef.current = result.updatedAt;
    setDocument((current) => current ? { ...current, ...result, project: current.project } : current);
    setStatus(nextStatus);
    baselineRef.current = JSON.stringify({ title: titleRef.current.trim(), content: contentRef.current, status: nextStatus });
    setSaveState('saved');
    setNotice('Document status updated.');
  }

  async function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!document || !commentText.trim() || !canReview) return;
    const response = await apiFetch(`${API_BASE}/documents/${document.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: commentText.trim() }),
    });
    const result = await response.json().catch(() => ({})) as ApiComment & ApiError;
    if (!response.ok) {
      setError(messageOf(result, 'Comment could not be added.'));
      return;
    }
    setComments((current) => [result, ...current]);
    setCommentText('');
    setNotice('Comment added.');
  }

  async function toggleCommentResolution(comment: ApiComment) {
    if (!canReview) return;
    const response = await apiFetch(`${API_BASE}/comments/${comment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: !comment.resolvedAt }),
    });
    const result = await response.json().catch(() => ({})) as ApiComment & ApiError;
    if (!response.ok) {
      setError(messageOf(result, 'Comment status could not be updated.'));
      return;
    }
    setComments((current) => current.map((item) => item.id === comment.id ? result : item));
    setNotice(result.resolvedAt ? 'Comment resolved.' : 'Comment reopened.');
  }

  async function restoreRevision(revision: ApiRevision) {
    if (!document || !canEdit) return;
    if (saveState !== 'saved') {
      setError('Save your current edits before restoring an earlier revision.');
      return;
    }
    if (!window.confirm(`Restore “${revision.title}”? The current content will be preserved as a revision.`)) return;
    const response = await apiFetch(`${API_BASE}/documents/${document.id}/revisions/${revision.id}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedUpdatedAt: updatedAtRef.current }) });
    const result = await response.json().catch(() => ({})) as ApiDocument & ApiError;
    if (response.status === 409 || result.code === 'DOCUMENT_VERSION_CONFLICT') {
      setSaveState('conflict');
      setError(messageOf(result, 'The document changed elsewhere. Reload the latest version before restoring.'));
      return;
    }
    if (!response.ok) {
      setError(messageOf(result, 'Revision could not be restored.'));
      return;
    }
    setDocument((current) => current ? { ...current, ...result, project: current.project } : current);
    setTitle(result.title);
    titleRef.current = result.title;
    setStatus(result.status);
    contentRef.current = result.content;
    updatedAtRef.current = result.updatedAt;
    baselineRef.current = JSON.stringify({ title: result.title, content: result.content, status: result.status });
    editor?.commands.setContent(result.content as never, false);
    setSaveState('saved');
    setNotice('Revision restored.');
    const refreshed = await apiFetch(`${API_BASE}/documents/${document.id}/revisions`, { cache: 'no-store' });
    if (refreshed.ok) setRevisions(await refreshed.json());
  }

  const saveLabel = useMemo(() => ({
    saved: 'Saved', dirty: 'Unsaved changes', saving: 'Saving…', failed: 'Save failed', conflict: 'Conflict detected',
  })[saveState], [saveState]);

  if (!authReady || (Boolean(token) && loading)) return <main className="editor-loading"><div className="editor-loading-mark">A</div><strong>Opening your document…</strong><span>Loading the latest saved version.</span></main>;
  if (!token) return <main className="editor-loading"><strong>Sign in to open this document</strong><button className="secondary-button" onClick={() => router.replace('/')}>Back to workspace</button></main>;

  return (
    <main className="document-editor-page">
      <header className="editor-topbar">
        <button className="editor-back" onClick={() => router.push('/documents')} aria-label="Back to documents">← <span>Documents</span></button>
        <div className="editor-breadcrumb"><span>{document?.project.name || 'Project'}</span><b>/</b><strong>{title || 'Untitled document'}</strong></div>
        <div className={'save-indicator save-' + saveState}><span />{saveLabel}</div>
        <button className="secondary-button editor-top-action" onClick={() => void loadDocument()} disabled={saving}>Reload</button>
      </header>
      {error && <div className="editor-alert" role="alert"><span>{error}</span><div>{saveState === 'conflict' && <button className="secondary-button" onClick={() => void loadDocument()}>Reload latest</button>}<button className="editor-alert-dismiss" onClick={() => setError('')} aria-label="Dismiss error">×</button></div></div>}
      {notice && <div className="editor-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div>}
      {!document ? <section className="editor-missing"><h1>Document unavailable</h1><p>{error || 'This document could not be loaded.'}</p><button className="primary-button" onClick={() => router.push('/')}>Return to workspace</button></section> : <>
        <div className="editor-workspace">
          <section className="editor-main-column">
            <div className="editor-title-area">
              <div className="editor-document-label"><span className="editor-doc-icon">▤</span><span>{document.project.name}</span><span className="editor-separator">/</span><span>Document</span></div>
              <input className="editor-title-input" value={title} maxLength={160} readOnly={!canEdit} aria-label="Document title" onChange={(event) => { titleRef.current = event.target.value; setTitle(event.target.value); }} placeholder="Untitled document" />
              <div className="editor-meta-row"><span className={'editor-status editor-status-' + status.toLowerCase().replace('_', '-')}>{status.replace('_', ' ')}</span><span>Last saved {new Date(document.updatedAt).toLocaleString()}</span><span>{role.toLowerCase()} access</span></div>
            </div>
            <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
              <button title="Bold" aria-label="Bold" disabled={!canEdit || !editor} className={editor?.isActive('bold') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleBold().run()}><strong>B</strong></button>
              <button title="Italic" aria-label="Italic" disabled={!canEdit || !editor} className={editor?.isActive('italic') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleItalic().run()}><em>I</em></button>
              <button title="Strike" aria-label="Strikethrough" disabled={!canEdit || !editor} className={editor?.isActive('strike') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleStrike().run()}><s>S</s></button>
              <button title="Inline code" aria-label="Inline code" disabled={!canEdit || !editor} className={editor?.isActive('code') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleCode().run()}>{'{}'}</button>
              <button title="Underline" aria-label="Underline" disabled={!canEdit || !editor} className={editor?.isActive('underline') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleMark('underline').run()}><u>U</u></button>
              <button title="Subscript" aria-label="Subscript" disabled={!canEdit || !editor} className={editor?.isActive('subscript') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleMark('subscript').unsetMark('superscript').run()}>x₂</button>
              <button title="Superscript" aria-label="Superscript" disabled={!canEdit || !editor} className={editor?.isActive('superscript') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleMark('superscript').unsetMark('subscript').run()}>x²</button>
              <label className="toolbar-select-control" title="Font family">
                <span className="sr-only">Font family</span>
                <select aria-label="Font family" disabled={!canEdit || !editor} defaultValue="" onChange={(event) => { const value = event.target.value; if (value) editor?.chain().focus().setMark('textStyle', { fontFamily: value }).run(); event.target.value = ''; }}>
                  <option value="" disabled>Font</option><option value="Arial, sans-serif">Arial</option><option value="Calibri, sans-serif">Calibri</option><option value="Georgia, serif">Georgia</option><option value="'Times New Roman', serif">Times New Roman</option><option value="Verdana, sans-serif">Verdana</option><option value="monospace">Monospace</option>
                </select>
              </label>
              <label className="toolbar-select-control" title="Font size">
                <span className="sr-only">Font size</span>
                <select aria-label="Font size" disabled={!canEdit || !editor} defaultValue="" onChange={(event) => { const value = event.target.value; if (value) editor?.chain().focus().setMark('textStyle', { fontSize: value }).run(); event.target.value = ''; }}>
                  <option value="" disabled>Size</option><option value="10pt">10</option><option value="11pt">11</option><option value="12pt">12</option><option value="14pt">14</option><option value="16pt">16</option><option value="18pt">18</option><option value="24pt">24</option><option value="36pt">36</option>
                </select>
              </label>
              <label className="toolbar-color-control" title="Text color">
                <span>A</span><input aria-label="Text color" type="color" disabled={!canEdit || !editor} defaultValue="#26352b" onChange={(event) => editor?.chain().focus().setMark('textStyle', { color: event.target.value }).run()} />
              </label>
              <label className="toolbar-color-control" title="Text highlight">
                <span className="highlight-letter">▰</span><input aria-label="Text highlight color" type="color" disabled={!canEdit || !editor} defaultValue="#fff29a" onChange={(event) => editor?.chain().focus().setMark('textStyle', { backgroundColor: event.target.value }).run()} />
              </label>
              <button title="Clear text styling" aria-label="Clear text styling" disabled={!canEdit || !editor} onClick={() => editor?.chain().focus().unsetMark('textStyle').unsetMark('underline').unsetMark('subscript').unsetMark('superscript').run()}>A×</button>
              <span className="toolbar-divider" />
              <span className="toolbar-divider" />
              <button title="Align left" aria-label="Align left" disabled={!canEdit || !editor} className={editor?.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph').textAlign === 'left' || !editor?.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph').textAlign ? 'is-active' : ''} onClick={() => updateParagraphLayout({ textAlign: 'left' })}>≡</button>
              <button title="Center align" aria-label="Center align" disabled={!canEdit || !editor} className={editor?.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph').textAlign === 'center' ? 'is-active' : ''} onClick={() => updateParagraphLayout({ textAlign: 'center' })}>≡</button>
              <button title="Align right" aria-label="Align right" disabled={!canEdit || !editor} className={editor?.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph').textAlign === 'right' ? 'is-active' : ''} onClick={() => updateParagraphLayout({ textAlign: 'right' })}>≡</button>
              <button title="Justify" aria-label="Justify text" disabled={!canEdit || !editor} className={editor?.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph').textAlign === 'justify' ? 'is-active' : ''} onClick={() => updateParagraphLayout({ textAlign: 'justify' })}>☰</button>
              <button title="Decrease indent" aria-label="Decrease indent" disabled={!canEdit || !editor} onClick={() => changeIndent(-1)}>⇤</button>
              <button title="Increase indent" aria-label="Increase indent" disabled={!canEdit || !editor} onClick={() => changeIndent(1)}>⇥</button>
              <label className="toolbar-select-control" title="Line spacing">
                <span className="sr-only">Line spacing</span>
                <select aria-label="Line spacing" disabled={!canEdit || !editor} defaultValue="" onChange={(event) => { const value = event.target.value; if (value) updateParagraphLayout({ lineHeight: value }); event.target.value = ''; }}>
                  <option value="" disabled>Line</option><option value="1">1.0</option><option value="1.15">1.15</option><option value="1.5">1.5</option><option value="2">2.0</option>
                </select>
              </label>
              <label className="toolbar-select-control" title="Paragraph spacing">
                <span className="sr-only">Paragraph spacing</span>
                <select aria-label="Paragraph spacing" disabled={!canEdit || !editor} defaultValue="" onChange={(event) => { const value = event.target.value; if (value) updateParagraphLayout({ paragraphSpacing: value }); event.target.value = ''; }}>
                  <option value="" disabled>After</option><option value="0">0</option><option value="0.5em">Small</option><option value="1em">Normal</option><option value="1.5em">Large</option>
                </select>
              </label>
              <label className="toolbar-color-control" title="Paragraph shading">
                <span aria-hidden="true">▧</span><input aria-label="Paragraph shading color" type="color" disabled={!canEdit || !editor} defaultValue="#edf3e4" onChange={(event) => updateParagraphLayout({ paragraphShading: event.target.value })} />
              </label>
              <button title="Toggle paragraph bottom border" aria-label="Toggle paragraph bottom border" disabled={!canEdit || !editor} onClick={toggleParagraphBorder}>▱</button>
              <span className="toolbar-divider" />
              <button title="Promote list item" aria-label="Promote list item" disabled={!canEdit || !editor || !editor.isActive('listItem')} onClick={() => editor?.chain().focus().liftListItem('listItem').run()}>⇤•</button>
              <button title="Nest list item" aria-label="Nest list item" disabled={!canEdit || !editor || !editor.isActive('listItem')} onClick={() => editor?.chain().focus().sinkListItem('listItem').run()}>⇥•</button>
              <button title="Restart numbered list at 1" aria-label="Restart numbered list at 1" disabled={!canEdit || !editor || !editor.isActive('orderedList')} onClick={() => editor?.chain().focus().updateAttributes('orderedList', { start: 1 }).run()}>1↻</button>
              <span className="toolbar-divider" />
              <label className="toolbar-select-control" title="Paper size">
                <span className="sr-only">Paper size</span>
                <select aria-label="Paper size" disabled={!canEdit || !editor} value={pageLayout?.pageSize || 'A4'} onChange={(event) => updatePageLayout('pageSize', event.target.value)}>
                  <option value="A4">A4</option><option value="Letter">Letter</option><option value="Legal">Legal</option>
                </select>
              </label>
              <label className="toolbar-select-control" title="Page orientation">
                <span className="sr-only">Page orientation</span>
                <select aria-label="Page orientation" disabled={!canEdit || !editor} value={pageLayout?.pageOrientation || 'portrait'} onChange={(event) => updatePageLayout('pageOrientation', event.target.value)}>
                  <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
                </select>
              </label>
              <label className="toolbar-select-control" title="Page margins">
                <span className="sr-only">Page margins</span>
                <select aria-label="Page margins" disabled={!canEdit || !editor} value={pageLayout?.pageMargins || 'normal'} onChange={(event) => updatePageLayout('pageMargins', event.target.value)}>
                  <option value="narrow">Narrow margins</option><option value="normal">Normal margins</option><option value="wide">Wide margins</option>
                </select>
              </label>
              <label className="toolbar-select-control" title="Page border">
                <span className="sr-only">Page border</span>
                <select aria-label="Page border" disabled={!canEdit || !editor} value={pageLayout?.pageBorder || 'none'} onChange={(event) => updatePageLayout('pageBorder', event.target.value)}>
                  <option value="none">No border</option><option value="single">Single border</option><option value="double">Double border</option>
                </select>
              </label>
              <button title="Insert page break" aria-label="Insert page break" disabled={!canEdit || !editor} onClick={insertPageBreak}>↵▱</button>
              <span className="toolbar-divider" />
              <span className="toolbar-divider" />
              <button title="Insert 3 by 3 table" aria-label="Insert table" disabled={!canEdit || !editor} onClick={insertTable}>▦ Table</button>
              <button title="Add row above" aria-label="Add row above" disabled={!canEdit || !editor || !editor.isActive('table')} onClick={() => modifyTable('row-before')}>Row ↑</button>
              <button title="Add row below" aria-label="Add row below" disabled={!canEdit || !editor || !editor.isActive('table')} onClick={() => modifyTable('row-after')}>Row ↓</button>
              <button title="Delete current row" aria-label="Delete current row" disabled={!canEdit || !editor || !editor.isActive('table')} onClick={() => modifyTable('row-delete')}>Row ×</button>
              <button title="Add column before" aria-label="Add column before" disabled={!canEdit || !editor || !editor.isActive('table')} onClick={() => modifyTable('column-before')}>Col ←</button>
              <button title="Add column after" aria-label="Add column after" disabled={!canEdit || !editor || !editor.isActive('table')} onClick={() => modifyTable('column-after')}>Col →</button>
              <button title="Delete current column" aria-label="Delete current column" disabled={!canEdit || !editor || !editor.isActive('table')} onClick={() => modifyTable('column-delete')}>Col ×</button>
              <button title="Toggle header row" aria-label="Toggle table header row" disabled={!canEdit || !editor || !editor.isActive('table')} onClick={() => modifyTable('header-toggle')}>Header</button>
              <button title="Merge current cell with cell to the right" aria-label="Merge cell right" disabled={!canEdit || !editor || !editor.isActive('table')} onClick={() => modifyTable('merge-right')}>Merge →</button>
              <button title="Split merged cell" aria-label="Split cell" disabled={!canEdit || !editor || !editor.isActive('table')} onClick={() => modifyTable('split-cell')}>Split</button>
              <label className="toolbar-select-control" title="Cell alignment"><span className="sr-only">Cell alignment</span><select aria-label="Cell alignment" disabled={!canEdit || !editor || !editor.isActive('table')} defaultValue="" onChange={(event) => { if (event.target.value) styleSelectedCells('textAlign', event.target.value); event.target.value = ''; }}><option value="" disabled>Cell align</option><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
              <label className="toolbar-color-control" title="Cell shading"><span aria-hidden="true">▧</span><input aria-label="Cell shading color" type="color" disabled={!canEdit || !editor || !editor.isActive('table')} defaultValue="#edf3e4" onChange={(event) => styleSelectedCells('backgroundColor', event.target.value)} /></label>
              <label className="toolbar-color-control" title="Cell border color"><span aria-hidden="true">▤</span><input aria-label="Cell border color" type="color" disabled={!canEdit || !editor || !editor.isActive('table')} defaultValue="#cbd5c5" onChange={(event) => styleSelectedCells('borderColor', event.target.value)} /></label>
              <span className="toolbar-divider" />
              <button title="Heading 1" aria-label="Heading 1" disabled={!canEdit || !editor} className={editor?.isActive('heading', { level: 1 }) ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
              <button title="Heading 2" aria-label="Heading 2" disabled={!canEdit || !editor} className={editor?.isActive('heading', { level: 2 }) ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
              <button title="Heading 3" aria-label="Heading 3" disabled={!canEdit || !editor} className={editor?.isActive('heading', { level: 3 }) ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
              <button title="Paragraph" aria-label="Normal paragraph" disabled={!canEdit || !editor} className={editor?.isActive('paragraph') ? 'is-active' : ''} onClick={() => editor?.chain().focus().setParagraph().run()}>¶</button>
              <span className="toolbar-divider" />
              <button title="Bullet list" aria-label="Bullet list" disabled={!canEdit || !editor} className={editor?.isActive('bulletList') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleBulletList().run()}>☷</button>
              <button title="Numbered list" aria-label="Numbered list" disabled={!canEdit || !editor} className={editor?.isActive('orderedList') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1.</button>
              <button title="Quote" aria-label="Blockquote" disabled={!canEdit || !editor} className={editor?.isActive('blockquote') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>❞</button>
              <button title="Code block" aria-label="Code block" disabled={!canEdit || !editor} className={editor?.isActive('codeBlock') ? 'is-active' : ''} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>{'{}'}</button>
              <button title="Horizontal divider" aria-label="Horizontal divider" disabled={!canEdit || !editor} onClick={() => editor?.chain().focus().setHorizontalRule().run()}>―</button>
              <button title="Clear formatting" aria-label="Clear formatting" disabled={!canEdit || !editor} onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}>Tx</button>
              <button title="Undo" aria-label="Undo" disabled={!canEdit || !editor || !editor.can().undo()} onClick={() => editor?.chain().focus().undo().run()}>↶</button>
              <button title="Redo" aria-label="Redo" disabled={!canEdit || !editor || !editor.can().redo()} onClick={() => editor?.chain().focus().redo().run()}>↷</button>
              <span className="toolbar-spacer" />
              <button className="toolbar-side-action" onClick={downloadWordDocument} disabled={!editor} title="Download a Word-compatible .doc file">↓ Word</button>
              <button className="toolbar-side-action" onClick={downloadPdf} disabled={!editor} title="Print or save this document as PDF">↓ PDF</button>
              <button className="toolbar-side-action" onClick={() => setShowHistory((value) => !value)} aria-expanded={showHistory}>◷ History</button>
              <button className="toolbar-side-action" onClick={() => setShowComments((value) => !value)} aria-expanded={showComments}>▤ Comments</button>
            </div>
            <div className={`editor-canvas page-size-${(pageLayout?.pageSize || 'A4').toLowerCase()} page-orientation-${pageLayout?.pageOrientation || 'portrait'} page-margins-${pageLayout?.pageMargins || 'normal'} page-border-${pageLayout?.pageBorder || 'none'}`}><EditorContent editor={editor} /></div>
            <footer className="editor-footer"><span>Autosaves after you pause typing</span><span>Structured document · JSON persistence</span></footer>
          </section>
          <aside className="editor-side-column">\n            <CollaborationPresence documentId={document.id} token={token} />
            {showHistory && <section className="editor-side-card"><div className="editor-side-heading"><div><h2>Version history</h2><p>Restore an earlier saved version.</p></div><button onClick={() => setShowHistory(false)} aria-label="Close history">×</button></div><div className="revision-list">{revisions.map((revision) => <article className="revision-item" key={revision.id}><span className="revision-marker" /><div><strong>{revision.title || 'Untitled version'}</strong><small>{revision.author?.displayName || 'Collaborator'} · {new Date(revision.createdAt).toLocaleString()}</small>{canEdit && <button className="revision-restore" onClick={() => void restoreRevision(revision)}>Restore version</button>}</div></article>)}{!revisions.length && <p className="editor-empty">No earlier revisions yet. A snapshot is created when content changes.</p>}</div></section>}
            {showComments && <section className="editor-side-card"><div className="editor-side-heading"><div><h2>Discussion</h2><p>Comments on this document</p></div><span className="comment-count">{comments.length}</span></div>{canReview && <form className="comment-compose" onSubmit={(event: FormEvent<HTMLFormElement>) => void addComment(event)}><label htmlFor="new-comment">Add a comment</label><textarea id="new-comment" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Share feedback or ask a question…" rows={3} maxLength={5000} /><button className="primary-button" type="submit" disabled={!commentText.trim()}>Post comment <span>→</span></button></form>}<div className="editor-comment-list">{comments.map((comment) => <article className="editor-comment" key={comment.id}><div className="comment-avatar">{(comment.author?.displayName || 'U').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div><div className="comment-content"><div className="comment-byline"><strong>{comment.author?.displayName || 'Collaborator'}</strong><time>{new Date(comment.createdAt).toLocaleDateString()}</time></div><p>{comment.body}</p>{comment.resolvedAt && <span className="resolved-label">Resolved</span>}{canReview && <button className="comment-resolve-button" onClick={() => void toggleCommentResolution(comment)}>{comment.resolvedAt ? 'Reopen' : 'Resolve'}</button>}</div></article>)}{!comments.length && <p className="editor-empty">No comments yet. Start the discussion with your team.</p>}</div></section>}
            <section className="editor-side-card editor-workflow-card"><h2>Review workflow</h2><p>Change the document status when it is ready for review.</p><label htmlFor="document-status">Document status</label><select id="document-status" value={status} disabled={!canEdit || saving || saveState !== 'saved'} onChange={(event) => void updateStatus(event.target.value as ApiDocument['status'])}><option value={status}>{status === 'IN_REVIEW' ? 'In review' : status.charAt(0) + status.slice(1).toLowerCase()}</option>{status === 'DRAFT' && <option value="IN_REVIEW">In review</option>}{status === 'IN_REVIEW' && <><option value="DRAFT">Draft</option><option value="APPROVED">Approved</option></>}{status === 'APPROVED' && <option value="DRAFT">Draft</option>}{status === 'ARCHIVED' && <option value="DRAFT">Draft</option>}{role === 'OWNER' && status !== 'ARCHIVED' && <option value="ARCHIVED">Archived</option>}</select><small>Project owners control archiving. The API enforces all role permissions.</small></section>
          </aside>
        </div>
      </>}
    </main>
  );
}
