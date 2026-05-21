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
