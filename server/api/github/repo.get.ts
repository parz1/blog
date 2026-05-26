type GitHubRepo = {
  default_branch: string
  description: string | null
  forks_count: number
  full_name: string
  html_url: string
  open_issues_count: number
  pushed_at: string
  stargazers_count: number
  watchers_count: number
}

type GitHubRelease = {
  body: string | null
  html_url: string
  name: string | null
  prerelease: boolean
  published_at: string | null
  tag_name: string
}

type GitHubCommit = {
  html_url: string
  sha: string
  commit: {
    author: {
      date: string
      name: string
    } | null
    message: string
  }
}

const githubHeaders = (token: string) => ({
  accept: 'application/vnd.github+json',
  authorization: `Bearer ${token}`,
  'x-github-api-version': '2022-11-28',
})

const parseName = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback

  const normalized = value.trim()
  return normalized || fallback
}

const firstLine = (value: string) => value.split('\n')[0]?.trim() ?? value

export default defineCachedEventHandler(
  async (event) => {
    const config = useRuntimeConfig(event)
    const token = config.githubToken

    if (!token) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing GitHub token',
        message:
          'Set NUXT_GITHUB_TOKEN or GITHUB_TOKEN to load project GitHub status.',
      })
    }

    const query = getQuery(event)
    const owner = parseName(query.owner, 'minerei-devs')
    const repoName = parseName(query.repo, 'leclog')
    const baseUrl = `https://api.github.com/repos/${owner}/${repoName}`
    const headers = githubHeaders(token)

    const [repo, releases, commits] = await Promise.all([
      $fetch<GitHubRepo>(baseUrl, { headers }),
      $fetch<GitHubRelease[]>(`${baseUrl}/releases`, {
        headers,
        query: { per_page: 5 },
      }),
      $fetch<GitHubCommit[]>(`${baseUrl}/commits`, {
        headers,
        query: { per_page: 8 },
      }),
    ])

    return {
      repo: {
        defaultBranch: repo.default_branch,
        description: repo.description,
        forks: repo.forks_count,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        openIssues: repo.open_issues_count,
        pushedAt: repo.pushed_at,
        stars: repo.stargazers_count,
        watchers: repo.watchers_count,
      },
      latestRelease: releases[0]
        ? {
            body: releases[0].body,
            htmlUrl: releases[0].html_url,
            name: releases[0].name,
            prerelease: releases[0].prerelease,
            publishedAt: releases[0].published_at,
            tagName: releases[0].tag_name,
          }
        : null,
      releases: releases.map((release) => ({
        htmlUrl: release.html_url,
        name: release.name,
        prerelease: release.prerelease,
        publishedAt: release.published_at,
        tagName: release.tag_name,
      })),
      commits: commits.map((commit) => ({
        author: commit.commit.author?.name,
        date: commit.commit.author?.date,
        htmlUrl: commit.html_url,
        message: firstLine(commit.commit.message),
        sha: commit.sha.slice(0, 7),
      })),
    }
  },
  {
    maxAge: 600,
    name: 'github-repo-status',
    getKey: (event) => {
      const query = getQuery(event)
      const owner = parseName(query.owner, 'minerei-devs')
      const repo = parseName(query.repo, 'leclog')
      return `${owner}/${repo}`
    },
  },
)
