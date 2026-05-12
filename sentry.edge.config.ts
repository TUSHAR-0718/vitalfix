import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Completely disable Sentry in development to avoid proxy/DNS errors
  enabled: process.env.NODE_ENV === "production",

  sendDefaultPii: true,
  tracesSampleRate: 0.1,
});
