import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import TextField from '@/components/ui/TextField';
import Icon from '@/components/ui/Icon';
import LanguageToggle from '@/components/layout/LanguageToggle';
import ReportPreviewModal from '@/components/common/ReportPreviewModal';
import { resolveType } from '@/hooks/useReportPreview';
import type { ReportPreview } from '@/hooks/useReportPreview';
import { downloadObjectUrl } from '@/lib/openReport';
import { useT } from '@/i18n/useLanguage';
import { apiErrorMessage, formatDate, money } from '@/lib/format';
import {
    useGetPublicSummaryQuery,
    useGetPublicReportFileMutation,
    useVerifyPublicReportMutation,
} from '@/services/publicApi';
import type { PublicPayload, PublicReportItem } from '@/services/publicApi';

const CENTRE = 'New Lab Diagnostic & Consultation Centre';

/**
 * The one screen a member of the public ever sees.
 *
 * Reached by scanning the QR printed on an invoice. It is deliberately outside
 * ProtectedRoute and outside ShellLayout: no sidebar, no staff chrome, nothing
 * that assumes a logged-in user. Patients arrive here on a phone, so it is
 * built narrow-first.
 */
const PublicReportPage = () => {
    const { token = '' } = useParams();
    const t = useT();

    const { data: summary, isLoading, isError, error, refetch } = useGetPublicSummaryQuery(token);
    const [verify, { isLoading: verifying }] = useVerifyPublicReportMutation();
    const [fetchFile] = useGetPublicReportFileMutation();

    const [last4, setLast4] = useState('');
    const [payload, setPayload] = useState<PublicPayload | null>(null);
    const [accessToken, setAccessToken] = useState('');

    // The object URL is held in a ref as well as in state so the revoke on
    // close always sees the current value, even under StrictMode's double
    // invoke. Same shape the staff screens use, so one modal serves both.
    const [preview, setPreview] = useState<ReportPreview | null>(null);
    const [openingId, setOpeningId] = useState<string | null>(null);
    const objectUrlRef = useRef<string | null>(null);

    const releaseUrl = () => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    };

    const closePreview = () => {
        releaseUrl();
        setPreview(null);
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            const result = await verify({ token, last4 }).unwrap();
            const { accessToken: issued, ...rest } = result;
            setAccessToken(issued);
            setPayload(rest as PublicPayload);
        } catch (error) {
            toast.error(apiErrorMessage(error, t('pub.notFound')));
            setLast4('');
        }
    };

    const openReport = async (item: PublicReportItem) => {
        const fileName = item.originalName ?? `${item.testName}.pdf`;
        releaseUrl();
        setOpeningId(item.itemId);

        // Open the modal before the bytes arrive, so a slow connection never
        // looks like a dead tap.
        setPreview({ invoiceId: '', itemId: item.itemId, fileName, caption: item.testName });

        try {
            const blob = await fetchFile({ token, itemId: item.itemId, accessToken }).unwrap();
            const mimeType = resolveType(blob, fileName);
            const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
            objectUrlRef.current = url;
            setPreview((current) => (current ? { ...current, url, mimeType } : current));
        } catch (error) {
            const message = apiErrorMessage(error, t('pub.sessionExpired'));
            setPreview((current) => (current ? { ...current, error: message } : current));
            toast.error(message);
        } finally {
            setOpeningId(null);
        }
    };

    const shell = (children: React.ReactNode) => (
        <div style={{ minHeight: '100vh', background: 'var(--surface-page)', padding: '24px 16px' }}>
            <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                        <h1 style={{ font: 'var(--type-section-title)', color: 'var(--text-heading)' }}>{CENTRE}</h1>
                        <p style={{ fontSize: 'var(--text-12)', color: 'var(--text-muted)' }}>{t('pub.title')}</p>
                    </div>
                    <LanguageToggle />
                </header>
                {children}
            </div>
        </div>
    );

    const card = (children: React.ReactNode) => (
        <section
            style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--pad-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
            }}
        >
            {children}
        </section>
    );

    if (isLoading) return shell(card(<p style={{ fontSize: 13 }}>{t('pub.checking')}</p>));

    /**
     * Only a 404 means the link itself is wrong. A server that is down, a
     * rate limit or a lost connection are different problems with different
     * answers, and telling a patient their link is invalid when the API is
     * simply unreachable sends them to the counter for nothing.
     *
     * A bad token and a revoked one still look identical, deliberately:
     * nothing here tells someone probing links whether one exists.
     */
    if (isError || !summary) {
        const status = (error as { status?: number | string } | undefined)?.status;
        const badLink = status === 404;

        return shell(
            card(
                <>
                    <p style={{ fontSize: 13, color: 'var(--text-body)' }}>
                        {badLink ? t('pub.notFound') : t('pub.unreachable')}
                    </p>
                    {!badLink && (
                        <Button variant="secondary" onClick={() => refetch()}>
                            {t('pub.retry')}
                        </Button>
                    )}
                </>
            )
        );
    }

    const meta = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--text-12)' }}>
            <span style={{ color: 'var(--text-muted)' }}>
                {t('pub.invoice')} · <strong style={{ color: 'var(--text-heading)' }}>{summary.invoiceNumber}</strong>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
                {t('pub.visitDate')} · {formatDate(summary.visitDate)}
            </span>
        </div>
    );

    // --- Before the phone check: masked name only, nothing else ---
    if (!payload) {
        return shell(
            <>
                {card(
                    <>
                        {meta}
                        <p style={{ font: 'var(--type-body)', color: 'var(--text-heading)' }}>{summary.patientName}</p>
                    </>
                )}
                {card(
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <h2 style={{ font: 'var(--type-label)', color: 'var(--text-heading)' }}>
                                {t('pub.verifyTitle')}
                            </h2>
                            <p style={{ fontSize: 'var(--text-12)', color: 'var(--text-muted)', marginTop: 4 }}>
                                {t('pub.verifyBody')}
                            </p>
                        </div>
                        <TextField
                            label={t('pub.last4')}
                            id="last4"
                            inputMode="numeric"
                            maxLength={4}
                            value={last4}
                            onChange={(event) => setLast4(event.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="••••"
                        />
                        <Button type="submit" block loading={verifying} disabled={last4.length !== 4}>
                            {t('pub.viewReports')}
                        </Button>
                    </form>
                )}
            </>
        );
    }

    if (payload.state === 'cancelled') {
        return shell(card(<>{meta}<p style={{ fontSize: 13 }}>{t('pub.cancelled')}</p></>));
    }

    // --- Settled money owed: the balance, and deliberately no test names ---
    if (payload.state === 'unpaid') {
        return shell(
            card(
                <>
                    {meta}
                    <h2 style={{ font: 'var(--type-label)', color: 'var(--text-heading)' }}>{t('pub.dueTitle')}</h2>
                    <p style={{ fontSize: 'var(--text-12)', color: 'var(--text-muted)' }}>{t('pub.dueBody')}</p>
                    <dl style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--text-13)' }}>
                        {[
                            [t('pub.total'), money(payload.netPayable), false],
                            [t('pub.paidSoFar'), money(payload.paidAmount), false],
                            [t('pub.amountDue'), money(payload.dueAmount), true],
                        ].map(([label, value, strong]) => (
                            <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
                                <dd
                                    style={{
                                        fontVariantNumeric: 'tabular-nums',
                                        fontWeight: strong ? 700 : 500,
                                        color: strong ? 'var(--danger-strong)' : 'var(--text-body)',
                                    }}
                                >
                                    {value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </>
            )
        );
    }

    // --- Settled: the reports ---
    return shell(
        <>
            {card(
                <>
                    {meta}
                    <p style={{ font: 'var(--type-body)', color: 'var(--text-heading)' }}>{payload.patientName}</p>
                </>
            )}
            {card(
                payload.items.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('pub.noReports')}</p>
                ) : (
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none' }}>
                        {payload.items.map((item) => (
                            <li
                                key={item.itemId}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    paddingBottom: 10,
                                    borderBottom: '1px solid var(--border-subtle)',
                                }}
                            >
                                <span style={{ minWidth: 0 }}>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontSize: 'var(--text-13)',
                                            fontWeight: 600,
                                            color: item.ready ? 'var(--text-heading)' : 'var(--text-faint)',
                                        }}
                                    >
                                        {item.testName}
                                    </span>
                                    <span style={{ fontSize: 'var(--text-12)', color: 'var(--text-muted)' }}>
                                        {item.testCode}
                                    </span>
                                </span>
                                {item.ready ? (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        icon="eye"
                                        loading={openingId === item.itemId}
                                        onClick={() => openReport(item)}
                                    >
                                        {t('pub.view')}
                                    </Button>
                                ) : (
                                    <span
                                        style={{
                                            fontSize: 'var(--text-12)',
                                            color: 'var(--text-faint)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Icon name="clock" size={13} />
                                        {t('pub.notReady')}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )
            )}

            <ReportPreviewModal
                preview={preview}
                onClose={closePreview}
                onDownload={() =>
                    preview?.url && downloadObjectUrl(preview.url, preview.fileName)
                }
            />
        </>
    );
};

export default PublicReportPage;
