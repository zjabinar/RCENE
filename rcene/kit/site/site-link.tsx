import type { ComponentProps } from "react";
import { Link } from "react-router";

/** The page container every site block lines up on (max-w-7xl, responsive gutters). */
export const SITE_CONTAINER = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

/** True for an in-app route ("/about"), false for "#anchor", "mailto:", "https://…" or "//host". */
export function isRoute(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export interface SiteLinkProps extends Omit<ComponentProps<"a">, "href"> {
  /** "/route" uses the router (no reload); anything else ("#section", "https://…") is a plain link. */
  to: string;
}

/**
 * One link for site blocks: a react-router <Link> for in-app routes, a plain
 * <a> for in-page anchors and external URLs (those don't need a router).
 */
export function SiteLink({ to, ...props }: SiteLinkProps) {
  if (isRoute(to)) return <Link to={to} {...props} />;
  return <a href={to} {...props} />;
}
