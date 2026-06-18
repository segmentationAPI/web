# Marketing blog authoring

Blog posts are local MDX files in this directory. Publishing is git-based: add or edit an `.mdx` file, open a PR, and deploy the marketing app.

## File and slug rules

- Use lowercase kebab-case file names, for example `sam-3-api-production-guide.mdx`.
- The file name becomes the public slug: `sam-3-api-production-guide.mdx` → `/blog/sam-3-api-production-guide`.
- Slugs may contain lowercase letters, numbers, and single dashes only.

## Required metadata

Every post must export a `metadata` object before the body:

```mdx
export const metadata = {
  title: "Post title",
  description: "Short SEO description.",
  publishedAt: "2026-06-10",
  updatedAt: "2026-06-12",
  tags: ["SAM 3", "API"],
  published: true,
};

# Post title
```

- `title`, `description`, and `publishedAt` are required strings.
- `updatedAt` is optional and should be added when materially updating a post.
- `tags` is required and must be an array of strings.
- `published` is required. Set it to `false` to keep a draft out of `/blog`, `/blog/[slug]`, and the sitemap.

## Images and MDX components

- Prefer shared blog images hosted from `https://assets.segmentationapi.com/images/`.
- Store blog image objects in the `segmentationapi-blog-assets` S3 bucket under the `images/` prefix. For example, `s3://segmentationapi-blog-assets/images/example.webp` is served at `https://assets.segmentationapi.com/images/example.webp`.
- AVIF files are fine for blog assets; upload them with the `image/avif` content type.
- Local-only images can still live in `apps/marketing/public` and be referenced with root-relative paths like `/blog/example.png`.
- Markdown images are supported. If width and height are needed, use the global MDX `Image` component:

```mdx
<Image src="/blog/example.png" alt="Example segmentation result" width={1200} height={630} />
```

- A global `Callout` component is available for short notes:

```mdx
<Callout title="Production note">Keep the note concise and useful.</Callout>
```

## Validation

Do not run app builds for this repo. Use:

```bash
pnpm --filter marketing check-types
pnpm --filter marketing lint
pnpm --filter marketing format:check
```
