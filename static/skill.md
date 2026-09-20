---
name: kantsy-blog
description: Publish a post to the Kantsy blog (Hugo + Netlify) via its writer API. Use when the user asks to write, upload, or publish a blog post.
---

# Kantsy — how to publish a post

Kantsy (`https://kantsy.netlify.app/`) is a Hugo static blog hosted on Netlify.
Posts are published with one API call: the API commits the post to GitHub and
Netlify rebuilds the site (~30–60s).

## 1. Prepare the cover image

- One image per post: JPG, PNG, or WEBP, source file under 4MB (aim under ~500KB).
- Base64-encode it (`base64 -i cover.png | tr -d '\n'`). A `data:...;base64,` prefix is tolerated but unnecessary.

## 2. POST the post

```bash
curl -X POST https://kantsy.netlify.app/api/posts \
  -H "Authorization: Bearer $BLOG_WRITER_TOKEN" \
  -H "Content-Type: application/json" \
  -d @post.json
```

`post.json` fields:

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Non-empty string |
| `slug` | no | Auto-made from title if omitted. Lowercase letters, numbers, hyphens only |
| `date` | no | ISO-8601. Defaults to now |
| `imageBase64` | yes | Base64 cover image |
| `imageName` | yes | Original filename; only its extension is used (`cover.jpg`, `.jpeg`, `.png`, `.webp`) |
| `html` | yes | Raw HTML body, rendered as-is (trusted writer, no sanitization) |

## 3. Handle the response

- `201 {slug, url}` — published. Wait ~60s for the rebuild, then GET the URL and expect `200`.
- `401` — missing/wrong token. Stop and ask the user to check `BLOG_WRITER_TOKEN`.
- `409 {slug}` — slug already taken. Pick a new slug and retry; nothing is overwritten.
- `400` / `413` — validation failed (`title-required`, `html-required`, `image-required`, `image-type-not-allowed`, `image-too-large`, `invalid-slug`, `invalid-date`). Fix the field and retry.
- `5xx` — server or GitHub error. Report the response body to the user.

## 4. Verify live

- Post URL returns `200` and shows title, date, cover image, and body.
- Homepage lists the new post.

## Rules

- The writer token comes from the user's environment at call time. Never ask for it to be pasted, never print it, never write it to a file.
- There are no edit/delete endpoints in v1. To remove a post, delete its `content/posts/<slug>/` folder on GitHub (triggers a rebuild).
- Keep cover images small; the API rejects decoded images over 6MB.
