/**
 * Umami, self-hosted on analytics.leonardsima.de. The instance runs on the same
 * machine as the app, so nothing leaves our own infrastructure.
 *
 * The website id and host sit here rather than in an env var: the id is visible
 * in the served HTML anyway, and this way a deploy needs no configuration.
 * `UMAMI_DOMAINS` keeps a local dev server or a preview out of the stats.
 */

export const UMAMI_SRC = "https://analytics.leonardsima.de/script.js";
export const UMAMI_WEBSITE_ID = "5a56cbbf-f16e-41cf-9705-48b8370ec94d";
export const UMAMI_DOMAINS = "dtu-semester.leonardsima.de";
