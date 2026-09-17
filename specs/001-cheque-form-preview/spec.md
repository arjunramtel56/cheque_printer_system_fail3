# Feature Specification: Cheque Form & Print Preview

**Feature Branch**: `001-cheque-form-preview`

**Created**: 2026-09-17

**Status**: Draft

**Input**: Build a simplified cheque form and live print preview for Nepalese bank cheques. Users enter cheque details (bank template, date, payee, amount, amount in words) and see a real-time, accurate print preview aligned to physical cheque dimensions (190.5 × 88.9 mm). Supports Direct Feed printing (blank cheque stock) with calibration for alignment.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter cheque details and view live preview (Priority: P1)

As a bank teller or individual user, I want to enter cheque details into a form and see a live, accurate preview of how the cheque will print, so that I can catch errors before wasting physical cheque stock.

**Why this priority**: This is the core workflow — without a working form + preview, no cheque can be prepared.

**Independent Test**: Can be tested by launching the app, selecting a bank, entering all four fields (date, payee, amount, words), and visually confirming the preview updates with each keystroke and matches the on-screen field values.

**Acceptance Scenarios**:

1. **Given** the form is displayed, **When** the user selects "Siddhartha Bank Limited", **Then** the preview updates to show the Siddhartha template layout.
2. **Given** a bank is selected, **When** the user types a payee name, **Then** the preview shows the payee text immediately.
3. **Given** the user has entered an amount, **Then** the amount-in-words field auto-generates the Nepali-English spelling (e.g., "One Thousand Five Hundred Fifty Rupees and Fifty Paisa Only").
4. **Given** the user edits the auto-generated words, **Then** the custom text is preserved (not overwritten by auto-generation).
5. **Given** the A/C Payee checkbox is checked, **Then** the preview shows "// A/C PAYEE ONLY //" crossing at the top of the cheque.

### User Story 2 - Print cheque at actual size (Priority: P1)

As a user preparing a real cheque, I want to click "Print Cheque" and have the browser print dialog produce a cheque at 100% actual size (190.5 × 88.9 mm) with all fields aligned to the physical cheque stock, so that the printed cheque is bank-processable.

**Why this priority**: Printing at actual size is the fundamental value proposition — misaligned or scaled prints are rejected by banks.

**Independent Test**: Can be tested by entering complete cheque data, clicking Print, confirming the browser print preview shows a 190.5 × 88.9 mm landscape page with visible cheque fields, and printing on blank cheque stock.

**Acceptance Scenarios**:

1. **Given** all fields are filled and valid, **When** the user clicks "Print Cheque", **Then** `window.print()` is invoked and the @page CSS sets the paper size to 190.5mm × 88.9mm landscape.
2. **Given** a field is empty or invalid, **When** the user clicks "Print Cheque", **Then** the print action is blocked and a clear error message describes the missing/invalid field.
3. **Given** the numeric amount and words amount disagree (e.g., 500.00 but words say "Five Rupees"), **Then** printing is blocked with a mismatch error.
4. **Given** the user adjusts X/Y calibration, **Then** the preview and print output shift by the same offset (preview == print geometry).

### User Story 3 - Support multiple bank templates (Priority: P2)

As a user who banks with different Nepalese banks, I want to select from a list of supported bank templates (Siddhartha, NIC ASIA, Nabil, etc.), so that each bank's specific field positions are used for accurate printing.

**Why this priority**: Different banks have different physical layouts; a single template does not fit all.

**Independent Test**: Can be tested by cycling through each bank in the template selector and confirming the preview re-renders with that bank's field coordinates (date position, payee position, amount positions).

**Acceptance Scenarios**:

1. **Given** the template dropdown is opened, **When** the user selects "NIC ASIA Bank", **Then** the preview layout shifts to match the NIC ASIA field coordinates.
2. **Given** the user selects a different bank, **Then** the previously entered cheque data is preserved (only the template geometry changes).

### User Story 4 - Calibrate print alignment (Priority: P2)

As a user whose printer deposits cheques slightly off, I want to adjust X/Y calibration offsets in 0.1 mm increments, so that I can fine-tune the print position to match my physical cheque stock.

**Why this priority**: Printer variance is common; calibration compensates for hardware-specific offsets.

**Independent Test**: Can be tested by entering a cheque, adjusting the X offset by +2.0 mm, and confirming the preview shifts 2 mm to the right while all fields remain visible.

**Acceptance Scenarios**:

1. **Given** calibration controls are shown, **When** the user clicks "−" on X Offset, **Then** the value decreases by 0.1 mm and the preview shifts left.
2. **Given** the user enters "30mm" in the calibration input, **Then** the field is rejected (only numeric input accepted) and the value stays unchanged.
3. **Given** calibration is at +20 mm X, **When** the user clicks "Reset", **Then** the offset returns to 0.

