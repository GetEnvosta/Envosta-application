'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CreateCommissionModal } from '@/components/admin/commission-actions';

export function CommissionsHeader({ users }: { users: any[] }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Commissions</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Track sales rep payouts and customer referral credits.
        </p>
      </div>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Commission
      </button>
      <CreateCommissionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        users={users}
      />
    </div>
  );
}
