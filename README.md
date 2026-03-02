# Creative Portfolio

I built this portfolio as a living archive of my creative work across photography, textbook sculpture, paper layering, and algorithmic art. I designed it for people who want to browse the work visually first, while still understanding the ideas and process behind each series.

## Why I Built This

I did not want a portfolio that felt like a static list of images. I wanted a system that presents each project as a cohesive body of work with its own visual identity.

I also wanted the site to be maintainable over time. My goal was to make updates simple: I can add a new project folder with media and metadata, and the site assembles the project page and index tile automatically.

## How the Portfolio Is Designed

The site is organized around four category entry points: `Photos`, `Textbook`, `Algo`, and `Paper`.

Each project page is designed with a consistent structure:

- A hero section that introduces the project title, date, and framing text.
- A media stream that lets the work unfold sequentially.
- A shared visual language that keeps the portfolio coherent while allowing each series to feel distinct.

For unreleased work, I use catalog placeholders labeled `Held for Submission`. These are intentionally designed cards rather than empty pages, so visitors can understand that a project exists in the series even when the full work cannot be published yet.

## What "Held for Submission" Means

Some calls for art require work to remain unpublished until decisions are complete. To respect that, I publish a designed placeholder instead of the full media.

Each placeholder includes:

- Title
- Year
- Medium
- Dimensions

What is intentionally withheld:

- Final images or videos
- Full process documentation
- Complete project media stream

## How I Add New Work

My update workflow is designed to be folder-first:

1. Create a folder at `src/content/<section>/<Project-Slug>/`.
2. Add project media into `src/content/<section>/<Project-Slug>/media/`.
3. Add a `page.json` file in `src/content/<section>/<Project-Slug>/`.
4. Build the site, and the project appears in the section index and gets its own detail page.

## Featured Series

- `Photos`: Film and digital photography series focused on repeated encounters in everyday scenes.
- `Textbook`: Carved textbook sculptures that reframe educational imagery as standalone visual art.
- `Algo`: Generative and algorithmic motion pieces.
- `Paper`: Layered paper works inspired by structure, depth, and architecture.

## For Technical Readers

This site is a static Astro 5 project with a content-driven architecture:

- `src/scripts/content.ts` loads `page.json` files and resolves media URLs with `import.meta.glob`.
- `src/content/placeholders.ts` defines placeholder projects and their visual tokens.
- Tailwind is configured through the Vite plugin in `astro.config.mjs`.
- Base-aware path helpers are used so links and assets work on GitHub Pages under `/creative`.

## Local Development

Run from the project root:

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Content Schema (Quick Reference)

In practice, each project `page.json` should include:

- Required fields: `title`, `slug`, `cover`, `media`
- Common fields: `dateCreated`, `displayDate`, `description`, `tags`, `options`
- Media item `type`: `image`, `video`, or `model`

Minimal example:

```json
{
  "title": "Project Title",
  "slug": "Project-Title",
  "dateCreated": "2026-01-15",
  "displayDate": "2026",
  "description": "Short project description.",
  "cover": "cover.jpg",
  "tags": ["tag-one", "tag-two"],
  "media": [
    {
      "type": "image",
      "src": "image-01.jpg",
      "alt": "Alt text",
      "caption": "Caption text"
    },
    {
      "type": "video",
      "src": "clip-01.mp4",
      "caption": "Video caption"
    },
    {
      "type": "model",
      "src": "model.glb",
      "usdz": "model.usdz"
    }
  ],
  "options": {
    "parallax": true,
    "bgFromDominantColor": true
  }
}
```

## Deployment

This site deploys to GitHub Pages through `.github/workflows/deploy.yml`.

- Push to `main` triggers the workflow.
- Astro is configured for Pages with `site` and `base` in `astro.config.mjs`.
- Deployment status can be checked in the GitHub `Actions` tab and `Settings -> Pages`.

Configured production URL:

- `https://morrisglr.github.io/creative/`

## Notes

This portfolio is intentionally iterative. Some projects appear as placeholders while they are held for submission or still in progress, and then transition into full project pages when publication is appropriate.

# Contact
Morris A. Aguilar, Ph.D.<br>
<a href= https://www.linkedin.com/in/morris-a-aguilar/ >LinkedIn</a><br>
