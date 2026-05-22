---
name: obsidian-blog-post-review
description: Validates and editorially reviews Obsidian-written Markdown posts before publishing them to this Astro site's journal. Use when the user provides a path to a blog post/note from Obsidian and asks to validate, revise, publish, copy, or prepare it for the site.
---

# Obsidian Blog Post Review

Use this skill to take a Markdown post from the Obsidian vault, validate compatibility with `themoraes`, and perform an editorial review before publication.

## Inputs

Ask for the Obsidian post path if not provided. Default site root is `/home/mswell/Projects/themoraes`.

Expected destination collection: `src/content/journal`.

## Workflow

1. **Read context and source**
   - Read the indicated `.md`/`.mdx` file.
   - If needed, read `src/content/config.ts` and nearby published posts for current conventions.

2. **Run deterministic compatibility validation**
   - From the site root, run:
     ```bash
     node /home/mswell/.pi/agent/skills/obsidian-blog-post-review/scripts/validate-post.mjs '<OBSIDIAN_POST_PATH>' /home/mswell/Projects/themoraes
     ```
   - Treat `issues` as blockers, `warnings` as review items, and `suggestions` as optional improvements.

3. **Compatibility checklist**
   - Frontmatter must match the Astro content schema:
     ```yaml
     ---
     title: "Post title"
     description: "Short summary for listing, SEO, and RSS."
     pubDate: YYYY-MM-DD
     tags: ["tag 1", "tag 2"]
     lang: "pt-BR" # or "en"
     draft: true # use false only when ready to publish
     ---
     ```
   - File name should be kebab-case, e.g. `minha-nota-de-campo.md`.
   - Remove or convert Obsidian-only syntax: `[[wikilinks]]`, `![[embeds]]`, loose body `#tags`, unsupported callouts.
   - Prefer body headings from `##` down; the site renders the title as the H1.
   - Check fenced code blocks are closed and language labels are reasonable.
   - Images must be publishable Markdown/site paths. Obsidian embeds (`![[image.png]]`) must be converted. A root-relative Markdown image like `![alt](/images/foo.png)` may not preview inside Obsidian, but it will render on the Astro site if the file exists under the site's `public/images/foo.png` (or equivalent served public path).

4. **Editorial review**
   - Review language correctness according to `lang` (`pt-BR` or `en`).
   - Preserve the author's voice: field notes/lab notebook, technical, personal, non-corporate.
   - In pt-BR informal posts, avoid using em dashes (`—`) as a default polishing device. Prefer short sentences, commas, parentheses, or colons when they sound more natural in the author's voice.
   - Check the story arc: hook/opening, context, observation/problem, example/evidence, learning/closing.
   - Flag unclear claims, abrupt jumps, duplicated ideas, weak ending, excessive jargon, or missing context.
   - Suggest title/description improvements when they are vague, too long, or not aligned with the post.
   - Do not invent technical facts. Mark missing evidence as a question or TODO.

5. **Index/table of contents and drafting scaffold**
   - Suggest an index when the post has 4+ `##` sections or roughly 900+ words.
   - Use plain Markdown links only:
     ```md
     ## Índice

     - [Contexto](#contexto)
     - [Nota de campo](#nota-de-campo)
     ```
   - Do not add an index to short notes unless it improves scanning.
   - Section labels such as `Contexto`, `Nota de campo`, and `Fechamento` may be useful as a drafting/template scaffold, but remove those labels from the final published post unless the user explicitly wants an editorial sectioned format. In final copy, turn them into natural opening/body/closing prose.

6. **Output to user**
   - Provide a concise report with:
     - compatibility status: ready / blocked / ready with warnings;
     - blockers;
     - editorial fixes;
     - suggested frontmatter changes;
     - suggested index, if needed;
     - publication path and slug.
   - Ask before editing the Obsidian file or copying into `src/content/journal`.

## Publishing assistance

Only after user approval:

1. Apply edits to the Obsidian source or create a cleaned copy.
2. Copy/write the post into `/home/mswell/Projects/themoraes/src/content/journal/<slug>.md`.
3. Run project validation, usually:
   ```bash
   npm run build
   ```
   If preview/dev is needed, use Docker for this project: `docker compose up`.

## Tone for suggestions

Be direct and practical. Prefer small diffs and explain why each change improves compatibility, readability, or publication quality.
