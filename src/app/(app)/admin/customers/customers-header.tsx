'use client';

import { useState } from 'react';
import { UserPlus, Gift } from 'lucide-react';
import { CreateUserModal } from '@/components/admin/create-user-modal';
import { CreateUnclaimedAccount } from '@/components/admin/create-unclaimed-account';
import { useRouter } from 'next/navigation';

export function CustomersHeader({ isAdmin }: { isAdmin: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const [showUnclaimed, setShowUnclaimed] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and view all customer accounts.
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUnclaimed(!showUnclaimed)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Gift className="w-4 h-4" />
              Create for Client
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </button>
            <CreateUserModal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              onCreated={() => router.refresh()}
            />
          </div>
        )}
      </div>

      {showUnclaimed && <CreateUnclaimedAccount />}
    </div>
  );
}
