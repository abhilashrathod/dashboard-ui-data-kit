import { CircleAlert, TriangleAlert } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import {
  FormProvider,
  get,
  useFormContext,
  useFormState,
  type FieldPath,
  type FieldValues,
  type SubmitHandler,
  type UseFormReturn,
} from 'react-hook-form'
import { cn } from '@/lib/cn'

export interface FormProps<TValues extends FieldValues, TOutput = TValues> {
  form: UseFormReturn<TValues, unknown, TOutput>
  /** Runs with the schema's parsed output, only when client validation passes. */
  onSubmit: SubmitHandler<TOutput>
  className?: string
  id?: string
  children: ReactNode
}

/**
 * React Hook Form's provider + a <form noValidate>: the schema validates, not
 * the browser, so messages are ours and consistent with the server's.
 */
export function Form<TValues extends FieldValues, TOutput = TValues>({
  form,
  onSubmit,
  className,
  id,
  children,
}: FormProps<TValues, TOutput>) {
  return (
    <FormProvider {...form}>
      <form id={id} noValidate onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className={className}>
        {children}
      </form>
    </FormProvider>
  )
}

/** Spread onto the control: its id and the aria wiring. */
export interface FormControlProps {
  id: string
  'aria-invalid': boolean | undefined
  'aria-describedby': string | undefined
  'aria-required': boolean | undefined
}

export interface FormFieldRenderProps {
  id: string
  /** Pass to kit Inputs and Selects as `invalid` (the danger edge). */
  invalid: boolean
  /** Description and error ids, space-separated; undefined when neither shows. */
  describedBy: string | undefined
  /** `{...controlProps}` on the control wires id, aria-invalid, aria-describedby and aria-required. */
  controlProps: FormControlProps
}

export interface FormFieldProps<TValues extends FieldValues> {
  name: FieldPath<TValues>
  label: ReactNode
  description?: ReactNode
  required?: boolean
  className?: string
  children: (props: FormFieldRenderProps) => ReactNode
}

/**
 * A labelled control with its description and error. The label is a real
 * <label for>, the error is linked by aria-describedby and lives in an
 * always-present polite live region, so screen readers hear it appear.
 */
export function FormField<TValues extends FieldValues>({
  name,
  label,
  description,
  required = false,
  className,
  children,
}: FormFieldProps<TValues>) {
  const id = useId()
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`
  const { control } = useFormContext<TValues>()
  const { errors } = useFormState({ control, name })
  const message = (get(errors, name) as { message?: string } | undefined)?.message
  const invalid = message !== undefined

  const describedBy =
    [description ? descriptionId : null, invalid ? errorId : null].filter(Boolean).join(' ') ||
    undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-status-danger-fg">
            *
          </span>
        ) : null}
      </label>
      {children({
        id,
        invalid,
        describedBy,
        controlProps: {
          id,
          'aria-invalid': invalid || undefined,
          'aria-describedby': describedBy,
          'aria-required': required || undefined,
        },
      })}
      {description ? (
        <p id={descriptionId} className="text-xs text-fg-muted">
          {description}
        </p>
      ) : null}
      <p
        id={errorId}
        aria-live="polite"
        className={cn('flex items-center gap-1.5 text-xs text-status-danger-fg', !invalid && 'hidden')}
      >
        {invalid ? (
          <>
            <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            {message}
          </>
        ) : null}
      </p>
    </div>
  )
}

export interface FormErrorProps {
  title: ReactNode
  description?: ReactNode
  requestId?: string
  className?: string
}

/** A form-level failure (not tied to a field): an inline danger banner. */
export function FormError({ title, description, requestId, className }: FormErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-md bg-status-danger-subtle px-4 py-3 text-sm text-status-danger-fg',
        className,
      )}
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-medium">{title}</p>
        {description ? <p>{description}</p> : null}
        {requestId ? (
          <p className="text-xs">
            Request ID: <span className="font-mono select-all">{requestId}</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}
