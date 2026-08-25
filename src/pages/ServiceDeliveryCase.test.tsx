import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ServiceDeliveryCase from "@/pages/ServiceDeliveryCase";

describe("Service-delivery deployment dossier", () => {
  it("separates measured results, supporting evidence, and excluded claims", () => {
    render(
      <MemoryRouter>
        <ServiceDeliveryCase />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: /Scaling service-delivery automation without scaling labor/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("836.3h").length).toBeGreaterThan(0);
    expect(screen.getByText(/the delivery was shared/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /What this case does—and does not—claim/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cash savings or realized headcount/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /outside the headline strip until the exact comparison window/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to Work/i })).toHaveAttribute(
      "href",
      "/work",
    );
  });
});
