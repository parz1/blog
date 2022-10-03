import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import rehypeDocument from 'rehype-document'
import remarkRehype from 'remark-rehype'
import rehypeFormat from 'rehype-format'
import rehypeStringify from 'rehype-stringify'

const postsDirectory = path.join(process.cwd(), 'posts')

export async function getChangeLogCtx() {
  // Get CHANGELOG.md
  const fileContent = fs.readFileSync('CHANGELOG.md', 'utf8')
  // console.log(fileContent)
  const matterResult = matter(fileContent)
  // Use remark to convert markdown into HTML string
  const processedContent = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeDocument)
    .use(rehypeFormat)
    .use(rehypeStringify)
    .process(matterResult.content)
  const contentHtml = processedContent.toString()
  // Combine the data with the id and contentHtml
  return {
    contentHtml,
  }
}
