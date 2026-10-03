import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Shuffle } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { Controller, useForm, useWatch, type Control } from 'react-hook-form'
import {
  Amount,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  ERROR_COPY,
  Form,
  FormError,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  StatusPill,
  Tooltip,
  useToast,
} from '@/components'
import {
  Channel,
  CreateOrderInput,
  withDefaults,
  type Order,
  type Page,
} from '@/contracts'
import type { z } from '@/contracts/zod'
import { fetchOrders, type ApiError } from '@/lib/api'
import { toApiError } from '@/lib/data-state'
import { applyServerErrors } from '@/lib/forms'
import { queryKeys, useCreateOrder } from '@/lib/query'
import { CHANNEL_LABEL } from './orderColumns'

type FormValues = z.input<typeof CreateOrderInput>

const REFERENCE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** A random PO-XXXXX reference (A–Z, 0–9). */
export function generateReference(): string {
  let suffix = ''
  for (let i = 0; i < 5; i++) {
    suffix += REFERENCE_CHARS[Math.floor(Math.random() * REFERENCE_CHARS.length)]
  }
  return `PO-${suffix}`
}

const freshDefaults = (): Partial<FormValues> => ({
  customer: { name: '', email: '' },
  channel: 'web',
  amount: undefined,
  itemCount: 1,
  reference: generateReference(),
})

/** Empty input → undefined (so "required" fires), anything else → Number (NaN fails the schema). */
const toNumber = (value: unknown) => (value === '' || value == null ? undefined : Number(value))

export interface CreateOrderDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "View" in the success toast: show this order in the Orders view. */
  onViewOrder: (id: string) => void
}

/**
 * "New order": a form drawer. The open state lives with the caller; the form
 * itself mounts with the drawer's content, so every opening starts from fresh
 * defaults and a new reference. Closing a dirty form asks first.
 */
export function CreateOrderDrawer({ open, onOpenChange, onViewOrder }: CreateOrderDrawerProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  /** Set by the mounted form: whether closing now would lose work, or is blocked. */
  const guard = useRef<{ dirty: boolean; submitting: boolean }>({ dirty: false, submitting: false })

  // Escape, the overlay, the close button and Cancel all come through here.
  const requestOpenChange = (next: boolean) => {
    if (next) return onOpenChange(true)
    if (guard.current.submitting) return
    if (guard.current.dirty) return setConfirmDiscard(true)
    onOpenChange(false)
  }

  return (
    <>
      <Drawer open={open} onOpenChange={requestOpenChange}>
        <DrawerContent size="md" aria-describedby={undefined}>
          {open ? (
            <CreateOrderForm
              guard={guard}
              onCancel={() => requestOpenChange(false)}
              onCreated={(order) => {
                guard.current = { dirty: false, submitting: false }
                onOpenChange(false)
                return order
              }}
              onViewOrder={onViewOrder}
            />
          ) : null}
        </DrawerContent>
      </Drawer>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        tone="danger"
        title="Discard this order?"
        description="The details you entered will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {
          guard.current = { dirty: false, submitting: false }
          onOpenChange(false)
        }}
      />
    </>
  )
}

