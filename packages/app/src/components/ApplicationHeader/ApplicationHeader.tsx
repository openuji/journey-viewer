import { useId } from "react";
import type { ReactNode } from "react";
import {
  Button,
  Heading,
  Icon,
  IconButton,
  Text,
  Tooltip,
} from "@journey-viewer/design-system";
import { blocksOpening, findingPath } from "@/document-policy";
import type { ApplicationReport } from "@/report";
import styles from "@/components/ApplicationHeader/ApplicationHeader.module.css";

export interface ApplicationHeaderProps {
  /** Leading content, such as a home link with a logo; a divider follows it. */
  readonly brand?: ReactNode;
  /** The title while no journey is open, such as the name of the one being read. */
  readonly placeholder: string;
  /** The open journey, if any; it stays open when a later attempt fails. */
  readonly document: Readonly<{ title: string; identity: string }> | null;
  readonly report: ApplicationReport;
  /** Opens the page's shared file chooser. */
  readonly onOpenFile: () => void;
  /** Downloads the open document and its presentation assets. Omit to disable download. */
  readonly onDownloadAssets?: () => void;
  readonly isDownloading?: boolean;
  readonly downloadError?: string;
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;
const conformance =
  "These checks cover the supported compact form; they do not establish full UJG conformance.";

function Status({
  report,
  document,
}: Readonly<Pick<ApplicationHeaderProps, "report" | "document">>) {
  const popover = useId();
  if (report.kind === "idle") return null;
  if (report.kind === "reading")
    return (
      <Text variant="caption" tone="subtle">
        Reading {report.name}…
      </Text>
    );
  const errors =
    report.kind === "checked" ? report.findings.filter(blocksOpening) : [];
  const failed = report.kind !== "checked" || errors.length > 0;
  if (report.kind === "checked" && report.findings.length === 0) {
    return (
      <Text
        variant="caption"
        tone="subtle"
        className={styles.ok}
        title={conformance}
      >
        <Icon name="check" />
        No findings
      </Text>
    );
  }
  const findings = report.kind === "checked" ? report.findings : [];
  const heading =
    report.kind === "read-error"
      ? `Could not read ${report.name}`
      : report.kind === "syntax-error"
        ? `JSON syntax error in ${report.name}`
        : failed
          ? `Could not open ${report.name}`
          : `${report.name} opened with ${plural(findings.length, "warning", "warnings")}`;
  return (
    <>
      <Button
        variant="chip"
        size="xs"
        className={styles.statusChip}
        data-tone={failed ? "danger" : "warning"}
        popoverTarget={popover}
        aria-haspopup="dialog"
      >
        {failed
          ? `Couldn't open ${report.name}`
          : plural(findings.length, "warning", "warnings")}
      </Button>
      <div
        id={popover}
        popover="auto"
        role="dialog"
        aria-label={heading}
        className={styles.findings}
        data-findings=""
      >
        <Text as="p" variant="label" weight="semibold">
          {heading}
        </Text>
        {report.kind !== "checked" && (
          <Text as="p" variant="caption" tone="muted">
            {report.message}
          </Text>
        )}
        {findings.length > 0 && (
          <ol className={styles.findingsList}>
            {findings.map((finding, index) => (
              <li
                key={index}
                data-severity={blocksOpening(finding) ? "error" : "warning"}
              >
                <Text
                  variant="caption"
                  weight="semibold"
                  className={styles.findingsSeverity}
                >
                  {blocksOpening(finding) ? "Error" : "Warning"}
                </Text>
                <Text variant="caption">{finding.message}</Text>
                <Text
                  variant="code"
                  tone="subtle"
                  className={styles.findingsPath}
                >
                  {finding.ruleId} · {findingPath(finding.path)}
                </Text>
              </li>
            ))}
          </ol>
        )}
        {failed && (
          <Text as="p" variant="caption" tone="muted">
            {document
              ? `${document.title} remains open.`
              : "No journey is open."}
          </Text>
        )}
        {!failed && (
          <Text as="p" variant="caption" tone="muted">
            Unresolved references are omitted by the viewer.
          </Text>
        )}
        <Text as="p" variant="caption" tone="subtle">
          {conformance}
        </Text>
      </div>
    </>
  );
}

/** The application's single top bar: brand, open journey, check status and file actions. */
export function ApplicationHeader({
  brand,
  placeholder,
  document,
  report,
  onOpenFile,
  onDownloadAssets,
  isDownloading = false,
  downloadError,
}: ApplicationHeaderProps) {
  return (
    <header className={styles.header} data-application-header="">
      <div className={styles.bar}>
        {brand && (
          <>
            <div className={styles.brand}>{brand}</div>
            <Text
              variant="label"
              tone="subtle"
              className={styles.divider}
              aria-hidden="true"
            >
              /
            </Text>
          </>
        )}
        <div className={styles.document}>
          <Heading level={1} size="sm" className={styles.title}>
            {document?.title ?? placeholder}
          </Heading>
          {document && (
            <Text
              variant="code"
              tone="subtle"
              className={styles.identity}
              title={document.identity}
            >
              {document.identity}
            </Text>
          )}
        </div>
        <div className={styles.status} role="status" aria-live="polite">
          <Status report={report} document={document} />
        </div>
        <div className={styles.actions}>
          <Tooltip label="Upload UJG">
            <Button
              variant="outline"
              size="sm"
              className={styles.open}
              onClick={onOpenFile}
            >
              <Icon name="upload" />
              <span className={styles.openLabel}>Upload UJG</span>
            </Button>
          </Tooltip>
          <Tooltip label="Download UJG assets">
            <IconButton
              label="Download UJG assets"
              icon={<Icon name="download" />}
              size="sm"
              onClick={onDownloadAssets}
              disabled={
                !document ||
                !onDownloadAssets ||
                report.kind === "reading" ||
                isDownloading
              }
              aria-busy={isDownloading || undefined}
            />
          </Tooltip>
        </div>
      </div>
      <div
        className={styles.downloadStatus}
        aria-live="polite"
        aria-atomic="true"
        data-asset-download-status=""
      >
        {isDownloading && (
          <Text variant="caption" tone="subtle">
            Preparing UJG assets…
          </Text>
        )}
        {downloadError && (
          <Text variant="caption" className={styles.downloadError}>
            Could not download UJG assets. {downloadError} Try again.
          </Text>
        )}
      </div>
    </header>
  );
}
