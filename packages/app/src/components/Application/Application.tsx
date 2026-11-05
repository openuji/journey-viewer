import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  ScreenshotMap,
  TouchpointPresentation,
} from "@journey-viewer/viewer";
import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";
import { checkDocument } from "@/document-policy";
import { readSource } from "@/read-source";
import type { DocumentSource, SourceInput } from "@/read-source";
import { ApplicationHeader } from "@/components/ApplicationHeader/ApplicationHeader";
import { ApplicationEmpty } from "@/components/ApplicationEmpty/ApplicationEmpty";
import { ApplicationFooter } from "@/components/ApplicationFooter/ApplicationFooter";
import { ApplicationViewer } from "@/components/ApplicationViewer/ApplicationViewer";
import { useFilePicker } from "@/file-picker";
import {
  assetDownloadName,
  createAssetArchive,
  saveAssetArchive,
} from "@/download-assets";
import type { ApplicationReport } from "@/report";
import styles from "@/components/Application/Application.module.css";

export interface ApplicationProps {
  /** A document to open on mount, read by URL with its optional presentation inputs. */
  readonly source?: DocumentSource;
  /** A document already present in the page, such as a self-contained generated site. */
  readonly embedded?: EmbeddedDocument;
  /** Leading header content, such as a home link with a logo. */
  readonly brand?: ReactNode;
  /** Other ways to start while no journey is open, such as a link to an example. */
  readonly alternatives?: ReactNode;
}

export interface EmbeddedDocument extends SourceInput {
  /** Shown while the document is checked and as the open journey's title. */
  readonly name: string;
}

type ReadRequest = Readonly<
  | { kind: "file"; file: File }
  | { kind: "source"; source: DocumentSource }
  | { kind: "embedded"; embedded: EmbeddedDocument }
>;
interface LoadedDocument {
  readonly name: string;
  readonly text: string;
  readonly graph: JourneyGraph;
  readonly screenshots: ScreenshotMap;
  readonly touchpoints: TouchpointPresentation;
}

/**
 * Reads a document, checks it with the application's policy and shows it in the viewer. Upload UJG
 * replaces it with a local one; a rejected replacement keeps the open journey.
 */
export function Application({
  source,
  embedded,
  brand,
  alternatives,
}: ApplicationProps) {
  const [request, setRequest] = useState<ReadRequest | null>(() =>
    embedded
      ? { kind: "embedded", embedded }
      : source
        ? { kind: "source", source }
        : null,
  );
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null);
  const [report, setReport] = useState<ApplicationReport>({ kind: "idle" });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const download = useRef<AbortController | null>(null);
  const releaseDownload = useRef<(() => void) | null>(null);
  const picker = useFilePicker((file) => {
    download.current?.abort();
    download.current = null;
    setIsDownloading(false);
    setDownloadError("");
    setRequest({ kind: "file", file });
  });

  useEffect(
    () => () => {
      download.current?.abort();
      download.current = null;
      releaseDownload.current?.();
    },
    [],
  );

  async function downloadAssets() {
    if (!loaded || report.kind === "reading" || download.current) return;
    const controller = new AbortController();
    download.current = controller;
    setIsDownloading(true);
    setDownloadError("");
    try {
      const blob = await createAssetArchive(loaded, controller.signal);
      controller.signal.throwIfAborted();
      releaseDownload.current?.();
      releaseDownload.current = saveAssetArchive(
        blob,
        assetDownloadName(loaded.name),
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        controller.abort();
        setDownloadError(
          error instanceof Error
            ? error.message
            : "The archive could not be created.",
        );
      }
    } finally {
      if (download.current === controller) {
        download.current = null;
        setIsDownloading(false);
      }
    }
  }

  useEffect(() => {
    if (!request) return;
    const currentRequest = request;
    const controller = new AbortController();
    // File.text cannot be aborted; this effect's lifetime guards late completions.
    let active = true;
    const name =
      request.kind === "file"
        ? request.file.name
        : request.kind === "source"
          ? request.source.name
          : request.embedded.name;
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
            : currentRequest.kind === "source"
              ? await readSource(currentRequest.source, controller.signal)
              : currentRequest.embedded;
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
        // Retain the derived graph until the next successful load; a new one resets the viewer.
        setLoaded({
          name,
          text: input.text,
          graph: checked.graph,
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
        placeholder={embedded?.name ?? source?.name ?? "Open a journey"}
        report={report}
        onOpenFile={picker.open}
        onDownloadAssets={() => void downloadAssets()}
        isDownloading={isDownloading}
        downloadError={downloadError}
        document={
          loaded ? { title: loaded.name, identity: loaded.graph.id } : null
        }
      />
      <main id="application" tabIndex={-1} className={styles.main}>
        {loaded ? (
          <div className={styles.loaded} data-application-viewer="">
            <ApplicationViewer
              graph={loaded.graph}
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
      <ApplicationFooter />
    </div>
  );
}
