'use strict'

// Generates a .md file next to each built documentation page (foo.html -> foo.md).
// Runs after Antora has finished, so it holds one page in memory at a time.
// Usage: node build-markdown.js [buildDir]

const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const TurndownService = require('turndown')
const { gfm } = require('turndown-plugin-gfm')

// elements injected by site scripts (embedded TOC, code copy buttons, the Copy Page widget itself)
// or by Asciidoctor (empty heading permalink icons) that aren't authored page content and
// shouldn't appear in the generated Markdown
const CHROME_SELECTOR = 'nav.pagination, .copy-page, aside.toc, .source-toolbox, a.anchor'

const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' }).use(gfm)

function toMarkdown (html) {
  const $ = cheerio.load(html)
  const article = $('article.doc').first()
  if (!article.length) return undefined
  article.find(CHROME_SELECTOR).remove()
  return turndownService.turndown(article.html() || '').trim()
}

function * walk (dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) yield * walk(entryPath)
    else if (entry.isFile() && entry.name.endsWith('.html')) yield entryPath
  }
}

const buildDir = path.resolve(process.argv[2] || 'build')
if (!fs.existsSync(buildDir)) {
  console.error(`build directory not found: ${buildDir}`)
  process.exit(1)
}

let count = 0
for (const htmlPath of walk(buildDir)) {
  const markdown = toMarkdown(fs.readFileSync(htmlPath, 'utf8'))
  if (markdown === undefined) continue
  fs.writeFileSync(htmlPath.replace(/\.html$/, '.md'), markdown, 'utf8')
  count++
}
console.log(`Generated ${count} markdown pages in ${buildDir}`)
