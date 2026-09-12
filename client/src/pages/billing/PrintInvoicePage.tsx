import { Fragment, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import BrandLogo from '@/components/brand/BrandLogo';
import { BRAND_BLUE, BRAND_GREEN, BRAND_TAGLINE_BN, BRAND_VALUES } from '@/lib/brand';
import { CENTRE } from '@/lib/centre';
import { formatDate, formatDateTime, money } from '@/lib/format';
import { isUnreachableBase, publicReportUrl } from '@/lib/publicUrl';
import { useGetInvoiceQuery } from '@/services/invoicesApi';
import type { Invoice } from '@/services/invoicesApi';
import { useGetInvoicePaymentsQuery } from '@/services/paymentsApi';

type CopyKind = 'patient' | 'centre';
type CopySelection = 'both' | CopyKind;

type Receipt = {
    _id: string;
    receiptNumber: string;
    paymentDate: string;
    receivedByName?: string;
    amount: number;
};

const COPY_LABEL: Record<CopyKind, string> = {
    patient: 'Patient copy',
    centre: 'Centre copy',
};

const SELECTION_LABEL: Record<CopySelection, string> = {
    both: 'Both copies · A4',
    patient: 'Patient copy · A5',
    centre: 'Centre copy · A5',
};

/**
 * The centre's letterhead: the logo, the contact details, and beneath a
 * blue-to-green rule the three values and the Bangla tagline from the
 * centre's own signage. Printed in English, like the rest of the document.
 */
const Letterhead = () => (
    <header>
        <div className="flex items-center justify-between gap-6">
            <BrandLogo size="letterhead" lang="en" />
            <address className="text-right text-[10px] not-italic leading-snug text-neutral-600">
                {CENTRE.address && <p>{CENTRE.address}</p>}
                {CENTRE.phone && <p className="figure">{CENTRE.phone}</p>}
                {CENTRE.email && <p>{CENTRE.email}</p>}
                {CENTRE.website && <p>{CENTRE.website}</p>}
            </address>
        </div>
        <div className="brand-rule mt-2" />
        <div className="mt-1.5 flex items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-[8.5px] font-semibold uppercase tracking-[.12em]">
                {BRAND_VALUES.en.map((value, index) => (
                    <span key={value} className="flex items-center gap-2">
                        {index > 0 && <span className="text-neutral-300">|</span>}
                        <span style={{ color: index === 1 ? BRAND_GREEN : BRAND_BLUE }}>{value}</span>
                    </span>
                ))}
            </p>
            <p className="tagline">{BRAND_TAGLINE_BN}</p>
        </div>
    </header>
);

const Totals = ({ invoice }: { invoice: Invoice }) => {
    const settled = invoice.dueAmount <= 0;

    return (
        <div className="w-60 shrink-0">
            <dl className="space-y-0.5 text-[11.5px] leading-snug">
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
                <div className="flex justify-between border-t border-neutral-300 pt-0.5 font-semibold">
                    <dt>Net payable</dt>
                    <dd className="figure tabular-nums">{money(invoice.netPayable)}</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-neutral-600">Paid</dt>
                    <dd className="figure tabular-nums">{money(invoice.paidAmount)}</dd>
                </div>
            </dl>

            {/*
              The one fact the patient and the counter both check, and the one
              thing on each copy set large.
            */}
            <div className="mt-1.5 flex items-baseline justify-between border-y-2 border-black py-1">
                <span className="text-[12.5px] font-semibold">{settled ? 'Paid in full' : 'Balance due'}</span>
                <span className="figure text-[15px] font-semibold tabular-nums">
                    {money(settled ? invoice.paidAmount : invoice.dueAmount)}
                </span>
            </div>
        </div>
    );
};

/** What only the patient needs: the QR for their reports, and how to collect them. */
const PatientNotes = ({ invoice }: { invoice: Invoice }) => (
    <div className="flex items-start gap-3">
        {invoice.publicToken && (
            <div className="shrink-0 text-center">
                <QRCodeSVG value={publicReportUrl(invoice.publicToken)} size={62} level="M" marginSize={0} />
                <p className="mt-1 text-[8px] leading-tight">Scan for your reports</p>
            </div>
        )}
        <div>
            <p className="font-semibold text-neutral-800">Collecting your reports</p>
            <p className="mt-0.5">
                Scan the code with your phone to read your reports online once this invoice is settled, or
                bring this copy to the counter.
            </p>
        </div>
    </div>
);

/**
 * What only the centre needs: who booked the visit and every receipt taken
 * against it, so the counter can reconcile the till without opening the app.
 */
const CentreNotes = ({ invoice, receipts }: { invoice: Invoice; receipts: Receipt[] }) => {
    const bookedBy = typeof invoice.createdBy === 'object' ? invoice.createdBy?.name : undefined;

    return (
        <div>
            {bookedBy && (
                <p>
                    <span className="field-label mr-1.5 inline">Booked by</span>
                    <span className="text-neutral-800">{bookedBy}</span>
                </p>
            )}
            {receipts.length > 0 ? (
                <table className="mt-1 w-full border-collapse text-[10px] leading-tight">
                    <tbody>
                        {receipts.map((payment) => (
                            <tr key={payment._id} className="border-b border-neutral-200">
                                <td className="figure py-0.5 pr-2">{payment.receiptNumber}</td>
                                <td className="figure py-0.5 pr-2">{formatDateTime(payment.paymentDate)}</td>
                                <td className="py-0.5 pr-2">{payment.receivedByName}</td>
                                <td className="figure py-0.5 text-right tabular-nums">{money(payment.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="mt-1">No payment received yet.</p>
            )}
        </div>
    );
};

/**
 * One half of the two-part invoice. Both halves carry the same bill; they
 * differ only in what each party needs to keep: the patient's half has the QR
 * and collection instructions, the centre's half has the booking and receipt
 * trail and a "Received by" line.
 */
const InvoiceCopy = ({ invoice, receipts, kind }: { invoice: Invoice; receipts: Receipt[]; kind: CopyKind }) => {
    const patient = invoice.patientInfo;
    const referrer = invoice.referrerInfo;

    return (
        <section className="copy">
            {/*
              The watermark: the centre's logo set large, faint and softened in
              the middle of the copy, behind the bill, as on the centre's own
              stationery. Every copy carries it, and it never competes with the
              figures printed over it.
            */}
            <div className="watermark" aria-hidden="true">
                <BrandLogo size="lg" lang="en" />
            </div>

            <Letterhead />

            <div className="mt-3 flex items-end justify-between gap-6">
                <div className="flex items-baseline gap-3">
                    <h1 className="text-[17px] font-semibold leading-none tracking-tight">Invoice</h1>
                    <span className="figure text-[12px] text-neutral-700">{invoice.invoiceNumber}</span>
                    {invoice.isCancelled && (
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider">Cancelled</span>
                    )}
                </div>
                <span className={`copy-tag ${kind === 'centre' ? 'copy-tag--centre' : ''}`}>{COPY_LABEL[kind]}</span>
            </div>

            <div className="mt-2 grid grid-cols-[1.35fr_1fr_auto] gap-6 border-y border-neutral-300 py-2 text-[11px] leading-snug">
                <div>
                    <p className="field-label">Patient</p>
                    <p className="text-[13px] font-semibold">{patient.name}</p>
                    <p className="text-neutral-700">
                        <span className="figure">{patient.patientId}</span>
                        {' · '}
                        <span className="capitalize">
                            {patient.age} yrs, {patient.gender}
                        </span>
                        {' · '}
                        <span className="figure">{patient.phone}</span>
                    </p>
                </div>
                <div>
                    <p className="field-label">Referred by</p>
                    {referrer ? (
                        <>
                            <p className="font-semibold">{referrer.name}</p>
                            {(referrer.designation || referrer.hospital) && (
                                <p className="text-neutral-700">
                                    {[referrer.designation, referrer.hospital].filter(Boolean).join(', ')}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-neutral-700">Self</p>
                    )}
                </div>
                <div className="text-right">
                    <p className="field-label">Date</p>
                    <p className="figure">{formatDate(invoice.visitDate)}</p>
                </div>
            </div>

            <table className="bill-table w-full border-collapse text-[11.5px] leading-tight">
                <thead>
                    <tr className="border-b border-neutral-400 text-left text-[9.5px] font-semibold uppercase tracking-wider text-neutral-500">
                        <th className="w-7 py-1.5 font-semibold">#</th>
                        <th className="py-1.5 font-semibold">Test</th>
                        <th className="w-28 py-1.5 font-semibold">Code</th>
                        <th className="w-28 py-1.5 text-right font-semibold">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items.map((item, index) => (
                        <tr
                            key={item._id}
                            className={`border-b border-neutral-200 ${item.isCancelled ? 'text-neutral-400' : ''}`}
                        >
                            <td className="figure py-1 align-top text-[10.5px] text-neutral-500">{index + 1}</td>
                            <td className="py-1 align-top">
                                {/*
                                  Struck, not dropped: the patient was told they were
                                  being billed for this, so the bill has to show what
                                  happened to it rather than quietly disagree.
                                */}
                                <span className={item.isCancelled ? 'line-through' : ''}>{item.testName}</span>
                                {item.isCancelled && (
                                    <span className="ml-2 text-[10px] italic">
                                        cancelled{item.cancelReason ? ` — ${item.cancelReason}` : ''}
                                    </span>
                                )}
                            </td>
                            <td className="figure py-1 align-top text-[10.5px] text-neutral-600">{item.testCode}</td>
                            <td
                                className={`figure py-1 text-right align-top tabular-nums ${
                                    item.isCancelled ? 'line-through' : ''
                                }`}
                            >
                                {money(item.price)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Blank ruled lines down to the totals; see .filler. */}
            <div className="filler" aria-hidden="true" />

            <div className="mt-2.5 flex items-start justify-between gap-8">
                <div className="min-w-0 flex-1 text-[10.5px] leading-snug text-neutral-600">
                    {kind === 'patient' ? (
                        <PatientNotes invoice={invoice} />
                    ) : (
                        <CentreNotes invoice={invoice} receipts={receipts} />
                    )}
                </div>
                <Totals invoice={invoice} />
            </div>

            <footer className="mt-4 flex items-end justify-between gap-6 text-[9.5px] text-neutral-500">
                <p>
                    Computer-generated invoice
                    {CENTRE.phone ? ` · ${CENTRE.phone}` : ''}
                </p>
                <div className="shrink-0 text-center">
                    <div className="mb-1 w-40 border-t border-neutral-500" />
                    <p className="text-neutral-600">{kind === 'patient' ? 'Authorised signature' : 'Received by'}</p>
                </div>
            </footer>
        </section>
    );
};

/**
 * The printed invoice, in two parts on one A4 sheet: the patient's copy on
 * top and the centre's copy beneath, separated by a cut line, each under the
 * centre's letterhead.
 *
 * Set in a serif rather than the app's face: this is a paper record, and the
 * interface's monospace is wider than A4 wants and wrong for names. The mono
 * face is kept for what gets read back or transcribed -- invoice numbers, test
 * codes, receipts -- and for money, where tabular figures align.
 *
 * Each copy refuses to split across pages. A booking with many tests pushes
 * the centre's copy onto a second sheet whole, rather than tearing either
 * copy in half. Either copy can also be printed alone -- a reprint for a
 * patient who lost theirs should not produce a second centre copy.
 *
 * Nothing about the centre's commission arrangements appears on either copy.
 */
const PrintInvoicePage = () => {
    const { id } = useParams();
    const printRef = useRef<HTMLDivElement>(null);
    const [selection, setSelection] = useState<CopySelection>('both');

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

    const receipts = payments.filter((payment) => !payment.isVoided) as Receipt[];
    const kinds: CopyKind[] = selection === 'both' ? ['patient', 'centre'] : [selection];

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
            <style>{`
                /* Each copy is exactly one A5 half of an A4 sheet: both copies
                   fill an A4 portrait page top and bottom, a single copy prints
                   on A5 landscape and looks exactly like its half. */
                @page { size: ${selection === 'both' ? 'A4 portrait' : 'A5 landscape'}; margin: 0; }
                @media print {
                    .sheet { box-shadow: none !important; }
                    thead { display: table-header-group; }
                }
                .copy {
                    box-sizing: border-box; width: 210mm; min-height: 148mm;
                    padding: 8mm 12mm; break-inside: avoid;
                    display: flex; flex-direction: column;
                }
                /* Fixed row height, so the blank lines below continue the
                   table at exactly the same pitch. */
                .bill-table tbody td { height: 6.2mm; box-sizing: border-box; }
                /* Whatever height a short bill leaves is taken up by blank
                   ruled lines, as on a printed invoice pad, instead of an
                   empty hole between the tests and the totals. */
                .filler {
                    flex: 1 1 auto; min-height: 0;
                    background-image: repeating-linear-gradient(
                        to bottom,
                        transparent 0, transparent calc(6.2mm - 1px),
                        #e5e5e5 calc(6.2mm - 1px), #e5e5e5 6.2mm
                    );
                }
                .doc {
                    font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;
                    /* Browsers drop background colours when printing unless told
                       not to; the tagline, the rule and the centre tag need them. */
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                /* Bengali is not in either Latin face; the taka sign comes from here. */
                .figure { font-family: 'JetBrains Mono', 'Noto Sans Bengali', ui-monospace, monospace; }
                .copy { position: relative; }
                /* Everything in a copy sits above the watermark. */
                .copy > *:not(.watermark) { position: relative; z-index: 1; }
                .watermark {
                    position: absolute; inset: 0; z-index: 0;
                    display: flex; align-items: center; justify-content: center;
                    pointer-events: none; opacity: .09; filter: blur(1.2px);
                }
                .watermark > div { transform: scale(1.35); }
                .brand-rule { height: 2px; background: linear-gradient(90deg, ${BRAND_BLUE}, ${BRAND_GREEN}); }
                .tagline {
                    font-family: 'Noto Sans Bengali', sans-serif;
                    font-size: 10px; font-weight: 600; line-height: 1.5;
                    color: #fff; white-space: nowrap;
                    padding: 1px 12px; border-radius: 999px;
                    background: linear-gradient(90deg, ${BRAND_BLUE}, ${BRAND_GREEN});
                }
                .field-label {
                    font-family: 'JetBrains Mono', ui-monospace, monospace;
                    font-size: 8.5px; font-weight: 600; letter-spacing: .1em;
                    text-transform: uppercase; color: #737373; margin-bottom: 1px;
                }
                .copy-tag {
                    font-family: 'JetBrains Mono', ui-monospace, monospace;
                    font-size: 9px; font-weight: 700; letter-spacing: .14em;
                    text-transform: uppercase; border: 1.5px solid #111; padding: 2px 8px;
                }
                /* Solid for the centre's half, so the counter never hands the
                   patient the wrong one. */
                .copy-tag--centre { background: #111; color: #fff; }
                /* Zero height, so two copies still add up to exactly one A4 page. */
                .cut { position: relative; height: 0; margin: 0 8mm; border-top: 1.5px dashed #9a948a; }
                .cut span {
                    position: absolute; left: 50%; top: -8px; transform: translateX(-50%);
                    background: #fff; padding: 0 10px;
                    font-family: 'JetBrains Mono', ui-monospace, monospace;
                    font-size: 9px; letter-spacing: .16em; text-transform: uppercase; color: #7a756b;
                }
            `}</style>

            <div className="mx-auto max-w-[52rem] px-4">
                {invoice.publicToken && isUnreachableBase() && (
                    <div className="mb-3 rounded-sm border border-amber-400 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 print:hidden">
                        <strong>The QR code on this invoice will not work for patients.</strong> It
                        points at <code>{publicReportUrl(invoice.publicToken)}</code>, which only
                        opens on this machine. Print from the live site, or set
                        VITE_PUBLIC_BASE_URL.
                    </div>
                )}

                <div className="mb-4 flex flex-wrap items-center justify-end gap-3 print:hidden">
                    <div
                        role="group"
                        aria-label="Copies to print"
                        className="mr-auto flex rounded-sm border border-slate-300 bg-white p-0.5 text-sm"
                    >
                        {(Object.keys(SELECTION_LABEL) as CopySelection[]).map((value) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={selection === value}
                                onClick={() => setSelection(value)}
                                className={`rounded-sm px-3.5 py-2 font-semibold transition ${
                                    selection === value
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                {SELECTION_LABEL[value]}
                            </button>
                        ))}
                    </div>
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

                <div
                    ref={printRef}
                    className="doc sheet mx-auto bg-white text-[12px] leading-snug text-black shadow-lg"
                    style={{ width: '210mm' }}
                >
                    {kinds.map((kind, index) => (
                        <Fragment key={kind}>
                            {index > 0 && (
                                <div className="cut" aria-hidden="true">
                                    <span>✂ Cut here</span>
                                </div>
                            )}
                            <InvoiceCopy invoice={invoice} receipts={receipts} kind={kind} />
                        </Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PrintInvoicePage;
