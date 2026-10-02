import { useState, type ReactNode } from 'react'
import { Dialog } from '@/components'
import { BulkDetailsContext, type BulkFailureDetails } from './bulkDetails'
import { orders, statusWord } from './summarizeBulkResult'

/**
 * Hosts the "couldn't be changed" dialog ABOVE the table, not inside the bulk
 * bar: the toast's "View details" can be pressed after the bar is gone (the
 * user cleared the selection), and the dialog must still open.
 */
export function BulkDetailsProvider({ children }: { children: ReactNode }) {
  const [details, setDetails] = useState<BulkFailureDetails | null>(null)
  const [open, setOpen] = useState(false)

  const show = (next: BulkFailureDetails) => {
    setDetails(next)
    setOpen(true)
  }

  return (
    <BulkDetailsContext value={show}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        {details ? (
          <Dialog.Content size="md">
            <Dialog.Header>
              <Dialog.Title>Orders that couldn&apos;t be changed</Dialog.Title>
              <Dialog.Description>
                {orders(details.failed.length)} couldn&apos;t be marked as{' '}
                {statusWord(details.status)}. Reasons are as the server reported them.
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body className="max-h-80">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-dashed border-border text-fg-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Order
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {details.failed.map((failure) => (
                    <tr key={failure.id}>
                      <td className="py-2 pr-4 whitespace-nowrap text-fg-muted tabular">
                        {failure.id}
                      </td>
                      <td className="py-2">{failure.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Dialog.Body>
          </Dialog.Content>
        ) : null}
      </Dialog>
    </BulkDetailsContext>
  )
}
