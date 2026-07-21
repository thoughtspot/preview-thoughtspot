'use strict'

const cheerio = require('cheerio')
const TurndownService = require('turndown')
const { gfm } = require('turndown-plugin-gfm')

// elements injected by site scripts (embedded TOC, code copy buttons, the Copy Page widget itself)
// or by Asciidoctor (empty heading permalink icons) that aren't authored page content and
// shouldn't appear in the generated Markdown
const CHROME_SELECTOR = 'nav.pagination, .copy-page, aside.toc, .source-toolbox, a.anchor'

function toMarkdown (html, turndownService) {
  const $ = cheerio.load(html)
  const article = $('article.doc').first()
  if (!article.length) return undefined
  article.find(CHROME_SELECTOR).remove()
  return turndownService.turndown(article.html() || '').trim()
}

module.exports.register = function () {
  const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' }).use(gfm)

  this.on('beforePublish', ({ contentCatalog, siteCatalog }) => {
    contentCatalog.getPages((page) => page.out).forEach((page) => {
      const markdown = toMarkdown(page.contents.toString(), turndownService)
      if (markdown === undefined) return
      const out = {
        ...page.out,
        path: page.out.path.replace(/\.html$/, '.md'),
        basename: page.out.basename.replace(/\.html$/, '.md'),
      }
      siteCatalog.addFile({
        contents: Buffer.from(markdown, 'utf8'),
        mediaType: 'text/markdown; charset=utf-8',
        out,
        src: { ...page.src, mediaType: 'text/markdown' },
      })
    })
  })
}
