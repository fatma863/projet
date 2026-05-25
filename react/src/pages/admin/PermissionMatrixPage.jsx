import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Check, X } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

const fetchRoles       = () => api.get('/roles').then((r) => r.data.data);
const fetchPermissions = () => api.get('/permissions').then((r) => r.data.data);

export default function PermissionMatrixPage() {
  const { data: roles  = [], isLoading: rolesLoading  } = useQuery({ queryKey: ['roles'],       queryFn: fetchRoles });
  const { data: groups = [], isLoading: groupsLoading } = useQuery({ queryKey: ['permissions'], queryFn: fetchPermissions });

  const activeRoles = roles.filter((r) => !r.is_archived);

  if (rolesLoading || groupsLoading) {
    return <div className="min-h-screen bg-gray-50 p-6 text-gray-500 text-sm">Chargement de la matrice…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck size={22} className="text-indigo-600" />
          Matrice des Permissions
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Vue d'ensemble des permissions accordées à chaque rôle.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 px-5 py-4 text-left font-bold text-gray-700 min-w-[220px] border-r border-gray-200">
                  Libellé de la permission
                </th>
                {activeRoles.map((role) => (
                  <th key={role.id} className="px-4 py-4 text-center font-semibold min-w-[120px]">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="text-gray-800 text-xs font-bold">{role.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <>
                  {/* Group header */}
                  <tr key={`group-${group.slug}`} className="border-b border-gray-100 bg-gray-50">
                    <td
                      colSpan={activeRoles.length + 1}
                      className="sticky left-0 px-5 py-2.5 text-sm font-bold"
                      style={{ color: group.color }}
                    >
                      {group.name}
                    </td>
                  </tr>

                  {/* Permission rows */}
                  {group.permissions.map((perm, idx) => (
                    <tr
                      key={perm.name}
                      className={cn(
                        'border-b border-gray-100 transition-colors hover:bg-indigo-50',
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      )}
                    >
                      <td className="sticky left-0 z-10 px-5 py-3 border-r border-gray-100 bg-inherit">
                        <p className="font-semibold text-gray-800 text-xs">{perm.description || perm.name}</p>
                        <p className="text-gray-400 text-[10px] font-mono mt-0.5">{perm.name}</p>
                      </td>
                      {activeRoles.map((role) => {
                        const hasIt = role.name === 'admin' ||
                          role.permissions.some((p) => p.name === perm.name);
                        return (
                          <td key={role.id} className="px-4 py-3 text-center">
                            {hasIt ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 mx-auto">
                                <Check size={13} className="text-green-600" />
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 mx-auto">
                                <X size={13} className="text-gray-400" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-5 text-sm text-gray-600 bg-white rounded-xl border border-gray-200 px-5 py-3 shadow-sm w-fit">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
            <Check size={13} className="text-green-600" />
          </span>
          Permission accordée
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
            <X size={13} className="text-gray-400" />
          </span>
          Permission non accordée
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 rounded-full bg-indigo-500" />
          <span>Le rôle <strong>admin</strong> possède automatiquement toutes les permissions</span>
        </div>
      </div>
    </div>
  );
}
