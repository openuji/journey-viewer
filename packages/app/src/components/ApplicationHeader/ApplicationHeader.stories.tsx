import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { ApplicationHeader } from "@/components/ApplicationHeader/ApplicationHeader";
import { BrandLink } from "@/components/BrandLink/BrandLink";
import { oidcDocument, reports } from "~/.storybook/fixtures";

const meta = {
  title: "App/ApplicationHeader",
  component: ApplicationHeader,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", controls: { exclude: ["brand"] } },
  args: {
    brand: <BrandLink href="./" />,
    placeholder: "Open a journey",
    document: oidcDocument,
    report: reports.ready,
    onOpenFile: action("Upload UJG"),
    onDownloadAssets: action("Download UJG assets"),
  },
} satisfies Meta<typeof ApplicationHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { document: null, report: reports.idle } };
export const Reading: Story = { args: { report: reports.reading } };
export const Warnings: Story = { args: { report: reports.warnings } };
export const SyntaxError: Story = { args: { report: reports.syntaxError } };
export const ReadError: Story = { args: { report: reports.readError } };
export const UnsupportedVersion: Story = {
  args: { report: reports.unsupportedVersion },
};
export const Downloading: Story = { args: { isDownloading: true } };
export const DownloadError: Story = {
  args: {
    downloadError:
      "Screenshot https://images.example/screens/checkout.png could not be fetched: answered with status 404.",
  },
};
export const LongDocumentName: Story = {
  args: {
    document: {
      title:
        "customer-account-onboarding-and-identity-verification-user-journeys.ujg.jsonld",
      identity:
        "urn:example:customer-account-onboarding-and-identity-verification:document:user-journeys",
    },
  },
};
