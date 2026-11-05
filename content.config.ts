import {
  collectionContentSource,
  resolveContentInput,
} from './lib/blog-content.mjs'
import { defineContentConfig, defineCollection } from '@nuxt/content'
import { contentSchemas } from './lib/content-schema'
const input = resolveContentInput()
const sourceFor = (pattern: string) => collectionContentSource(pattern, input)
export default defineContentConfig({
  collections: {
    pages: defineCollection({
      type: 'page',
      source: sourceFor('*.md'),
      schema: contentSchemas.pages,
    }),
    concepts: defineCollection({
      type: 'page',
      source: sourceFor('concepts/**/*.md'),
      schema: contentSchemas.concepts,
    }),
    entities: defineCollection({
      type: 'page',
      source: sourceFor('entities/**/*.md'),
      schema: contentSchemas.entities,
    }),
    projects: defineCollection({
      type: 'page',
      source: sourceFor('projects/**/*.md'),
      schema: contentSchemas.projects,
    }),
    articles: defineCollection({
      type: 'page',
      source: sourceFor('blog/articles/**/*.md'),
      schema: contentSchemas.articles,
    }),
    columns: defineCollection({
      type: 'page',
      source: sourceFor('blog/columns/**/*.md'),
      schema: contentSchemas.columns,
    }),
    gallery: defineCollection({
      type: 'page',
      source: sourceFor('gallery/**/*.md'),
      schema: contentSchemas.gallery,
    }),
  },
})
