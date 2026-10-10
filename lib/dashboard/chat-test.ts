/** The tester's fake customer number for an owner (one test conversation per business). */
export function testPhoneFor(ownerId: string): string {
  return `test-${ownerId.slice(0, 8)}`;
}
