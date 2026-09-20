import { Fragment, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import ErrorState from '@/components/common/ErrorState';
import Loader from '@/components/common/Loader';
import BrandLogo from '@/components/brand/BrandLogo';
import BrandMark from '@/components/brand/BrandMark';
import { BRAND_BLUE, BRAND_GREEN, BRAND_TAGLINE_BN, BRAND_VALUES } from '@/lib/brand';
import { CENTRE } from '@/lib/centre';
import { formatDateTime, money } from '@/lib/format';
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
    patient: 'Patient Copy',
    centre: 'Centre Copy',
};

const SELECTION_LABEL: Record<CopySelection, string> = {
    both: 'Both copies · A4',
    patient: 'Patient copy · A5',
    centre: 'Centre copy · A5',
};

/** The centre's mark and name, centred at the top of each A5 copy. */
const Letterhead = () => (
    <header className="flex flex-col items-center text-center">
        <BrandLogo size="md" lang="en" />
        <div className="brand-rule mt-2 w-full" />
    </header>
);

/**
 * The two facts every copy answers first: what was billed, and where it
 * stands. Two label:value columns, four rows each -- the third row on the
 * right stays blank so the referrer's line lands beside the age/sex row.
 */
const MetaGrid = ({ invoice }: { invoice: Invoice }) => {
    const patient = invoice.patientInfo;
    const referrer = invoice.referrerInfo;

    return (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[10.5px] leading-snug">
            <p><span className="field-label">Invoice No</span><span className="figure">{invoice.invoiceNumber}</span></p>
            <p><span className="field-label">Date</span><span className="figure">{formatDateTime(invoice.visitDate)}</span></p>
            <p><span className="field-label">Patient ID</span><span className="figure">{patient.patientId}</span></p>
            <p><span className="field-label">Phone</span><span className="figure">{patient.phone}</span></p>
            <p><span className="field-label">Name</span><span className="font-semibold">{patient.name}</span></p>
            <p>&nbsp;</p>
            <p>
                <span className="field-label">Age / Sex</span>
                <span className="capitalize">{patient.age} Y / {patient.gender}</span>
            </p>
            <p>
                <span className="field-label">Ref By</span>
                {referrer ? [referrer.name, referrer.designation].filter(Boolean).join(', ') : 'Self'}
            </p>
        </div>
    );
};

/**
 * The money, arranged so the discount is visibly attached to the part of the
 * bill it actually came off.
 *
 * With an outdoor test on the invoice, a single "Item Total" line made the
 * discount look wrong — 15% of a 1,500 total is 225, not the 150 printed,
 * because the outdoor 500 is never discounted. So the two parts are totalled
 * separately: the discount sits directly under the lab tests it reduced, and
 * the outdoor amount is added after it, untouched. Without an outdoor line the
 * box reads exactly as it always has.
 */
const Totals = ({
    invoice,
    catalogueTotal,
    outdoorTotal,
}: {
    invoice: Invoice;
    catalogueTotal: number;
    outdoorTotal: number;
}) => {
    const hasOutdoor = outdoorTotal > 0;

    return (
        <div className="w-40 shrink-0 border border-neutral-300">
            <dl className="text-[10.5px] leading-snug">
                <div className="flex justify-between border-b border-neutral-200 px-2 py-1">
                    <dt className="text-neutral-600">{hasOutdoor ? 'Lab tests' : 'Item Total'}</dt>
                    <dd className="figure tabular-nums">
                        {money(hasOutdoor ? catalogueTotal : invoice.grossAmount)}
                    </dd>
                </div>
                {invoice.discountAmount > 0 && (
                    <div className="flex justify-between border-b border-neutral-200 px-2 py-1">
                        <dt className="text-neutral-600">(-) Discount {invoice.discountPercent}%</dt>
                        <dd className="figure tabular-nums">{money(invoice.discountAmount)}</dd>
                    </div>
                )}
                {hasOutdoor && (
                    <div className="flex justify-between border-b border-neutral-200 px-2 py-1">
                        <dt className="text-neutral-600">Outdoor tests</dt>
                        <dd className="figure tabular-nums">{money(outdoorTotal)}</dd>
                    </div>
                )}
                <div className="flex justify-between border-b border-neutral-200 px-2 py-1 font-semibold">
                    <dt>Net Payable</dt>
                    <dd className="figure tabular-nums">{money(invoice.netPayable)}</dd>
                </div>
                <div className="flex justify-between border-b border-neutral-200 px-2 py-1">
                    <dt className="text-neutral-600">Paid</dt>
                    <dd className="figure tabular-nums">{money(invoice.paidAmount)}</dd>
                </div>
                <div className="flex justify-between px-2 py-1 font-bold">
                    <dt>Due</dt>
                    <dd className="figure tabular-nums">{money(invoice.dueAmount)}</dd>
                </div>
            </dl>
        </div>
    );
};

