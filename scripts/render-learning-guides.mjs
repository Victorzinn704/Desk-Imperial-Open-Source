import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const guides = [
  {
    source: 'docs/learning/git-professional-field-guide.md',
    title: 'Git Sem Drama',
    subtitle: 'Guia profissional de versionamento para trabalhar com previsibilidade',
    output: 'docs/learning/dist/git-sem-drama-guia-profissional.pdf',
  },
  {
    source: 'docs/learning/junior-engineer-field-guide.md',
    title: 'Junior Forte',
    subtitle: 'Guia de evolucao para construir software com criterio de engenharia',
    output: 'docs/learning/dist/guia-dev-junior-forte.pdf',
  },
]

const documentMeta = {
  eyebrow: 'Desk Imperial Engineering Notes',
  footer:
    'Material criado para apoiar onboarding, revisao tecnica e evolucao de engenharia. Use como guia vivo: adapte ao contexto do projeto e mantenha os exemplos alinhados ao codigo real.',
  generatedAt: '2026-05-15',
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replaceAll(/`([^`]+)`/g, '<code>$1</code>')
    .replaceAll(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replaceAll(/\*([^*]+)\*/g, '<em>$1</em>')
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
}

function closeLists(state, html) {
  while (state.listStack.length > 0) {
    html.push(`</${state.listStack.pop()}>`)
  }
}

function createMarkdownState() {
  return { inCode: false, codeLines: [], listStack: [] }
}

function openList(state, html, listTag, markup = `<${listTag}>`) {
  if (state.listStack.at(-1) === listTag) {
    return
  }

  closeLists(state, html)
  state.listStack.push(listTag)
  html.push(markup)
}

function toggleCodeFence(state, html) {
  if (state.inCode) {
    html.push(`<pre><code>${escapeHtml(state.codeLines.join('\n'))}</code></pre>`)
    state.inCode = false
    state.codeLines = []
    return
  }

  closeLists(state, html)
  state.inCode = true
}

function parseHeading(line) {
  const heading = /^(#{1,4})\s+(.+)$/.exec(line)
  if (!heading) {
    return null
  }

  const text = heading[2].replaceAll(/^#+|#+$/g, '').trim()
  return { id: slugify(text), level: heading[1].length, text }
}

function renderHeading({ heading, html, toc, state }) {
  closeLists(state, html)
  if (heading.level <= 3) toc.push(heading)
  html.push(`<h${heading.level} id="${heading.id}">${inlineMarkdown(heading.text)}</h${heading.level}>`)
}

function renderChecklistItem({ html, line, state }) {
  const checked = /^- \[[xX]\]/.test(line)
  const text = line.replace(/^- \[[ xX]\]\s+/, '')
  openList(state, html, 'ul', '<ul class="checklist">')
  html.push(`<li>${checked ? '☑' : '☐'} ${inlineMarkdown(text)}</li>`)
}

function renderUnorderedItem({ html, line, state }) {
  openList(state, html, 'ul')
  html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`)
}

function renderNumberedItem({ html, line, numbered, state }) {
  openList(state, html, 'ol')
  html.push(`<li>${inlineMarkdown(numbered[2])}</li>`)
}

function renderBlockquote({ html, line, state }) {
  closeLists(state, html)
  html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`)
}

function renderParagraph({ html, line, state }) {
  closeLists(state, html)
  html.push(`<p>${inlineMarkdown(line)}</p>`)
}

function renderMarkdownLine({ html, line, state, toc }) {
  const heading = parseHeading(line)
  if (heading) {
    renderHeading({ heading, html, state, toc })
    return
  }

  if (line.startsWith('> ')) {
    renderBlockquote({ html, line, state })
    return
  }

  if (/^- \[[ xX]\]\s+/.test(line)) {
    renderChecklistItem({ html, line, state })
    return
  }

  if (line.startsWith('- ')) {
    renderUnorderedItem({ html, line, state })
    return
  }

  const numbered = /^(\d+)\.\s+(.+)$/.exec(line)
  if (numbered) {
    renderNumberedItem({ html, line, numbered, state })
    return
  }

  renderParagraph({ html, line, state })
}

function renderRawMarkdownLine({ html, rawLine, state, toc }) {
  const line = rawLine.trimEnd()

  if (line.startsWith('```')) {
    toggleCodeFence(state, html)
    return
  }

  if (state.inCode) {
    state.codeLines.push(rawLine)
    return
  }

  if (line.trim() === '') {
    closeLists(state, html)
    return
  }

  renderMarkdownLine({ html, line, state, toc })
}

function renderMarkdown(markdown) {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n')
  const html = []
  const toc = []
  const state = createMarkdownState()

  for (const rawLine of lines) {
    renderRawMarkdownLine({ html, rawLine, state, toc })
  }

  closeLists(state, html)
  return { body: html.join('\n'), toc }
}

function renderTocItems(toc) {
  return toc
    .filter((item) => item.level > 1)
    .map((item) => `<li class="toc-level-${item.level}"><a href="#${item.id}">${escapeHtml(item.text)}</a></li>`)
    .join('\n')
}

