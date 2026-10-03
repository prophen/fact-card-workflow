'use client'
import { useState } from 'react'
export function CopyCaption({ caption }: { caption: string }) {
  const [message, setMessage] = useState('')
  async function copy() {
    try {
      await navigator.clipboard.writeText(caption)
      setMessage('Caption copied')
    } catch {
      setMessage('Select the caption text to copy it.')
    }
  }
  return (
    <div className="copy-control">
      <button className="text-button" onClick={copy}>
        Copy caption <span aria-hidden="true">⧉</span>
      </button>
      <span role="status">{message}</span>
    </div>
  )
}
