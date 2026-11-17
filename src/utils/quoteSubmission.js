const UUID_BYTE_LENGTH = 16;
const UUID_VERSION_INDEX = 6;
const UUID_VARIANT_INDEX = 8;
const UUID_VERSION_MASK = 0x0f;
const UUID_VARIANT_MASK = 0x3f;
const UUID_VERSION_4 = 0x40;
const UUID_VARIANT_RFC4122 = 0x80;

const createSubmissionId = () => {
  const cryptoApi = window.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues !== "function") {
    throw new Error("Please use a current browser to submit this form.");
  }

  const bytes = new Uint8Array(UUID_BYTE_LENGTH);
  cryptoApi.getRandomValues(bytes);
  bytes[UUID_VERSION_INDEX] =
    (bytes[UUID_VERSION_INDEX] & UUID_VERSION_MASK) | UUID_VERSION_4;
  bytes[UUID_VARIANT_INDEX] =
    (bytes[UUID_VARIANT_INDEX] & UUID_VARIANT_MASK) | UUID_VARIANT_RFC4122;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10).join(""),
  ].join("-");
};

export const getSubmissionAttempt = (previous, formData) => {
  const payload = JSON.stringify(formData);
  if (previous?.payload === payload) {
    return previous;
  }

  // Retry unchanged data with the same ID; edits are a new submission.
  return { id: createSubmissionId(), payload };
};
