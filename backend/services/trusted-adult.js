// Retired self-declaration routes could set the old boolean. Preserve records,
// but only provider-verified PASS records authorize restricted content.
function trustedAdult(user) {
  return user?.adultVerified === true && user?.adultVerificationMethod === 'pass';
}
module.exports = { trustedAdult };
