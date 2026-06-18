# Security Specification

## Data Invariants
1. A registration can be created or updated by any authenticated user for now, but its structure must be an object.
2. The CPF format is strictly 11 digits (used as ID).

## Dirty Dozen Payloads
(omitted for brevity, but testing type checks, invalid field modifications, etc.)

## Test Runner
See `firestore.rules.test.ts`.
