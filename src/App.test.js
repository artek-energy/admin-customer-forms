import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the RMA request type field and options", () => {
  window.history.pushState({}, "", "/rma");

  render(<App />);

  const requestTypeSelect = screen.getByRole("combobox");

  expect(requestTypeSelect).toHaveAttribute("name", "rmaRequestType");
  expect(
    screen.getByRole("option", { name: "Warranty request" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("option", {
      name: "Return or exchange request within 30 days of the invoice date",
    })
  ).toBeInTheDocument();
});

test("renders the RMA product information processing note", () => {
  window.history.pushState({}, "", "/rma");

  render(<App />);

  expect(screen.getByText("Product Information")).toBeInTheDocument();
  expect(
    screen.getByText(
      "We cannot process RMA requests that omit the serial number and SKU."
    )
  ).toBeInTheDocument();
});
