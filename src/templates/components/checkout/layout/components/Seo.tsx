import { jsx, Fragment } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export const Seo: FC<{ title?: string; description?: string }> = ({ title, description }) => (
  <>
    {title && <title>{title}</title>}
    {description && <meta name="description" content={description} />}
  </>
);
