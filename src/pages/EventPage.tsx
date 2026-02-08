import { useParams } from 'react-router-dom';
import EventDetection from '@/components/payout/EventDetection';

export default function EventPage() {
  const { eventId } = useParams();
  return <EventDetection policyId={eventId} />;
}
