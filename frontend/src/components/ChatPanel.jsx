/* ============================================================
   ChatPanel.jsx — Lebergott Knowledge Chat
   InfraNodus dark theme — functional, clean, no decoration
   - Messages list top, input bar bottom fixed
   - User bubbles: right-aligned, accent bg
   - Assistant bubbles: left-aligned, panel bg
   - 3-dot typing indicator
   - Error toast on failure
   - [[Wikilink]] parsing → graph navigation
   ============================================================ */

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api/v1'

// Role-based suggested questions
const SUGGESTED_QUESTIONS = {
  client: [
    'Welche Symptome deuten auf Leberprobleme hin?',
    'Was kann ich für meine Entgiftung tun?',
    'Welche Ernährung unterstützt meine Leber?',
  ],
  staff: [
    'Welche Wissenscluster sind am stärksten vernetzt?',
    'Wo sind analytische Lücken im Lebergott-Wissen?',
    'Was verbindet Ernährung und Entgiftung?',
  ],
  admin: [
    'Welche Content-Lücken gibt es im Wissensnetz?',
    'Wo entstehen neue Produkt-Ideen aus Gaps?',
    'Was sind die stärksten Brücken-Konzepte?',
  ],
  default: [
    'Wo sind die größten Wissenslücken?',
    'Welche Konzepte sind am stärksten vernetzt?',
    'Was verbindet Ernährung und Entgiftung?',
  ],
}

const WELCOME_MESSAGE = {
  role: 'assistant',
  text: 'Willkommen! Stelle mir Fragen über das Wissensnetz. Ich zeige Verbindungen, Lücken und Brücken — und verlinke relevante Konzepte im Graph.',
  nodes: [],
  gaps: [],
  followUps: [],
}

export default function ChatPanel({
  vaultId = 'lebergott',
  selectedNode,
  onNodeNavigate,
  onWikiLinkClick,
  initialContext = '',
}) {
  const { token, user } = useAuth()
  const { toast } = useToast()
  const sessionKey = useMemo(() => `lb_chat_${user?.id || 'anon'}`, [user?.id])

  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey)
      if (saved) return JSON.parse(saved)
    } catch { /* ignore */ }
    return [WELCOME_MESSAGE]
  })

  const [input, setInput]     = useState(initialContext)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  // Persist messages
  useEffect(() => {
    try { sessionStorage.setItem(sessionKey, JSON.stringify(messages)) } catch { /* ignore */ }
  }, [messages, sessionKey])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const suggestedQuestions = useMemo(() => {
    const role = user?.role || 'default'
    return SUGGESTED_QUESTIONS[role] || SUGGESTED_QUESTIONS.default
  }, [user?.role])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return

    const userMsg = { role: 'user', text: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const history = messages.slice(-10).map(m => ({ role: m.role, text: m.text }))

    const authHeaders = {}
    if (token && !token.startsWith('demo_')) {
      authHeaders['Authorization'] = `Bearer ${token}`
    }

    try {
      const res = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          vault_id: vaultId,
          question: text.trim(),
          selected_node_id: selectedNode?.id || null,
          role: user?.role || 'client',
          history,
        }),
        signal: AbortSignal.timeout(22000),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: data.answer || 'Keine Antwort gefunden.',
          nodes: data.relevant_nodes || [],
          gaps: data.gaps || [],
          bridges: data.bridges || [],
          followUps: data.follow_up_questions || [],
        }])
      } else {
        throw new Error(`HTTP ${res.status}`)
      }
    } catch (err) {
      toast.error('Verbindung unterbrochen – versuche erneut')
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: _localFallback(text.trim()),
        nodes: [],
        gaps: [],
        followUps: ['Versuche eine andere Frage'],
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleWikiClick = (label) => {
    if (onWikiLinkClick) {
      onWikiLinkClick(label)
    } else {
      onNodeNavigate?.({
        id: label.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-+|-+$/g, ''),
        label,
        cluster: null,
        connections: 0,
        is_hub: false,
        is_gap: false,
      })
    }
  }

  const showSuggested = messages.length <= 1

  return (
    <>
      <style>{TYPING_KEYFRAMES}</style>
      <div style={cs.root}>
        {/* Messages scroll area */}
        <div style={cs.messageList}>
          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              message={msg}
              onFollowUp={sendMessage}
              onNodeClick={onNodeNavigate}
              onWikiClick={handleWikiClick}
            />
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={cs.typingBubble}>
              <span style={{ ...cs.dot, animationDelay: '0ms' }} />
              <span style={{ ...cs.dot, animationDelay: '160ms' }} />
              <span style={{ ...cs.dot, animationDelay: '320ms' }} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions — shown only on empty chat */}
        {showSuggested && !loading && (
          <div style={cs.suggestions}>
            {suggestedQuestions.map((q, i) => (
              <SuggestedChip key={i} text={q} onClick={() => sendMessage(q)} />
            ))}
          </div>
        )}

        {/* Selected node context badge */}
        {selectedNode && (
          <div style={cs.nodeCtx}>
            <span style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>◆</span>
            <span>Kontext: <strong style={{ color: 'var(--accent)' }}>{selectedNode.label}</strong></span>
          </div>
        )}

        {/* Input bar — fixed at bottom */}
        <div style={cs.inputArea}>
          <div style={cs.inputRow}>
            <InputField
              inputRef={inputRef}
              value={input}
              onChange={setInput}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <SendButton onClick={() => sendMessage(input)} disabled={loading || !input.trim()} />
          </div>
        </div>
      </div>
    </>
  )
}


