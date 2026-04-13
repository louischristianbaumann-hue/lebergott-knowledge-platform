/* ============================================================
   ChatPanel.jsx — Lebergott Knowledge Chat
   - Lebergott brand colors (cream/forest/gold) throughout
   - [[Wikilink]] parsing → clickable gold buttons → graph navigation
   - Role-aware suggested questions
   - Chat history in sessionStorage
   - Typing indicator (gold dots)
   ============================================================ */

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const LB = {
  forest:    '#1a3a2a',
  forestDp:  '#0f2418',
  gold:      '#c5a55a',
  goldDim:   '#9e8648',
  goldGlow:  'rgba(197,165,90,0.12)',
  goldBorder:'rgba(197,165,90,0.28)',
  cream:     '#faf9f5',
  creamDim:  '#f0ede4',
  creamBrd:  'rgba(26,58,42,0.10)',
  text:      '#2c2c2a',
  textMid:   '#4a6a4a',
  textLight: '#7a9a7a',
  warmGray:  '#b0aea5',
  red:       '#a83020',
}

// Role-based suggested questions
const SUGGESTED_QUESTIONS = {
  client: [
    'Welche Symptome deuten auf Leberprobleme hin?',
    'Was kann ich für meine Entgiftung tun?',
    'Welche Ernährung unterstützt meine Leber?',
    'Was verbindet meine Beschwerden?',
    'Wie funktioniert die Selbstheilungskraft?',
  ],
  staff: [
    'Welche Wissenscluster sind am stärksten vernetzt?',
    'Wo sind analytische Lücken im Lebergott-Wissen?',
    'Was verbindet Ernährung und Entgiftung?',
    'Zeige Brücken zwischen den Haupt-Clustern.',
    'Welche Konzepte fehlen Klienten am häufigsten?',
  ],
  admin: [
    'Welche Content-Lücken gibt es im Wissensnetz?',
    'Wo entstehen neue Produkt-Ideen aus Gaps?',
    'Welche Themen werden am meisten gefragt?',
    'Was sind die stärksten Brücken-Konzepte?',
    'Zeige alle isolierten Wissensknoten.',
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
  const sessionKey = useMemo(() => `lb_chat_${user?.id || 'anon'}`, [user?.id])

  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey)
      if (saved) return JSON.parse(saved)
    } catch { /* ignore */ }
    return [WELCOME_MESSAGE]
  })

  const [input, setInput]   = useState(initialContext)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  // Persist messages
  useEffect(() => {
    try { sessionStorage.setItem(sessionKey, JSON.stringify(messages)) } catch { /* ignore */ }
  }, [messages, sessionKey])

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
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // History: last 10 messages before this user message (for n8n context)
    const history = messages.slice(-10).map((m) => ({ role: m.role, text: m.text }))

    const authHeaders = {}
    if (token && !token.startsWith('demo_')) {
      authHeaders['Authorization'] = `Bearer ${token}`
    }

    try {
      let answered = false

      // Backend orchestrates: n8n bot → local graph analysis → demo fallback
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
          // 22s: allows n8n (15s timeout) + local graph fallback buffer
          signal: AbortSignal.timeout(22000),
        })
        if (res.ok) {
          const data = await res.json()
          setMessages((prev) => [...prev, {
            role: 'assistant',
            text: data.answer || 'Keine Antwort gefunden.',
            nodes: data.relevant_nodes || [],
            gaps: data.gaps || [],
            bridges: data.bridges || [],
            followUps: data.follow_up_questions || [],
          }])
          answered = true
        }
      } catch { /* backend offline */ }

      // Frontend demo fallback (backend completely unreachable)
      if (!answered) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          text: _localFallback(text.trim()),
          nodes: [],
          gaps: [],
          followUps: ['Welche Cluster gibt es?', 'Wo sind [[Wissenslücken]]?'],
        }])
      }
    } catch {
      setMessages((prev) => [...prev, {
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

  // Wikilink click: use provided handler or synthesize a node from label
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
    <div style={cs.root}>
      {/* Messages */}
      <div className="lb-scroll" style={cs.messageList}>
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
            <span className="lb-typing-dot" />
            <span className="lb-typing-dot" />
            <span className="lb-typing-dot" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {showSuggested && !loading && (
        <div style={cs.suggestions}>
          {suggestedQuestions.slice(0, 3).map((q, i) => (
            <SuggestedChip key={i} text={q} onClick={() => sendMessage(q)} />
          ))}
        </div>
      )}

      {/* Selected node context badge */}
      {selectedNode && (
        <div style={cs.nodeCtx}>
          <span style={cs.nodeCtxDot}>◆</span>
          <span>Kontext: <strong style={{ color: LB.forest }}>{selectedNode.label}</strong></span>
        </div>
      )}

      {/* Input area */}
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
  )
}


/* ── Suggested chip ─────────────────────────────────────────────── */

function SuggestedChip({ text, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '5px 11px',
        background: hover ? LB.goldGlow : 'transparent',
        border: `1px solid ${hover ? LB.gold : LB.goldBorder}`,
        borderRadius: '20px',
        fontSize: '0.7rem',
        color: hover ? LB.goldDim : LB.textMid,
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'all 150ms ease',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {text}
    </button>
  )
}


/* ── Input field ────────────────────────────────────────────────── */

function InputField({ inputRef, value, onChange, onKeyDown, disabled }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder="Frage zum Wissensraum stellen…"
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        flex: 1,
        padding: '11px 14px',
        background: LB.creamDim,
        border: `1.5px solid ${focused ? LB.gold : LB.creamBrd}`,
        borderRadius: '10px',
        color: LB.text,
        fontSize: '0.83rem',
        fontFamily: "'DM Sans', sans-serif",
        outline: 'none',
        transition: 'border-color 200ms ease, box-shadow 200ms ease',
        boxShadow: focused ? `0 0 0 3px rgba(197,165,90,0.12)` : 'none',
      }}
    />
  )
}


