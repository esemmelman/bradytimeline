import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, LoaderCircle, RotateCcw, Trash2 } from 'lucide-react'
import { supabase } from './supabase'

export default function ItemNotes({ item, onClose }: {
  item: { item_key: string; label: string }
  onClose: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const latestBody = useRef('')
  const savedBody = useRef('')
  const pendingSave = useRef<Promise<boolean> | null>(null)
  const active = useRef(true)
  const [body, setBody] = useState('')
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState('')
  const dirty = body !== original

  useEffect(() => {
    active.current = true
    let cancelled = false
    void (async () => {
      try {
        const { data, error: readError } = await supabase.from('brady_status_notes_v1')
          .select('body').eq('item_key', item.item_key).maybeSingle()
        if (readError) throw readError
        if (!cancelled) {
          latestBody.current = savedBody.current = data?.body ?? ''
          setBody(latestBody.current)
          setOriginal(savedBody.current)
        }
      } catch {
        if (!cancelled) { setError('Notes could not be loaded. Return to the sheet and try again.'); setLoadFailed(true) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true; active.current = false }
  }, [item.item_key])

  // Serialize writes so a slow response can never overwrite a newer draft.
  const save = useCallback((): Promise<boolean> => {
    if (pendingSave.current) return pendingSave.current
    if (!active.current || loading || loadFailed) return Promise.resolve(false)
    if (latestBody.current === savedBody.current) return Promise.resolve(true)
    setSaving(true)
    setError('')
    const request = (async () => {
      try {
        while (active.current && latestBody.current !== savedBody.current) {
          const snapshot = latestBody.current
          const { error: saveError } = await supabase.from('brady_status_notes_v1')
            .upsert({ item_key: item.item_key, body: snapshot }, { onConflict: 'item_key' })
          if (saveError) throw saveError
          savedBody.current = snapshot
          if (active.current) setOriginal(snapshot)
        }
        return active.current
      } catch {
        if (active.current) setError('Your note could not be saved. Your changes are still here. Try again.')
        return false
      } finally {
        pendingSave.current = null
        if (active.current) setSaving(false)
      }
    })()
    pendingSave.current = request
    return request
  }, [item.item_key, loading, loadFailed])

  useEffect(() => {
    if (!dirty || loading || loadFailed || error) return
    const timer = window.setTimeout(() => { void save() }, 600)
    return () => window.clearTimeout(timer)
  }, [body, dirty, loading, loadFailed, error, save])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function changeBody(value: string) {
    latestBody.current = value
    setBody(value)
    setError('')
  }

  async function close() {
    if (loading || loadFailed) { onClose(); return }
    setClosing(true)
    if (await save()) onClose()
    else if (active.current) setClosing(false)
  }

  function insertDate() {
    const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    const content = latestBody.current.trimEnd()
    const next = (content ? content + '\n\n\n' : '') + date + '\n'
    changeBody(next)
    requestAnimationFrame(() => {
      const field = textareaRef.current
      field?.focus()
      field?.setSelectionRange(next.length, next.length)
      if (field) field.scrollTop = field.scrollHeight
    })
  }

  return <main className="notes-page">
    <section className="notes-card" aria-labelledby="note-title">
      <button className="button button-light" onClick={() => void close()} disabled={closing}><ArrowLeft size={16} /> Back to sheet</button>
      <p className="eyebrow">Private editor notes</p>
      <h1 id="note-title">{item.label}</h1>
      {error && <p className="error-banner" role="alert">{error}</p>}
      {loading ? <p role="status"><LoaderCircle className="spin" size={16} /> Loading notes…</p> : <>
        <div className="notes-toolbar" role="toolbar" aria-label="Note tools">
          <button className="button button-light" onClick={insertDate} disabled={closing || loadFailed}><CalendarDays size={16} /> Insert date</button>
          <button className="button button-light" onClick={() => changeBody('')} disabled={closing || loadFailed || !body}><Trash2 size={16} /> Clear</button>
        </div>
        <label htmlFor="item-note">Notes</label>
        <textarea id="item-note" ref={textareaRef} autoFocus value={body} onChange={(event) => changeBody(event.target.value)} disabled={closing || loadFailed} placeholder="Add practice notes for this prayer or reading…" />
        <div className="notes-actions">
          {error && !loadFailed && <button className="button button-light" onClick={() => void save()} disabled={saving || closing}><RotateCcw size={16} /> Retry saving</button>}
          <span role="status">{loadFailed ? '' : error ? 'Not saved' : saving ? 'Saving…' : dirty ? 'Waiting to save…' : 'All changes saved automatically'}</span>
        </div>
      </>}
    </section>
  </main>
}
