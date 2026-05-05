# Legend Holding Group Website

A modern, responsive website for Legend Holding Group built with Next.js 15, React 19, and Tailwind CSS.

## Features

- Modern UI/UX with responsive design
- Brand logo carousel
- News section
- Hero section with video background
- Interactive components and animations



## Tech Stack

- Next.js 15.2.4
- React 19.1.0
- TypeScript
- Tailwind CSS
- Radix UI Components
- Lucide React Icons
- clsx & tailwind-merge for conditional styling

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/legendwebnew.git
cd legendwebnew
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Staging Environment (Non-Production)

Staging uses a separate env file (`.env.staging`) and connects directly to a self-hosted Postgres instead of Supabase.

1. Create `.env.staging` from the template:

```bash
cp .env.staging.example .env.staging
```

2. Fill in staging-only values (do not reuse production secrets). Required Postgres vars:

- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_SSL`
- `APP_ENV=staging`, `NEXT_PUBLIC_APP_ENV=staging`

If the password contains special characters (`$ ! # & @ ^`), wrap it in double quotes in the file.

3. Verify the DB connection:

```bash
npm run db:test:staging
```

4. Run staging scripts:

```bash
npm run dev:staging
npm run build:staging
npm run start:staging
```

The Postgres pool is exposed via `lib/db.ts` (`query`, `withTransaction`, `checkDbConnection`).

### Build

To create a production build:

```bash
pnpm build
```

To start the production server:

```bash
pnpm start
```

## Project Structure

- `/app` - Next.js app router pages and layouts
- `/components` - Reusable React components
- `/lib` - Utility functions and shared code
- `/public` - Static assets
- `/styles` - Global styles and Tailwind CSS configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
