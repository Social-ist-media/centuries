# NEXUS desk

Single-deploy desk for the social aggregator. Chronological feed, studio connections, cross-post composer, ledger, mentions, and pulse.

The original apps/web + apps/api split cannot deploy on Vercel alone: the web client expects a long-running Fastify API, the default branch is not main, and Prisma is still SQLite. These files do not replace apps/web or apps/api.

Live posting to X, Threads, and Instagram still waits on developer apps. Bluesky and Mastodon public timelines can be pulled by handle. Credentials are not stored.
