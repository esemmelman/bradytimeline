import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, LoaderCircle, Save, Trash2, X } from 'lucide-react'
import { supabase } from './supabase'

export default function ItemNotes({ item, onClose }: {
  item: { item_key: string; label: string }
  onClose: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [body, setBody] = useState('')
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const dirty = body !== original

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { data, error: readError } = await supabase.from('brady_status_notes_v1')
          .select('body').eq('item_key', item.item_key).maybeSingle()
        if (readError) throw readError
        if (active) { setBody(data?.body ?? ''); setOriginal(data?.body ?? '') }
      } catch {
        if (active) { setError('Notes could not be loaded. Return to the sheet and try again.'); setLoadFailed(true) }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [item.item_key])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function close() {
    if (!dirty || window.confirm('Discard unsaved changes to this note?')) onClose()
  }

  function insertDate() {
    const field = textareaRef.current
    const start = field?.selectionStart ?? body.length
    const end = field?.selectionEnd ?? start
    const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    setBody(body.slice(0, start) + date + '\n' + body.slice(end))
    setSaved(false)
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + date.length + 1, start + date.length + 1) })
  }

  async function save() {
    if (loading || loadFailed || saving) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const { error: saveError } = await supabase.from('brady_status_notes_v1')
        .upsert({ item_key: item.item_key, body }, { onConflict: 'item_key' })
      if (saveError) throw saveError
      setOriginal(body)
      setSaved(true)
    } catch {
      setError('Your note was not saved. Please try again. Your changes are still here.')
    } finally { setSaving(false) }
  }

  return <main className="notes-page">
    <section className="notes-card" aria-labelledby="note-title">
      <button className="button button-light" onClick={close} disabled={saving}><ArrowLeft size={16} /> Back to sheet</button>
      <p className="eyebrow">Private editor notes</p>
      <h1 id="note-title">{item.label}</h1>
      {error && <p className="error-banner" role="alert">{error}</p>}
      {loading ? <p role="status"><LoaderCircle className="spin" size={16} /> Loading notes…</p> : <>
        <div className="notes-toolbar" role="toolbar" aria-label="Note tools">
          <button className="button button-light" onClick={insertDate} disabled={saving || loadFailed}><CalendarDays size={16} /> Insert date</button>
          <button className="button button-light" onClick={() => { setBody(''); setSaved(false) }} disabled={saving || loadFailed || !body}><Trash2 size={16} /> Clear</button>
        </div>
        <label htmlFor="item-note">Notes</label>
        <textarea id="item-note" ref={textareaRef} autoFocus value={body} onChange={(event) => { setBody(event.target.value); setSaved(false) }} disabled={saving || loadFailed} placeholder="Add practice notes for this prayer or reading…" />
        <div className="notes-actions">
          <button className="button button-dark" onClick={() => void save()} disabled={saving || loadFailed || !dirty}>{saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} {saving ? 'Saving…' : 'Save'}</button>
          <button className="button button-light" onClick={close} disabled={saving}><X size={16} /> Cancel</button>
          <span role="status">{saved ? 'Saved' : dirty ? 'Unsaved changes' : ''}</span>
        </div>
      </>}
    </section>
  </main>
}
