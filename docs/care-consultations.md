# Care: appointments and consultations

The main web Care screen contains upcoming appointments and doctor availability. Full appointment history is available through View all appointments. Messages, payment history/refund requests and referrals remain reachable through the secondary tools, including their existing deep links. The floating assistant is omitted on Care so it cannot cover booking or payment controls.

## Consultation types

Each provider-owned availability slot is either `online` (the default for all existing slots) or `in_person`. In-person slots require a nonblank clinic address of at most 500 characters. Online slots must have a blank clinic address. The core validates the type/address, and a database constraint rejects incompatible combinations. Availability overlap rules still apply across both types, so a practitioner cannot offer two simultaneous visits.

The scheduler filters times by consultation type, shows the clinic address for in-person times, and repeats the type/address during review and final confirmation. Changing type clears any selected time. The fee remains the provider's existing per-consultation fee for both types; no separate pricing or amount supplied by a client is accepted.

Appointment responses expose the booked slot's read-only type and address. Slot times/type/location have no update endpoint, consistent with the existing booked-slot design. Rescheduling must keep the same practitioner and consultation type. Changing type requires cancellation and a new booking. A replacement clinic address, if different, is shown during rescheduling review. Changing the selected child clears the active scheduler/reschedule state.

Only confirmed/in-progress online appointments offer Join online visit. The button reflects the server's video-readiness flag, and the join API independently verifies the type, status, parties, live authorization and consultation time window. In-person bookings never receive a video token. Video revocation processing excludes in-person appointments. No video meeting was performed by the synthetic UI checks.

The existing native client also labels consultation types and clinic addresses in slot choices/review, hides video join for in-person visits and filters rescheduling to the same type. Native hardware/audio/video behavior is not established by the type and unit checks.

## Payment status

Razorpay checkout, provider orders, signed webhooks, reconciliation and refunds already exist. This change reuses those transitions for both consultation types. A reservation remains awaiting payment until server-side confirmation; closing checkout or a client callback does not itself mark it paid. Booking checks payment readiness and the selected clinician's child-record authorization before creating a hold.

The current adapter permits sandbox operation and rejects live Razorpay keys. Care explicitly labels sandbox readiness and unavailable payments. Neither a test doctor nor a simulated checkout represents a real medical service or proof of successful real payments. This change does not activate live payments, configure credentials, or bypass the existing activation controls. LiveKit credentials, hosted worker/revocation readiness, and actual two-party audio/video also require separate production verification.

## Deploy and verify

Migration `0013_slot_clinic_address_slot_consultation_mode_and_more` (after the milestone migration) was applied to the hosted database on 26 October 2026. It defaults existing slots to online and preserves bookings/payments. Both Django migration-history entries were verified, with row-level security enabled and no anonymous/authenticated table grants on the new milestone table.

Core tests: `python manage.py test api.test_finance api.tests --noinput` from `services/core`. The added cases cover address/type validation, API authority, an in-person reservation/payment transition using the local simulator, denial of in-person video tokens, same-type rescheduling and revocation isolation.

Web: from `apps/web`, run `node scripts/check-care-dashboard.mjs` and `node scripts/check-booking-flow.mjs`. These use the real components with synthetic API responses and a mocked Razorpay client; they do not contact a real payment processor or doctor. CI runs them alongside the existing milestone, responsive, type and unit checks. Screenshots are temporary files under `/tmp/neuronest-care`.

## Dr. Keerthy S profile

Care displays the supplied Dr. Keerthy S information with an official NIPMR department link, replacing the demo-doctor cards in both web and native directories. The supplied fee is ₹250, with Monday–Friday hours of 10:30 am–3 pm IST excluding lunch. The lunch-break interval has not been supplied; no times or booking slots are generated from these hours. Qualifications and fee/availability are labelled as provided, rather than credential-verified by NeuroNest.

This is an informational profile with no practitioner/account identifier, appointment action or payment action. No doctor account is created or linked. Existing test practitioners, bookings and payments are preserved in storage; their cards are omitted from the directory. An actual approved provider account, confirmed availability and operational payment configuration are still required for in-app reservations. The pending-provider staging command retains its existing verification requirements and is not run by the app.

