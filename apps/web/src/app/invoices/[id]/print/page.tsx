'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { TableSkeleton, ErrorMessage, Button } from '@/components/ui';
import { API_V1 } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
interface LineItem {
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

interface InvoiceDetail {
  _id: string;
  invoiceNumber: string;
  patientId: { firstName: string; lastName: string; systemId: string } | null;
  lineItems: LineItem[];
  subtotal: string;
  total: string;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  dueDate: string;
  createdAt: string;
  stellarMemo: string;
  stellarDestination: string;
  stellarPayURI: string;
  qrCodeDataUrl: string;
}

// ── Data fetching ─────────────────────────────────────────────────────────
async function fetchInvoice(id: string): Promise<InvoiceDetail> {
  const res = await fetch(`${API_V1}/invoices/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load invoice');
  const body = await res.json();
  return body.data;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

// ── Component ──────────────────────────────────────────────────────────────
export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const {
    data,
    isLoading,
    error,
  } = useQuery<InvoiceDetail>({
    queryKey: ['invoice', params.id],
    queryFn: () => fetchInvoice(params.id),
  });

  if (isLoading) return <TableSkeleton columns={4} rows={6} />;
  if (error)
    return (
      <ErrorMessage
        message={error instanceof Error ? error.message : 'Unable to load invoice.'}
        onRetry={() => window.location.reload()}
      />
    );
  if (!data) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">Invoice not found.</p>
          <Button onClick={() => router.push('/invoices')} className="mt-4">
            Back to invoices
          </Button>
        </div>
      </main>
    );
  }

  const patientName = data.patientId
    ? `${data.patientId.firstName} ${data.patientId.lastName}`
    : 'Unknown Patient';

  return (
    <>
      {/* ── Print-specific styles ── */}
      <style>{`
        @media print {
          /* Hide everything outside the print root */
          body > *:not(#invoice-print-root) { display: none !important; }
          #invoice-print-root { display: block !important; }

          /* Hide screen-only chrome */
          .no-print { display: none !important; }

          /* A4 page layout — ISO 216 */
          @page {
            size: A4 portrait;
            margin: 18mm 15mm 18mm 15mm;
          }

          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.5;
          }

          /* Respect colour-adjust for coloured header / badges */
          * {
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Tables */
          table { border-collapse: collapse; width: 100%; }
          th, td {
            border: 1px solid #ccc;
            padding: 4pt 6pt;
            text-align: left;
            font-size: 9pt;
          }
          th { background: #eeeeee !important; font-weight: bold; }

          /* Avoid breaking rows across pages */
          tr { page-break-inside: avoid; }
        }

        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      <div id="invoice-print-root">
        {/* ── Screen toolbar (hidden when printing) ── */}
        <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
          <button
            onClick={() => router.back()}
            className="text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            ← Back
          </button>
          <span className="flex-1 text-sm text-gray-500">
            Print preview — Invoice {data.invoiceNumber} · {patientName}
          </span>
          <a
            href={`/api/v1/invoices/${data._id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Download PDF
          </a>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Print / Save as PDF
          </button>
        </div>

        {/* ── Printable document ── */}
        <main className="mx-auto max-w-4xl px-6 py-8 print:p-0">

          {/* ── Invoice header ── */}
          <header className="mb-8 border-b-2 border-gray-800 pb-4">
            <div className="flex items-start justify-between">
              {/* Clinic branding */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Health Watchers Clinic</h1>
                <p className="text-sm text-gray-600">123 Medical Plaza, Suite 400 · (555) 800-1234</p>
                <p className="text-sm text-gray-600">support@healthwatchers.com</p>
              </div>
              {/* Invoice meta */}
              <div className="text-right">
                <p className="text-3xl font-extrabold tracking-tight text-blue-700">INVOICE</p>
                <p className="mt-1 font-semibold text-gray-900">#{data.invoiceNumber}</p>
                <p className="text-sm text-gray-600">Date: {formatDateTime(data.createdAt)}</p>
                <p className="text-sm text-gray-600">Due: {formatDate(data.dueDate)}</p>
                <p className="mt-1 text-sm">
                  Status:{' '}
                  <span
                    className={`font-semibold ${
                      data.status === 'paid'
                        ? 'text-green-700'
                        : data.status === 'cancelled'
                          ? 'text-red-600'
                          : 'text-gray-700'
                    }`}
                  >
                    {STATUS_LABEL[data.status] ?? data.status}
                  </span>
                </p>
              </div>
            </div>

            {/* Bill To */}
            <div className="mt-6 grid grid-cols-2 gap-x-8 text-sm">
              <div>
                <p className="font-semibold uppercase tracking-wide text-gray-500">Bill To</p>
                <p className="font-semibold text-gray-900">{patientName}</p>
                {data.patientId && (
                  <p className="text-gray-600">MRN: {data.patientId.systemId}</p>
                )}
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wide text-gray-500">Payment Reference</p>
                <p className="font-mono text-xs break-all text-gray-700">{data.stellarMemo}</p>
              </div>
            </div>
          </header>

          {/* ── Line items table ── */}
          <section className="mb-8">
            <h2 className="mb-3 text-base font-bold uppercase tracking-wide text-gray-800">
              Services
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-600">
                  <th className="border border-gray-300 px-3 py-2">Description</th>
                  <th className="border border-gray-300 px-3 py-2 text-right">Qty</th>
                  <th className="border border-gray-300 px-3 py-2 text-right">Unit Price</th>
                  <th className="border border-gray-300 px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.lineItems.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-3 py-2 text-gray-900">
                      {item.description}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-gray-900">
                      {item.unitPrice} {data.currency}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-medium text-gray-900">
                      {item.total} {data.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    {data.subtotal} {data.currency}
                  </span>
                </div>
                <div className="flex justify-between pt-1 text-base font-bold">
                  <span className="text-gray-900">Total Due</span>
                  <span className="text-blue-700">
                    {data.total} {data.currency}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Stellar payment details ── */}
          <section className="mb-8 rounded-lg border border-blue-100 bg-blue-50 p-4 print:border-gray-300 print:bg-gray-50">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-blue-800 print:text-gray-800">
              Stellar Payment Details
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <div>
                <span className="font-semibold text-gray-700">Destination Address: </span>
                <span className="break-all font-mono text-xs text-gray-900">
                  {data.stellarDestination}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Memo: </span>
                <span className="font-mono text-xs text-gray-900">{data.stellarMemo}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Amount: </span>
                <span className="text-gray-900">
                  {data.total} {data.currency}
                </span>
              </div>
            </div>

            {/* QR Code */}
            {data.qrCodeDataUrl && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-xs text-gray-600">Scan to pay via Stellar wallet</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.qrCodeDataUrl}
                  alt="Stellar payment QR code"
                  width={120}
                  height={120}
                  className="rounded border border-gray-200 bg-white p-1"
                />
              </div>
            )}
          </section>

          {/* ── Print footer ── */}
          <footer className="mt-12 border-t border-gray-300 pt-4 text-xs text-gray-500">
            <p>
              This invoice is generated from Health Watchers and is intended for the recipient only.
              Please retain for your records. For questions, contact support@healthwatchers.com.
            </p>
            <p className="mt-1">
              Patient: {patientName}
              {data.patientId ? ` · MRN: ${data.patientId.systemId}` : ''} · Invoice:{' '}
              {data.invoiceNumber} · Printed: {formatDateTime(new Date().toISOString())}
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}
