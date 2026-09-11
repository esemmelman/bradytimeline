import { FormEvent, useEffect, useRef, useState } from 'react'
import { Check, Eye, KeyRound, LoaderCircle, Lock, LogOut, RotateCcw, X } from 'lucide-react'
import { editorEmail, supabase } from './supabase'
import ItemNotes from './ItemNotes'

type Status = 'red' | 'yellow' | 'green'
type Item = { item_key: string; label: string; sort_order: number }
type DateColumn = { date_key: string; label: string; sort_order: number }
type Cell = { item_key: string; date_key: string; status: Status }

const choices: { value: Status | null; label: string }[] = [
  { value: 'red', label: 'Needs work' },
  { value: 'yellow', label: 'In progress' },
  { value: 'green', label: 'Ready' },
  { value: null, label: 'Clear' },
]

const keyFor = (item: string, date: string) => `${item}::${date}`

function dateFromKey(dateKey: string) {
  const [month, day] = dateKey.split('-').map(Number)
  return new Date(2026, month - 1, day)
}

function isEarlierThanCurrentWeek(dateKey: string) {
  const today = new Date()
  const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dayFromMonday = (startOfWeek.getDay() + 6) % 7
  startOfWeek.setDate(startOfWeek.getDate() - dayFromMonday)
  const oneWeekBefore = new Date(startOfWeek)
  oneWeekBefore.setDate(oneWeekBefore.getDate() - 7)
  return dateFromKey(dateKey) < oneWeekBefore
}

function daysFromColumnUntilEvent(dateKey: string) {
  const columnDate = dateFromKey(dateKey)
  const eventDate = new Date(2026, 11, 12)
  return Math.max(0, Math.round((eventDate.getTime() - columnDate.getTime()) / 86_400_000))
}

