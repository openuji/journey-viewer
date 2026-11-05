import type { Meta, StoryObj } from "@storybook/react-vite";
import { Application } from "@/components/Application/Application";
import { BrandLink } from "@/components/BrandLink/BrandLink";
import { oidcSource } from "~/.storybook/fixtures";

const meta = {
  title: "App/Application",
  component: Application,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    controls: { exclude: ["brand", "alternatives"] },
    docs: {
      description: {
        component:
          "The complete application owns its light theme. Upload UJG reads a local file, and Download UJG assets saves the loaded document and its images as a ZIP.",
      },
    },
  },
  args: { brand: <BrandLink href="./" /> },
  // Application reads source once on mount; changing source in Controls starts a fresh session.
  render: (args) => <Application key={JSON.stringify(args.source)} {...args} />,
} satisfies Meta<typeof Application>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    alternatives: (
      <a href="./?path=/story/app-application--solid-oidc" target="_top">
        explore the Solid-OIDC example
      </a>
    ),
  },
};
export const SolidOidc: Story = {
  name: "Solid-OIDC",
  args: { source: oidcSource },
};
export const DocumentOnly: Story = {
  args: { source: { name: oidcSource.name, document: oidcSource.document } },
};
export const SyntaxError: Story = {
  args: {
    source: { name: "broken.json", document: "data:application/json,%7B" },
  },
};