/** What only the patient needs: the QR for their reports. */
const PatientNotes = ({ invoice }: { invoice: Invoice }) => (
    <div className="flex items-start gap-3">
        {invoice.publicToken && (
            <div className="shrink-0 text-center">
                <QRCodeSVG value={publicReportUrl(invoice.publicToken)} size={58} level="M" marginSize={0} />
                <p className="mt-1 text-[7.5px] leading-tight">রিপোর্ট স্ক্যান করে অনলাইনে দেখুন</p>
            </div>
        )}
    </div>
);

/** What only the centre needs: every receipt taken against this invoice. */
const CentreNotes = ({ receipts }: { receipts: Receipt[] }) => (
    <div className="text-[10px] leading-tight">
        {receipts.length > 0 ? (
            receipts.map((payment) => (
                <div key={payment._id} className="flex gap-3">
                    <span className="figure text-neutral-600">{payment.receiptNumber}</span>
                    <span className="figure text-neutral-600">{formatDateTime(payment.paymentDate)}</span>
                    <span className="figure ml-auto tabular-nums">{money(payment.amount)}</span>
                </div>
            ))
        ) : (
            <p className="text-neutral-500">No payment received yet.</p>
        )}
    </div>
);

/** Accurate — a target, hit dead centre. */
const AccurateMark = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11.5" fill={BRAND_BLUE} />
        <circle cx="12" cy="12" r="6" fill="none" stroke="#fff" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="1.9" fill="#fff" />
        <path
            d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2"
            stroke="#fff"
            strokeWidth="1.7"
            strokeLinecap="round"
        />
    </svg>
);

/** Reliable — a shield, checked. */
const ReliableMark = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 1.4l9 3.4v6.6c0 5.4-3.7 9.7-9 11.2-5.3-1.5-9-5.8-9-11.2V4.8z" fill={BRAND_GREEN} />
        <path
            d="M7.7 12.1l3 3 5.6-5.7"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

/** Care you can trust — a heart, held in an open hand. */
const CareMark = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11.5" fill={BRAND_BLUE} />
        <path d="M12 16.1l-3.5-3.3a2.3 2.3 0 1 1 3.5-3 2.3 2.3 0 1 1 3.5 3z" fill="#fff" />
        <path
            d="M6.6 15.6c1.2 2.6 3.1 4 5.4 4s4.2-1.4 5.4-4"
            fill="none"
            stroke="#fff"
            strokeWidth="1.7"
            strokeLinecap="round"
        />
    </svg>
);

const VALUE_MARKS = [AccurateMark, ReliableMark, CareMark];

/**
 * The centre's three values, set the way its own signage sets them: a rule
 * carrying a heartbeat across the foot of the page, then each value behind its
 * own mark, divided rather than boxed. Printed in the brand's two colours on
 * white — knocking the words out of two solid blocks made them shout, and put
 * them in the document's serif, which is not the face the signage uses.
 */
const ValuesBanner = () => (
    <div className="mt-auto pt-1">
        <div className="flex items-center">
            <span className="h-[1.6px] flex-1" style={{ background: BRAND_BLUE }} />
            <svg width="46" height="14" viewBox="0 0 46 14" className="shrink-0" aria-hidden="true">
                <path
                    d="M0 7H12l2.5-4 3 9 2.5-8 2 3H46"
                    fill="none"
                    stroke={BRAND_BLUE}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <span className="h-[1.6px] flex-1" style={{ background: BRAND_GREEN }} />
        </div>

        <div className="mt-1 flex items-center justify-center">
            {BRAND_VALUES.en.map((value, index) => {
                const Mark = VALUE_MARKS[index];
                return (
                    <Fragment key={value}>
                        {index > 0 && (
                            <span
                                className="mx-2.5 h-3.5 w-px shrink-0"
                                style={{ background: BRAND_GREEN, opacity: 0.55 }}
                            />
                        )}
                        <span className="flex items-center gap-1.5">
                            <Mark />
                            <span
                                className="value-label"
                                style={{ color: index === 1 ? BRAND_GREEN : BRAND_BLUE }}
                            >
                                {value}
                            </span>
                        </span>
                    </Fragment>
                );
            })}
        </div>

        <div className="mt-1.5 flex justify-center">
            <p className="tagline-pill">{BRAND_TAGLINE_BN}</p>
        </div>
    </div>
);

