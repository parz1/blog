import { z } from 'zod'
import {
  contentAuthorIds,
  contentAuthorRoles,
  isValidContentCredits,
} from '../utils/contentAuthors.ts'
const authorsSchema = z
  .array(
    z
      .object({
        id: z.enum(contentAuthorIds),
        roles: z
          .array(z.enum(contentAuthorRoles))
          .min(1)
          .refine(
            (roles) => new Set(roles).size === roles.length,
            'Duplicate contribution roles',
          )
          .optional(),
      })
      .strict(),
  )
  .min(1)
  .refine(
    isValidContentCredits,
    'Each author and contribution role must appear once',
  )

const articleSchema = z.object({
  authors: authorsSchema,
  title: z.string(),
  slug: z.string().optional(),
  kind: z.enum(['post', 'log', 'crap']),
  lang: z.enum(['cn', 'ja', 'en']).default('cn').optional(),
  description: z.string().optional(),
  notice: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  cover: z.string().optional(),
  published: z.string().datetime(),
})

const columnChapterSchema = z
  .object({
    id: z.string(),
    workingTitle: z.string(),
    summary: z.string().optional(),
    state: z.enum(['planned', 'learning', 'writing', 'published', 'revising']),
    articleSlug: z.string().optional(),
    role: z.enum(['core', 'supplemental']).default('core').optional(),
  })
  .refine(
    (chapter) => chapter.state !== 'published' || Boolean(chapter.articleSlug),
    {
      message: 'Published chapters must reference an articleSlug',
      path: ['articleSlug'],
    },
  )

export const contentSchemas = {
  pages: z.object({
    authors: authorsSchema,
    title: z.string(),
    slug: z.string().optional(),
    description: z.string().optional(),
    lang: z.enum(['cn', 'ja', 'en']).default('cn').optional(),
  }),
  concepts: z.object({
    authors: authorsSchema,
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
  entities: z.object({
    authors: authorsSchema,
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
  projects: z.object({
    authors: authorsSchema,
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
  articles: articleSchema,
  columns: z.object({
    title: z.string(),
    slug: z.string(),
    lang: z.enum(['cn', 'ja', 'en']).default('cn').optional(),
    description: z.string(),
    status: z.enum(['active', 'completed', 'paused']),
    authors: authorsSchema,
    started: z.number().int().optional(),
    question: z.string().optional(),
    thesis: z.string().optional(),
    scope: z.array(z.string()).optional(),
    updated: z.string(),
    cover: z.string().optional(),
    tags: z.array(z.string()).optional(),
    sections: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        chapters: z.array(columnChapterSchema),
      }),
    ),
  }),
  gallery: z.object({
    authors: authorsSchema,
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
}
