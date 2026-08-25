import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContentTab from "@/components/portfolio/ContentTab";

vi.mock("@/lib/supabase-queries", () => ({
  getBlogPosts: vi.fn().mockResolvedValue([]),
  getCuratedArticles: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/sentry", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/components/Skeleton", () => ({
  BlogCardSkeleton: () => <div data-testid="post-loading" />,
}));

vi.mock("@/components/BlogCard", () => ({
  default: () => null,
}));

describe("ContentTab", () => {
  it("hides post controls and empty chrome until posts exist", async () => {
    render(<ContentTab />);

    await waitFor(() => {
      expect(screen.queryByTestId("post-loading")).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { name: "Speaking & Writing" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Search content..."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^All/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No content yet")).not.toBeInTheDocument();
  });
});
