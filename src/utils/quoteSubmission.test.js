import { getSubmissionAttempt } from "./quoteSubmission";

const FIRST_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_ID = "22222222-2222-4222-8222-222222222222";
const cryptoDescriptor = Object.getOwnPropertyDescriptor(window, "crypto");

const setCrypto = (value) => {
  Object.defineProperty(window, "crypto", { configurable: true, value });
};

beforeEach(() => {
  setCrypto({
    randomUUID: jest.fn().mockReturnValueOnce(FIRST_ID).mockReturnValueOnce(SECOND_ID),
  });
});

afterEach(() => {
  if (cryptoDescriptor) {
    Object.defineProperty(window, "crypto", cryptoDescriptor);
  } else {
    delete window.crypto;
  }
});

test("reuses the attempt when retrying identical answers", () => {
  const data = { firstName: "Test", services: { diyInstallation: true } };
  const attempt = getSubmissionAttempt(null, data);
  const retry = getSubmissionAttempt(attempt, JSON.parse(JSON.stringify(data)));

  expect(attempt.id).toBe(FIRST_ID);
  expect(retry).toBe(attempt);
});

test("starts a new attempt when a nested answer changes", () => {
  const data = { firstName: "Test", services: { diyInstallation: true } };
  const attempt = getSubmissionAttempt(null, data);
  const changed = getSubmissionAttempt(attempt, {
    ...data,
    services: { diyInstallation: false },
  });

  expect(changed.id).toBe(SECOND_ID);
  expect(attempt.id).toBe(FIRST_ID);
  expect(data.services.diyInstallation).toBe(true);
});

test("uses a new ID after a successful submission resets the attempt", () => {
  const data = { firstName: "Test" };
  const completed = getSubmissionAttempt(null, data);
  const next = getSubmissionAttempt(null, data);

  expect(completed.id).toBe(FIRST_ID);
  expect(next.id).toBe(SECOND_ID);
});

test.each([
  [0, "00000000-0000-4000-8000-000000000000"],
  [255, "ffffffff-ffff-4fff-bfff-ffffffffffff"],
])("creates a valid UUID when only getRandomValues is available (%i)", (byte, expected) => {
  setCrypto({ getRandomValues: (bytes) => bytes.fill(byte) });

  expect(getSubmissionAttempt(null, { firstName: "Test" }).id).toBe(expected);
});

test("rejects a submission when secure randomness is unavailable", () => {
  setCrypto(undefined);

  expect(() => getSubmissionAttempt(null, { firstName: "Test" }))
    .toThrow("Please use a current browser to submit this form.");
});
