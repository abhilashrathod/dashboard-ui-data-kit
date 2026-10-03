# Forms

The kit's form pattern, shown by the "New order" drawer ([`CreateOrderDrawer.tsx`](../src/features/orders/CreateOrderDrawer.tsx)). It uses React Hook Form, the Zod resolver, and the kit's `Form`, `FormField` and `FormError` ([`src/components/form/`](../src/components/form/)).

## One schema, one set of messages

The form validates with the same contract the API handler uses: `CreateOrderInput` in [`src/contracts/order.ts`](../src/contracts/order.ts). The schema carries the user-facing messages ("Name must be at least 2 characters", "Use at most 2 decimals", "Reference must look like PO-AB12C"), so:

- the client shows them inline as you type (`mode: 'onTouched'`, then `reValidateMode: 'onChange'`);
- the server, validating with the same schema, returns the **same** messages in its 422 `fieldErrors`, keyed by the same dot-paths (`customer.email`).

A rule only the server can check (a duplicate reference) still comes back as a field error, with the server's own message.

Number fields are text in the DOM. They're registered with `setValueAs` (empty → `undefined`, otherwise `Number`), so the schema's numeric checks apply unchanged and an empty field says "Enter an amount", not "expected number, received NaN".

## FormField: the accessibility wiring

```tsx
<FormField<FormValues> name="customer.email" label="Email" required>
  {({ controlProps, invalid }) => (
    <Input {...controlProps} {...register('customer.email')} type="email" invalid={invalid} />
  )}
</FormField>
```

`FormField` renders the `<label for>` (with a visual `*` when required), the control, an optional description and the error. The render prop's `controlProps` wires the control in one spread:

- `id`, matching the label;
- `aria-invalid` while there's an error (and `invalid` gives kit Inputs and Selects their danger edge);
- `aria-describedby`, the description and/or error ids;
- `aria-required`.

The error element is always in the DOM with `aria-live="polite"`, so a message is announced when it appears, not only when the field is focused. Errors use `status-danger-fg` with a small icon, so color is never the only cue. Radix Selects go through a `Controller`, composed from `Select.Root` + `SelectTrigger` so the trigger can take `controlProps` and the field's `ref` (for focusing it on error).

## Server errors: `applyServerErrors`

[`src/lib/forms/applyServerErrors.ts`](../src/lib/forms/applyServerErrors.ts) maps a failed submit onto the form:

- An `ApiError` with code `VALIDATION` and `fieldErrors`: each dot-path becomes `setError(path, { type: 'server', message })`, the first field gets focus, and it returns `true`. The drawer stays open and the messages show inline, exactly like client errors.
- Anything else returns `false`. The caller shows a form-level `FormError` (an inline danger banner with the `ERROR_COPY` text for the code and the request ID) and keeps every value entered.

## The unsaved-changes guard

Escape, the overlay, the close button and Cancel all reach the drawer's `onOpenChange`. While the form is dirty, closing opens a danger `ConfirmDialog`, "Discard this order?" (Discard / Keep editing). A pristine form closes at once, and nothing can close it mid-submit. The form mounts with the drawer's content, so every opening starts from fresh defaults and a new generated reference. The fields are disabled (one `<fieldset disabled>`) while the request is in flight.

On success the drawer closes, and a toast says "Order ORD-… created" with **View**. View is one push navigation to the Orders view searching for that id. The lists and metrics refresh through `useCreateOrder`'s existing invalidation.

## The demo helper

Under Reference, "Use an existing reference (demo)" fills in the reference of an order that already exists. It reads the first cached order list (`queryKeys.orders.lists()`), or fetches one order if nothing is cached. Submitting then shows the server-side duplicate check landing as an inline field error, the path a real conflict takes. Its tooltip says so.
