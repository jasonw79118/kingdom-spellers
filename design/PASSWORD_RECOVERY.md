# Password recovery - 2026-10-23

Implemented parent-account recovery for the deployed Appwrite provider. Sign In now links to Forgot password; the provider sends a one-hour email link, and a public reset screen accepts a confirmed 8-256 character password. No account, player, mastery, reward, or database schema changes.

The callback uses the current origin and pathname with ?passwordRecovery=1, preserving GitHub Pages subpaths without relying on server-side routes or fragment query behavior. Before React renders, main.jsx extracts the userId and secret into module memory, removes recovery parameters from browser history, and routes to #/reset-password. Credentials are cleared after success and never written to local/session storage. Refreshing the cleaned page requires reopening the email link. Appwrite validates expiration and single use server-side; no client-only authorization.

Unknown-email errors receive the same generic completion message. Delivery/configuration and rate-limit errors remain visible without exposing SDK diagnostics. No automatic sign-in or sign-out is performed. Existing passwords and sign-in behavior remain unchanged until a valid recovery is completed.

Local demo recovery is explicitly unavailable: there is no email service and no insecure email-only password replacement. The unused Supabase fallback retains its existing auth behavior; this new recovery UI explicitly directs its users to administrator support rather than pretending Appwrite links will work.

Deployment prerequisite: the live hostname must remain in the Appwrite Web platform allowlist, and Appwrite recovery email delivery must be enabled. No private keys or new environment variables are required. Vite configuration stays unchanged. Actual email delivery and a real mailbox-to-password-change round trip require a controlled live-account check after deployment; automated browser requests use synthetic tokens and intercepted API responses only.

Validation: npm run test:recovery, npm run test:recovery:browser, npm test, npm run build, git diff --check. Browser coverage includes email submission, callback routing, URL scrubbing, mismatch rejection, update request, success, safe refresh, expired token, and 375px layout. Not deployed by this implementation task.
