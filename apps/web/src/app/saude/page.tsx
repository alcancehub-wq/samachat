import { redirect } from 'next/navigation';

export default function SaudePage() {
  redirect('/system/health');
}
