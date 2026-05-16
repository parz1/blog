import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    concepts: defineCollection({
      type: 'page',
      source: 'concepts/*.md',
      schema: z.object({
        title: z.string(),
        slug: z.string(),
        summary: z.string().optional(),
        state: z.enum(['seed', 'growing', 'mature', 'shifting']),
        tags: z.array(z.string()).optional(),
        updated: z.string(),
        linkedConcepts: z.array(z.string()).optional(),
        relations: z
          .array(
            z.object({
              concept: z.string(),
              type: z.enum([
                'relates',
                'shapes',
                'depends-on',
                'tensions-with',
                'appears-in',
              ]),
            }),
          )
          .optional(),
        relatedProjects: z.array(z.string()).optional(),
        aliases: z.array(z.string()).optional(),
        lang: z.enum(['cn', 'ja', 'en']).default('en').optional(),
      }),
    }),
    posts: defineCollection({
      type: 'page',
      source: 'blog/posts/*.md',
      schema: z.object({
        title: z.string(),
        slug: z.string().optional(),
        lang: z.enum(['cn', 'ja', 'en']).default('cn').optional(),
        description: z.string().optional(),
        notice: z.string().optional(),
        categories: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        cover: z.string().optional(),
        published: z.string().datetime(),
      }),
    }),
    logs: defineCollection({
      type: 'page',
      source: 'blog/logs/*.md',
      schema: z.object({
        title: z.string(),
        slug: z.string().optional(),
        lang: z.enum(['cn', 'ja', 'en']).default('cn').optional(),
        description: z.string().optional(),
        notice: z.string().optional(),
        categories: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        cover: z.string().optional(),
        published: z.string().datetime(),
      }),
    }),
    crap: defineCollection({
      type: 'page',
      source: 'blog/crap/*.md',
      schema: z.object({
        title: z.string(),
        slug: z.string().optional(),
        lang: z.enum(['cn', 'ja', 'en']).default('cn').optional(),
        description: z.string().optional(),
        notice: z.string().optional(),
        categories: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        cover: z.string().optional(),
        published: z.string().datetime(),
      }),
    }),
  },
})
