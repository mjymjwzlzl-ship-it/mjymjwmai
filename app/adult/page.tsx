import FreshLimeHome from '@/components/home/FreshLimeHome';
import publishedPlans from '@/config/membership-plans.json';

export default function AdultPage() {
  return <FreshLimeHome adultOnly publishedPlans={publishedPlans} />;
}
