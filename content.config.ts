import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    pages: defineCollection({
      type: 'page',
      source: '*.md',
      schema: z.object({
        title: z.string(),
        slug: z.string().optional(),
        description: z.string().optional(),
        lang: z.enum(['cn', 'ja', 'en']).default('cn').optional(),
      }),
    }),
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
    entities: defineCollection({
      type: 'page',
      source: 'entities/*.md',
      schema: z.object({
        title: z.string(),
        slug: z.string(),
        summary: z.string().optional(),
        kind: z.enum([
          'format',
          'software',
          'tool',
          'library',
          'standard',
          'dataset',
          'instrument',
          'organization',
          'person',
          'product',
          'protocol',
          'other',
        ]),
        status: z
          .enum(['active', 'legacy', 'deprecated', 'unknown'])
          .default('active'),
        tags: z.array(z.string()).optional(),
        updated: z.string(),
        aliases: z.array(z.string()).optional(),
        relatedConcepts: z.array(z.string()).optional(),
        relatedEntities: z.array(z.string()).optional(),
        externalLinks: z
          .array(
            z.object({
              label: z.string(),
              url: z.string(),
            }),
          )
          .optional(),
        lang: z.enum(['cn', 'ja', 'en']).default('cn').optional(),
      }),
    }),
    projects: defineCollection({
      type: 'page',
      source: 'projects/*.md',
      schema: z.object({
        title: z.string(),
        slug: z.string(),
        summary: z.string(),
        status: z.enum(['active', 'paused', 'archived', 'experimental']),
        version: z.string().optional(),
        tags: z.array(z.string()).optional(),
        updated: z.string(),
        repo: z.object({
          owner: z.string(),
          name: z.string(),
        }),
        links: z
          .array(
            z.object({
              label: z.string(),
              url: z.string(),
            }),
          )
          .optional(),
        relatedConcepts: z.array(z.string()).optional(),
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
    gallery: defineCollection({
      type: 'page',
      source: 'gallery/*.md',
      schema: z.object({
        slug: z.string(),
        lang: z.enum(['cn', 'ja', 'en']).default('cn').optional(),
        title: z.string(),
        caption: z.string().optional(),
        date: z.string().optional(),
        time: z.string().optional(),
        location: z.string().optional(),
        published: z.string().datetime(),
        media: z.array(
          z.object({
            id: z.string(),
            title: z.string().optional(),
            alt: z.string().optional(),
            image: z.string(),
            imageUrl: z.string().optional(),
            liveVideo: z.string().optional(),
            liveVideoUrl: z.string().optional(),
            width: z.number(),
            height: z.number(),
            takenAt: z.string(),
            camera: z
              .object({
                model: z.string().optional(),
                lens: z.string().optional(),
                focalLength: z.string().optional(),
                aperture: z.string().optional(),
                iso: z.string().optional(),
                shutter: z.string().optional(),
                ev: z.string().optional(),
                resolution: z.string().optional(),
                colorProfile: z.string().optional(),
                liveDuration: z.string().optional(),
                format: z.string().optional(),
              })
              .optional(),
          }),
        ),
      }),
    }),
  },
})
