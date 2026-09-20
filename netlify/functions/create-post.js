const crypto = require("crypto");

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}

function authorized(event) {
  const expected = process.env.BLOG_WRITER_TOKEN;
  if (!expected) return false;
  const header = event.headers.authorization || event.headers.Authorization;
  if (!header || !header.startsWith("Bearer ")) return false;
  const got = header.slice(7);
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "post";
}

function extOf(name) {
  const i = (name || "").lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function stripDataPrefix(b64) {
  const m = /^data:[\w/+.-]+;base64,/.exec(b64);
  return m ? b64.slice(m[0].length) : b64;
}

async function gh(path, pat, init) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(init && init.headers) },
  });
  return res;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "method-not-allowed" });
  if (!authorized(event)) return json(401, { error: "unauthorized" });

  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const pat = process.env.GITHUB_PAT;
  if (!repo || !pat) return json(500, { error: "server-misconfigured" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "invalid-json" });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const html = typeof body.html === "string" ? body.html : "";
  const imageName = typeof body.imageName === "string" ? body.imageName : "";
  let imageB64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  if (!title) return json(400, { error: "title-required" });
  if (!html.trim()) return json(400, { error: "html-required" });
  if (!imageB64) return json(400, { error: "image-required" });

  const ext = extOf(imageName);
  if (!ALLOWED_EXTS.has(ext)) return json(400, { error: "image-type-not-allowed" });

  imageB64 = stripDataPrefix(imageB64);
  let imageBytes;
  try {
    imageBytes = Buffer.from(imageB64, "base64");
  } catch {
    return json(400, { error: "image-not-base64" });
  }
  if (imageBytes.length === 0) return json(400, { error: "image-empty" });
  if (imageBytes.length > MAX_IMAGE_BYTES) return json(413, { error: "image-too-large" });

  let slug = typeof body.slug === "string" && body.slug.trim() ? body.slug.trim().toLowerCase() : slugify(title);
  if (!/^[a-z0-9-]+$/.test(slug)) return json(400, { error: "invalid-slug" });

  let date = new Date().toISOString();
  if (body.date) {
    const d = new Date(body.date);
    if (isNaN(d.getTime())) return json(400, { error: "invalid-date" });
    date = d.toISOString();
  }

  // 409 if slug already exists
  const check = await gh(`/repos/${repo}/contents/content/posts/${slug}/index.md?ref=${encodeURIComponent(branch)}`, pat);
  if (check.status === 200) return json(409, { error: "slug-exists", slug });
  if (check.status !== 404) return json(502, { error: "github-check-failed" });

  const md = `+++\ntitle = ${JSON.stringify(title)}\ndate = ${JSON.stringify(date)}\nslug = ${JSON.stringify(slug)}\n+++\n\n${html}\n`;
  const mdB64 = Buffer.from(md, "utf8").toString("base64");
  const msg = `post: ${slug}`;

  const putMd = await gh(`/repos/${repo}/contents/content/posts/${slug}/index.md`, pat, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg, content: mdB64, branch }),
  });
  if (!putMd.ok) return json(502, { error: "github-write-md-failed" });
  const mdSha = (await putMd.json()).content.sha;

  const putImg = await gh(`/repos/${repo}/contents/content/posts/${slug}/cover${ext}`, pat, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg, content: imageB64, branch }),
  });
  if (!putImg.ok) return json(502, { error: "github-write-image-failed", mdSha });
  const imgSha = (await putImg.json()).content.sha;

  return json(201, { slug, url: `/posts/${slug}/`, mdSha, imgSha });
};