### User Story 5 - Number-to-words conversion in Nepali numbering system (Priority: P2)

As a user entering the amount, I want the amount in words to use the Nepali numbering convention (Thousand, Lakh, Crore), so that the cheque wording conforms to banking standards.

**Why this priority**: Nepalese cheques use the local numbering system; incorrect wording renders the cheque non-compliant.

**Independent Test**: Can be tested by entering "100050" as the amount and confirming the words show "One Lakh Five Hundred Rupees Only".

**Acceptance Scenarios**:

1. **Given** the user enters "100000", **Then** the words show "One Lakh Rupees Only".
2. **Given** the user enters "100.50", **Then** the words show "One Hundred Rupees and Fifty Paisa Only".
3. **Given** the user enters "0", **Then** no words are generated.

## Edge Cases

- What happens when the payee name exceeds the field width? → Text is rendered with a font that auto-scales down (minimum 6pt) to fit within the configured field width.
- How does the system handle a future-dated cheque? → The date is accepted as user-entered text; validation warns but does not hard-block (future dating may be legitimate for post-dated cheques).
- What happens when the amount in words is manually edited to disagree with the numeric amount? → Print is blocked with a "does not match" error; the user must correct or regenerate.
- What happens when the user clears all fields? → The preview returns to a "no template selected" placeholder.
- What happens if the browser does not support `window.print()`? → A fallback error message is displayed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow the user to select a bank template from a dropdown of at least 3 Nepalese banks (Siddhartha, NIC ASIA, Nabil).
- **FR-002**: System MUST auto-populate the cheque date with today's date in DD/MM/YYYY format on first load.
- **FR-003**: System MUST provide a toggle to enable/disable the "A/C PAYEE ONLY" crossing line on the cheque.
- **FR-004**: System MUST render a live preview of the cheque at actual size (190.5 × 88.9 mm) with all fields positioned using mm-based coordinates.
- **FR-005**: System MUST convert numeric amounts to Nepali-English words using the Lakh/Crore numbering system (e.g., 100000 → "One Lakh").
- **FR-006**: System MUST auto-generate the amount-in-words when the numeric amount changes, unless the user has manually edited the words field.
- **FR-007**: System MUST block printing if any required field (date, payee, amount, words) is empty or invalid.
- **FR-008**: System MUST block printing when the numeric amount and the amount-in-words do not match (case-insensitive, whitespace-normalized comparison).
- **FR-009**: System MUST support X/Y calibration offsets in 0.1 mm increments with a ±25 mm range.
- **FR-010**: System MUST set the @page print size to 190.5mm × 88.9mm landscape for Direct Feed mode.
- **FR-011**: System MUST show a clear error message describing why the Print button is disabled.
- **FR-012**: System MUST provide a "Clear All" action that resets all cheque data and calibration with confirmation.
- **FR-013**: System MUST prevent a second print invocation while a print dialog is open (double-click guard).
- **FR-014**: System MUST reject non-numeric calibration input (e.g., "30mm") without silently coercing it.

### Key Entities

- **BankTemplate**: Identifies a bank and its physical cheque layout. Attributes: id, bankName, widthMm (190.5), heightMm (88.9), field coordinates for date, payee, amount-words (2 lines), amount-numbers, and A/C Payee crossing.
- **ChequeFieldCoordinate**: A position on the cheque in mm. Attributes: x (mm from left), y (mm from top), width (mm), fontSize (pt), optional minFontSize, optional letterSpacing, optional alignment.
- **ChequeData**: The user-entered data for a single cheque. Attributes: bankId, payeeName, date (DD/MM/YYYY string), amount (number), amountInWords (string), isAcPayee (boolean).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can enter all cheque fields and see the preview update in real-time with every keystroke (no perceptible delay).
- **SC-002**: Printed cheques on standard 190.5 × 88.9 mm cheque stock have all fields within ±1 mm of their target position after ≤ 2 calibration adjustments.
- **SC-003**: 100% of invalid/empty cheque states are blocked from printing with a clear, actionable error message.
- **SC-004**: Amount-to-words conversion produces correct Nepali numbering for amounts from 1.00 to 999,999,999.99 NPR.
- **SC-005**: The print-readiness checklist (all fields valid + geometry confirmed) is satisfied in under 3 seconds for a returning user.

## Assumptions

- Target users have a browser with `window.print()` support and a connected printer loaded with standard Nepalese cheque stock (190.5 × 88.9 mm).
- Bank templates are provided as static configuration data (no backend required); future admin-defined templates may be added.
- Standard cheque size is 190.5 × 88.9 mm (8.5" × 3.5"), the common Nepalese cheque dimension.
- The number-to-words library uses English words with Nepali numbering grouping (Lakh, Crore), which is the convention on Nepalese cheques.
- Calibration is stored per print-mode group (Direct Feed vs A4 Carrier) and does not persist across sessions in the initial release.
