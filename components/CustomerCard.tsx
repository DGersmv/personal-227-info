'use client';

import { useRouter } from 'next/navigation';
import PortfolioCard from './PortfolioCard';

interface CustomerCardProps {
  userId: number;
  userName: string | null;
  userEmail: string;
}

export default function CustomerCard({ userId, userName, userEmail }: CustomerCardProps) {
  const router = useRouter();

  return (
    <div className="relative">
      <div className="mb-2 text-sm font-semibold text-gray-700">Заказчик (Владелец объекта):</div>
      <PortfolioCard
        userId={userId}
        userEmail={userEmail}
        userName={userName}
        userRole="CUSTOMER"
        onClick={() => router.push(`/users/${userId}/objects`)}
      />
    </div>
  );
}

