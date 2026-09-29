import plans from '@/config/membership-plans.json';
import MembershipPricingPreview from '@/components/subscription/MembershipPricingPreview';

// Price configuration stays on the server; no unconfigured checkout is exposed.
export default function SubscribePage() {
  return <MembershipPricingPreview plans={plans} />;
}