/* ── Send button ────────────────────────────────────────────────── */

function SendButton({ onClick, disabled }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '11px 18px',
        background: disabled ? LB.creamDim : hover ? '#143020' : LB.forest,
        border: 'none',
        borderRadius: '10px',
        color: disabled ? LB.warmGray : LB.cream,
        fontSize: '0.9rem',
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 180ms ease',
        transform: (!disabled && hover) ? 'translateY(-1px)' : 'none',
        boxShadow: (!disabled && hover) ? '0 4px 12px rgba(26,58,42,0.2)' : 'none',
        flexShrink: 0,
      }}
    >
      →
    </button>
  )
}


/* ── Individual chat message ────────────────────────────────────── */

function ChatMessage({ message, onFollowUp, onNodeClick, onWikiClick }) {
  const isUser = message.role === 'user'

  return (
    <div style={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '92%',
      animation: 'lb-fade-up 0.3s ease both',
    }}>
      {/* Message bubble */}
      <div style={{
        padding: '10px 14px',
        background: isUser ? LB.forest : LB.cream,
        border: `1px solid ${isUser ? 'rgba(26,58,42,0.6)' : LB.creamBrd}`,
        borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
        fontSize: '0.82rem',
        color: isUser ? LB.cream : LB.text,
        lineHeight: 1.65,
        boxShadow: '0 1px 4px rgba(26,58,42,0.06)',
      }}>
        <RenderMarkdown text={message.text} onWikiClick={onWikiClick} isUser={isUser} />
      </div>

      {/* Relevant nodes (clickable) */}
      {message.nodes?.length > 0 && (
        <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {message.nodes.map((node) => (
            <NodeChip key={node.id} node={node} onClick={() => onNodeClick?.(node)} />
          ))}
        </div>
      )}

      {/* Follow-up chips — horizontal, pill-shaped */}
      {!isUser && message.followUps?.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {message.followUps.map((q, i) => (
            <FollowUpChip key={i} text={q} onClick={() => onFollowUp?.(q)} />
          ))}
        </div>
      )}
    </div>
  )
}


/* ── Node chip (in message) ─────────────────────────────────────── */

function NodeChip({ node, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '3px 9px',
        background: node.is_gap
          ? (hover ? 'rgba(180,80,30,0.12)' : 'rgba(180,80,30,0.06)')
          : (hover ? LB.goldGlow : 'rgba(197,165,90,0.06)'),
        border: `1px solid ${node.is_gap ? 'rgba(180,80,30,0.25)' : LB.goldBorder}`,
        borderRadius: '20px',
        fontSize: '0.68rem',
        color: node.is_gap ? '#8b4020' : LB.goldDim,
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        transition: 'all 150ms ease',
        transform: hover ? 'translateY(-1px)' : 'none',
      }}
    >
      {node.is_gap ? '◇' : '◆'} {node.label}
    </button>
  )
}


