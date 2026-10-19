# Voided O.R. reinsertion and correction tracking

## Setup

Use the updated app and a database with the link-table migration applied. The targeted migration adds `payment_corrections` and preserves existing payments and users:

```powershell
node scripts/migrate-payment-corrections.mjs
```

The command uses `DATABASE_URL` from the environment or `.env`. Run it against each database before deploying this code there. It is also included in the full `scripts/migrate.mjs` migration.

Use an unused seven-digit O.R. range for each test fixture. The examples below use `8000000–8000004`; choose a different unused range if needed. Log in, use today's date, and select a collector from the current list.

## Manual checklist

1. **Ordinary insert:** Enter start `8000000`, pieces `5`, amount `1000`, and a collector. Press Enter through the fields and select the collector. Insert shows the normal confirmation. Confirm: exactly one active record appears with the logged-in user as encoder and updater.
2. **Void the original:** Open Edit, authenticate if prompted, and void that record. Note its record ID, original details, encoder, timestamps, voider, and voided timestamp in Void History / View audit. Its amount and pieces stop contributing to active totals.
3. **Warning and Cancel:** Enter the same range with amount `1250` and a different collector. Insert shows “Previously Voided O.R.”, the original ID/range, who voided it, and when. Cancel has initial keyboard focus. Cancel saves nothing and leaves the entered details available for editing.
4. **View original before proceeding:** Reopen the warning and choose View original. Verify the original ID, Void status, payment details, and audit details. Close audit to return to the warning.
5. **Proceed:** Click Proceed. Exactly one new active payment is created with a different record ID, the corrected details, and the logged-in user's attribution. The original stays Void with every original payment/audit field unchanged. Focus returns to the empty O.R. Start field, with no success toast.
6. **Links in both directions:** Open the new record's Audit History. “Correction of voided payment #...” opens the original. The original displays “Replacement payment #...” and View replacement returns to the corrected record. Void History also exposes View audit and View replacement. Reload the page and verify that the links persist.
7. **Active duplicates:** Try the same range again, then a range partially overlapping the active replacement. Both must be blocked without creating a payment or a correction link, even though the original is voided.
8. **Validation:** Try invalid O.R. lengths, a range/pieces mismatch, an invalid amount, missing collector, or a future date through the API. Validation must reject the entry. Voided O.R. acknowledgement must not bypass validation.
9. **Partial/multiple overlaps:** Using separate unused fixtures, create two adjacent payments and void both. Insert a corrected range spanning part of each. The warning lists both originals; Proceed links both to the new record. Each original provides a link back to that replacement.
10. **Repeated correction:** Void the replacement and insert the range again. All overlapping voided records are listed. The new record links to those originals; previous correction links remain available, and all earlier records retain Void status and their audit data.
11. **Stale screen:** In tab A, open confirmation for an unused range. In tab B, insert that range and then void it. Without reopening tab A's confirmation, confirm there. The server must return the void warning and save nothing until the user reviews it and clicks Proceed. If tab B leaves its record active instead, tab A must be blocked as an active duplicate.
12. **Keyboard/loading:** Enter moves through entry fields. In a void warning, the next Enter activates Cancel rather than silently proceeding. Click Proceed to save; buttons are disabled while saving. A held Enter must not create multiple records. After success, type directly into O.R. Start. On a network failure, keep the corrected details and display an error for retrying.
13. **Totals and reports:** Only active records contribute to collections, filtered RCD amounts, and filtered pieces. Originals remain visible in Void History and void reports. Viewing audit links must not change those totals or timestamps.

## Automated checks

```powershell
node --test tests/payment-corrections.test.mjs
$env:PAYMENT_DB_TESTS = '1'
node --test tests/payment-corrections.test.mjs
Remove-Item Env:PAYMENT_DB_TESTS
```

The first command runs validation tests without a database. The opt-in MySQL tests run the actual insertion code with session-local temporary tables that shadow `payments` and `payment_corrections`. They require an existing user and the migrated schema. No persistent payment or user is modified. Closing the connection removes all temporary test data.

Database tests cover ordinary insertion, absent/incorrect acknowledgements, preserved original audit fields, active overlap rejection, renewed acknowledgement for newly voided matches, correction chains, partial overlaps with multiple originals, and rollback when link creation fails.

## Audit rules

- `payment_corrections` stores the replacement payment ID, original voided payment ID, and link creation timestamp. Foreign keys prevent deletion of linked payment records.
- Links are written in the same transaction as the new payment. The original row is never edited during reinsertion.
- The new payment's creator and creation timestamp record who confirmed the correction and when. All matching voided records must be acknowledged by ID.
- Correction links describe overlaps, including partial ranges; they do not imply that the entire original range was replaced. Both complete ranges are visible when following the links.
- Existing historical reinsertions are not linked automatically: matching numbers alone cannot establish whether a user intended a correction.
