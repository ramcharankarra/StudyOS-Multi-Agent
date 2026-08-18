import React, { useState } from "react"
import { Copy, Check } from "lucide-react"

interface MarkdownRendererProps {
  content: string
  className?: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  if (!content) return null

  // Helper to parse inline styles: bold, italic, inline code, links, LaTeX math
  const parseInline = (text: string): React.ReactNode[] => {
    if (!text) return []

    // Tokenize text into inline elements
    const tokens: React.ReactNode[] = []
    let remaining = text
    let keyIdx = 0

    while (remaining.length > 0) {
      // 1. Inline Code `code`
      const codeMatch = remaining.match(/^`([^`]+)`/)
      if (codeMatch) {
        tokens.push(
          <code
            key={keyIdx++}
            className="px-1.5 py-0.5 rounded-md bg-muted text-foreground font-mono text-[0.85em] border border-border/50 font-semibold"
          >
            {codeMatch[1]}
          </code>
        )
        remaining = remaining.slice(codeMatch[0].length)
        continue
      }

      // 2. Bold Text **text** or __text__
      const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/)
      if (boldMatch) {
        tokens.push(
          <strong key={keyIdx++} className="font-bold text-foreground">
            {parseInline(boldMatch[2])}
          </strong>
        )
        remaining = remaining.slice(boldMatch[0].length)
        continue
      }

      // 3. Italic Text *text* or _text_ (excluding bullets)
      const italicMatch = remaining.match(/^(\*|_)(.*?)\1/)
      if (italicMatch && italicMatch[2].trim().length > 0) {
        tokens.push(
          <em key={keyIdx++} className="italic text-foreground/90">
            {parseInline(italicMatch[2])}
          </em>
        )
        remaining = remaining.slice(italicMatch[0].length)
        continue
      }

      // 4. Links [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        tokens.push(
          <a
            key={keyIdx++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium hover:underline cursor-pointer"
          >
            {linkMatch[1]}
          </a>
        )
        remaining = remaining.slice(linkMatch[0].length)
        continue
      }

      // 5. LaTeX inline math $math$ or \(math\)
      const mathMatch = remaining.match(/^(\$|\\\()(.*?)\1/) || remaining.match(/^\\\((.*?)\\\)/)
      if (mathMatch) {
        const mathExpr = mathMatch[2] || mathMatch[1]
        tokens.push(
          <span key={keyIdx++} className="font-serif italic text-foreground px-0.5 bg-muted/30 rounded">
            {mathExpr}
          </span>
        )
        remaining = remaining.slice(mathMatch[0].length)
        continue
      }

      // Next plain text character chunk up to next special syntax delimiter
      const nextSpecial = remaining.search(/[`*_\[$\\]/)
      if (nextSpecial === -1) {
        tokens.push(remaining)
        break
      } else if (nextSpecial === 0) {
        tokens.push(remaining[0])
        remaining = remaining.slice(1)
      } else {
        tokens.push(remaining.slice(0, nextSpecial))
        remaining = remaining.slice(nextSpecial)
      }
    }

    return tokens
  }

  // Parse block-level Markdown structures
  const renderBlocks = (raw: string): React.ReactNode => {
    // 1. Separate code blocks from normal text
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const blocks: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    let blockKey = 0

    const processTextChunk = (chunk: string) => {
      const lines = chunk.split("\n")
      let inList = false
      let listType: "ul" | "ol" = "ul"
      let listItems: React.ReactNode[] = []

      const flushList = () => {
        if (listItems.length > 0) {
          if (listType === "ul") {
            blocks.push(
              <ul key={blockKey++} className="space-y-1.5 my-2.5 pl-2">
                {listItems}
              </ul>
            )
          } else {
            blocks.push(
              <ol key={blockKey++} className="space-y-1.5 my-2.5 pl-2 list-decimal list-inside">
                {listItems}
              </ol>
            )
          }
          listItems = []
          inList = false
        }
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trimEnd()

        // Empty line
        if (!line.trim()) {
          flushList()
          continue
        }

        // Headings: ###, ##, #
        if (line.startsWith("#")) {
          flushList()
          const level = line.match(/^#+/)?.[0].length || 1
          const titleText = line.replace(/^#+\s*/, "")

          if (level === 1) {
            blocks.push(
              <h1 key={blockKey++} className="text-lg font-bold font-heading text-foreground mt-4 mb-2 border-b border-border/40 pb-1">
                {parseInline(titleText)}
              </h1>
            )
          } else if (level === 2) {
            blocks.push(
              <h2 key={blockKey++} className="text-base font-bold font-heading text-foreground mt-3.5 mb-1.5">
                {parseInline(titleText)}
              </h2>
            )
          } else {
            blocks.push(
              <h3 key={blockKey++} className="text-sm font-bold font-heading text-foreground mt-3 mb-1">
                {parseInline(titleText)}
              </h3>
            )
          }
          continue
        }

        // Horizontal Rule --- or ***
        if (/^(\-\-\-|Wait|\*\*\*)$/.test(line.trim())) {
          flushList()
          blocks.push(<hr key={blockKey++} className="my-4 border-border/50" />)
          continue
        }

        // Table detection (| header | header |)
        if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
          flushList()
          const tableRows: string[] = []
          while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
            tableRows.push(lines[i].trim())
            i++
          }
          i-- // Step back one line

          if (tableRows.length >= 2) {
            const headerCols = tableRows[0].split("|").filter((c) => c.trim().length > 0 || c === "")
            // Skip separator line if present (e.g. |---|---|)
            const bodyRows = tableRows.slice(1).filter((r) => !/^[|\s:-]+$/.test(r))

            blocks.push(
              <div key={blockKey++} className="my-3 overflow-x-auto rounded-xl border border-border/80 bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/80">
                      {headerCols.map((col, idx) => (
                        <th key={idx} className="p-2.5 font-bold text-foreground">
                          {parseInline(col.trim())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bodyRows.map((rowStr, rIdx) => {
                      const cols = rowStr.split("|").filter((c) => c.trim().length > 0 || c === "")
                      return (
                        <tr key={rIdx} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                          {cols.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2.5 text-foreground/90">
                              {parseInline(cell.trim())}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
            continue
          }
        }

        // Bullet Lists (- or *)
        const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)/)
        if (bulletMatch) {
          if (!inList || listType !== "ul") {
            flushList()
            inList = true
            listType = "ul"
          }
          listItems.push(
            <li key={`item_${listItems.length}`} className="flex items-start gap-2 text-foreground/90">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
              <span className="flex-1 min-w-0">{parseInline(bulletMatch[2])}</span>
            </li>
          )
          continue
        }

        // Numbered Lists (1. 2.)
        const numMatch = line.match(/^(\s*)\d+\.\s+(.*)/)
        if (numMatch) {
          if (!inList || listType !== "ol") {
            flushList()
            inList = true
            listType = "ol"
          }
          listItems.push(
            <li key={`item_${listItems.length}`} className="text-foreground/90">
              {parseInline(numMatch[2])}
            </li>
          )
          continue
        }

        // Blockquotes (> text)
        if (line.startsWith(">")) {
          flushList()
          const quoteText = line.replace(/^>\s*/, "")
          blocks.push(
            <blockquote key={blockKey++} className="pl-3 py-1 my-2 border-l-2 border-primary bg-primary/5 text-foreground/90 rounded-r-lg italic text-xs">
              {parseInline(quoteText)}
            </blockquote>
          )
          continue
        }

        // Normal Paragraph Line
        flushList()
        if (line.trim()) {
          blocks.push(
            <p key={blockKey++} className="my-1.5 leading-relaxed text-foreground/90 font-sans">
              {parseInline(line)}
            </p>
          )
        }
      }

      flushList()
    }

    while ((match = codeBlockRegex.exec(raw)) !== null) {
      // Process text before code block
      if (match.index > lastIndex) {
        processTextChunk(raw.slice(lastIndex, match.index))
      }

      const lang = match[1] || "code"
      const codeStr = match[2].trim()

      blocks.push(
        <CodeBlockContainer key={blockKey++} language={lang} code={codeStr} />
      )

      lastIndex = match.index + match[0].length
    }

    // Process remaining text after last code block
    if (lastIndex < raw.length) {
      processTextChunk(raw.slice(lastIndex))
    }

    return <div className="space-y-1">{blocks}</div>
  }

  return <div className={`text-xs md:text-sm text-foreground space-y-2 ${className}`}>{renderBlocks(content)}</div>
}

// Dedicated Copyable Code Block Container
const CodeBlockContainer: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 rounded-2xl border border-border/80 bg-zinc-950 text-zinc-100 overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-[11px] text-zinc-400 font-mono">
        <span className="lowercase font-semibold">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-zinc-100 transition-colors cursor-pointer"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export default MarkdownRenderer
