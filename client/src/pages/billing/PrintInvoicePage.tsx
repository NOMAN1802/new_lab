import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import { commissionBasis, formatDate, formatDateTime, money } from '@/lib/format';
import { useGetInvoiceQuery } from '@/services/invoicesApi';
import { useGetInvoicePaymentsQuery } from '@/services/paymentsApi';

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

    const validPayments = payments.filter((payment) => !payment.isVoided);

    return (
        <div className="min-h-screen bg-slate-100 py-8">
            <div className="mx-auto max-w-3xl px-4">
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
                        className="rounded-sm bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
                    >
                        Print / Save as PDF
                    </button>
                </div>

                <div ref={printRef} className="bg-white p-10 shadow-lg print:shadow-none">
                    {/*
                      No letterhead: these print onto the centre's own
                      pre-printed stationery, so the top of the page is left
                      clear for it.
                    */}
                    <header className="flex items-end justify-between border-b-2 border-slate-800 pb-5">
                        <div>
                            <p className="text-lg font-bold uppercase tracking-wide text-slate-900">
                                Invoice
                            </p>
                            <p className="mt-1 font-mono text-sm font-semibold text-slate-700">
                                {invoice.invoiceNumber}
                            </p>
                        </div>
                        <p className="text-sm text-slate-700">
                            Date: {formatDate(invoice.visitDate)}
                        </p>
                    </header>

                    <section className="grid grid-cols-2 gap-6 border-b border-slate-200 py-5 text-sm">
                        <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Patient
                            </p>
                            <p className="font-semibold text-slate-900">{invoice.patientInfo.name}</p>
                            <p className="text-slate-600">ID: {invoice.patientInfo.patientId}</p>
                            <p className="capitalize text-slate-600">
                                {invoice.patientInfo.age} yrs · {invoice.patientInfo.gender}
                            </p>
                            <p className="text-slate-600">{invoice.patientInfo.phone}</p>
                            {invoice.patientInfo.address && (
                                <p className="text-slate-600">{invoice.patientInfo.address}</p>
                            )}
                        </div>

                        {invoice.referrerInfo && (
                            <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Referred by
                                </p>
                                <p className="font-semibold text-slate-900">
                                    {invoice.referrerInfo.name}
                                </p>
                                {invoice.referrerInfo.designation && (
                                    <p className="text-slate-600">{invoice.referrerInfo.designation}</p>
                                )}
                                {invoice.referrerInfo.hospital && (
                                    <p className="text-slate-600">{invoice.referrerInfo.hospital}</p>
                                )}
                            </div>
                        )}
                    </section>

                    <table className="w-full py-5 text-sm">
                        <thead>
                            <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                                <th className="py-2 font-semibold">#</th>
                                <th className="py-2 font-semibold">Test</th>
                                <th className="py-2 font-semibold">Code</th>
                                <th className="py-2 text-right font-semibold">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, index) => (
                                <tr key={item._id} className="border-b border-slate-100">
                                    <td className="py-2.5 text-slate-500">{index + 1}</td>
                                    <td className="py-2.5 text-slate-800">{item.testName}</td>
                                    <td className="py-2.5 font-mono text-xs text-slate-500">
                                        {item.testCode}
                                    </td>
                                    <td className="py-2.5 text-right tabular-nums text-slate-900">
                                        {money(item.price)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <section className="flex justify-end pt-4">
                        <dl className="w-72 space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-slate-600">Gross amount</dt>
                                <dd className="tabular-nums text-slate-900">
                                    {money(invoice.grossAmount)}
                                </dd>
                            </div>
                            {invoice.discountAmount > 0 && (
                                <div className="flex justify-between">
                                    <dt className="text-slate-600">
                                        Discount ({invoice.discountPercent}%)
                                    </dt>
                                    <dd className="tabular-nums text-slate-900">
                                        −{money(invoice.discountAmount)}
                                    </dd>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold">
                                <dt className="text-slate-900">Net payable</dt>
                                <dd className="tabular-nums text-slate-900">
                                    {money(invoice.netPayable)}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-600">Amount paid</dt>
                                <dd className="tabular-nums text-slate-900">
                                    {money(invoice.paidAmount)}
                                </dd>
                            </div>
                            <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold">
                                <dt className="text-slate-900">Due balance</dt>
                                <dd className="tabular-nums text-slate-900">
                                    {money(invoice.dueAmount)}
                                </dd>
                            </div>

                            {invoice.referrerInfo &&
                                invoice.commissionAmount !== undefined && (
                                    <div className="mt-2 flex justify-between border-t border-dashed border-slate-300 pt-2">
                                        <dt className="text-slate-600">
                                            Referrer commission
                                            {invoice.commissionValue
                                                ? ` (${commissionBasis(
                                                      invoice.commissionType,
                                                      invoice.commissionValue
                                                  )})`
                                                : ''}
                                        </dt>
                                        <dd className="tabular-nums text-slate-900">
                                            {money(invoice.commissionAmount)}
                                        </dd>
                                    </div>
                                )}
                        </dl>
                    </section>

                    {validPayments.length > 0 && (
                        <section className="mt-6 border-t border-slate-200 pt-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Payments received
                            </p>
                            <table className="w-full text-xs">
                                <tbody>
                                    {validPayments.map((payment) => (
                                        <tr key={payment._id} className="text-slate-600">
                                            <td className="py-1 font-mono">{payment.receiptNumber}</td>
                                            <td className="py-1">
                                                {formatDateTime(payment.paymentDate)}
                                            </td>
                                            <td className="py-1">{payment.receivedByName}</td>
                                            <td className="py-1 text-right tabular-nums">
                                                {money(payment.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    )}

                    <footer className="mt-10 flex items-end justify-between border-t border-slate-200 pt-6 text-xs text-slate-500">
                        <p>
                            All payments received in cash.
                            <br />
                            This is a computer-generated invoice.
                        </p>
                        <div className="text-center">
                            <div className="mb-1 w-40 border-t border-slate-400" />
                            <p>Authorised signature</p>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default PrintInvoicePage;
