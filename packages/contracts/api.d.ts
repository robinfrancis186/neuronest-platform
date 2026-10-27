export interface paths {
    "/health/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["health_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/appointments/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_appointments_list"];
        put?: never;
        post: operations["v1_appointments_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/appointments/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_appointments_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/appointments/{id}/cancel/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_appointments_cancel_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/appointments/{id}/complete/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_appointments_complete_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/appointments/{id}/join/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Issue short-lived credentials for an authorized consultation participant; recording is disabled. */
        post: operations["v1_appointments_join_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/appointments/{id}/no-show/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_appointments_no_show_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/appointments/{id}/reschedule/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_appointments_reschedule_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/assistant/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Explicit include_records requires a child, fresh records authorization, and enabled patient AI processing. The optional care_summary contains only category counts and deterministic review signals; it is not a diagnosis or signed clinical summary. Education and reviewed sources are distinct from diagnosis. */
        post: operations["v1_assistant_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/assistant-guide/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_assistant_guide_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/attachments/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_attachments_list"];
        put?: never;
        post: operations["v1_attachments_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/attachments/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_attachments_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/attachments/{id}/content/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_attachments_content_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/audit/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_audit_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/audit/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_audit_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/identity/link/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Legacy account attachment is not self-service. A matching Firebase identity receives firebase_identity_link_review_required and support must complete an independent identity review before an operator records any mapping. */
        post: operations["v1_auth_identity_link_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/username/claim/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Finish username-first setup after verified email access. The account owner chooses the password in Firebase only after verification. */
        post: operations["v1_auth_username_claim_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/username/sign-in/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Durably rate-limited parent-only username-to-Firebase-custom-token exchange. A capped attempt returns the same generic credential failure, and the stored email address is never returned. */
        post: operations["v1_auth_username_sign_in_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/children/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_children_list"];
        put?: never;
        post: operations["v1_children_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/children/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_children_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["v1_children_partial_update"];
        trace?: never;
    };
    "/v1/content/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_content_list"];
        put?: never;
        post: operations["v1_content_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/content/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_content_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["v1_content_partial_update"];
        trace?: never;
    };
    "/v1/content/{id}/review/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_content_review_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/exports/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Synchronous authorized JSON export. Records and export scopes are required; observations are included only with their separate scope. */
        post: operations["v1_exports_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/goals/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_goals_list"];
        put?: never;
        post: operations["v1_goals_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/goals/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_goals_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["v1_goals_partial_update"];
        trace?: never;
    };
    "/v1/grants/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_grants_list"];
        put?: never;
        post: operations["v1_grants_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/grants/{id}/revoke/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_grants_revoke_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/growth/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_growth_list"];
        put?: never;
        post: operations["v1_growth_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/growth/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_growth_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["v1_growth_partial_update"];
        trace?: never;
    };
    "/v1/guardianships/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_guardianships_list"];
        put?: never;
        post: operations["v1_guardianships_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/guardianships/{id}/accept/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_guardianships_accept_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/guardianships/{id}/revoke/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_guardianships_revoke_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_me_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/messages/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_messages_list"];
        put?: never;
        post: operations["v1_messages_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/messages/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_messages_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/messages/recipients/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_messages_recipients_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/milestone-checkins/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_milestone_checkins_list"];
        put?: never;
        post: operations["v1_milestone_checkins_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/milestone-checkins/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_milestone_checkins_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/milestone-checkins/{id}/explain/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_milestone_checkins_explain_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/milestone-checkins/catalog/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_milestone_checkins_catalog_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notifications/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_notifications_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notifications/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_notifications_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/notifications/{id}/read/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_notifications_read_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/observations/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_observations_list"];
        put?: never;
        post: operations["v1_observations_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/observations/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_observations_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["v1_observations_partial_update"];
        trace?: never;
    };
    "/v1/operations/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_operations_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/operations/{id}/resolve-dispute/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_operations_resolve_dispute_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/operations/{id}/retry/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_operations_retry_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/parent-questionnaires/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Private parent reflection entries, deliberately separate from screening. */
        get: operations["v1_parent_questionnaires_list"];
        put?: never;
        /** @description Store a completed parent reflection. It does not call a diagnostic engine, create a score or result, enter the clinical record, or become assistant context or export data. */
        post: operations["v1_parent_questionnaires_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/parent-questionnaires/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Private parent reflection entries, deliberately separate from screening. */
        get: operations["v1_parent_questionnaires_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/payment-demo/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Create an INR 250 Razorpay test order only. No consultation is booked and no child data is sent. */
        post: operations["v1_payment_demo_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/payment-demo/{order_id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Fetch a test order directly from Razorpay, verify ownership and return its captured-payment status. Client callbacks cannot confirm payment. */
        get: operations["v1_payment_demo_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/payments/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_payments_list"];
        put?: never;
        post: operations["v1_payments_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/payments/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_payments_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/payments/{id}/reconcile/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Operations-only reconciliation with provider order, capture, and refund evidence. */
        post: operations["v1_payments_reconcile_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/payments/{id}/refund/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Refund the remaining captured balance after cancellation. Repeated request keys return the same refund. */
        post: operations["v1_payments_refund_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/payments/{id}/transfer/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Operations-only payout submission after a completed, captured consultation. */
        post: operations["v1_payments_transfer_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/policies/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_policies_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/practitioners/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_practitioners_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/practitioners/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_practitioners_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/preferences/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_preferences_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["v1_preferences_partial_update"];
        trace?: never;
    };
    "/v1/privacy-requests/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_privacy_requests_list"];
        put?: never;
        post: operations["v1_privacy_requests_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/privacy-requests/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_privacy_requests_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/privacy-requests/{id}/accept/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_privacy_requests_accept_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/privacy-requests/{id}/execute/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_privacy_requests_execute_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/privacy-requests/{id}/resolve/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_privacy_requests_resolve_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/privacy-requests/{id}/restore/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_privacy_requests_restore_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/privacy-requests/{id}/review/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_privacy_requests_review_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/privacy-requests/{id}/revoke-transition/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_privacy_requests_revoke_transition_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/provider-applications/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_provider_applications_list"];
        put?: never;
        post: operations["v1_provider_applications_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/provider-applications/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_provider_applications_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/provider-applications/{id}/payout-onboarding/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Create a linked Route account in sandbox. KYC and product activation remain provider-reviewed steps. */
        post: operations["v1_provider_applications_payout_onboarding_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/provider-applications/{id}/review/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_provider_applications_review_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/readiness/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Configuration readiness, not evidence of clinical approval or successful provider connectivity. */
        get: operations["v1_readiness_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/records/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_records_list"];
        put?: never;
        post: operations["v1_records_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/records/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_records_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["v1_records_partial_update"];
        trace?: never;
    };
    "/v1/records/{id}/amend/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_records_amend_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/records/{id}/sign/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_records_sign_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/referrals/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_referrals_list"];
        put?: never;
        post: operations["v1_referrals_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/referrals/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_referrals_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["v1_referrals_partial_update"];
        trace?: never;
    };
    "/v1/resources/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_resources_list"];
        put?: never;
        post: operations["v1_resources_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/resources/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_resources_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["v1_resources_partial_update"];
        trace?: never;
    };
    "/v1/resources/{id}/review/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_resources_review_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/schema/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @description OpenApi3 schema for this API. Format can be selected via content negotiation.
         *
         *     - YAML: application/vnd.oai.openapi
         *     - JSON: application/vnd.oai.openapi+json
         */
        get: operations["v1_schema_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/screenings/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_screenings_list"];
        put?: never;
        post: operations["v1_screenings_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/screenings/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_screenings_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/screenings/{id}/review/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_screenings_review_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/screenings/{id}/submit/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Submit answers to the current screening stage. Response status distinguishes incomplete, follow-up required, completed, and ineligible. */
        post: operations["v1_screenings_submit_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/screenings/instruments/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_screenings_instruments_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/slots/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_slots_list"];
        put?: never;
        post: operations["v1_slots_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/therapy-sessions/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_therapy_sessions_list"];
        put?: never;
        post: operations["v1_therapy_sessions_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/therapy-sessions/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_therapy_sessions_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["v1_therapy_sessions_partial_update"];
        trace?: never;
    };
    "/v1/vaccinations/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_vaccinations_list"];
        put?: never;
        post: operations["v1_vaccinations_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/vaccinations/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["v1_vaccinations_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["v1_vaccinations_partial_update"];
        trace?: never;
    };
    "/v1/webhooks/razorpay/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["v1_webhooks_razorpay_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Account: {
            /** Format: uuid */
            readonly id: string;
            /** Format: email */
            email: string;
            display_name: string;
            role?: components["schemas"]["RoleEnum"];
            language?: components["schemas"]["LanguageE83Enum"];
        };
        AdultTransferAcceptanceRequest: {
            accept: boolean;
        };
        AdultTransferRevocationRequest: {
            evidence_reference: string;
        };
        ApiError: {
            detail: string;
        };
        Appointment: {
            /** Format: uuid */
            readonly id: string;
            readonly consultation_mode: string;
            readonly clinic_address: string;
            readonly provider_name: string;
            /** Format: date-time */
            readonly starts_at: string;
            /** Format: date-time */
            readonly ends_at: string;
            /** Format: date-time */
            readonly created_at: string;
            readonly status: string;
            readonly amount_minor: number;
            /** Format: date-time */
            readonly hold_expires_at: string;
            readonly cancellation_reason: string;
            readonly policy_snapshot: unknown;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly booker: string;
            /** Format: uuid */
            readonly practitioner: string;
            /** Format: uuid */
            slot: string;
        };
        AppointmentCancellationRequest: {
            reason?: string;
        };
        AppointmentInputRequest: {
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            slot: string;
        };
        AppointmentRescheduleRequest: {
            /** Format: uuid */
            slot: string;
        };
        AssistantCareSummary: {
            schema_version: string;
            status: string;
            triage: components["schemas"]["AssistantTriage"];
            data_categories: {
                [key: string]: number;
            };
            notice: string;
        };
        AssistantCitation: {
            id: string;
            title: string;
            /** Format: uri */
            url: string;
            version?: string;
            review_status?: string;
        };
        AssistantInputRequest: {
            message: string;
            /** @default en */
            language: components["schemas"]["Language582Enum"];
            /** Format: uuid */
            child?: string;
            /** @default false */
            include_records: boolean;
            /** @default false */
            app_help: boolean;
        };
        AssistantReply: {
            answer: string;
            language: components["schemas"]["Language582Enum"];
            citations: components["schemas"]["AssistantCitation"][];
            escalation: string;
            status: string;
            request_id: string | null;
            model?: string;
            notice?: string;
            care_summary?: components["schemas"]["AssistantCareSummary"];
            actions?: string[];
        };
        AssistantTriage: {
            level: components["schemas"]["LevelEnum"];
            signals: string[];
            clinical_review_required: boolean;
        };
        Attachment: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            readonly filename: string;
            readonly content_type: string;
            readonly size: number;
            readonly sha256: string;
            readonly scan_status: string;
            readonly scan_detail: string;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly author: string;
        };
        AttachmentUploadRequest: {
            /** Format: uuid */
            child: string;
            /** Format: binary */
            file: string;
        };
        Audit: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            action: string;
            object_id?: string;
            purpose?: string;
            /** Format: uuid */
            actor?: string | null;
            /** Format: uuid */
            child?: string | null;
        };
        Child: {
            /** Format: uuid */
            readonly id: string;
            name: string;
            /** Format: date */
            date_of_birth: string;
            language?: components["schemas"]["LanguageE83Enum"];
            readonly transition_status: string;
        };
        ChildExportInputRequest: {
            /** Format: uuid */
            child: string;
        };
        ChildRecordExport: {
            child: components["schemas"]["Child"];
            /** Format: date-time */
            generated_at: string;
            records: components["schemas"]["Record"][];
            observations?: components["schemas"]["Observation"][];
        };
        ChildRequest: {
            name: string;
            /** Format: date */
            date_of_birth: string;
            language?: components["schemas"]["LanguageE83Enum"];
        };
        ConsultationRoom: {
            url: string;
            token: string;
            room: string;
            expires_in: number;
            recording: boolean;
        };
        Content: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            title: string;
            summary: string;
            language: components["schemas"]["LanguageE83Enum"];
            kind: components["schemas"]["ContentKindEnum"];
            /** Format: uri */
            url?: string;
            /** Format: uri */
            source_url: string;
            readonly review_status: string;
            /** Format: date-time */
            readonly reviewed_at: string | null;
            available?: boolean;
        };
        /**
         * @description * `article` - Article
         *     * `video` - Video
         * @enum {string}
         */
        ContentKindEnum: "article" | "video";
        ContentRequest: {
            title: string;
            summary: string;
            language: components["schemas"]["LanguageE83Enum"];
            kind: components["schemas"]["ContentKindEnum"];
            /** Format: uri */
            url?: string;
            /** Format: uri */
            source_url: string;
            available?: boolean;
        };
        ContentReviewRequest: {
            status: components["schemas"]["ContentReviewStatusEnum"];
        };
        /**
         * @description * `approved` - approved
         *     * `rejected` - rejected
         * @enum {string}
         */
        ContentReviewStatusEnum: "approved" | "rejected";
        /**
         * @description * `INR` - INR
         * @enum {string}
         */
        CurrencyEnum: "INR";
        /** @description The signed-in account may see its own login username; peers may not. */
        CurrentAccount: {
            /** Format: uuid */
            readonly id: string;
            /** Format: email */
            email: string;
            display_name: string;
            role?: components["schemas"]["RoleEnum"];
            language?: components["schemas"]["LanguageE83Enum"];
            /** @description Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
            username: string;
        };
        DemoCheckout: {
            order_id: string;
            key: string;
            amount_minor: number;
            currency: string;
            status: components["schemas"]["DemoCheckoutStatusEnum"];
        };
        /**
         * @description * `pending` - pending
         *     * `paid` - paid
         * @enum {string}
         */
        DemoCheckoutStatusEnum: "pending" | "paid";
        DisputeResolutionRequest: {
            resolution: components["schemas"]["ResolutionEnum"];
            evidence_reference: string;
        };
        /**
         * @description * `communication` - communication
         *     * `social` - social
         *     * `movement` - movement
         *     * `daily_living` - daily_living
         *     * `sensory` - sensory
         *     * `emotional_regulation` - emotional_regulation
         *     * `sleep` - sleep
         *     * `eating` - eating
         *     * `other` - other
         *     * `motor` - motor
         * @enum {string}
         */
        DomainEnum: "communication" | "social" | "movement" | "daily_living" | "sensory" | "emotional_regulation" | "sleep" | "eating" | "other" | "motor";
        ExplanationInputRequest: {
            consent: boolean;
            /** @default en */
            language: components["schemas"]["Language582Enum"];
        };
        FirebaseIdentityLinkRequest: {
            confirm: boolean;
        };
        FirebaseIdentityLinkReviewRequired: {
            /** @default firebase_identity_link_review_required */
            code: string;
            detail: string;
        };
        FirebaseIdentityLinked: {
            linked: boolean;
        };
        Goal: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            title: string;
            description?: string;
            /** Format: date */
            target_date?: string | null;
            status?: components["schemas"]["GoalStatusEnum"];
            /** Format: date-time */
            readonly achieved_at: string | null;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly author: string;
        };
        GoalRequest: {
            title: string;
            description?: string;
            /** Format: date */
            target_date?: string | null;
            status?: components["schemas"]["GoalStatusEnum"];
            /** Format: uuid */
            child: string;
        };
        /**
         * @description * `active` - active
         *     * `achieved` - achieved
         *     * `paused` - paused
         * @enum {string}
         */
        GoalStatusEnum: "active" | "achieved" | "paused";
        Grant: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            scopes?: unknown;
            purpose: string;
            /** Format: date-time */
            expires_at: string;
            /** Format: date-time */
            readonly revoked_at: string | null;
            readonly consent_version: string;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            recipient: string;
            /** Format: uuid */
            readonly grantor: string;
        };
        GrantRequest: {
            scopes?: unknown;
            purpose: string;
            /** Format: date-time */
            expires_at: string;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            recipient: string;
        };
        Growth: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            /** Format: date */
            measured_on: string;
            /** Format: decimal */
            weight_kg: string;
            /** Format: decimal */
            height_cm: string;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly author: string;
        };
        GrowthRequest: {
            /** Format: date */
            measured_on: string;
            /** Format: decimal */
            weight_kg: string;
            /** Format: decimal */
            height_cm: string;
            /** Format: uuid */
            child: string;
        };
        Guardianship: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            /** Format: email */
            email: string;
            relationship?: string;
            can_share?: boolean;
            scopes?: unknown;
            readonly status: string;
            /** Format: date-time */
            readonly revoked_at: string | null;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly user: string | null;
            /** Format: uuid */
            readonly invited_by: string | null;
        };
        GuardianshipRequest: {
            /** Format: email */
            email: string;
            relationship?: string;
            can_share?: boolean;
            scopes?: unknown;
            /** Format: uuid */
            child: string;
        };
        Health: {
            status: string;
            service: string;
            environment: string;
        };
        /**
         * @description * `deletion` - deletion
         *     * `correction` - correction
         *     * `export` - export
         *     * `complaint` - complaint
         *     * `adult_transition` - adult_transition
         * @enum {string}
         */
        KindD20Enum: "deletion" | "correction" | "export" | "complaint" | "adult_transition";
        /**
         * @description * `en` - en
         *     * `ml` - ml
         * @enum {string}
         */
        Language582Enum: "en" | "ml";
        /**
         * @description * `en` - English
         *     * `ml` - Malayalam
         * @enum {string}
         */
        LanguageE83Enum: "en" | "ml";
        /**
         * @description * `en` - en
         *     * `ml` - ml
         * @enum {string}
         */
        LanguagesEnum: "en" | "ml";
        /**
         * @description * `routine` - routine
         *     * `clinician` - clinician
         * @enum {string}
         */
        LevelEnum: "routine" | "clinician";
        Message: {
            /** Format: uuid */
            readonly id: string;
            readonly author_name: string;
            /** Format: date-time */
            readonly created_at: string;
            body: string;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly author: string;
            /** Format: uuid */
            recipient: string;
        };
        MessageRequest: {
            body: string;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            recipient: string;
        };
        MilestoneCheckIn: {
            /** Format: uuid */
            readonly id: string;
            answers: {
                [key: string]: "yes" | "in_progress" | "not_yet" | "unsure";
            };
            parent_concern: boolean;
            skill_loss: boolean;
            /** Format: date-time */
            readonly created_at: string;
            catalog_version: string;
            /** Format: int64 */
            band_months: number;
            readonly age_months: number;
            readonly summary: unknown;
            readonly ai_explanation: unknown;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly author: string;
        };
        MilestoneCheckInRequest: {
            answers: {
                [key: string]: "yes" | "in_progress" | "not_yet" | "unsure";
            };
            parent_concern: boolean;
            skill_loss: boolean;
            catalog_version: string;
            /** Format: int64 */
            band_months: number;
            /** Format: uuid */
            child: string;
        };
        Notification: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            title: string;
            body: string;
            kind: string;
            reference: string;
            /** Format: date-time */
            readonly read_at: string | null;
            email_status?: string;
            push_status?: string;
        };
        Observation: {
            /** Format: uuid */
            readonly id: string;
            domain: components["schemas"]["DomainEnum"];
            status: components["schemas"]["ObservationStatusEnum"];
            /** Format: date-time */
            readonly created_at: string;
            title: string;
            note?: string;
            /** Format: date */
            observed_on: string;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly author: string;
        };
        ObservationRequest: {
            domain: components["schemas"]["DomainEnum"];
            status: components["schemas"]["ObservationStatusEnum"];
            title: string;
            note?: string;
            /** Format: date */
            observed_on: string;
            /** Format: uuid */
            child: string;
        };
        /**
         * @description * `observed` - observed
         *     * `not_yet` - not_yet
         *     * `unsure` - unsure
         *     * `lost` - lost
         * @enum {string}
         */
        ObservationStatusEnum: "observed" | "not_yet" | "unsure" | "lost";
        OperationsQueue: {
            outbox: components["schemas"]["QueueItem"][];
            payment_events: components["schemas"]["QueueItem"][];
            next_offset: number | null;
        };
        PaginatedAccountList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Account"][];
        };
        PaginatedAppointmentList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Appointment"][];
        };
        PaginatedAttachmentList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Attachment"][];
        };
        PaginatedAuditList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Audit"][];
        };
        PaginatedChildList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Child"][];
        };
        PaginatedContentList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Content"][];
        };
        PaginatedGoalList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Goal"][];
        };
        PaginatedGrantList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Grant"][];
        };
        PaginatedGrowthList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Growth"][];
        };
        PaginatedGuardianshipList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Guardianship"][];
        };
        PaginatedMessageList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Message"][];
        };
        PaginatedMilestoneCheckInList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["MilestoneCheckIn"][];
        };
        PaginatedNotificationList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Notification"][];
        };
        PaginatedObservationList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Observation"][];
        };
        PaginatedParentQuestionnaireResponseList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["ParentQuestionnaireResponse"][];
        };
        PaginatedPaymentList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Payment"][];
        };
        PaginatedPractitionerList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Practitioner"][];
        };
        PaginatedPrivacyRequestList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["PrivacyRequest"][];
        };
        PaginatedProviderApplicationList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["ProviderApplication"][];
        };
        PaginatedRecordList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Record"][];
        };
        PaginatedReferralList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Referral"][];
        };
        PaginatedResourceList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Resource"][];
        };
        PaginatedScreeningInstrumentList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["ScreeningInstrument"][];
        };
        PaginatedScreeningList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Screening"][];
        };
        PaginatedSlotList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Slot"][];
        };
        PaginatedTherapySessionList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["TherapySession"][];
        };
        PaginatedVaccinationList: {
            count: number;
            /** Format: uri */
            next?: string | null;
            /** Format: uri */
            previous?: string | null;
            results: components["schemas"]["Vaccination"][];
        };
        /** @description Validate one fixed, non-diagnostic parent reflection questionnaire. */
        ParentQuestionnaireResponse: {
            /** Format: uuid */
            readonly id: string;
            answers: {
                [key: string]: "almost_always" | "concerned" | "never" | "often" | "sometimes";
            };
            /** Format: date-time */
            readonly created_at: string;
            questionnaire_id: string;
            questionnaire_version: string;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly author: string;
        };
        /** @description Validate one fixed, non-diagnostic parent reflection questionnaire. */
        ParentQuestionnaireResponseRequest: {
            answers: {
                [key: string]: "almost_always" | "concerned" | "never" | "often" | "sometimes";
            };
            questionnaire_id: string;
            questionnaire_version: string;
            /** Format: uuid */
            child: string;
        };
        PatchedChildRequest: {
            name?: string;
            /** Format: date */
            date_of_birth?: string;
            language?: components["schemas"]["LanguageE83Enum"];
        };
        PatchedContentRequest: {
            title?: string;
            summary?: string;
            language?: components["schemas"]["LanguageE83Enum"];
            kind?: components["schemas"]["ContentKindEnum"];
            /** Format: uri */
            url?: string;
            /** Format: uri */
            source_url?: string;
            available?: boolean;
        };
        PatchedGoalRequest: {
            title?: string;
            description?: string;
            /** Format: date */
            target_date?: string | null;
            status?: components["schemas"]["GoalStatusEnum"];
            /** Format: uuid */
            child?: string;
        };
        PatchedGrowthRequest: {
            /** Format: date */
            measured_on?: string;
            /** Format: decimal */
            weight_kg?: string;
            /** Format: decimal */
            height_cm?: string;
            /** Format: uuid */
            child?: string;
        };
        PatchedObservationRequest: {
            domain?: components["schemas"]["DomainEnum"];
            status?: components["schemas"]["ObservationStatusEnum"];
            title?: string;
            note?: string;
            /** Format: date */
            observed_on?: string;
            /** Format: uuid */
            child?: string;
        };
        PatchedPreferenceUpdateRequest: {
            language?: components["schemas"]["Language582Enum"];
            email?: boolean;
            push?: boolean;
            push_token?: string;
        };
        PatchedRecordRequest: {
            kind?: components["schemas"]["RecordKindEnum"];
            title?: string;
            body?: string;
            /** Format: uuid */
            child?: string;
        };
        PatchedReferralRequest: {
            reason?: string;
            destination?: string;
            status?: string;
            /** Format: uuid */
            child?: string;
        };
        PatchedResourceRequest: {
            name?: string;
            kind?: string;
            location?: string;
            summary?: string;
            /** Format: uri */
            url?: string;
        };
        PatchedTherapySessionRequest: {
            /** Format: date-time */
            scheduled_at?: string;
            note?: string;
            status?: components["schemas"]["TherapySessionStatusEnum"];
            /** Format: uuid */
            child?: string;
            /** Format: uuid */
            practitioner?: string;
        };
        PatchedVaccinationRequest: {
            name?: string;
            /** Format: date */
            administered_on?: string | null;
            /** Format: date */
            due_on?: string | null;
            note?: string;
            /** Format: uuid */
            child?: string;
        };
        Payment: {
            /** Format: uuid */
            readonly id: string;
            readonly checkout: components["schemas"]["PaymentCheckout"];
            /** Format: date-time */
            readonly created_at: string;
            readonly amount_minor: number;
            readonly status: string;
            readonly provider_order_id: string | null;
            readonly provider_payment_id: string | null;
            readonly refunded_minor: number;
            readonly transfer_id: string;
            /** Format: uuid */
            appointment: string;
        };
        PaymentCheckout: {
            key: string;
            order_id: string | null;
            amount: number;
            currency: components["schemas"]["CurrencyEnum"];
            name: string;
            description: string;
            ready: boolean;
            verification: string;
        };
        PaymentInputRequest: {
            /** Format: uuid */
            appointment: string;
        };
        PaymentReconciliation: {
            status: string;
            refunded_minor?: number;
            detail?: string;
        };
        PayoutOnboardingRequest: {
            /** Format: email */
            email?: string;
            phone?: string;
            legal_business_name?: string;
            business_type?: string;
            profile?: {
                [key: string]: unknown;
            };
            provider_account_id?: string;
        };
        PolicyReadiness: {
            configured: boolean;
            production_approved: boolean;
            policy?: unknown;
            reason?: string;
            retention_execution?: string;
        };
        Practitioner: {
            /** Format: uuid */
            readonly id: string;
            readonly display_name: string;
            /** Format: date-time */
            readonly created_at: string;
            specialty: string;
            profession: components["schemas"]["ProfessionEnum"];
            languages?: unknown;
            /** Format: int64 */
            fee_minor?: number;
            readonly verified: boolean;
            readonly status: string;
            bio?: string;
            /** Format: uuid */
            readonly user: string;
        };
        Preferences: {
            language: components["schemas"]["Language582Enum"];
            email: boolean;
            push: boolean;
        };
        PrivacyRequest: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            kind: components["schemas"]["KindD20Enum"];
            detail: string;
            readonly status: string;
            readonly response: string;
            /** Format: date-time */
            readonly reviewed_at: string | null;
            readonly evidence_reference: string;
            /** Format: date-time */
            readonly accepted_at: string | null;
            readonly retention_review: unknown;
            readonly execution_receipt: unknown;
            /** Format: uuid */
            readonly user: string;
            /** Format: uuid */
            child?: string | null;
            /** Format: uuid */
            readonly subject: string | null;
            /** Format: uuid */
            readonly reviewed_by: string | null;
        };
        PrivacyRequestRequest: {
            kind: components["schemas"]["KindD20Enum"];
            detail: string;
            /** Format: uuid */
            child?: string | null;
        };
        PrivacyResolutionRequest: {
            response: string;
            /** @default resolved */
            status: components["schemas"]["PrivacyResolutionStatusEnum"];
        };
        /**
         * @description * `in_review` - in_review
         *     * `resolved` - resolved
         *     * `rejected` - rejected
         * @enum {string}
         */
        PrivacyResolutionStatusEnum: "in_review" | "resolved" | "rejected";
        PrivacyRestorationRequest: {
            evidence_reference: string;
        };
        PrivacyReviewRequest: {
            evidence_reference: string;
            /** Format: uuid */
            subject?: string;
            /** Format: uuid */
            child?: string;
            retention_holds?: string[];
        };
        /**
         * @description * `doctor` - doctor
         *     * `therapist` - therapist
         *     * `mentor` - mentor
         * @enum {string}
         */
        ProfessionEnum: "doctor" | "therapist" | "mentor";
        ProviderApplication: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            display_name: string;
            specialty: string;
            profession: components["schemas"]["ProfessionEnum"];
            languages?: unknown;
            /** Format: int64 */
            fee_minor: number;
            bio?: string;
            registration_number: string;
            readonly status: string;
            readonly review_reason: string;
            /** Format: uuid */
            readonly user: string;
        };
        ProviderApplicationRequest: {
            display_name: string;
            specialty: string;
            profession: components["schemas"]["ProfessionEnum"];
            languages?: unknown;
            /** Format: int64 */
            fee_minor: number;
            bio?: string;
            registration_number: string;
        };
        ProviderOperation: {
            id: string;
            status: string;
        };
        ProviderReviewRequest: {
            status: components["schemas"]["ProviderReviewStatusEnum"];
            reason: string;
        };
        /**
         * @description * `approved` - approved
         *     * `rejected` - rejected
         *     * `suspended` - suspended
         * @enum {string}
         */
        ProviderReviewStatusEnum: "approved" | "rejected" | "suspended";
        QueueItem: {
            /** Format: uuid */
            id: string;
            kind: string;
            status: string;
            /** Format: date-time */
            created_at: string;
            attempts?: number;
            /** Format: date-time */
            available_at?: string;
            /** Format: uuid */
            payment?: string | null;
            retry_allowed: boolean;
            required_action: string;
        };
        RazorpayEventRequest: {
            event: string;
            payload: {
                [key: string]: unknown;
            };
        };
        ReadinessCapability: {
            ready: boolean;
            mode?: string;
            reason?: string;
            patient_context_enabled?: boolean;
            policy_ready?: boolean;
        };
        /**
         * @description * `configuration_restored` - configuration_restored
         *     * `provider_recovered` - provider_recovered
         *     * `reviewed_transient_failure` - reviewed_transient_failure
         * @enum {string}
         */
        ReasonEnum: "configuration_restored" | "provider_recovered" | "reviewed_transient_failure";
        Record: {
            /** Format: uuid */
            readonly id: string;
            readonly author_name: string;
            /** Format: date-time */
            readonly created_at: string;
            kind: components["schemas"]["RecordKindEnum"];
            title: string;
            body: string;
            readonly status: string;
            /** Format: date-time */
            readonly signed_at: string | null;
            readonly amendment_reason: string;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly author: string;
            /** Format: uuid */
            readonly amendment_of: string | null;
        };
        RecordAmendmentRequest: {
            body: string;
            reason: string;
        };
        /**
         * @description * `note` - note
         *     * `report` - report
         *     * `prescription` - prescription
         *     * `assessment` - assessment
         * @enum {string}
         */
        RecordKindEnum: "note" | "report" | "prescription" | "assessment";
        RecordRequest: {
            kind: components["schemas"]["RecordKindEnum"];
            title: string;
            body: string;
            /** Format: uuid */
            child: string;
        };
        Referral: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            reason: string;
            destination: string;
            status?: string;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly author: string;
        };
        ReferralRequest: {
            reason: string;
            destination: string;
            status?: string;
            /** Format: uuid */
            child: string;
        };
        RefundResult: {
            refund: components["schemas"]["RefundSummary"];
            payment: components["schemas"]["Payment"];
        };
        RefundSummary: {
            /** Format: uuid */
            id: string;
            status: string;
            amount_minor: number;
        };
        /**
         * @description * `evidence_submitted` - evidence_submitted
         *     * `provider_closed` - provider_closed
         *     * `escalated` - escalated
         * @enum {string}
         */
        ResolutionEnum: "evidence_submitted" | "provider_closed" | "escalated";
        Resource: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            name: string;
            kind: string;
            location: string;
            summary: string;
            /** Format: uri */
            url: string;
            /** Format: date */
            readonly verified_at: string | null;
            readonly review_status: string;
        };
        ResourceRequest: {
            name: string;
            kind: string;
            location: string;
            summary: string;
            /** Format: uri */
            url: string;
        };
        RetryRequest: {
            reason: components["schemas"]["ReasonEnum"];
        };
        /**
         * @description * `parent` - parent
         *     * `doctor` - doctor
         *     * `therapist` - therapist
         *     * `mentor` - mentor
         *     * `admin` - admin
         * @enum {string}
         */
        RoleEnum: "parent" | "doctor" | "therapist" | "mentor" | "admin";
        Screening: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            instrument_id: string;
            readonly status: string;
            readonly answers: unknown;
            readonly result: unknown;
            readonly review_note: string;
            /** Format: date-time */
            readonly reviewed_at: string | null;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly author: string;
            /** Format: uuid */
            readonly reviewed_by: string | null;
        };
        ScreeningAnswerOption: {
            value: string;
            label: string;
        };
        ScreeningInstrument: {
            id: string;
            name: string;
            enabled: boolean;
            synthetic: boolean;
            license_status: string;
            min_age_months: number;
            max_age_months: number;
            questions: components["schemas"]["ScreeningQuestion"][];
            version?: string;
            languages?: components["schemas"]["LanguagesEnum"][];
            notice?: string;
            /** Format: uri */
            source_url?: string;
        };
        ScreeningQuestion: {
            id: string;
            text: string;
            options: components["schemas"]["ScreeningAnswerOption"][];
        };
        ScreeningRequest: {
            instrument_id: string;
            /** Format: uuid */
            child: string;
        };
        ScreeningReviewRequest: {
            note: string;
        };
        ScreeningSubmissionRequest: {
            answers?: {
                [key: string]: unknown;
            };
        };
        ServiceReadiness: {
            capabilities: {
                [key: string]: components["schemas"]["ReadinessCapability"];
            };
        };
        Slot: {
            /** Format: uuid */
            readonly id: string;
            /** Format: uuid */
            readonly practitioner: string;
            /** Format: date-time */
            starts_at: string;
            /** Format: date-time */
            ends_at: string;
            readonly available: boolean;
            consultation_mode?: components["schemas"]["SlotConsultationModeEnum"];
            clinic_address?: string;
        };
        /**
         * @description * `online` - Online
         *     * `in_person` - In person
         * @enum {string}
         */
        SlotConsultationModeEnum: "online" | "in_person";
        /**
         * @description * `online` - online
         *     * `in_person` - in_person
         * @enum {string}
         */
        SlotInputConsultationModeEnum: "online" | "in_person";
        SlotInputRequest: {
            /** Format: date-time */
            starts_at: string;
            /** Format: date-time */
            ends_at: string;
            /** @default online */
            consultation_mode: components["schemas"]["SlotInputConsultationModeEnum"];
            clinic_address?: string;
        };
        TherapySession: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            /** Format: date-time */
            scheduled_at: string;
            note?: string;
            status?: components["schemas"]["TherapySessionStatusEnum"];
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly author: string;
            /** Format: uuid */
            practitioner: string;
        };
        TherapySessionRequest: {
            /** Format: date-time */
            scheduled_at: string;
            note?: string;
            status?: components["schemas"]["TherapySessionStatusEnum"];
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            practitioner: string;
        };
        /**
         * @description * `scheduled` - scheduled
         *     * `completed` - completed
         *     * `cancelled` - cancelled
         * @enum {string}
         */
        TherapySessionStatusEnum: "scheduled" | "completed" | "cancelled";
        UsernameClaimRequest: {
            username: string;
            full_name: string;
        };
        UsernameSession: {
            custom_token: string;
        };
        UsernameSignInRequest: {
            username: string;
            password: string;
        };
        Vaccination: {
            /** Format: uuid */
            readonly id: string;
            /** Format: date-time */
            readonly created_at: string;
            name: string;
            /** Format: date */
            administered_on?: string | null;
            /** Format: date */
            due_on?: string | null;
            note?: string;
            /** Format: uuid */
            child: string;
            /** Format: uuid */
            readonly author: string;
        };
        VaccinationRequest: {
            name: string;
            /** Format: date */
            administered_on?: string | null;
            /** Format: date */
            due_on?: string | null;
            note?: string;
            /** Format: uuid */
            child: string;
        };
        WebhookAcknowledgement: {
            received: boolean;
            status: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    health_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_appointments_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedAppointmentList"];
                };
            };
        };
    };
    v1_appointments_create: {
        parameters: {
            query?: never;
            header?: {
                /** @description Stable retry identifier; maximum 160 characters. Reusing it with different data is rejected. */
                "Idempotency-Key"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AppointmentInputRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["AppointmentInputRequest"];
                "multipart/form-data": components["schemas"]["AppointmentInputRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Appointment"];
                };
            };
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Appointment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_appointments_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this appointment. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Appointment"];
                };
            };
        };
    };
    v1_appointments_cancel_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this appointment. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["AppointmentCancellationRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["AppointmentCancellationRequest"];
                "multipart/form-data": components["schemas"]["AppointmentCancellationRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Appointment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_appointments_complete_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this appointment. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Appointment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_appointments_join_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this appointment. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ConsultationRoom"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_appointments_no_show_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this appointment. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Appointment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_appointments_reschedule_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this appointment. */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AppointmentRescheduleRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["AppointmentRescheduleRequest"];
                "multipart/form-data": components["schemas"]["AppointmentRescheduleRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Appointment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_assistant_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AssistantInputRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["AssistantInputRequest"];
                "multipart/form-data": components["schemas"]["AssistantInputRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AssistantReply"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_assistant_guide_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    v1_attachments_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedAttachmentList"];
                };
            };
        };
    };
    v1_attachments_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["AttachmentUploadRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Attachment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_attachments_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this attachment. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Attachment"];
                };
            };
        };
    };
    v1_attachments_content_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this attachment. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Private accepted attachment bytes, preserving the uploaded content type and attachment filename. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": string;
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_audit_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedAuditList"];
                };
            };
        };
    };
    v1_audit_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this audit. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Audit"];
                };
            };
        };
    };
    v1_auth_identity_link_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FirebaseIdentityLinkRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["FirebaseIdentityLinkRequest"];
                "multipart/form-data": components["schemas"]["FirebaseIdentityLinkRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FirebaseIdentityLinked"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FirebaseIdentityLinkReviewRequired"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_auth_username_claim_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UsernameClaimRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["UsernameClaimRequest"];
                "multipart/form-data": components["schemas"]["UsernameClaimRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CurrentAccount"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_auth_username_sign_in_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UsernameSignInRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["UsernameSignInRequest"];
                "multipart/form-data": components["schemas"]["UsernameSignInRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UsernameSession"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_children_list: {
        parameters: {
            query?: {
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedChildList"];
                };
            };
        };
    };
    v1_children_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChildRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ChildRequest"];
                "multipart/form-data": components["schemas"]["ChildRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Child"];
                };
            };
        };
    };
    v1_children_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this child. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Child"];
                };
            };
        };
    };
    v1_children_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this child. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedChildRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedChildRequest"];
                "multipart/form-data": components["schemas"]["PatchedChildRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Child"];
                };
            };
        };
    };
    v1_content_list: {
        parameters: {
            query?: {
                language?: "en" | "ml";
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedContentList"];
                };
            };
        };
    };
    v1_content_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ContentRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ContentRequest"];
                "multipart/form-data": components["schemas"]["ContentRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Content"];
                };
            };
        };
    };
    v1_content_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this content. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Content"];
                };
            };
        };
    };
    v1_content_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this content. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedContentRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedContentRequest"];
                "multipart/form-data": components["schemas"]["PatchedContentRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Content"];
                };
            };
        };
    };
    v1_content_review_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this content. */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ContentReviewRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ContentReviewRequest"];
                "multipart/form-data": components["schemas"]["ContentReviewRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Content"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_exports_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChildExportInputRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ChildExportInputRequest"];
                "multipart/form-data": components["schemas"]["ChildExportInputRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ChildRecordExport"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_goals_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedGoalList"];
                };
            };
        };
    };
    v1_goals_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GoalRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["GoalRequest"];
                "multipart/form-data": components["schemas"]["GoalRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Goal"];
                };
            };
        };
    };
    v1_goals_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this goal. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Goal"];
                };
            };
        };
    };
    v1_goals_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this goal. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedGoalRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedGoalRequest"];
                "multipart/form-data": components["schemas"]["PatchedGoalRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Goal"];
                };
            };
        };
    };
    v1_grants_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedGrantList"];
                };
            };
        };
    };
    v1_grants_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GrantRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["GrantRequest"];
                "multipart/form-data": components["schemas"]["GrantRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Grant"];
                };
            };
        };
    };
    v1_grants_revoke_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this grant. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Grant"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_growth_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedGrowthList"];
                };
            };
        };
    };
    v1_growth_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GrowthRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["GrowthRequest"];
                "multipart/form-data": components["schemas"]["GrowthRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Growth"];
                };
            };
        };
    };
    v1_growth_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this growth. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Growth"];
                };
            };
        };
    };
    v1_growth_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this growth. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedGrowthRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedGrowthRequest"];
                "multipart/form-data": components["schemas"]["PatchedGrowthRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Growth"];
                };
            };
        };
    };
    v1_guardianships_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedGuardianshipList"];
                };
            };
        };
    };
    v1_guardianships_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuardianshipRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["GuardianshipRequest"];
                "multipart/form-data": components["schemas"]["GuardianshipRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Guardianship"];
                };
            };
        };
    };
    v1_guardianships_accept_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this guardianship. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Guardianship"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_guardianships_revoke_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this guardianship. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Guardianship"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_me_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CurrentAccount"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FirebaseIdentityLinkReviewRequired"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_messages_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedMessageList"];
                };
            };
        };
    };
    v1_messages_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MessageRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["MessageRequest"];
                "multipart/form-data": components["schemas"]["MessageRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
        };
    };
    v1_messages_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this message. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Message"];
                };
            };
        };
    };
    v1_messages_recipients_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedAccountList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_milestone_checkins_list: {
        parameters: {
            query?: {
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedMilestoneCheckInList"];
                };
            };
        };
    };
    v1_milestone_checkins_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MilestoneCheckInRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["MilestoneCheckInRequest"];
                "multipart/form-data": components["schemas"]["MilestoneCheckInRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MilestoneCheckIn"];
                };
            };
        };
    };
    v1_milestone_checkins_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this milestone check in. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MilestoneCheckIn"];
                };
            };
        };
    };
    v1_milestone_checkins_explain_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this milestone check in. */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExplanationInputRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ExplanationInputRequest"];
                "multipart/form-data": components["schemas"]["ExplanationInputRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    v1_milestone_checkins_catalog_retrieve: {
        parameters: {
            query: {
                child: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    v1_notifications_list: {
        parameters: {
            query?: {
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedNotificationList"];
                };
            };
        };
    };
    v1_notifications_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this notification. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Notification"];
                };
            };
        };
    };
    v1_notifications_read_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this notification. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Notification"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_observations_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedObservationList"];
                };
            };
        };
    };
    v1_observations_create: {
        parameters: {
            query?: never;
            header?: {
                /** @description Stable retry identifier; maximum 160 characters. Reusing it with different data is rejected. */
                "Idempotency-Key"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ObservationRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ObservationRequest"];
                "multipart/form-data": components["schemas"]["ObservationRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Observation"];
                };
            };
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Observation"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_observations_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this observation. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Observation"];
                };
            };
        };
    };
    v1_observations_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this observation. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedObservationRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedObservationRequest"];
                "multipart/form-data": components["schemas"]["PatchedObservationRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Observation"];
                };
            };
        };
    };
    v1_operations_list: {
        parameters: {
            query?: {
                offset?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OperationsQueue"][];
                };
            };
        };
    };
    v1_operations_resolve_dispute_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DisputeResolutionRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["DisputeResolutionRequest"];
                "multipart/form-data": components["schemas"]["DisputeResolutionRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueueItem"];
                };
            };
        };
    };
    v1_operations_retry_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RetryRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["RetryRequest"];
                "multipart/form-data": components["schemas"]["RetryRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QueueItem"];
                };
            };
        };
    };
    v1_parent_questionnaires_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedParentQuestionnaireResponseList"];
                };
            };
        };
    };
    v1_parent_questionnaires_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ParentQuestionnaireResponseRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ParentQuestionnaireResponseRequest"];
                "multipart/form-data": components["schemas"]["ParentQuestionnaireResponseRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ParentQuestionnaireResponse"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_parent_questionnaires_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this parent questionnaire response. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ParentQuestionnaireResponse"];
                };
            };
        };
    };
    v1_payment_demo_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DemoCheckout"];
                };
            };
        };
    };
    v1_payment_demo_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                order_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DemoCheckout"];
                };
            };
        };
    };
    v1_payments_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedPaymentList"];
                };
            };
        };
    };
    v1_payments_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PaymentInputRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PaymentInputRequest"];
                "multipart/form-data": components["schemas"]["PaymentInputRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Payment"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_payments_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this payment. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Payment"];
                };
            };
        };
    };
    v1_payments_reconcile_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this payment. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentReconciliation"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_payments_refund_create: {
        parameters: {
            query?: never;
            header?: {
                /** @description Stable retry identifier; maximum 160 characters. Reusing it with different data is rejected. */
                "Idempotency-Key"?: string;
            };
            path: {
                /** @description A UUID string identifying this payment. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RefundResult"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_payments_transfer_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this payment. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProviderOperation"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_policies_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PolicyReadiness"];
                };
            };
        };
    };
    v1_practitioners_list: {
        parameters: {
            query?: {
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
                profession?: "doctor" | "mentor" | "therapist";
                specialty?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedPractitionerList"];
                };
            };
        };
    };
    v1_practitioners_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this practitioner. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Practitioner"];
                };
            };
        };
    };
    v1_preferences_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Preferences"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_preferences_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedPreferenceUpdateRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedPreferenceUpdateRequest"];
                "multipart/form-data": components["schemas"]["PatchedPreferenceUpdateRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Preferences"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_privacy_requests_list: {
        parameters: {
            query?: {
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedPrivacyRequestList"];
                };
            };
        };
    };
    v1_privacy_requests_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PrivacyRequestRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PrivacyRequestRequest"];
                "multipart/form-data": components["schemas"]["PrivacyRequestRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivacyRequest"];
                };
            };
        };
    };
    v1_privacy_requests_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this privacy request. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivacyRequest"];
                };
            };
        };
    };
    v1_privacy_requests_accept_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this privacy request. */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdultTransferAcceptanceRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["AdultTransferAcceptanceRequest"];
                "multipart/form-data": components["schemas"]["AdultTransferAcceptanceRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivacyRequest"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_privacy_requests_execute_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this privacy request. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivacyRequest"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_privacy_requests_resolve_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this privacy request. */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PrivacyResolutionRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PrivacyResolutionRequest"];
                "multipart/form-data": components["schemas"]["PrivacyResolutionRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivacyRequest"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_privacy_requests_restore_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this privacy request. */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PrivacyRestorationRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PrivacyRestorationRequest"];
                "multipart/form-data": components["schemas"]["PrivacyRestorationRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivacyRequest"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_privacy_requests_review_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this privacy request. */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PrivacyReviewRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PrivacyReviewRequest"];
                "multipart/form-data": components["schemas"]["PrivacyReviewRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivacyRequest"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_privacy_requests_revoke_transition_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this privacy request. */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdultTransferRevocationRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["AdultTransferRevocationRequest"];
                "multipart/form-data": components["schemas"]["AdultTransferRevocationRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivacyRequest"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_provider_applications_list: {
        parameters: {
            query?: {
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedProviderApplicationList"];
                };
            };
        };
    };
    v1_provider_applications_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProviderApplicationRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ProviderApplicationRequest"];
                "multipart/form-data": components["schemas"]["ProviderApplicationRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProviderApplication"];
                };
            };
        };
    };
    v1_provider_applications_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this provider application. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProviderApplication"];
                };
            };
        };
    };
    v1_provider_applications_payout_onboarding_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this provider application. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PayoutOnboardingRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PayoutOnboardingRequest"];
                "multipart/form-data": components["schemas"]["PayoutOnboardingRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProviderOperation"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_provider_applications_review_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this provider application. */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProviderReviewRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ProviderReviewRequest"];
                "multipart/form-data": components["schemas"]["ProviderReviewRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProviderApplication"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_readiness_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ServiceReadiness"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_records_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedRecordList"];
                };
            };
        };
    };
    v1_records_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecordRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["RecordRequest"];
                "multipart/form-data": components["schemas"]["RecordRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Record"];
                };
            };
        };
    };
    v1_records_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Record"];
                };
            };
        };
    };
    v1_records_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedRecordRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedRecordRequest"];
                "multipart/form-data": components["schemas"]["PatchedRecordRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Record"];
                };
            };
        };
    };
    v1_records_amend_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecordAmendmentRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["RecordAmendmentRequest"];
                "multipart/form-data": components["schemas"]["RecordAmendmentRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Record"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_records_sign_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Record"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_referrals_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedReferralList"];
                };
            };
        };
    };
    v1_referrals_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReferralRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ReferralRequest"];
                "multipart/form-data": components["schemas"]["ReferralRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Referral"];
                };
            };
        };
    };
    v1_referrals_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this referral. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Referral"];
                };
            };
        };
    };
    v1_referrals_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this referral. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedReferralRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedReferralRequest"];
                "multipart/form-data": components["schemas"]["PatchedReferralRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Referral"];
                };
            };
        };
    };
    v1_resources_list: {
        parameters: {
            query?: {
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedResourceList"];
                };
            };
        };
    };
    v1_resources_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResourceRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ResourceRequest"];
                "multipart/form-data": components["schemas"]["ResourceRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Resource"];
                };
            };
        };
    };
    v1_resources_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Resource"];
                };
            };
        };
    };
    v1_resources_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedResourceRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedResourceRequest"];
                "multipart/form-data": components["schemas"]["PatchedResourceRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Resource"];
                };
            };
        };
    };
    v1_resources_review_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ContentReviewRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ContentReviewRequest"];
                "multipart/form-data": components["schemas"]["ContentReviewRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Resource"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_schema_retrieve: {
        parameters: {
            query?: {
                format?: "json" | "yaml";
                lang?: "af" | "ar" | "ar-dz" | "ast" | "az" | "be" | "bg" | "bn" | "br" | "bs" | "ca" | "ckb" | "cs" | "cy" | "da" | "de" | "dsb" | "el" | "en" | "en-au" | "en-gb" | "eo" | "es" | "es-ar" | "es-co" | "es-mx" | "es-ni" | "es-ve" | "et" | "eu" | "fa" | "fi" | "fr" | "fy" | "ga" | "gd" | "gl" | "he" | "hi" | "hr" | "hsb" | "hu" | "hy" | "ia" | "id" | "ig" | "io" | "is" | "it" | "ja" | "ka" | "kab" | "kk" | "km" | "kn" | "ko" | "ky" | "lb" | "lt" | "lv" | "mk" | "ml" | "mn" | "mr" | "ms" | "my" | "nb" | "ne" | "nl" | "nn" | "os" | "pa" | "pl" | "pt" | "pt-br" | "ro" | "ru" | "sk" | "sl" | "sq" | "sr" | "sr-latn" | "sv" | "sw" | "ta" | "te" | "tg" | "th" | "tk" | "tr" | "tt" | "udm" | "ug" | "uk" | "ur" | "uz" | "vi" | "zh-hans" | "zh-hant";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/vnd.oai.openapi": {
                        [key: string]: unknown;
                    };
                    "application/yaml": {
                        [key: string]: unknown;
                    };
                    "application/vnd.oai.openapi+json": {
                        [key: string]: unknown;
                    };
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
        };
    };
    v1_screenings_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedScreeningList"];
                };
            };
        };
    };
    v1_screenings_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ScreeningRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ScreeningRequest"];
                "multipart/form-data": components["schemas"]["ScreeningRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Screening"];
                };
            };
        };
    };
    v1_screenings_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this screening. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Screening"];
                };
            };
        };
    };
    v1_screenings_review_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this screening. */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ScreeningReviewRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ScreeningReviewRequest"];
                "multipart/form-data": components["schemas"]["ScreeningReviewRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Screening"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_screenings_submit_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this screening. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ScreeningSubmissionRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ScreeningSubmissionRequest"];
                "multipart/form-data": components["schemas"]["ScreeningSubmissionRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Screening"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_screenings_instruments_list: {
        parameters: {
            query?: {
                language?: "en" | "ml";
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedScreeningInstrumentList"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_slots_list: {
        parameters: {
            query?: {
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
                practitioner?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedSlotList"];
                };
            };
        };
    };
    v1_slots_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SlotInputRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["SlotInputRequest"];
                "multipart/form-data": components["schemas"]["SlotInputRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Slot"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    v1_therapy_sessions_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedTherapySessionList"];
                };
            };
        };
    };
    v1_therapy_sessions_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TherapySessionRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["TherapySessionRequest"];
                "multipart/form-data": components["schemas"]["TherapySessionRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TherapySession"];
                };
            };
        };
    };
    v1_therapy_sessions_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this therapy session. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TherapySession"];
                };
            };
        };
    };
    v1_therapy_sessions_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this therapy session. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedTherapySessionRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedTherapySessionRequest"];
                "multipart/form-data": components["schemas"]["PatchedTherapySessionRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TherapySession"];
                };
            };
        };
    };
    v1_vaccinations_list: {
        parameters: {
            query?: {
                /** @description Filter to one child. Current scope authorization is always rechecked. */
                child?: string;
                /** @description A page number within the paginated result set. */
                page?: number;
                /** @description Number of results to return per page. */
                page_size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaginatedVaccinationList"];
                };
            };
        };
    };
    v1_vaccinations_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VaccinationRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["VaccinationRequest"];
                "multipart/form-data": components["schemas"]["VaccinationRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Vaccination"];
                };
            };
        };
    };
    v1_vaccinations_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this vaccination. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Vaccination"];
                };
            };
        };
    };
    v1_vaccinations_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description A UUID string identifying this vaccination. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedVaccinationRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedVaccinationRequest"];
                "multipart/form-data": components["schemas"]["PatchedVaccinationRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Vaccination"];
                };
            };
        };
    };
    v1_webhooks_razorpay_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Stable provider event identifier; maximum 255 characters. */
                "X-Razorpay-Event-Id": string;
                /** @description Hex HMAC-SHA256 of the exact raw body with the webhook secret. */
                "X-Razorpay-Signature": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RazorpayEventRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["RazorpayEventRequest"];
                "multipart/form-data": components["schemas"]["RazorpayEventRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WebhookAcknowledgement"];
                };
            };
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
}