/* ── Follow-up chip ─────────────────────────────────────────────── */

function FollowUpChip({ text, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: 'left',
        padding: '4px 11px',
        background: hover ? 'rgba(26,58,42,0.05)' : 'transparent',
        border: `1px solid ${hover ? 'rgba(26,58,42,0.25)' : LB.creamBrd}`,
        borderRadius: '20px',
        fontSize: '0.7rem',
        color: hover ? LB.forest : LB.textMid,
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'all 150ms ease',
        whiteSpace: 'nowrap',
      }}
    >
      → {text}
    </button>
  )
}


/* ── Markdown + Wikilink renderer ───────────────────────────────── */

function RenderMarkdown({ text, onWikiClick, isUser }) {
  if (!text) return null

  return (
    <div>
      {text.split('\n').map((line, lineIdx) => {
        // Blockquote
        if (line.startsWith('> ')) {
          return (
            <div key={lineIdx} style={{
              borderLeft: `2px solid ${isUser ? 'rgba(250,249,245,0.3)' : LB.gold}`,
              paddingLeft: '10px',
              margin: '4px 0',
              color: isUser ? 'rgba(250,249,245,0.75)' : LB.textLight,
              fontStyle: 'italic',
              fontSize: '0.77rem',
            }}>
              {parseInline(line.slice(2), onWikiClick, isUser)}
            </div>
          )
        }

        // Callout lines (emoji markers)
        if (line.includes('⚠️')) {
          return (
            <div key={lineIdx} style={{
              padding: '5px 10px',
              background: 'rgba(180,80,20,0.06)',
              borderRadius: '5px',
              margin: '3px 0',
              fontSize: '0.78rem',
            }}>
              {parseInline(line, onWikiClick, isUser)}
            </div>
          )
        }

        if (line.includes('🌿') || line.includes('✦') || line.includes('🍃')) {
          return (
            <div key={lineIdx} style={{
              padding: '5px 10px',
              background: 'rgba(26,58,42,0.05)',
              borderRadius: '5px',
              margin: '3px 0',
              fontSize: '0.78rem',
            }}>
              {parseInline(line, onWikiClick, isUser)}
            </div>
          )
        }

        // Numbered list item
        if (/^\d+\.\s/.test(line)) {
          return (
            <div key={lineIdx} style={{ display: 'flex', gap: '6px', margin: '2px 0' }}>
              <span style={{ color: LB.gold, fontWeight: 600, flexShrink: 0 }}>
                {line.match(/^\d+/)[0]}.
              </span>
              <span>{parseInline(line.replace(/^\d+\.\s*/, ''), onWikiClick, isUser)}</span>
            </div>
          )
        }

        // Empty line → spacing
        if (!line.trim()) {
          return <div key={lineIdx} style={{ height: '6px' }} />
        }

        return (
          <div key={lineIdx}>
            {parseInline(line, onWikiClick, isUser)}
          </div>
        )
      })}
    </div>
  )
}


/* ── Inline parser: [[wikilinks]] + **bold** ────────────────────── */

function parseInline(text, onWikiClick, isUser) {
  // Split by [[wikilinks]]
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
      return [<WikiLink key={`wiki-${si}`} label={seg.value} onClick={() => onWikiClick?.(seg.value)} isUser={isUser} />]
    }
    // Process bold within text segments
    return seg.value.split(/(\*\*[^*]+\*\*)/g).map((part, pi) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`bold-${si}-${pi}`} style={{ color: isUser ? LB.cream : LB.forest }}>{part.slice(2, -2)}</strong>
      }
      return <span key={`text-${si}-${pi}`}>{part}</span>
    })
  })
}


/* ── WikiLink button ────────────────────────────────────────────── */