/* ── Typing animation keyframes ─────────────────────────────── */

const TYPING_KEYFRAMES = `
  @keyframes chat-dot-bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-5px); opacity: 1; }
  }
`


/* ── Suggested chip ─────────────────────────────────────────── */

function SuggestedChip({ text, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '5px 12px',
        background: hover ? 'var(--bg-card-hover)' : 'transparent',
        border: `1px solid ${hover ? 'var(--border-focus)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-full)',
        fontSize: '0.72rem',
        color: hover ? 'var(--text)' : 'var(--text-muted)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {text}
    </button>
  )
}


/* ── Input field ────────────────────────────────────────────── */

function InputField({ inputRef, value, onChange, onKeyDown, disabled }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder="Stelle eine Frage zum Lebergott-Wissen..."
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        flex: 1,
        padding: '10px 14px',
        background: 'var(--bg-card)',
        border: `1px solid ${focused ? 'var(--border-focus)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        color: 'var(--text)',
        fontSize: '0.83rem',
        fontFamily: 'var(--font-sans)',
        outline: 'none',
        transition: 'border-color var(--transition-fast)',
        boxShadow: focused ? '0 0 0 2px rgba(0,212,255,0.08)' : 'none',
      }}
    />
  )
}


/* ── Send button ────────────────────────────────────────────── */

function SendButton({ onClick, disabled }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '10px 16px',
        background: disabled ? 'var(--bg-card)' : hover ? 'rgba(0,212,255,0.2)' : 'rgba(0,212,255,0.1)',
        border: `1px solid ${disabled ? 'var(--border)' : 'rgba(0,212,255,0.3)'}`,
        borderRadius: 'var(--radius-md)',
        color: disabled ? 'var(--text-dim)' : 'var(--accent)',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all var(--transition-fast)',
        flexShrink: 0,
      }}
    >
      →
    </button>
  )
}


/* ── Individual chat message ────────────────────────────────── */

