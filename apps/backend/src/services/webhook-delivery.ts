import crypto from "node:crypto";
import { logger } from "../logger.ts";
import { checkEgress } from "../utils/egress-guard.ts";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const TIMEOUT_MS = 10_000;

function computeSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function deliverWebhook(
  url: string,
  payload: string,
  signingSecret: string,
  timestamp: string,
  customHeaders: Record<string, string> | null,
): Promise<void> {
  const signature = computeSignature(payload, signingSecret);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAYS[attempt - 1]),
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // Checked on every attempt: the URL's DNS records can change between
      // retries, and a Webhook URL is user-supplied, so it gets the same egress
      // policy as a model-chosen one.
      const egress = await checkEgress(url);
      if (!egress.allowed) {
        logger.warn(
          { url, reason: egress.reason },
          "Webhook delivery blocked by network policy",
        );
        return;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": timestamp,
        ...customHeaders,
      };

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: payload,
        // Redirects are not followed: a redirect target would skip the egress
        // check above. A 3xx is a non-OK response like any other.
        redirect: "manual",
        signal: controller.signal,
      });

      if (response.ok) {
        logger.info(
          { url, attempt: attempt + 1 },
          "Webhook delivered successfully",
        );
        return;
      }

      logger.warn(
        { url, status: response.status, attempt: attempt + 1 },
        "Webhook delivery failed with non-OK status",
      );
    } catch (error) {
      logger.warn(
        {
          url,
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        },
        "Webhook delivery attempt failed",
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  logger.error({ url }, "Webhook delivery exhausted all retries");
}
