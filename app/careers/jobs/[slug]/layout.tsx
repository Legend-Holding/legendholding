import { query } from '@/lib/db';
import { generatePageMetadata } from '@/config/metadata';
import { parseJobSlug } from '@/lib/job-slug';

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<ReturnType<typeof generatePageMetadata>> {
  const { slug } = await props.params;
  const id = parseJobSlug(slug);

  const result = await query(
    `SELECT title FROM jobs WHERE id = $1 AND status = 'active' LIMIT 1`,
    [id],
  );
  const job = result.rows[0];

  const title = job?.title ? `${job.title}` : 'Job Opening';
  return generatePageMetadata({
    title,
    description:
      'Explore career opportunities at Legend Holding Group. Join our dynamic team and contribute to innovation across the Middle East.',
    keywords:
      'Legend Holding Group jobs, career opportunities, UAE employment, Middle East careers',
  });
}

export default function JobDetailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