export default function App() {
  const tableFrameRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [dates, setDates] = useState<DateColumn[]>([])
  const [cells, setCells] = useState<Record<string, Status>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [selected, setSelected] = useState<Status | null>('green')
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [noteItem, setNoteItem] = useState<Item | null>(null)

  async function loadSheet() {
    const [itemsResult, datesResult, cellsResult] = await Promise.all([
      supabase.from('brady_status_items_v1').select('*').order('sort_order'),
      supabase.from('brady_status_dates_v1').select('*').order('sort_order'),
      supabase.from('brady_status_cells_v1').select('item_key,date_key,status'),
    ])
    const firstError = itemsResult.error || datesResult.error || cellsResult.error
    if (firstError) throw firstError
    setItems(itemsResult.data as Item[])
    setDates(datesResult.data as DateColumn[])
    setCells(Object.fromEntries((cellsResult.data as Cell[]).map((cell) => [keyFor(cell.item_key, cell.date_key), cell.status])))
  }

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setEditor(data.session?.user.email === editorEmail)
        await loadSheet()
      } catch {
        setError('The status sheet could not be loaded. Please refresh and try again.')
      } finally {
        setLoading(false)
      }
    })()

    const channel = supabase.channel('brady-status-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brady_status_cells_v1' }, () => void loadSheet())
      .subscribe()
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEditor(session?.user.email === editorEmail)
      if (session?.user.email !== editorEmail) setNoteItem(null)
    })
    return () => { void supabase.removeChannel(channel); authListener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (loading || !dates.length) return
    const openingDateKey = '09-07'
    const positionAtOpeningDate = () => {
      const frame = tableFrameRef.current
      const firstHeading = frame?.querySelector<HTMLElement>('.date-heading')
      const openingIndex = dates.findIndex((date) => date.date_key === openingDateKey)
      if (frame && firstHeading && openingIndex >= 0) {
        frame.scrollLeft = openingIndex * firstHeading.offsetWidth
      }
    }
    const animationFrame = requestAnimationFrame(positionAtOpeningDate)
    const restorationTimer = window.setTimeout(positionAtOpeningDate, 250)
    const finalTimer = window.setTimeout(positionAtOpeningDate, 750)
    return () => {
      cancelAnimationFrame(animationFrame)
      window.clearTimeout(restorationTimer)
      window.clearTimeout(finalTimer)
    }
  }, [dates, loading])

  async function signIn(event: FormEvent) {
    event.preventDefault()
    if (!passcode) return
    setSigningIn(true)
    setLoginError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email: editorEmail, password: passcode })
    setSigningIn(false)
    if (authError) {
      setLoginError('That passcode didn’t work. Please try again.')
      return
    }
    setPasscode('')
    setLoginOpen(false)
  }

  async function updateCell(itemKey: string, dateKey: string) {
    if (!editor) return
    const mapKey = keyFor(itemKey, dateKey)
    const previous = cells[mapKey]
    setCells((current) => {
      const next = { ...current }
      if (selected) next[mapKey] = selected
      else delete next[mapKey]
      return next
    })
    setSaving(mapKey)
    const result = selected
      ? await supabase.from('brady_status_cells_v1').upsert({ item_key: itemKey, date_key: dateKey, status: selected }, { onConflict: 'item_key,date_key' })
      : await supabase.from('brady_status_cells_v1').delete().eq('item_key', itemKey).eq('date_key', dateKey)
    setSaving(null)
    if (result.error) {
      setCells((current) => {
        const next = { ...current }
        if (previous) next[mapKey] = previous
        else delete next[mapKey]
        return next
      })
      setError('That change was not saved. Please try again.')
    } else {
      setSaved(mapKey)
      window.setTimeout(() => setSaved(null), 900)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setEditor(false)
    setNoteItem(null)
  }

  if (editor && noteItem) {
    return <ItemNotes key={noteItem.item_key} item={noteItem} onClose={() => setNoteItem(null)} />
  }

  return (
    <main>
      <section className="sheet-section">
        <div className="sheet-heading">
          <div className="sheet-title">
            <h2>Brady’s progress sheet</h2>
          </div>
          <div className="sheet-actions">
            {!editor && <div className="view-badge"><Eye size={15} /> View only</div>}
            {editor ? (
              <button className="button button-light" onClick={signOut}><LogOut size={16} /> Exit editing</button>
            ) : (
              <button className="button button-dark" onClick={() => setLoginOpen(true)}><KeyRound size={16} /> Editor access</button>
            )}
            <span className="version">v1.2.0</span>
          </div>
        </div>

        <div className="legend">
          {choices.slice(0, 3).map((choice) => <span key={choice.label}><i className={`dot ${choice.value}`} />{choice.label}</span>)}
        </div>

        {editor && (
          <div className="editor-tools">
            <div><strong>Editing is on</strong><small>Choose a color, then select cells. Select a prayer or reading to edit its notes.</small></div>
            <div className="palette" role="toolbar" aria-label="Cell color">
              {choices.map((choice) => (
                <button key={choice.label} className={`palette-choice ${selected === choice.value ? 'selected' : ''}`} onClick={() => setSelected(choice.value)} title={choice.label} aria-label={choice.label}>
                  {choice.value ? <i className={`swatch ${choice.value}`} /> : <RotateCcw size={17} />}
                  <span>{choice.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="error-banner">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={16} /></button></div>}

        <div className="table-frame" ref={tableFrameRef}>
          {loading ? <div className="loading"><LoaderCircle className="spin" /> Loading the sheet…</div> : (
            <div className="table-scroll-content"><table>
              <thead>
                <tr className="countdown-row">
                  <th className="skill-heading" rowSpan={2}>Prayer &amp; reading</th>
                  {dates.map((date, index) => <th className={`countdown-heading ${isEarlierThanCurrentWeek(date.date_key) ? 'past-week' : ''}`} key={date.date_key}>{dates.length - index}</th>)}
                </tr>
                <tr className="date-row">
                  {dates.map((date) => <th className={`date-heading ${isEarlierThanCurrentWeek(date.date_key) ? 'past-week' : ''}`} data-date-key={date.date_key} key={date.date_key} title={`${daysFromColumnUntilEvent(date.date_key)} days from ${date.label} until 12/12/2026`}>{date.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.item_key}>
                    <th scope="row">{editor ? <button className="item-notes-link" onClick={() => { if (editor) setNoteItem(item) }} aria-label={`Open notes for ${item.label}`}>{item.label}</button> : item.label}</th>
                    {dates.map((date) => {
                      const mapKey = keyFor(item.item_key, date.date_key)
                      const status = cells[mapKey]
                      return <td className={isEarlierThanCurrentWeek(date.date_key) ? 'past-week' : ''} key={date.date_key}>
                        <button className={`cell ${status ?? 'empty'} ${editor ? 'editable' : ''}`} disabled={!editor || saving === mapKey} onClick={() => void updateCell(item.item_key, date.date_key)} aria-label={`${item.label}, ${date.label}: ${status ?? 'not marked'}`}>
                          {saving === mapKey && <LoaderCircle className="spin" size={14} />}
                          {saved === mapKey && <Check size={15} />}
                        </button>
                      </td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table><div className="scroll-space" aria-hidden="true" /></div>
          )}
        </div>
        <p className="scroll-note">Swipe sideways to see every week →</p>
      </section>

      <footer>Made for steady progress, one week at a time.</footer>

      {loginOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setLoginOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setLoginOpen(false)} aria-label="Close"><X size={20} /></button>
            <div className="lock-icon"><Lock size={22} /></div>
            <p className="eyebrow">Private editing</p>
            <h2 id="login-title">Enter your passcode</h2>
            <p>Viewing is open to everyone. Your passcode unlocks the color tools and private item notes.</p>
            <form onSubmit={signIn}>
              <label htmlFor="passcode">Passcode</label>
              <input id="passcode" type="password" autoFocus autoComplete="current-password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="••••••••" />
              {loginError && <span className="form-error">{loginError}</span>}
              <button className="button button-dark full" disabled={signingIn || !passcode}>{signingIn ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />} Unlock editing</button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
