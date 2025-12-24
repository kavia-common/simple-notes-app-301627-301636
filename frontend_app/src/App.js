import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

// Types
/**
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} title
 * @property {string} content
 * @property {number} updatedAt
 */

// Utilities
const STORAGE_KEY = 'simple-notes-app.notes.v1';

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(n => ({ ...n, updatedAt: Number(n.updatedAt) || Date.now() }));
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // no-op
  }
}

function formatDateTime(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

// Components

// PUBLIC_INTERFACE
function Header({ query, onQueryChange, onAddClick }) {
  /** Accessible header with search and add button. */
  return (
    <header className="sn-header" role="banner">
      <div className="sn-header-inner">
        <h1 className="sn-title">Simple Notes</h1>
        <div className="sn-actions">
          <div className="sn-search">
            <label htmlFor="search" className="sr-only">Search notes</label>
            <input
              id="search"
              type="search"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder="Search by title…"
              aria-label="Search notes by title"
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={onAddClick}
            aria-label="Add a new note"
          >
            + Add note
          </button>
        </div>
      </div>
    </header>
  );
}

// PUBLIC_INTERFACE
function NotesList({ notes, onEdit, onDelete }) {
  /** List of notes with keyboard accessible actions. */
  if (notes.length === 0) {
    return (
      <div className="sn-empty" role="status" aria-live="polite">
        <div className="sn-empty-card">
          <p className="sn-empty-title">No notes yet</p>
          <p className="sn-empty-subtitle">Click “Add note” to create your first note.</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="sn-list" role="list">
      {notes.map(note => (
        <NoteItem
          key={note.id}
          note={note}
          onEdit={() => onEdit(note)}
          onDelete={() => onDelete(note)}
        />
      ))}
    </ul>
  );
}

// PUBLIC_INTERFACE
function NoteItem({ note, onEdit, onDelete }) {
  /** A single note item entry. */
  return (
    <li className="sn-item" role="listitem">
      <div className="sn-item-main" onClick={onEdit} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(); } }}
        aria-label={`Edit note ${note.title || 'untitled'}`}>
        <h3 className="sn-item-title">{note.title || 'Untitled'}</h3>
        <p className="sn-item-content">{note.content ? truncate(note.content, 180) : 'No content'}</p>
      </div>
      <div className="sn-item-meta">
        <span className="sn-item-date" aria-label={`Last updated ${formatDateTime(note.updatedAt)}`}>
          Updated {timeAgo(note.updatedAt)}
        </span>
        <div className="sn-item-actions">
          <button className="btn btn-outline" onClick={onEdit} aria-label={`Edit note ${note.title || 'untitled'}`}>Edit</button>
          <button className="btn btn-danger" onClick={onDelete} aria-label={`Delete note ${note.title || 'untitled'}`}>Delete</button>
        </div>
      </div>
    </li>
  );
}

function truncate(text, n) {
  if (!text) return '';
  if (text.length <= n) return text;
  return text.slice(0, n - 1) + '…';
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return formatDateTime(ts);
}

// PUBLIC_INTERFACE
function NoteEditor({ isOpen, initialNote, onCancel, onSave }) {
  /**
   * Accessible modal editor for adding/editing a note.
   * Keyboard:
   * - Enter + meta/ctrl to save
   * - Escape to cancel
   */
  const [title, setTitle] = useState(initialNote?.title || '');
  const [content, setContent] = useState(initialNote?.content || '');
  const titleRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialNote?.title || '');
      setContent(initialNote?.content || '');
      // focus title on open
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [isOpen, initialNote]);

  useEffect(() => {
    function onKeydown(e) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [isOpen, title, content, onCancel]);

  function handleSave() {
    const next = {
      ...(initialNote || {}),
      title: title.trim(),
      content: content.trim(),
    };
    onSave(next);
  }

  if (!isOpen) return null;

  return (
    <div className="sn-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <div className="sn-modal" ref={dialogRef}>
        <div className="sn-modal-header">
          <h2 id="editor-title">{initialNote ? 'Edit note' : 'Add note'}</h2>
        </div>
        <div className="sn-modal-body">
          <div className="field">
            <label htmlFor="note-title">Title</label>
            <input
              id="note-title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
            />
          </div>
          <div className="field">
            <label htmlFor="note-content">Content</label>
            <textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note…"
              rows={8}
            />
          </div>
        </div>
        <div className="sn-modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancel (Esc)</button>
          <button className="btn btn-success" onClick={handleSave}>
            {initialNote ? 'Save changes' : 'Add note'} (⌘/Ctrl+Enter)
          </button>
        </div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function ConfirmDialog({ isOpen, message, onCancel, onConfirm }) {
  /** Lightweight confirmation modal for delete. */
  if (!isOpen) return null;
  return (
    <div className="sn-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="sn-modal">
        <div className="sn-modal-header">
          <h2 id="confirm-title">Delete note</h2>
        </div>
        <div className="sn-modal-body">
          <p>{message}</p>
        </div>
        <div className="sn-modal-footer">
          <button className="btn btn-outline" onClick={onCancel} autoFocus>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** Main Application UI for Simple Notes. */
  const [notes, setNotes] = useState(() => loadNotes());
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // Persist notes
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  // Derived: filtered + sorted list
  const visibleNotes = useMemo(() => {
    const lower = query.trim().toLowerCase();
    let out = notes;
    if (lower) {
      out = out.filter(n => (n.title || '').toLowerCase().includes(lower));
    }
    // sort by updatedAt desc
    out = [...out].sort((a, b) => b.updatedAt - a.updatedAt);
    return out;
  }, [notes, query]);

  function openAdd() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(note) {
    setEditing(note);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
  }

  function handleSave(noteDraft) {
    const now = Date.now();
    if (noteDraft.id) {
      // update
      setNotes(prev =>
        prev.map(n => (n.id === noteDraft.id ? { ...n, ...noteDraft, updatedAt: now } : n))
      );
    } else {
      const id = cryptoRandomString();
      const created = { id, title: noteDraft.title || '', content: noteDraft.content || '', updatedAt: now };
      setNotes(prev => [created, ...prev]);
    }
    closeEditor();
  }

  function requestDelete(note) {
    setToDelete(note);
    setConfirmOpen(true);
  }

  function cancelDelete() {
    setConfirmOpen(false);
    setToDelete(null);
  }

  function confirmDelete() {
    if (toDelete) {
      setNotes(prev => prev.filter(n => n.id !== toDelete.id));
    }
    cancelDelete();
  }

  // Keyboard shortcut: 'a' to add when not editing
  useEffect(() => {
    function onKeydown(e) {
      if (editorOpen) return;
      if ((e.key.toLowerCase() === 'a') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        openAdd();
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [editorOpen]);

  return (
    <div className="sn-app">
      <Header query={query} onQueryChange={setQuery} onAddClick={openAdd} />
      <main className="sn-main" role="main">
        <div className="sn-toolbar" aria-label="Filters and sorting">
          <p className="sn-count" aria-live="polite">{visibleNotes.length} {visibleNotes.length === 1 ? 'note' : 'notes'}</p>
        </div>
        <NotesList notes={visibleNotes} onEdit={openEdit} onDelete={requestDelete} />
      </main>

      <NoteEditor
        isOpen={editorOpen}
        initialNote={editing}
        onCancel={closeEditor}
        onSave={handleSave}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        message={`Are you sure you want to delete “${toDelete?.title || 'Untitled'}”? This action cannot be undone.`}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function cryptoRandomString() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default App;
