import Sidebar from '@/components/common/Sidebar';
import { getCurrentUser } from '@/actions/authActions';
import { redirect } from 'next/navigation';

export default async function PatientLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?portal=patient');
  }

  // Doctor accounts must not access patient workspace
  if (user.role !== 'patient' && user.role !== 'admin') {
    redirect(`/${user.role}/dashboard`);
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 min-h-[calc(100vh-4rem)]">
      <Sidebar role="patient" />
      <div className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-10 max-w-7xl w-full pb-20 md:pb-10">
        {children}
      </div>
    </div>
  );
}

