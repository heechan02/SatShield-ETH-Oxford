import { useParams } from 'react-router-dom';
import ActivePolicyDashboard from '@/components/monitoring/ActivePolicyDashboard';

export default function ActivePolicy() {
  const { policyId } = useParams();
  return <ActivePolicyDashboard policyId={policyId} />;
}
