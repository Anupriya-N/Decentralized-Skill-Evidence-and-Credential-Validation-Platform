import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { storageService } from '../../services/storageService';
import { formatDate } from '../../utils/formatUtils';
import { Users, Ban, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminUsers = () => {
  const { users, refreshData } = useApp();
  const [roleFilter, setRoleFilter] = useState('ALL');

  const filteredUsers = users.filter(u => roleFilter === 'ALL' || u.role === roleFilter);

  const toggleUserStatus = (u) => {
    const nextStatus = u.accountStatus === 'active' ? 'suspended' : 'active';
    const allUsers = storageService.getUsers();
    const idx = allUsers.findIndex(item => item.id === u.id);
    if (idx !== -1) {
      allUsers[idx].accountStatus = nextStatus;
      storageService.setUsers(allUsers);
      refreshData();
      toast.success(`User ${u.fullName} is now ${nextStatus}.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User Account Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage student, recruiter, issuer, and administrator accounts.</p>
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white"
        >
          <option value="ALL">All Roles ({users.length})</option>
          <option value="student">Students</option>
          <option value="recruiter">Recruiters</option>
          <option value="issuer">Issuers</option>
          <option value="admin">Administrators</option>
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Affiliation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 flex items-center gap-3">
                    <img src={u.profileImage} alt={u.fullName} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-slate-800">{u.fullName}</p>
                      <span className="text-[11px] text-slate-400">{u.email}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="capitalize font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {u.college || u.company || u.organizationName || 'Platform Core'}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge status={u.accountStatus || 'active'} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {u.role !== 'admin' && (
                      <Button
                        variant={u.accountStatus === 'active' ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => toggleUserStatus(u)}
                      >
                        {u.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