function CreateOrderForm({
  guard,
  onCancel,
  onCreated,
  onViewOrder,
}: {
  guard: { current: { dirty: boolean; submitting: boolean } }
  onCancel: () => void
  onCreated: (order: Order) => void
  onViewOrder: (id: string) => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const createOrder = useCreateOrder()
  const [formError, setFormError] = useState<ApiError | null>(null)
  const [findingReference, setFindingReference] = useState(false)

  const form = useForm<FormValues, unknown, CreateOrderInput>({
    resolver: zodResolver(CreateOrderInput),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: freshDefaults(),
  })
  const { register, control, formState, setValue } = form
  const submitting = formState.isSubmitting
  // Read by the drawer when a close is requested (a ref: no re-render needed).
  guard.current = { dirty: formState.isDirty, submitting }

  const onSubmit = async (values: CreateOrderInput) => {
    setFormError(null)
    try {
      const order = await createOrder.mutateAsync(values)
      form.reset(freshDefaults())
      onCreated(order)
      toast({
        title: `Order ${order.id} created`,
        tone: 'success',
        action: { label: 'View', onClick: () => onViewOrder(order.id) },
      })
    } catch (error) {
      if (applyServerErrors(form, error)) return
      // Not a field problem: say so at the top and keep everything entered.
      setFormError(toApiError(error))
    }
  }

  const setReference = (reference: string) =>
    setValue('reference', reference, { shouldDirty: true, shouldValidate: true, shouldTouch: true })

  /** Demo helper: an existing order's reference, to show the server's duplicate check. */
  const fillExistingReference = async () => {
    const cached = queryClient
      .getQueriesData<Page<Order>>({ queryKey: queryKeys.orders.lists() })
      .map(([, page]) => page?.rows[0]?.reference)
      .find((reference) => reference !== undefined)
    if (cached) return setReference(cached)
    setFindingReference(true)
    try {
      const page = await fetchOrders(withDefaults({ pageSize: 1 }))
      const reference = page.rows[0]?.reference
      if (reference) setReference(reference)
      else toast({ title: 'No orders to borrow a reference from', tone: 'danger' })
    } catch {
      toast({ title: "Couldn't load an existing order", tone: 'danger' })
    } finally {
      setFindingReference(false)
    }
  }

  const reference = register('reference')
  const onReferenceChange = (event: ChangeEvent<HTMLInputElement>) => {
    // Uppercase as typed, keeping the caret where it was.
    const input = event.currentTarget
    const { selectionStart, selectionEnd } = input
    input.value = input.value.toUpperCase()
    input.setSelectionRange(selectionStart, selectionEnd)
    return reference.onChange(event)
  }

  const errorCopy = formError ? ERROR_COPY[formError.code] : undefined

  return (
    <Form form={form} onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader>
        <DrawerTitle>New order</DrawerTitle>
        <DrawerDescription>Create an order manually.</DrawerDescription>
      </DrawerHeader>
      <DrawerBody className="flex flex-col gap-6">
        {formError && errorCopy ? (
          <FormError
            title={errorCopy.title}
            description={errorCopy.description}
            requestId={formError.requestId}
          />
        ) : null}

        <fieldset disabled={submitting} className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="new-order-customer" className="flex flex-col gap-4">
            <h3 id="new-order-customer" className="text-xs font-medium tracking-wide text-fg-muted uppercase">
              Customer
            </h3>
            <FormField<FormValues> name="customer.name" label="Name" required>
              {({ controlProps, invalid }) => (
                <Input
                  {...controlProps}
                  {...register('customer.name')}
                  invalid={invalid}
                  autoComplete="off"
                />
              )}
            </FormField>
            <FormField<FormValues> name="customer.email" label="Email" required>
              {({ controlProps, invalid }) => (
                <Input
                  {...controlProps}
                  {...register('customer.email')}
                  type="email"
                  invalid={invalid}
                  autoComplete="off"
                />
              )}
            </FormField>
          </section>

          <section aria-labelledby="new-order-order" className="flex flex-col gap-4">
            <h3 id="new-order-order" className="text-xs font-medium tracking-wide text-fg-muted uppercase">
              Order
            </h3>
            <FormField<FormValues> name="channel" label="Channel" required>
              {({ controlProps, invalid }) => (
                <Controller
                  control={control}
                  name="channel"
                  render={({ field }) => (
                    <Select.Root
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={submitting}
                    >
                      <SelectTrigger
                        {...controlProps}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        invalid={invalid}
                      />
                      <SelectContent>
                        {Channel.options.map((channel) => (
                          <SelectItem key={channel} value={channel}>
                            {CHANNEL_LABEL[channel]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select.Root>
                  )}
                />
              )}
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
              <FormField<FormValues> name="amount" label="Amount" required>
                {({ controlProps, invalid }) => (
                  <Input
                    {...controlProps}
                    {...register('amount', { setValueAs: toNumber })}
                    inputMode="decimal"
                    leftAdornment="$"
                    placeholder="0.00"
                    invalid={invalid}
                    autoComplete="off"
                  />
                )}
              </FormField>
              <FormField<FormValues> name="itemCount" label="Items" required>
                {({ controlProps, invalid }) => (
                  <Input
                    {...controlProps}
                    {...register('itemCount', { setValueAs: toNumber })}
                    type="number"
                    min={1}
                    max={999}
                    step={1}
                    invalid={invalid}
                  />
                )}
              </FormField>
            </div>
            <div className="flex flex-col gap-2">
              <FormField<FormValues>
                name="reference"
                label="Reference"
                description="The customer's purchase order, e.g. PO-AB12C."
                required
              >
                {({ controlProps, invalid }) => (
                  <Input
                    {...controlProps}
                    {...reference}
                    onChange={onReferenceChange}
                    invalid={invalid}
                    autoComplete="off"
                    spellCheck={false}
                    className="pr-1.5 uppercase"
                    rightAdornment={
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Shuffle />}
                        onClick={() => setReference(generateReference())}
                        disabled={submitting}
                        className="text-fg"
                      >
                        Generate
                      </Button>
                    }
                  />
                )}
              </FormField>
              <Tooltip content="Triggers the server-side duplicate check" side="bottom">
                <button
                  type="button"
                  onClick={() => void fillExistingReference()}
                  disabled={submitting || findingReference}
                  aria-busy={findingReference || undefined}
                  className="self-start rounded-xs text-xs text-accent-text underline-offset-2 focus-ring hover-enabled:underline disabled:cursor-progress"
                >
                  Use an existing reference (demo)
                </button>
              </Tooltip>
            </div>
          </section>
        </fieldset>

        <OrderPreview control={control} />
      </DrawerBody>
      <DrawerFooter>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Create order
        </Button>
      </DrawerFooter>
    </Form>
  )
}

/** A live preview of the order as it will be created (new orders start as pending). */
function OrderPreview({ control }: { control: Control<FormValues, unknown, CreateOrderInput> }) {
  const values = useWatch({ control })
  const name = values.customer?.name?.trim()
  const email = values.customer?.email?.trim()
  const amount = typeof values.amount === 'number' && Number.isFinite(values.amount) ? values.amount : 0
  const items =
    typeof values.itemCount === 'number' && Number.isFinite(values.itemCount) ? values.itemCount : 0
  const channel = Channel.safeParse(values.channel)

  return (
    <Card variant="tile" aria-labelledby="new-order-preview" className="gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 id="new-order-preview" className="text-sm font-medium text-fg-muted">
          Preview
        </h3>
        <StatusPill status="pending" />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="truncate font-medium">{name || 'Customer name'}</p>
        <p className="truncate text-sm text-fg-muted">{email || 'customer@example.com'}</p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Amount value={amount} size="display-sm" glyph />
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          {channel.success ? (
            <Badge variant="outline" tone="neutral">
              {CHANNEL_LABEL[channel.data]}
            </Badge>
          ) : null}
          <span className="tabular">
            {items} {items === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>
    </Card>
  )
}