function WikiLink({ label, onClick, isUser }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: '1px 6px',
        borderRadius: '4px',
        border: `1px solid ${isUser
          ? (hover ? 'rgba(250,249,245,0.6)' : 'rgba(250,249,245,0.3)')
          : (hover ? LB.gold : LB.goldBorder)}`,
        background: isUser
          ? (hover ? 'rgba(250,249,245,0.1)' : 'rgba(250,249,245,0.07)')
          : (hover ? LB.goldGlow : 'rgba(197,165,90,0.07)'),
        color: isUser
          ? (hover ? LB.cream : 'rgba(250,249,245,0.8)')
          : (hover ? LB.forest : LB.goldDim),
        fontSize: 'inherit',
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 150ms ease',
        lineHeight: 'inherit',
        verticalAlign: 'baseline',
      }}
    >
      <span style={{ opacity: 0.6, fontSize: '0.75em' }}>[[</span>
      {label}
      <span style={{ opacity: 0.6, fontSize: '0.75em' }}>]]</span>
    </button>
  )
}


/* ── Styles ─────────────────────────────────────────────────────── */

const cs = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: LB.cream,
    fontFamily: "'DM Sans', sans-serif",
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  typingBubble: {
    alignSelf: 'flex-start',
    padding: '10px 14px',
    background: LB.cream,
    border: `1px solid ${LB.creamBrd}`,
    borderRadius: '4px 14px 14px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    boxShadow: '0 1px 4px rgba(26,58,42,0.06)',
  },
  suggestions: {
    padding: '8px 14px',
    borderTop: `1px solid ${LB.creamBrd}`,
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    background: LB.cream,
  },
  nodeCtx: {
    padding: '7px 14px',
    background: 'rgba(197,165,90,0.07)',
    borderTop: `1px solid ${LB.goldBorder}`,
    fontSize: '0.72rem',
    color: LB.textMid,
    fontFamily: "'DM Sans', sans-serif",
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  nodeCtxDot: { color: LB.gold, fontSize: '0.65rem' },
  inputArea: {
    padding: '10px 14px 12px',
    borderTop: `1px solid ${LB.creamBrd}`,
    background: LB.cream,
  },
  inputRow: { display: 'flex', gap: '8px', alignItems: 'center' },
}


/* ── Local fallback ─────────────────────────────────────────────── */

function _localFallback(question) {
  const q = question.toLowerCase()

  if (q.includes('lücke') || q.includes('gap') || q.includes('fehlt')) {
    return (
      '**4 Wissenslücken** gefunden:\n\n' +
      '1. **[[Epigenetik & Leber]]** — fehlt komplett\n' +
      '2. **[[Darm-Leber-Achse]]** — unterrepräsentiert\n' +
      '3. **[[Chronobiologie Detox]]** — kein Cluster\n' +
      '4. **[[Fastenprotokolle]]** — nicht verankert\n\n' +
      '🌿 Klicke auf einen [[Begriff]] um ihn im Graph zu finden.'
    )
  }
  if (q.includes('hub') || q.includes('zentral') || q.includes('vernetzt')) {
    return (
      '**Top 5 Hub-Knoten:**\n\n' +
      '1. **[[Leber heißt Leben]]** — 77 Verbindungen\n' +
      '2. **[[Selbstheilungskraft]]** — 54 Verbindungen\n' +
      '3. **[[Entgiftung]]** — 48 Verbindungen\n' +
      '4. **[[Darmgesundheit]]** — 43 Verbindungen\n' +
      '5. **[[Mitochondrien]]** — 38 Verbindungen'
    )
  }
  if (q.includes('entgiftung') || q.includes('detox')) {
    return (
      '**[[Entgiftung]]** ist zentral im Lebergott-Wissen:\n\n' +
      '> Die Leber entgiftet in zwei Phasen — Phase I aktiviert Toxine, Phase II neutralisiert sie.\n\n' +
      'Verknüpfte Konzepte: [[Schwermetalle]], [[Darmgesundheit]], [[Mariendistel]], [[Wasser]].\n\n' +
      '🌿 Öffne den Chat mit einem [[Knoten]] ausgewählt für tiefere Analyse.'
    )
  }
  return (
    'Im Demo-Modus ist lokale Analyse verfügbar. Starte das Backend für volle Graph-Analyse:\n\n' +
    '`uvicorn backend.main:app --reload`\n\n' +
    'Versuche: [[Entgiftung]], [[Leber heißt Leben]], [[Mariendistel]]'
  )
}
