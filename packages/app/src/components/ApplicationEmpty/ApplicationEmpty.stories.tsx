import type { Meta, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { ApplicationEmpty } from "@/components/ApplicationEmpty/ApplicationEmpty";

const meta = {
  title: "App/ApplicationEmpty",
  component: ApplicationEmpty,
  tags: ["autodocs"],
  args: { onOpenFile: action("Upload UJG") },
} satisfies Meta<typeof ApplicationEmpty>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithAlternative: Story = {
  args: {
    children: (
      <>
        or{" "}
        <a href="./?path=/story/app-application--solid-oidc" target="_top">
          explore the Solid-OIDC example
        </a>
      </>
    ),
  },
};