const documentStyles = `
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      color: #172033;
      font-family: "Inter", "Segoe UI", Arial, sans-serif;
      font-size: 10.7pt;
      line-height: 1.55;
      margin: 0;
      background: #f5f7fb;
    }

    .page {
      background: #fff;
      margin: 0 auto;
      max-width: 860px;
      padding: 0;
    }

    .cover {
      border-bottom: 1px solid #d8dfeb;
      padding: 36px 0 24px;
    }

    .eyebrow {
      color: #2f6f8f;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: .14em;
      margin: 0 0 18px;
      text-transform: uppercase;
    }

    h1 {
      color: #111827;
      font-size: 30pt;
      letter-spacing: 0;
      line-height: 1.05;
      margin: 0 0 12px;
    }

    .subtitle {
      color: #526173;
      font-size: 12.5pt;
      line-height: 1.45;
      margin: 0;
      max-width: 680px;
    }

    .meta {
      color: #6b7280;
      display: flex;
      font-size: 9pt;
      gap: 12px;
      margin-top: 24px;
    }

    .toc {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin: 24px 0 28px;
      padding: 16px 18px;
      break-inside: avoid;
    }

    .toc strong {
      color: #0f172a;
      display: block;
      font-size: 9pt;
      letter-spacing: .12em;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .toc ul {
      columns: 2;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .toc li {
      break-inside: avoid;
      margin: 0 0 5px;
      padding: 0;
    }

    .toc a {
      color: #1f6180;
      text-decoration: none;
    }

    h2 {
      border-top: 1px solid #e5eaf1;
      color: #111827;
      font-size: 17pt;
      letter-spacing: 0;
      margin: 28px 0 10px;
      padding-top: 18px;
      break-after: avoid;
    }

    h3 {
      color: #203047;
      font-size: 12.5pt;
      margin: 18px 0 6px;
      break-after: avoid;
    }

    h4 {
      color: #334155;
      font-size: 10.5pt;
      margin: 14px 0 4px;
      break-after: avoid;
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    p {
      margin: 0 0 9px;
    }

    ul, ol {
      margin: 0 0 11px 20px;
      padding: 0;
    }

    li {
      margin: 0 0 4px;
    }

    blockquote {
      background: #eef6fb;
      border-left: 4px solid #2f6f8f;
      color: #203047;
      margin: 16px 0;
      padding: 12px 14px;
      border-radius: 0 8px 8px 0;
    }

    code {
      background: #edf2f7;
      border: 1px solid #dbe4ef;
      border-radius: 4px;
      color: #0f3d56;
      font-family: "Cascadia Code", "Consolas", monospace;
      font-size: 8.7pt;
      padding: 1px 4px;
    }

    pre {
      background: #111827;
      border-radius: 8px;
      color: #e5edf6;
      font-family: "Cascadia Code", "Consolas", monospace;
      font-size: 8.4pt;
      line-height: 1.45;
      margin: 13px 0 16px;
      overflow: hidden;
      padding: 13px 14px;
      white-space: pre-wrap;
      break-inside: avoid;
    }

    pre code {
      background: transparent;
      border: 0;
      color: inherit;
      padding: 0;
    }

    strong {
      color: #0f172a;
    }

    .footer-note {
      border-top: 1px solid #d8dfeb;
      color: #64748b;
      font-size: 8.8pt;
      margin-top: 32px;
      padding-top: 12px;
    }

    @media print {
      body {
        background: #fff;
      }

      .page {
        max-width: none;
      }
    }`

function renderDocumentHead(title) {
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${documentStyles}
  </style>
</head>`
}

function renderCover({ subtitle, title }) {
  return `<section class="cover">
      <p class="eyebrow">${escapeHtml(documentMeta.eyebrow)}</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="subtitle">${escapeHtml(subtitle)}</p>
      <p class="meta"><span>Gerado em ${documentMeta.generatedAt}</span><span>Formato: guia pratico</span></p>
    </section>`
}

function renderTableOfContents(toc) {
  return `<nav class="toc">
      <strong>Mapa rapido</strong>
      <ul>${renderTocItems(toc)}</ul>
    </nav>`
}

function renderDocumentBody({ body, subtitle, title, toc }) {
  return `<body>
  <main class="page">
    ${renderCover({ subtitle, title })}
    ${renderTableOfContents(toc)}
    <article>
      ${body}
    </article>
    <p class="footer-note">${escapeHtml(documentMeta.footer)}</p>
  </main>
</body>`
}

function renderHtml({ markdown, title, subtitle }) {
  const { body, toc } = renderMarkdown(markdown)

  return `<!doctype html>
<html lang="pt-BR">
${renderDocumentHead(title)}
${renderDocumentBody({ body, subtitle, title, toc })}
</html>`
}

function findBrowser() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ]

  const browser = candidates.find((candidate) => existsSync(candidate))
  if (!browser) throw new Error('Chrome ou Edge nao encontrado para gerar PDF.')
  return browser
}

function renderGuide(guide, browser) {
  const sourcePath = resolve(guide.source)
  const outputPath = resolve(guide.output)
  const htmlPath = resolve('.cache', 'learning-guides', basename(outputPath).replace(/\.pdf$/i, '.html'))
  const markdown = readFileSync(sourcePath, 'utf8')

  mkdirSync(dirname(outputPath), { recursive: true })
  mkdirSync(dirname(htmlPath), { recursive: true })
  writeFileSync(htmlPath, renderHtml({ markdown, title: guide.title, subtitle: guide.subtitle }), 'utf8')

  execFileSync(
    browser,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--print-to-pdf-no-header',
      `--print-to-pdf=${outputPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: 'inherit' },
  )

  console.log(`rendered ${basename(outputPath)}`)
}

const browser = findBrowser()
for (const guide of guides) renderGuide(guide, browser)
