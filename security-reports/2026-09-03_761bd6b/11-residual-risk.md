# Residual risk and limitations

The original application remains in use with preexisting access-control risks. No source mutation or disabling of user-facing flows was performed. The target is intentionally isolated and cannot yet replace the published backend.

Static source-to-sink reviews identified member impersonation, unsafe profile tenant/active mutation, voting-token exposure, broad management RPCs and additional transport gaps. These were not exploited on real users. Final cross-tenant dynamic tests have not been performed; a passing offline suite does not establish deployment safety.

Storage metadata verification establishes migrated names/bytes/MIME, not private-object SHA256. A separate public-object checksum verification is recorded in the private migration evidence. OPENAI_API_KEY presence is not proof of valid billing, permissions or a working model call.

Source drift after the original backup must be reconciled before cutover. Keep the original backend and backups available until final validation and user-facing acceptance. Do not expand Sites sharing, push GitHub, delete the source, rotate personal credentials, or create a paid resource implicitly.
