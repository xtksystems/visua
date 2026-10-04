# Shutdown investigation

Hypothesis: the HTTP response completes but its keep-alive connection remains
open while the listener is closing. Confirm with response finish, socket close,
listener close, run drain, and store close timestamps in `debug-shutdown.ts`.
Earlier consuming response bodies fixed the idle-probe case but not the case
where shutdown begins during an active probe. No production service is touched.

Root cause confirmed: the probe response finished at 273 ms with
`keepAlive: true`; after the client consumed it at 303 ms, the server still had
one connection. Listener close and store drain began only at the 2,000 ms forced
connection-close deadline. Setting active responses to close their connection
on completion fixes this without cutting off their response bodies.

The SSE regression reveals a second connection case: headers are already sent
before shutdown. Node's `_http_outgoing` source derives `_last` from
`shouldKeepAlive` while storing headers, so changing the flag after an SSE ready
event cannot retroactively close the connection. End a drained socket at its
last active response's finish; track pipelined responses per socket so one
completed response cannot truncate another active response.

Postgres integration diagnosis: the original SSO unknown-DNS case timed out
at 30 seconds while simulating 217 hourly ticks across ten days. A separate
throwaway Postgres run with the original suite and `--testTimeout=60000`
passed all 11 cases in 64.61 seconds. Product domain logic was unchanged.
Replace redundant hourly ticks with explicit one-hour retry boundaries and
11 unknown-DNS observations across ten days, retaining the period and stronger
lookup-count assertions. Final checks will use the original 30-second limit.
