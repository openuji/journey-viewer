import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type {
  ScreenshotMap,
  TouchpointPresentation,
} from "@journey-viewer/viewer";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { checkDocument } from "@/document-policy";
import { readSource } from "@/read-source";
import type { DocumentSource, SourceInput } from "@/read-source";
import { ApplicationHeader } from "@/components/ApplicationHeader/ApplicationHeader";
import { ApplicationEmpty } from "@/components/ApplicationEmpty/ApplicationEmpty";
import { ApplicationViewer } from "@/components/ApplicationViewer/ApplicationViewer";
import { useFilePicker } from "@/file-picker";
import type { ApplicationReport } from "@/report";
import styles from "@/components/Application/Application.module.css";

export interface ApplicationProps {
  /** A document to open on mount, read by URL with its optional presentation inputs. */
  readonly source?: DocumentSource;
  /** Leading header content, such as a home link with a logo. */
  readonly brand?: ReactNode;
  /** Other ways to start while no journey is open, such as a link to an example. */
  readonly alternatives?: ReactNode;
}

type ReadRequest = Readonly<
  { kind: "file"; file: File } | { kind: "source"; source: DocumentSource }
>;
interface LoadedDocument {
  readonly name: string;
  readonly document: UjgDocument;
  readonly screenshots: ScreenshotMap;
  readonly touchpoints: TouchpointPresentation;
}

/**
 * Reads a document, checks it with the application's policy and shows it in the viewer. Open file
 * replaces it with a local one; a rejected replacement keeps the open journey.
 */
export function Application({ source, brand, alternatives }: ApplicationProps) {
  const [request, setRequest] = useState<ReadRequest | null>(() =>
    source ? { kind: "source", source } : null,
  );
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null);
  const [report, setReport] = useState<ApplicationReport>({ kind: "idle" });
  const picker = useFilePicker((file) => setRequest({ kind: "file", file }));

  useEffect(() => {
    if (!request) return;
    const currentRequest = request;
    const controller = new AbortController();
    // File.text cannot be aborted; this effect's lifetime guards late completions.
    let active = true;
    const name =
      request.kind === "file" ? request.file.name : request.source.name;
    setReport({ kind: "reading", name });
    async function open() {
      let input: SourceInput;
      try {
        input =
          currentRequest.kind === "file"
            ? {
                text: await currentRequest.file.text(),
                screenshots: {},
                touchpoints: {},
              }
            : await readSource(currentRequest.source, controller.signal);
      } catch (error) {
        if (active)
          setReport({
            kind: "read-error",
            name,
            message:
              error instanceof Error
                ? error.message
                : "The document could not be read.",
          });
        return;
      }
      if (!active) return;
      let value: unknown;
      try {
        value = JSON.parse(input.text);
      } catch (error) {
        setReport({
          kind: "syntax-error",
          name,
          message:
            error instanceof Error ? error.message : "Invalid JSON syntax.",
        });
        return;
      }
      const checked = checkDocument(value);
      setReport({ kind: "checked", name, findings: checked.findings });
      if (checked.kind === "ready") {
        // Retain the exact parsed object until the next successful load.
        setLoaded({
          name,
          document: checked.document,
          screenshots: input.screenshots,
          touchpoints: input.touchpoints,
        });
      }
    }
    void open();
    return () => {
      active = false;
      controller.abort();
    };
  }, [request]);

  return (
    <div className={styles.application} data-jv-theme="light">
      {picker.input}
      <ApplicationHeader
        brand={brand}
        placeholder={source?.name ?? "Open a journey"}
        report={report}
        onOpenFile={picker.open}
        document={
          loaded
            ? { title: loaded.name, identity: loaded.document["@id"] }
            : null
        }
      />
      <main id="application" tabIndex={-1} className={styles.main}>
        {loaded ? (
          <div className={styles.loaded} data-application-viewer="">
            <ApplicationViewer
              document={loaded.document}
              screenshots={loaded.screenshots}
              touchpoints={loaded.touchpoints}
            />
          </div>
        ) : report.kind === "reading" ? null : (
          <ApplicationEmpty onOpenFile={picker.open}>
            {alternatives}
          </ApplicationEmpty>
        )}
      </main>
    </div>
  );
}