The deployed public readiness endpoint was checked on 26 October 2026: payments reported `ready: false`, `mode: unavailable`, `policy_ready: false`. This is a point-in-time observation, not proof that credentials or the worker are configured. Local browser checkout and finance tests use synthetic services; no real charge was attempted.

## Independent Razorpay test checkout

Care → Payments → Razorpay test checkout creates a fixed ₹250 (25,000 paise) INR test order for an authenticated active parent. The order contains only a project-test marker and the parent's opaque account ID in Razorpay notes; it contains no child, doctor, appointment, medical information or clinical consent. Dr. Keerthy stays unlinked and no consultation is booked. The test result is separate from booking-payment history, and the order remains available in Razorpay's test dashboard. Reloading this demo panel clears its local order display; it does not alter the provider order.

`POST /v1/payment-demo/` accepts an empty body only. `GET /v1/payment-demo/{order_id}/` fetches the order directly from Razorpay and verifies its purpose, owner, amount and currency. Only a fully paid order is shown as confirmed. Checkout close/failure and a client handler call do not themselves confirm payment. An unpaid order is reused when reopening checkout. There are no automatic charges, provider transfers or clinical entitlements.

This path requires real Razorpay **test** credentials (`rzp_test_…`) on the backend. Live and malformed key prefixes are rejected before contacting the provider. `/v1/readiness/` reports its configuration separately as `payment_demo`; `payments` continues to describe consultation bookings and retains the approved-policy, worker and consent gates. No production policy approval is fabricated and `DEMO_MODE` remains disabled on the production host.

Verification: `api.test_payment_demo` covers authorization, ownership, tampering, test-only keys, provider-result validation, confirmation and clinical-policy isolation without any database queries. `node scripts/check-payment-demo.mjs` exercises pending, close/reopen, failure, provider-error, server-confirmed success, absent configuration and script-loading failure through the actual web UI with synthetic services. A configured readiness flag is not proof of provider connectivity or a completed Razorpay test-card transaction.

### Hosted verification, 26 October 2026

The frontend (`dpl_DCE143Xb57ZnnYBa8Tp5LoCRTGH4`) and core (`dpl_A7kAKQKka8LQZ3i3s4JSc6nHDtrL`) were deployed and promoted. Live readiness reports `payment_demo` ready in sandbox mode and consultation `payments` unavailable. Care visibly shows Dr. Keerthy's informational profile without a linked practitioner account. The standalone checkout is also accessible before adding a child.

The hosted API successfully created genuine Razorpay test orders, and the widget opened with the Test Mode ribbon and ₹250 amount. The mock netbanking page did not open in the in-app browser; the published dummy-card flow stalled at Sending OTP, and the Chrome checkout frame remained blank. No successful provider-captured payment was observed, so end-to-end sandbox payment success remains unverified. No real charge, saved card or appointment was created. Pending test orders remain in the provider dashboard.

The final backend suite passed 173 tests with three skips. Web unit/type/build checks and the synthetic checkout browser cases passed; these do not substitute for completing the outstanding provider sandbox authentication step.

## Project-review bookings, 27 October 2026

Care now includes four explicitly fictional providers: Asha (general pediatrics, ₹100), Nila (developmental pediatrics, ₹150), Arun (pediatric neurology, ₹200), and Mira (child psychiatry, ₹300). Their 30-minute slots cover weekdays from 10:30 am to 3 pm IST, excluding 12:30–1:30 pm. Online and in-person slots occupy separate times. Dr. Keerthy remains an informational, unlinked profile.

`SANDBOX_BOOKING_ENABLED=true` and configured Razorpay test credentials enable this fixed catalogue separately from clinical booking readiness. Book an appointment refreshes the catalogue through authenticated `POST /v1/demo-bookings/prepare/`; no client-supplied names, fees or accounts are accepted. The reserved fictional accounts have unusable passwords. These bookings create no child-record grants and cannot pay out to providers. Real-provider authorization and approved-policy requirements remain in place.

