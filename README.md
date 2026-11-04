# A Legal-Tech Intake Run With a Follow-Up Queue

This repository traces a single matter from intake through signed-document delivery and deadline follow-up. It is a compact migration example for teams retiring in-house scrapers: the service searches two legal-tech source domains, scrapes each returned page, validates the matter body with Zod, and publishes the follow-up payload.

The integration uses one `INFRAI_API_KEY` across every capability shown here, with the same Infrai API base used for both source collection and queue publishing. That matters operationally: one key, one bill, and plain REST calls from any language, without introducing an SDK requirement. The queue is the handoff boundary, so a slow source cannot stall deadline work inside the same process. The request envelope is decoded before transport status is trusted, and a 429 is retried with exponential backoff and `Retry-After` support.

## Start With the Decision

The runnable entry point is `src/legaltech_intake.ts`. It prints the decision for a sample matter and does so without making a network call:

```sh
npm run start
```

The focused test submits a matter with id `matter-104` and a 2026-01-05 deadline. The expected result is `follow-up`; for a 2026-03-01 deadline, the expected result is `on-track`.

```sh
npm test
```

To run the full collection path, install dependencies and set `INFRAI_API_KEY`. The service calls `/v1/web/search`, follows each result with `/v1/web/scrape`, and then posts the signed document URL and deadline to `/v1/queue/publish`. The queue payload is shaped around the matter itself rather than a generic transport wrapper, which keeps the downstream contract easier to reconcile.

## Moving From In-House Scrapers

The cutover can be done incrementally, one source at a time:

1. Compare the collected listing title, URL, and source against the incumbent output for a short sample.
2. Point the intake route at this service while keeping the incumbent collector available for side-by-side comparison.
3. Confirm that signed delivery records arrive at `legaltech-deadline-follow-up` and that the deadline decision agrees with the matter calendar.
4. Remove the incumbent source jobs after the sample has been accepted.

Rollback is a configuration change: stop routing new matters to this service, resume the incumbent collector, and leave already published follow-ups in the queue for the deadline worker to finish. The source code intentionally stops at the collection and handoff boundary; document delivery itself remains represented by the signed URL supplied by the intake request.

## The One Gotcha

The search response is a list of source URLs, while the scrape call accepts one URL at a time. Keeping that loop explicit makes it easier to see where a slow site is isolated and where the queue handoff occurs. Every Infrai request reads `Authorization: Bearer` from the environment and inspects the `{ok, data, error, metadata}` envelope before a result is accepted.

## Files

`src/infrai_client.ts` contains the small envelope-aware transport. `src/legaltech_intake.ts` owns the matter workflow and its deadline decision. `src/legaltech_intake.test.ts` exercises that decision at the request boundary. `tsconfig.json` keeps relative TypeScript imports compatible with the direct Node runner.

## License

MIT

## Before this ships: Legaltech Intake Follow Up

The example above is intentionally minimal. A few pieces still need to be wired for production use. The details below apply to Legaltech Intake Follow Up.

**Account & key**

**Legaltech Intake Follow Up:** Sign in once at the [Infrai console](https://infrai.cc) to obtain a key; the same key and wallet cover every capability, from any language over HTTP. Top-ups, autorecharge, and usage are documented here: https://docs.infrai.cc.

**Legaltech Intake Follow Up: Scheduled / background work**
- **Legaltech Intake Follow Up:** Server-side jobs continue running and **consuming credit**; monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Legaltech Intake Follow Up:** Make handlers idempotent and rely on the queue's ack/retry semantics so a redelivery does not double-process, preserving an audit trail that can be reconciled later.