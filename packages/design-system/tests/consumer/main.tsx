import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  Heading,
  IconButton,
  JourneyCard,
  StateRow,
  Text,
} from "../../dist/index.js";
import "../../dist/styles.css";
import "../../dist/reset.css";
import "../../.storybook/generated/alternate.css";

function Sample({ theme }: { readonly theme: string }) {
  const [snapshot, setSnapshot] = useState<
    Readonly<{ selected: boolean; expanded: boolean }>
  >({ selected: false, expanded: false });
  return (
    <section
      data-jv-theme={theme}
      data-testid={theme}
      style={{
        padding: "var(--jv-space-sm)",
        background: "var(--jv-color-background)",
        minWidth: 0,
      }}
    >
      <Heading level={2} size="sm">
        {theme}
      </Heading>
      <JourneyCard
        title="Account access"
        count="4 states"
        touchpoint={{ label: "Web" }}
      >
        <StateRow
          label="Averylongunbrokenstatelabelthatmustwrapwithoutoverflowingtheavailablemobilewidth"
          description="Nested journey"
          composite
          selected={snapshot.selected}
          expanded={snapshot.expanded}
          entryCount={1}
          exitCount={2}
          onSelect={() =>
            setSnapshot((previous) => ({
              ...previous,
              selected: !previous.selected,
            }))
          }
          onToggle={() =>
            setSnapshot((previous) => ({
              ...previous,
              expanded: !previous.expanded,
            }))
          }
        >
          <Text>Caller-supplied content</Text>
        </StateRow>
      </JourneyCard>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--jv-space-sm)",
          marginBlockStart: "var(--jv-space-sm)",
        }}
      >
        <Button variant="solid">Continue</Button>
        <Button disabled>Unavailable</Button>
        <IconButton
          label="Add item"
          icon={
            <svg viewBox="0 0 16 16">
              <path d="M3 8h10M8 3v10" stroke="currentColor" />
            </svg>
          }
        />
      </div>
      {theme === "dark" && (
        <section
          data-jv-theme="light"
          data-testid="nested-light"
          style={{ padding: "var(--jv-space-sm)" }}
        >
          <Button>Nested light button</Button>
        </section>
      )}
    </section>
  );
}

function App() {
  return (
    <main>
      <Heading level={1} size="lg">
        Compiled component consumer
      </Heading>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: "1rem",
        }}
      >
        <Sample theme="light" />
        <Sample theme="dark" />
        <Sample theme="alternate" />
      </div>
      <form
        data-jv-theme="light"
        onSubmit={(event) => {
          event.preventDefault();
          document.documentElement.dataset.submitted = "true";
        }}
      >
        <Button>Default button inside form</Button>
        <Button type="submit">Submit</Button>
      </form>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <div data-jv-theme="light">
    <App />
  </div>,
);
