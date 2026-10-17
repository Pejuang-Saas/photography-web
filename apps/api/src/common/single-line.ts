/** Strips CR/LF so a header value (such as an email subject) can never inject extra headers. */
export function singleLine(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}
