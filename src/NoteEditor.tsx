import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

// Only whole-line date markers are formatted; all content is rendered as text.
function dateLabel(line: string) {
  return line.startsWith('**') && line.endsWith('**') && line.length > 4 ? line.slice(2, -2) : null
}

export default function NoteEditor({ value, disabled, editorRef, onChange }: {
  value: string
  disabled: boolean
  editorRef: RefObject<HTMLDivElement>
  onChange: (value: string) => void
}) {
  const renderedValue = useRef<string | null>(null)
  const dates = useRef(new Set<string>())

  useLayoutEffect(() => {
    const editor = editorRef.current
    if (!editor || value === renderedValue.current) return
    dates.current = new Set(value.split('\n').map(dateLabel).filter((date): date is string => date !== null))
    const lines = value.split('\n').map((line) => {
      const block = document.createElement('div')
      const date = dateLabel(line)
      if (date) {
        const strong = document.createElement('strong')
        strong.textContent = date
        block.append(strong)
      } else if (line) block.textContent = line
      else block.append(document.createElement('br'))
      return block
    })
    editor.replaceChildren(...lines)
    renderedValue.current = value
  }, [value, editorRef])

  function input() {
    const editor = editorRef.current
    if (!editor) return
    // Read browser-created line blocks without counting their placeholder <br> twice.
    function text(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
      if (node instanceof HTMLBRElement) return '\n'
      const children = Array.from(node.childNodes)
      if (children.length === 1 && children[0] instanceof HTMLBRElement) return ''
      return children.map((child, index) => {
        const block = child instanceof HTMLElement && ['DIV', 'P'].includes(child.tagName)
        return (block && index > 0 ? '\n' : '') + text(child)
      }).join('')
    }
    const next = text(editor).split('\n').map((line) => dates.current.has(line) ? `**${line}**` : line).join('\n')
    renderedValue.current = next
    onChange(next)
  }

  return <div id="item-note" className="note-editor" ref={editorRef} role="textbox" aria-labelledby="item-note-label" aria-multiline="true" aria-disabled={disabled} contentEditable={disabled ? false : 'plaintext-only'} suppressContentEditableWarning onInput={input} />
}
