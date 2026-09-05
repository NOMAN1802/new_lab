import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import { CENTRE } from '@/lib/centre';
import { formatDate, formatDateTime, money } from '@/lib/format';
import { useGetInvoiceQuery } from '@/services/invoicesApi';
import { useGetInvoicePaymentsQuery } from '@/services/paymentsApi';

/**
 * The patient's copy.
 *
 * Set in a serif rather than the app's face: this is a paper record a patient
 * keeps, and the interface's monospace is both wider than A4 wants and wrong
 * for names and addresses. The mono face is kept for the things that get read
 * back aloud or transcribed — the invoice number, test codes, receipts — and
 * for the money column, where tabular figures line up on the decimal.
 *
 * Nothing about the centre's commission arrangements appears here. What a
 * referring doctor is owed is between the centre and the doctor; it is not the
 * patient's business and does not belong on their bill.
 */
const PrintInvoicePage = () => {
    const { id } = useParams();
    const printRef = useRef<HTMLDivElement>(null);

    const { data: invoice, isLoading, isError, refetch } = useGetInvoiceQuery(id!);
    const { data: payments = [] } = useGetInvoicePaymentsQuery(id!);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: invoice ? `Invoice-${invoice.invoiceNumber}` : 'Invoice',
    });

    if (isLoading) return <Loader fullScreen message="Preparing invoice..." />;
    if (isError || !invoice) {
        return <ErrorState title="Could not load invoice" onRetry={refetch} />;
    }

    const receipts = payments.filter((payment) => !payment.isVoided);
    const settled = invoice.dueAmount <= 0;

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
            <style>{`
                @page { size: A4; margin: 14mm; }
                @media print {
                    .sheet { box-shadow: none; padding: 0; }
                    tr, .keep-together { break-inside: avoid; }
                    thead { display: table-header-group; }
                }
                .doc { font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif; }
                /* Bengali is not in either Latin face; the taka sign comes from here. */
                .figure { font-family: 'JetBrains Mono', 'Noto Sans Bengali', ui-monospace, monospace; }
            `}</style>

            <div className="mx-auto max-w-[52rem] px-4">
                <div className="mb-4 flex justify-end gap-3 print:hidden">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="rounded-sm border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        onClick={() => handlePrint()}
                        className="rounded-sm bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                        Print / Save as PDF
                    </button>
                </div>

                <div ref={printRef} className="doc sheet bg-white p-12 text-[13px] leading-relaxed text-black shadow-lg">
                    {/*
                      No letterhead: these print onto the centre's own pre-printed
                      stationery, so the top of the page stays clear for it.
                    */}
                    <header className="flex items-end justify-between gap-8 border-b border-black pb-4">
                        <div>
                            <h1 className="text-[26px] font-semibold leading-none tracking-tight">Invoice</h1>
                            <p className="figure mt-2 text-[13px] tracking-tight text-neutral-700">
                                {invoice.invoiceNumber}
                            </p>
                        </div>
                        <dl className="text-right text-[12px] leading-snug text-neutral-600">
                            <div className="flex justify-end gap-2">
                                <dt>Date</dt>
                                <dd className="figure w-28 text-black">{formatDate(invoice.visitDate)}</dd>
                            </div>
                            {invoice.isCancelled && (
                                <div className="mt-1 flex justify-end gap-2">
                                    <dt>Status</dt>
                                    <dd className="w-28 font-semibold text-black">Cancelled</dd>
                                </div>
                            )}
                        </dl>
                    </header>

                    <section className="grid grid-cols-[1.1fr_1fr] gap-10 py-5">
                        <div>
                            <h2 className="mb-1.5 text-[11px] font-semibold text-neutral-500">Billed to</h2>
                            <p className="text-[15px] font-semibold">{invoice.patientInfo.name}</p>
                            <p className="figure mt-0.5 text-[12px] text-neutral-600">
                                {invoice.patientInfo.patientId}
                            </p>
                            <p className="mt-1 capitalize text-neutral-700">
                                {invoice.patientInfo.age} years, {invoice.patientInfo.gender}
                            </p>
                            <p className="figure text-neutral-700">{invoice.patientInfo.phone}</p>
                            {invoice.patientInfo.address && (
                                <p className="text-neutral-700">{invoice.patientInfo.address}</p>
                            )}
                        </div>

                        {invoice.referrerInfo && (
                            <div>
                                <h2 className="mb-1.5 text-[11px] font-semibold text-neutral-500">Referred by</h2>
                                <p className="text-[15px] font-semibold">{invoice.referrerInfo.name}</p>
                                {invoice.referrerInfo.designation && (
                                    <p className="mt-0.5 text-neutral-700">{invoice.referrerInfo.designation}</p>
                                )}
                                {invoice.referrerInfo.hospital && (
                                    <p className="text-neutral-700">{invoice.referrerInfo.hospital}</p>
                                )}
                            </div>
                        )}
                    </section>

                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-y border-neutral-400 text-left text-[11px] font-semibold text-neutral-600">
                                <th className="w-8 py-2 font-semibold">#</th>
                                <th className="py-2 font-semibold">Test</th>
                                <th className="w-32 py-2 font-semibold">Code</th>
                                <th className="w-32 py-2 text-right font-semibold">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, index) => (
                                <tr
                                    key={item._id}
                                    className={`border-b border-neutral-200 ${item.isCancelled ? 'text-neutral-400' : ''}`}
                                >
                                    <td className="figure py-2.5 align-top text-[12px] text-neutral-500">{index + 1}</td>
                                    <td className="py-2.5 align-top">
                                        <span className={item.isCancelled ? 'line-through' : ''}>{item.testName}</span>
                                        {/*
                                          Struck, not dropped: the patient was told they were
                                          being billed for this, so the bill has to show what
                                          happened to it rather than quietly disagree.
                                        */}
                                        {item.isCancelled && (
                                            <span className="block text-[11px] italic">
                                                Cancelled{item.cancelReason ? ` — ${item.cancelReason}` : ''}
                                            </span>
                                        )}
                                    </td>
                                    <td className="figure py-2.5 align-top text-[12px] text-neutral-600">
                                        {item.testCode}
                                    </td>
                                    <td
                                        className={`figure py-2.5 text-right align-top tabular-nums ${
                                            item.isCancelled ? 'line-through' : ''
                                        }`}
                                    >
                                        {money(item.price)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <section className="keep-together mt-6 flex justify-end">
                        <div className="w-80">
                            <dl className="space-y-1.5 text-[13px]">
                                <div className="flex justify-between">
                                    <dt className="text-neutral-600">Subtotal</dt>
                                    <dd className="figure tabular-nums">{money(invoice.grossAmount)}</dd>
                                </div>
                                {invoice.discountAmount > 0 && (
                                    <div className="flex justify-between">
                                        <dt className="text-neutral-600">Discount {invoice.discountPercent}%</dt>
                                        <dd className="figure tabular-nums">−{money(invoice.discountAmount)}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-neutral-300 pt-1.5 font-semibold">
                                    <dt>Net payable</dt>
                                    <dd className="figure tabular-nums">{money(invoice.netPayable)}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-neutral-600">Paid</dt>
                                    <dd className="figure tabular-nums">{money(invoice.paidAmount)}</dd>
                                </div>
                            </dl>

                            {/*
                              The one fact a patient and the counter both check.
                              It was the fifth row of a list; here it is the only
                              thing on the page set large.
                            */}
                            <div className="mt-3 flex items-baseline justify-between border-y-2 border-black py-2.5">
                                <span className="text-[14px] font-semibold">
                                    {settled ? 'Paid in full' : 'Balance due'}
                                </span>
                                <span className="figure text-[19px] font-semibold tabular-nums">
                                    {money(settled ? invoice.paidAmount : invoice.dueAmount)}
                                </span>
                            </div>
                        </div>
                    </section>

                    {receipts.length > 0 && (
                        <section className="keep-together mt-8">
                            <h2 className="mb-2 text-[11px] font-semibold text-neutral-500">Receipts</h2>
                            <table className="w-full border-collapse text-[12px]">
                                <tbody>
                                    {receipts.map((payment) => (
                                        <tr key={payment._id} className="border-b border-neutral-200 text-neutral-700">
                                            <td className="figure w-32 py-1.5">{payment.receiptNumber}</td>
                                            <td className="figure py-1.5">{formatDateTime(payment.paymentDate)}</td>
                                            <td className="py-1.5">{payment.receivedByName}</td>
                                            <td className="figure w-32 py-1.5 text-right tabular-nums">
                                                {money(payment.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    )}

                    <footer className="keep-together mt-12 flex items-end justify-between gap-10 border-t border-neutral-300 pt-5 text-[11px] leading-relaxed text-neutral-600">
                        <div>
                            <p>Paid in cash. Please bring this invoice when collecting reports.</p>
                            <p className="mt-0.5">
                                Computer-generated by {CENTRE.name}
                                {CENTRE.phone ? ` · ${CENTRE.phone}` : ''}
                            </p>
                        </div>
                        <div className="shrink-0 text-center">
                            <div className="mb-1.5 w-44 border-t border-neutral-500" />
                            <p>Authorised signature</p>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default PrintInvoicePage;