/**
 * One A5-portrait half of the printed invoice. Both halves carry the same
 * bill; they differ only in what each party needs to keep: the patient's
 * half has the QR to their reports, the centre's half has the receipt trail
 * and a "Received by" line.
 */
const InvoiceCopy = ({ invoice, receipts, kind }: { invoice: Invoice; receipts: Receipt[]; kind: CopyKind }) => {
    const bookedBy = typeof invoice.createdBy === 'object' ? invoice.createdBy?.name : undefined;
    const settled = invoice.dueAmount <= 0;

    // Outdoor lines print under their own heading, after the catalogue ones.
    const catalogueItems = invoice.items.filter((item) => !item.isOutdoor);
    const outdoorItems = invoice.items.filter((item) => item.isOutdoor);
    const orderedItems = [...catalogueItems, ...outdoorItems];

    // Cancelled lines are struck on the page but dropped from the server's
    // totals, so the split has to drop them too or the two parts stop adding
    // up to the net. The catalogue side is derived rather than summed, so it
    // always agrees with the gross the server computed.
    const outdoorTotal =
        Math.round(
            outdoorItems
                .filter((item) => !item.isCancelled)
                .reduce((total, item) => total + item.price, 0) * 100,
        ) / 100;
    const catalogueTotal = Math.round((invoice.grossAmount - outdoorTotal) * 100) / 100;

    return (
        <section className="copy">
            <div className="watermark" aria-hidden="true">
                <BrandMark size={200} />
            </div>

            <Letterhead />

            <div className="mt-2 text-center">
                <span className="copy-badge">{COPY_LABEL[kind]}</span>
            </div>

            <MetaGrid invoice={invoice} />

            <table className="bill-table mt-2.5 w-full border-collapse text-[10.5px] leading-tight">
                <thead>
                    <tr className="border-b border-t border-neutral-400 text-left font-semibold">
                        <th className="w-6 py-1">SL</th>
                        <th className="w-20 py-1">Code</th>
                        <th className="py-1">Test Name</th>
                        <th className="w-16 py-1 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {orderedItems.map((item, index) => (
                        <Fragment key={item._id}>
                            {/*
                              Everything below this heading was billed exactly
                              as it was typed in at the counter, so the reader
                              can see at a glance which lines the discount above
                              could not have touched.
                            */}
                            {item.isOutdoor && index === catalogueItems.length && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="border-t border-neutral-300 py-1 align-bottom text-[8.5px] font-semibold uppercase tracking-wider text-neutral-500"
                                    >
                                        Outdoor tests · billed as entered, no discount
                                    </td>
                                </tr>
                            )}
                            <tr
                                className={`border-b border-neutral-200 ${item.isCancelled ? 'text-neutral-400' : ''}`}
                            >
                                <td className="figure py-1 align-top text-neutral-500">{index + 1}</td>
                                <td className="figure py-1 align-top text-neutral-600">{item.testCode}</td>
                                <td className="py-1 align-top">
                                    <span className={item.isCancelled ? 'line-through' : ''}>{item.testName}</span>
                                    {item.isCancelled && (
                                        <span className="ml-2 text-[9px] italic">
                                            cancelled{item.cancelReason ? ` — ${item.cancelReason}` : ''}
                                        </span>
                                    )}
                                </td>
                                <td
                                    className={`figure py-1 text-right align-top tabular-nums ${
                                        item.isCancelled ? 'line-through' : ''
                                    }`}
                                >
                                    {money(item.price)}
                                </td>
                            </tr>
                        </Fragment>
                    ))}
                </tbody>
            </table>

            <div className="mt-2 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <p className="stamp">{settled ? 'Paid' : invoice.paidAmount > 0 ? 'Partial' : 'Due'}</p>
                    {kind === 'patient' ? (
                        <PatientNotes invoice={invoice} />
                    ) : (
                        <CentreNotes receipts={receipts} />
                    )}
                </div>
                <Totals invoice={invoice} catalogueTotal={catalogueTotal} outdoorTotal={outdoorTotal} />
            </div>

            <div className="filler mt-2" aria-hidden="true" />

            <div className="mt-3 text-center text-[8.5px] leading-snug text-neutral-500">
                {CENTRE.address && <p>{CENTRE.address}</p>}
                <p>রিপোর্ট সংগ্রহের সময় অবশ্যই এই রশিদটি সঙ্গে আনবেন।</p>
                <p>
                    Printed {formatDateTime(new Date())} · Computer generated invoice
                    {CENTRE.phone ? ` · ${CENTRE.phone}` : ''}
                </p>
            </div>

            <footer className="mt-2 flex items-end justify-between gap-4 text-[9px] text-neutral-500">
                <p>{bookedBy ? `Created by: ${bookedBy}` : ''}</p>
                <div className="shrink-0 text-center">
                    <div className="mb-1 w-32 border-t border-neutral-500" />
                    <p className="text-neutral-600">{kind === 'patient' ? 'Authorised Signature' : 'Received By'}</p>
                </div>
            </footer>

            <ValuesBanner />
        </section>
    );
};

