"use client"

import { useRef, useCallback, type ClipboardEvent } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import TurndownService from "turndown"
import { Bold, Italic, Heading1, List, ListOrdered, Link2, Code } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

type FormatAction =
  | { type: "wrap"; before: string; after: string }
  | { type: "line-prefix"; prefix: string }

const FORMAT_ACTIONS: Record<string, FormatAction> = {
  bold: { type: "wrap", before: "**", after: "**" },
  italic: { type: "wrap", before: "*", after: "*" },
  code: { type: "wrap", before: "`", after: "`" },
  link: { type: "wrap", before: "[", after: "](url)" },
  heading: { type: "line-prefix", prefix: "# " },
  unorderedList: { type: "line-prefix", prefix: "- " },
  orderedList: { type: "line-prefix", prefix: "1. " },
}

// Lazily created — Turndown touches `document`, which isn't available
// during SSR, and there's no reason to pay the init cost until a paste
// with rich HTML actually happens.
let turndownService: TurndownService | null = null

function getTurndownService(): TurndownService {
  if (!turndownService) {
    turndownService = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
    })
    turndownService.use((service: TurndownService) => {
      service.remove("style")
      service.remove("script")
    })
  }
  return turndownService
}

export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Pasting rich text (e.g. from Word/Google Docs) carries an
  // `text/html` clipboard payload. Convert it to clean Markdown instead of
  // letting the browser fall back to plain text (which drops all
  // formatting). Plain-text paste is left to the browser's default
  // behavior.
  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const html = event.clipboardData.getData("text/html")
      if (!html) return

      event.preventDefault()

      const markdown = getTurndownService().turndown(html).trim()
      const textarea = textareaRef.current
      const start = textarea?.selectionStart ?? value.length
      const end = textarea?.selectionEnd ?? value.length

      const newValue = value.substring(0, start) + markdown + value.substring(end)
      onChange(newValue)

      const cursorPos = start + markdown.length
      requestAnimationFrame(() => {
        textarea?.focus()
        textarea?.setSelectionRange(cursorPos, cursorPos)
      })
    },
    [value, onChange]
  )

  const applyFormat = useCallback(
    (actionKey: string) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const action = FORMAT_ACTIONS[actionKey]
      if (!action) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selected = value.substring(start, end)

      let newValue: string
      let cursorPos: number

      if (action.type === "wrap") {
        const wrapped = `${action.before}${selected || "texto"}${action.after}`
        newValue = value.substring(0, start) + wrapped + value.substring(end)
        if (selected) {
          cursorPos = start + wrapped.length
        } else {
          cursorPos = start + action.before.length + "texto".length
        }
      } else {
        // line-prefix: find the start of the current line
        const lineStart = value.lastIndexOf("\n", start - 1) + 1
        newValue =
          value.substring(0, lineStart) + action.prefix + value.substring(lineStart)
        cursorPos = end + action.prefix.length
      }

      onChange(newValue)

      // Restore focus and cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(cursorPos, cursorPos)
      })
    },
    [value, onChange]
  )

  const toolbarButtons = [
    { key: "bold", icon: Bold, title: "Negrito" },
    { key: "italic", icon: Italic, title: "Italico" },
    { key: "heading", icon: Heading1, title: "Titulo" },
    "separator",
    { key: "unorderedList", icon: List, title: "Lista" },
    { key: "orderedList", icon: ListOrdered, title: "Lista numerada" },
    "separator",
    { key: "link", icon: Link2, title: "Link" },
    { key: "code", icon: Code, title: "Codigo" },
  ] as const

  return (
    <Tabs defaultValue="write" className="flex flex-col flex-1">
      <TabsList className="w-fit">
        <TabsTrigger value="write">Escrever</TabsTrigger>
        <TabsTrigger value="preview">Visualizar</TabsTrigger>
      </TabsList>

      <TabsContent value="write" className="flex flex-col flex-1 mt-0">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 flex-wrap border rounded-t-md px-2 py-1 bg-muted/50">
          {toolbarButtons.map((item, index) => {
            if (item === "separator") {
              return (
                <Separator
                  key={`sep-${index}`}
                  orientation="vertical"
                  className="mx-1 h-5"
                />
              )
            }

            const Icon = item.icon
            return (
              <Button
                key={item.key}
                type="button"
                variant="ghost"
                className="h-8 w-8 p-0"
                title={item.title}
                onClick={() => applyFormat(item.key)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            )
          })}
        </div>

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="flex-1 min-h-[200px] md:min-h-[300px] resize-none rounded-t-none border-t-0 font-mono text-sm"
        />
      </TabsContent>

      <TabsContent value="preview" className="flex-1 mt-0">
        <div className="border rounded-md p-4 min-h-[200px] md:min-h-[300px] overflow-y-auto markdown-preview">
          {value ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-bold mt-5 mb-3 pb-1 border-b first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-bold mt-4 mb-2 first:mt-0">{children}</h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-base font-bold mt-3 mb-1 first:mt-0">
                    {children}
                  </h4>
                ),
                p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    {children}
                  </a>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold">{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children, className }) => {
                  // If it has a className, it's a code block (with language); otherwise inline
                  if (className) {
                    return (
                      <code className="bg-muted text-sm px-1 py-0.5 rounded font-mono">
                        {children}
                      </code>
                    )
                  }
                  return (
                    <code className="bg-muted text-sm px-1.5 py-0.5 rounded font-mono">
                      {children}
                    </code>
                  )
                },
                pre: ({ children }) => (
                  <pre className="bg-muted rounded-md p-4 mb-3 overflow-x-auto text-sm">
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic mb-3 text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-4 border-border" />,
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-3">
                    <table className="w-full border-collapse border border-border text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="border border-border px-3 py-2 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-3 py-2">{children}</td>
                ),
                input: ({ checked, ...props }) => (
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled
                    className="mr-2"
                    {...props}
                  />
                ),
                del: ({ children }) => (
                  <del className="line-through text-muted-foreground">{children}</del>
                ),
              }}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nada para visualizar. Escreva algo na aba &quot;Escrever&quot;.
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
