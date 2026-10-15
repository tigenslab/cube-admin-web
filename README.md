# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Course content

Open a course and select **Course content** to manage its outline, units, and
unit blocks at `/courses/{id}/content`.

Create units in the **Units** tab, then add unit references and groups in the
**Course outline** tab. In **Unit blocks**, select a unit to manage groups,
theory blocks, assessment blocks, and links to other blocks. Parent and position
fields control the outline order. Descriptions are available through **View**.

Editing follows the API's course permissions and requires a draft course.
Deletion prompts for confirmation and displays dependency errors from the API.
The frontend uses the nested course-content endpoints under the configured
`NUXT_PUBLIC_API_BASE`; deploy the API and initialize its content tables first.