function ChatMessage({ message, onFollowUp, onNodeClick, onWikiClick }) {
  const isUser = message.role === 'user'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '88%',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
    }}>
      {/* Message bubble */}
      <div style={{
        padding: '10px 14px',
        background: isUser ? 'rgba(0,212,255,0.1)' : 'var(--bg-panel)',
        border: `1px solid ${isUser ? 'rgba(0,212,255,0.25)' : 'var(--border)'}`,
        borderRadius: isUser ? '12px 12px 3px 12px' : '3px 12px 12px 12px',
        fontSize: '0.82rem',
        color: 'var(--text)',
        lineHeight: 1.65,
      }}>
        <RenderMarkdown text={message.text} onWikiClick={onWikiClick} isUser={isUser} />
      </div>

      {/* Relevant nodes (clickable chips) */}
      {message.nodes?.length > 0 && (
        <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {message.nodes.map(node => (
            <NodeChip key={node.id} node={node} onClick={() => onNodeClick?.(node)} />
          ))}
        </div>
      )}

      {/* Follow-up questions */}
      {!isUser && message.followUps?.length > 0 && (
        <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {message.followUps.map((q, i) => (
            <FollowUpChip key={i} text={q} onClick={() => onFollowUp?.(q)} />
          ))}
        </div>
      )}
    </div>
  )
}


/* ── Node chip ──────────────────────────────────────────────── */

function NodeChip({ node, onClick }) {
  const [hover, setHover] = useState(false)
  const isGap = node.is_gap
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '3px 9px',
        background: hover
          ? (isGap ? 'rgba(245,158,11,0.12)' : 'rgba(0,212,255,0.08)')
          : 'transparent',
        border: `1px solid ${isGap ? 'rgba(245,158,11,0.3)' : 'rgba(0,212,255,0.2)'}`,
        borderRadius: 'var(--radius-full)',
        fontSize: '0.68rem',
        color: isGap ? 'var(--warning)' : 'var(--accent)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontWeight: 500,
        transition: 'all var(--transition-fast)',
      }}
    >
      {isGap ? '◇' : '◆'} {node.label}
    </button>
  )
}


/* ── Follow-up chip ─────────────────────────────────────────── */