/**
 * The printed invoice, in two A5-portrait halves that sit side by side on
 * one A4-landscape sheet, separated by a cut line, each under its own
 * letterhead -- exactly what an A4-landscape sheet folds down to.
 *
 * Set in a serif rather than the app's face: this is a paper record, and the
 * interface's monospace is wider than A4 wants and wrong for names. The mono
 * face is kept for what gets read back or transcribed -- invoice numbers,
 * test codes, receipts -- and for money, where tabular figures align.
 *
 * Either copy can also be printed alone, as a single A5-portrait sheet -- a
 * reprint for a patient who lost theirs should not produce a second centre
 * copy.
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
                /* Two A5-portrait copies side by side make exactly one
                   A4-landscape sheet; a single copy prints on its own A5
                   portrait sheet and looks exactly like its half. */
                @page { size: ${selection === 'both' ? 'A4 landscape' : 'A5 portrait'}; margin: 0; }
                @media print {
                    .sheet { box-shadow: none !important; }
                    thead { display: table-header-group; }
                }
                .copy {
                    box-sizing: border-box; width: 148mm; min-height: 210mm;
                    padding: 7mm 9mm; break-inside: avoid;
                    display: flex; flex-direction: column;
                }
                .bill-table tbody td { height: 5.4mm; box-sizing: border-box; }
                .filler { flex: 1 1 auto; min-height: 0; }
                .doc {
                    font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .figure { font-family: 'JetBrains Mono', 'Noto Sans Bengali', ui-monospace, monospace; }
                .brand-rule { height: 2px; background: ${BRAND_GREEN}; }
                .copy-badge {
                    display: inline-block; background: #111; color: #fff;
                    font-family: 'JetBrains Mono', ui-monospace, monospace;
                    font-size: 10px; font-weight: 700; letter-spacing: .1em;
                    text-transform: uppercase; border-radius: 999px; padding: 3px 16px;
                }
                .field-label {
                    display: inline-block; width: 62px;
                    font-family: 'JetBrains Mono', ui-monospace, monospace;
                    font-size: 8px; font-weight: 600; letter-spacing: .06em;
                    text-transform: uppercase; color: #737373;
                }
                .stamp {
                    font-family: 'Brush Script MT', 'Segoe Script', cursive;
                    font-size: 22px; font-weight: 700; color: #111; line-height: 1;
                    margin-bottom: 2px;
                }
                /* The signage face, not the document's serif: these three words
                   are the centre's mark, not part of the bill. */
                .value-label {
                    font-family: var(--font-display), ui-sans-serif, system-ui, sans-serif;
                    font-size: 8.5px; font-weight: 800; line-height: 1;
                    letter-spacing: .06em; text-transform: uppercase; white-space: nowrap;
                }
                .tagline-pill {
                    font-family: 'Noto Sans Bengali', sans-serif;
                    font-size: 9px; font-weight: 600; line-height: 1.6;
                    color: #fff; white-space: nowrap;
                    padding: 1.5px 14px; border-radius: 999px;
                    background: linear-gradient(90deg, ${BRAND_BLUE}, ${BRAND_GREEN});
                }
                .copy { position: relative; }
                /* Everything in a copy sits above the watermark. */
                .copy > *:not(.watermark) { position: relative; z-index: 1; }
                .watermark {
                    position: absolute; inset: 0; z-index: 0;
                    display: flex; align-items: center; justify-content: center;
                    pointer-events: none; opacity: .1; filter: blur(1.2px);
                }
                /* Zero height, so two copies still add up to exactly one A4 page. */
                .cut { position: relative; width: 0; border-left: 1.5px dashed #9a948a; }
                .cut span {
                    position: absolute; top: 50%; left: 0; transform: translate(-50%, -50%) rotate(180deg);
                    writing-mode: vertical-rl;
                    background: #fff; padding: 10px 2px;
                    font-family: 'JetBrains Mono', ui-monospace, monospace;
                    font-size: 9px; letter-spacing: .16em; text-transform: uppercase; color: #7a756b;
                }
            `}</style>

            <div className="mx-auto max-w-[64rem] px-4">
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
                    className="doc sheet mx-auto flex bg-white text-[11px] leading-snug text-black shadow-lg"
                    style={{ width: selection === 'both' ? '296mm' : '148mm' }}
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