Checkout confirmation uses `POST /v1/payments/{id}/verify/` for the booking parent only. The server fetches Razorpay evidence and retains order, amount, currency, capture and hold-expiry checks; a client callback cannot mark a booking paid. Payments also offers manual status verification after refreshing or closing checkout.

Verification on the live production aliases: four profiles and price tiers appeared; a ₹100 online hold persisted after refresh and was cancelled after unsuccessful embedded-browser authentication. In Chrome, an actual ₹150 Razorpay test-card transaction completed through the provider's mock-bank Success page. NeuroNest then displayed `confirmed`, retained that status after reload, and showed the provider order as `captured` in Payments. The saved example belongs to the explicitly labelled Review Child — Synthetic profile. No real payment or clinical consultation occurred. The in-app browser stalled at the provider bank redirect; use Chrome for the review. Public test-card details are documented by [Razorpay](https://razorpay.com/docs/payments/payments/test-card-details/).

The four automated UI scenarios cover all fee tiers, both consultation types, desktop/mobile widths, English/Malayalam, slot holds, absence of record grants and server-verified confirmation using mocked services (`node scripts/check-demo-booking.mjs`). Core sandbox/fixture/finance/payment-demo tests passed (58 tests, one existing skip), as did the separate 53-test core regression group and web unit/type/build checks. These automated results are separate from the provider-captured Chrome transaction above. Two-party video calls and real clinical bookings were not tested.


## Online demo consultations, 27 October 2026

The LiveKit Cloud project **NeuroNest Demo** is connected through server-only Production values `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` on neuronest-core. Agent observability is disabled; no recording/egress workflow was enabled. The public video-readiness flag now reports ready. Core deployment `dpl_CUz2NoCgdBvqjocb9NDFCumAVyQe` and web deployment `dpl_EBu31dbbpArAyKc95NSR7dpCmGD4` are live.

A confirmed online demo booking offers **Join online visit**. Its booking parent can open **Open demo doctor view**, which opens a second authenticated tab with a distinct, room-scoped fictional-doctor identity. This does not create a doctor login, clinical grant or access to child records. The server checks booking ownership, active family access, confirmed status, online mode, the fixed demo-provider identity, enabled test credentials and a healthy revocation worker. Tokens expire after two minutes and have no room-administration or recording grant. The doctor-view URL retains its role after refresh. Camera and microphone start off and can be enabled through the call controls.

Paid fictional visits can be joined immediately for a project demonstration, until 30 minutes after the scheduled end. Real-provider visits keep their scheduled opening time, clinician standing and record-access requirements. In-person, unpaid, cancelled and closed visits do not issue video tokens. Cancellation now removes connected participants through the worker, including additional guardians; the Cloud request sets an explicit token-revocation cutoff as described in the [LiveKit participant documentation](https://docs.livekit.io/intro/basics/rooms-participants-tracks/participants/#remove-participant).

Live verification used **Review Child — Synthetic**: a fresh ₹100 online booking for 28 October at 2:30 pm IST completed Razorpay's actual sandbox bank flow, became confirmed, survived refresh, and admitted both Demo parent and Demo Dr. Asha into the same provider room. The LiveKit room API independently returned both participants. Doctor refresh and both sides' leave/rejoin behavior were exercised without enabling physical cameras or microphones. The confirmed booking remains available for the review.

Separately, the actual React call interface was tested at 1440 px and 390 px using synthetic application-API responses and a real LiveKit Cloud connection. Two browser clients exchanged generated microphone audio and camera video; inbound audio bytes, decoded video frames and rendered video-frame counts increased in both directions. Role links, URL preservation, overflow and leaving were checked. These generated-media checks are separate from the live paid-booking authorization flow. Core tests passed 90 cases with one existing database-specific skip; web unit/type/build, Care regression and compact Health records checks passed. Live cancellation/token-revocation delivery, physical devices, real clinicians and cross-network/TURN behavior were not verified. Refresh an already-open app tab after deployment before joining a call, because a stale tab may reference an obsolete lazy-loaded asset.