function FollowUpChip({ text, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: 'left',
        padding: '4px 10px',
        background: hover ? 'var(--bg-card)' : 'transparent',
        border: `1px solid ${hover ? 'var(--border-focus)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-full)',
        fontSize: '0.7rem',
        color: hover ? 'var(--text)' : 'var(--text-muted)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap',
      }}
    >
      → {text}
    </button>
  )
}


/* ── Markdown + Wikilink renderer ───────────────────────────── */

function RenderMarkdown({ text, onWikiClick }) {
  if (!text) return null

  return (
    <div>
      {text.split('\n').map((line, lineIdx) => {
        // Blockquote
        if (line.startsWith('> ')) {
          return (
            <div key={lineIdx} style={{
              borderLeft: '2px solid var(--border-focus)',
              paddingLeft: '10px',
              margin: '4px 0',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              fontSize: '0.78rem',
            }}>
              {parseInline(line.slice(2), onWikiClick)}
            </div>
          )
        }

        // Warning callout
        if (line.includes('⚠️')) {
          return (
            <div key={lineIdx} style={{
              padding: '5px 10px',
              background: 'rgba(245,158,11,0.06)',
              borderRadius: 'var(--radius-sm)',
              margin: '3px 0',
              fontSize: '0.78rem',
            }}>
              {parseInline(line, onWikiClick)}
            </div>
          )
        }

        // Numbered list item
        if (/^\d+\.\s/.test(line)) {
          return (
            <div key={lineIdx} style={{ display: 'flex', gap: '6px', margin: '2px 0' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>
                {line.match(/^\d+/)[0]}.
              </span>
              <span>{parseInline(line.replace(/^\d+\.\s*/, ''), onWikiClick)}</span>
            </div>
          )
        }

        // Empty line → spacing
        if (!line.trim()) {
          return <div key={lineIdx} style={{ height: '6px' }} />
        }

        return (
          <div key={lineIdx}>
            {parseInline(line, onWikiClick)}
          </div>
        )
      })}
    </div>
  )
}


/* ── Inline parser: [[wikilinks]] + **bold** ────────────────── */

function parseInline(text, onWikiClick) {
  const segments = []
  let last = 0
  const re = /\[\[([^\]]+)\]\]/g
  let m

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: 'text', value: text.slice(last, m.index) })
    segments.push({ type: 'wiki', value: m[1] })
    last = re.lastIndex
  }
  if (last < text.length) segments.push({ type: 'text', value: text.slice(last) })

  return segments.flatMap((seg, si) => {
    if (seg.type === 'wiki') {
      return [<WikiLink key={`wiki-${si}`} label={seg.value} onClick={() => onWikiClick?.(seg.value)} />]
    }
    return seg.value.split(/(\*\*[^*]+\*\*)/g).map((part, pi) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`bold-${si}-${pi}`} style={{ color: 'var(--text)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
      }
      return <span key={`text-${si}-${pi}`}>{part}</span>
    })
  })
}


/* ── WikiLink anchor ────────────────────────────────────────── */

function WikiLink({ label, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <a
      href="#"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={e => { e.preventDefault(); onClick?.() }}
      style={{
        color: hover ? 'var(--accent)' : 'rgba(0,212,255,0.7)',
        textDecoration: 'none',
        borderBottom: `1px solid ${hover ? 'var(--accent)' : 'rgba(0,212,255,0.3)'}`,
        fontSize: '0.85em',
        transition: 'all var(--transition-fast)',
        cursor: 'pointer',
      }}
    >
      {label}
    </a>
  )
}


/* ── Styles ─────────────────────────────────────────────────── */

const cs = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--bg)',
    fontFamily: 'var(--font-sans)',
    overflow: 'hidden',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--border) transparent',
  },
  typingBubble: {
    alignSelf: 'flex-start',
    padding: '10px 14px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: '3px 12px 12px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  dot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--text-muted)',
    animation: 'chat-dot-bounce 1.1s infinite ease-in-out',
  },
  suggestions: {
    padding: '8px 16px',
    borderTop: '1px solid var(--border-muted)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    background: 'var(--bg)',
  },
  nodeCtx: {
    padding: '6px 16px',
    borderTop: '1px solid var(--border-muted)',
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-sans)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--bg)',
  },
  inputArea: {
    padding: '10px 16px 12px',
    borderTop: '1px solid var(--border)',
    background: 'var(--bg)',
    flexShrink: 0,
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
}


/* ── Local fallback ─────────────────────────────────────────── */

function _localFallback(question) {
  const q = question.toLowerCase()

  if (q.includes('lücke') || q.includes('gap') || q.includes('fehlt')) {
    return (
      '**4 Wissenslücken** gefunden:\n\n' +
      '1. **[[Epigenetik & Leber]]** — fehlt komplett\n' +
      '2. **[[Darm-Leber-Achse]]** — unterrepräsentiert\n' +
      '3. **[[Chronobiologie Detox]]** — kein Cluster\n' +
      '4. **[[Fastenprotokolle]]** — nicht verankert'
    )
  }
  if (q.includes('hub') || q.includes('zentral') || q.includes('vernetzt')) {
    return (
      '**Top Hub-Knoten:**\n\n' +
      '1. **[[Leber heißt Leben]]** — 77 Verbindungen\n' +
      '2. **[[Selbstheilungskraft]]** — 54 Verbindungen\n' +
      '3. **[[Entgiftung]]** — 48 Verbindungen\n' +
      '4. **[[Darmgesundheit]]** — 43 Verbindungen'
    )
  }
  if (q.includes('entgiftung') || q.includes('detox') || q.includes('müdigkeit')) {
    return (
      '[[Entgiftung]] ist zentral im Lebergott-Wissen.\n\n' +
      '> Die Leber entgiftet in zwei Phasen — Phase I aktiviert Toxine, Phase II neutralisiert sie.\n\n' +
      'Verwandte Konzepte: [[Schwermetalle]], [[Darmgesundheit]], [[Mariendistel]], [[Wasser]].'
    )
  }
  return (
    'Backend nicht erreichbar. Starte es mit:\n\n' +
    '`uvicorn backend.main:app --reload`\n\n' +
    'Versuche: [[Entgiftung]], [[Leber heißt Leben]], [[Mariendistel]]'
  )
}
