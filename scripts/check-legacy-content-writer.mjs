if (process.env.BLOG_CONTENT_MODE !== 'legacy') {
  console.error(
    'This gallery writer targets the rollback content directory. External blog-content media authoring is not adapted yet; use the workspace directly or explicitly select legacy mode for the old workflow.',
  )
  process.exitCode = 1
}
