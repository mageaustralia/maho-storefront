/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface AnnouncementBarProps {
  text: string;
  bgColor?: string;
  textColor?: string;
  link?: string | null;
  dismissible?: boolean;
}

/**
 * Announcement Bar — sitewide content bar above the header.
 *
 * Displays promotional text (free shipping, sale announcements, etc.).
 * Configured per-store via page config `announcementBar` section.
 * Can be dismissed by the user (stored in sessionStorage).
 */
export const AnnouncementBar: FC<AnnouncementBarProps> = ({
  text,
  bgColor,
  textColor,
  link,
  dismissible = true,
}) => {
  const style = [
    bgColor ? `background-color:${bgColor}` : '',
    textColor ? `color:${textColor}` : '',
  ].filter(Boolean).join(';');

  const defaultClasses = !bgColor ? 'bg-primary text-primary-content' : '';

  return (
    <div
      id="announcement-bar"
      class={`text-center text-sm font-medium py-2 px-8 relative ${defaultClasses}`}
      style={style || undefined}
      data-controller="announcement-bar"
      data-turbo-permanent
    >
      {link ? (
        <a href={link} class="no-underline hover:underline" style={textColor ? `color:${textColor}` : undefined}>
          {text}
        </a>
      ) : (
        <span>{text}</span>
      )}
      {dismissible && (
        <button
          class="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
          data-action="announcement-bar#dismiss"
          aria-label="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}
    </div>
  );
};
