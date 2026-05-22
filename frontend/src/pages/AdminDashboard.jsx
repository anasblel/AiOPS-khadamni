import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  
  // Data State
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  
  // Loading & Error States
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [formLabel, setFormLabel] = useState('');
  const [formIcon, setFormIcon] = useState('🛠️');
  const [formRemote, setFormRemote] = useState(true);
  const [formSpecialties, setFormSpecialties] = useState('');

  // Delete Confirmations
  const [userToDelete, setUserToDelete] = useState(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);

  // Fetch users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users directory.');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch job families
  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const { data } = await api.get('/providers/job-families');
      setServices(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch services list.');
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchServices();
  }, []);

  // Cascading User Deletion Handler
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/users/${userToDelete._id}`);
      setUsers(users.filter(u => u._id !== userToDelete._id));
      setUserToDelete(null);
      // Re-fetch since deleting a user can impact active provider statistics
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setActionLoading(false);
    }
  };

  // Service CRUD Handlers
  const handleOpenAddService = () => {
    setModalMode('add');
    setEditingServiceId(null);
    setFormLabel('');
    setFormIcon('🛠️');
    setFormRemote(true);
    setFormSpecialties('');
    setIsServiceModalOpen(true);
  };

  const handleOpenEditService = (srv) => {
    setModalMode('edit');
    setEditingServiceId(srv.id || srv._id);
    setFormLabel(srv.label);
    setFormIcon(srv.icon);
    setFormRemote(srv.remoteAllowed);
    setFormSpecialties(srv.specialties.join(', '));
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!formLabel.trim() || !formIcon.trim()) {
      alert('Label and Emoji Icon are required.');
      return;
    }

    const specialtiesArray = formSpecialties
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const payload = {
      label: formLabel.trim(),
      icon: formIcon.trim(),
      remoteAllowed: formRemote,
      specialties: specialtiesArray
    };

    setActionLoading(true);
    try {
      if (modalMode === 'add') {
        const { data } = await api.post('/admin/job-families', payload);
        setServices([...services, data]);
      } else {
        const { data } = await api.put(`/admin/job-families/${editingServiceId}`, payload);
        setServices(services.map(s => (s.id === editingServiceId || s._id === editingServiceId ? data : s)));
      }
      setIsServiceModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save service.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    setActionLoading(true);
    const identifier = serviceToDelete.id || serviceToDelete._id;
    try {
      await api.delete(`/admin/job-families/${identifier}`);
      setServices(services.filter(s => s.id !== identifier && s._id !== identifier));
      setServiceToDelete(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete service.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone && u.phone.includes(userSearch)) ||
      (u.address && u.address.toLowerCase().includes(userSearch.toLowerCase()));
      
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 overflow-x-hidden">
        {/* Header Section */}
        <div className="relative p-6 sm:p-8 rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900/20 via-purple-950/10 to-[#0a0a0f] border border-white/5 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse duration-[8000ms]" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse duration-[6000ms]" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                Administrative Console
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                System Workspace
              </h1>
              <p className="mt-2 text-white/50 text-sm sm:text-base max-w-2xl">
                Enforce platform standards, manage user accounts, perform secure cascading cleanup, and dynamically update the service catalog.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { fetchUsers(); fetchServices(); }}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium flex items-center gap-2 hover:scale-102"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7C4.547 9.547 4.5 10.768 4.5 12s.047 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.092-1.209.138-2.43.138-3.662z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12l3-3m-3 3l-3-3m-10.5 6l-3 3m3-3l3 3" />
                </svg>
                Sync Data
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            {
              label: 'Total Platform Users',
              value: loadingUsers ? '...' : users.length,
              icon: (
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.331 0-4.512-.647-6.366-1.773a3.25 3.25 0 01-1.28-2.539V14.16c0-3.042 2.333-5.578 5.277-5.837a48.567 48.567 0 017.447.106A5.273 5.273 0 0117.5 13.5V14c0 .878-.154 1.72-.435 2.502" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9a3 3 0 100-6 3 3 0 000 6zM19.5 13a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
                </svg>
              ),
              color: 'from-indigo-500/10 to-indigo-600/5 border-indigo-500/20'
            },
            {
              label: 'Active Providers',
              value: loadingUsers ? '...' : users.filter(u => u.role === 'provider').length,
              icon: (
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              ),
              color: 'from-purple-500/10 to-purple-600/5 border-purple-500/20'
            },
            {
              label: 'Registered Clients',
              value: loadingUsers ? '...' : users.filter(u => u.role === 'client').length,
              icon: (
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              ),
              color: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20'
            },
            {
              label: 'Available Services',
              value: loadingServices ? '...' : services.length,
              icon: (
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a2.25 2.25 0 003.182 0l5.178-5.178a2.25 2.25 0 000-3.182l-9.581-9.581A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
              ),
              color: 'from-amber-500/10 to-amber-600/5 border-amber-500/20'
            }
          ].map((stat, i) => (
            <div key={i} className={`bg-gradient-to-br ${stat.color} border rounded-2xl p-5 shadow-lg relative overflow-hidden group`}>
              <div className="flex justify-between items-start">
                <span className="text-white/40 text-xs sm:text-sm font-medium leading-none">{stat.label}</span>
                <div className="p-2 rounded-lg bg-white/5 border border-white/5">{stat.icon}</div>
              </div>
              <div className="mt-4 font-black text-2xl sm:text-3xl tracking-tight text-white group-hover:scale-105 transition-all origin-left duration-300">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/5 gap-6">
          {[
            { id: 'users', label: 'Users Directory', count: filteredUsers.length },
            { id: 'services', label: 'Services (Job Families)', count: services.length }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-4 px-2 text-sm font-semibold tracking-wide border-b-2 transition-all relative flex items-center gap-2 ${
                activeTab === t.id 
                  ? 'border-indigo-500 text-indigo-400' 
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              {t.label}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === t.id ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-white/40'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab 1: Users Directory */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by name, email, phone or address..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full bg-[#12121a]/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                />
              </div>

              <div className="flex gap-2 items-center">
                <span className="text-xs text-white/40 font-medium">Role Filter:</span>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="bg-[#12121a]/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer appearance-none pr-8"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admins</option>
                  <option value="provider">Providers</option>
                  <option value="client">Clients</option>
                </select>
              </div>
            </div>

            {/* Users Directory Table / Cards */}
            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <span className="text-white/40 text-sm">Fetching user directory...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-[#12121a]/40 border border-white/5 rounded-2xl py-16 text-center">
                <p className="text-white/40 text-sm">No users match your criteria.</p>
              </div>
            ) : (
              <div className="bg-[#12121a]/40 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-semibold tracking-wider text-white/40 uppercase">
                        <th className="px-6 py-4">User Details</th>
                        <th className="px-6 py-4">Role Badge</th>
                        <th className="px-6 py-4">Contact Info</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4">Joined Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {filteredUsers.map(u => {
                        const avatarInitials = u.name
                          ? u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                          : '?';
                        const joinedAt = new Date(u.createdAt).toLocaleDateString(undefined, { 
                          year: 'numeric', month: 'short', day: 'numeric' 
                        });

                        return (
                          <tr key={u._id} className="hover:bg-white/[0.01] transition-all group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-xs shrink-0">
                                  {avatarInitials}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-white truncate max-w-[200px]">{u.name}</div>
                                  <div className="text-xs text-white/40 truncate max-w-[200px]">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                u.role === 'admin' 
                                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' 
                                  : u.role === 'provider' 
                                    ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' 
                                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  u.role === 'admin' ? 'bg-purple-400' : u.role === 'provider' ? 'bg-indigo-400' : 'bg-emerald-400'
                                }`} />
                                <span className="capitalize">{u.role}</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 text-white/70">
                              {u.phone ? (
                                <span className="font-mono text-xs">{u.phone}</span>
                              ) : (
                                <span className="text-white/20 italic text-xs">No Phone</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-white/70 max-w-[200px] truncate">
                              {u.address ? (
                                <span>📍 {u.address}</span>
                              ) : (
                                <span className="text-white/20 italic text-xs">No Address</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-white/40 text-xs font-mono">{joinedAt}</td>
                            <td className="px-6 py-4 text-right">
                              {u._id === user?.id ? (
                                <span className="text-xs text-white/20 font-medium italic select-none">You (Self)</span>
                              ) : (
                                <button
                                  onClick={() => setUserToDelete(u)}
                                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/40 text-xs font-semibold tracking-wide transition-all duration-200"
                                >
                                  Remove User
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Services Taxonomy */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Platform Offerings</h3>
                <p className="text-xs text-white/40">Dynamic taxonomy list mapped for provider registration dropdowns.</p>
              </div>
              
              <button
                onClick={handleOpenAddService}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/35 hover:scale-103 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Service
              </button>
            </div>

            {loadingServices ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <span className="text-white/40 text-sm">Fetching service taxonomies...</span>
              </div>
            ) : services.length === 0 ? (
              <div className="bg-[#12121a]/40 border border-white/5 rounded-2xl py-16 text-center">
                <p className="text-white/40 text-sm">No services configured. Create one now!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(srv => (
                  <div key={srv._id || srv.id} className="relative rounded-2xl p-6 bg-gradient-to-br from-[#12121a] to-[#12121a]/50 border border-white/10 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group flex flex-col justify-between min-h-[220px]">
                    
                    {/* Top Detail */}
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl p-2.5 rounded-xl bg-white/5 border border-white/5 block">{srv.icon || '💼'}</span>
                          <div>
                            <h4 className="font-bold text-white text-base leading-snug">{srv.label}</h4>
                            <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono font-bold">{srv.id}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${
                          srv.remoteAllowed 
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}>
                          {srv.remoteAllowed ? '🟢 Remote' : '🚗 In-person'}
                        </span>
                      </div>

                      {/* Specialties List */}
                      <div className="mt-4">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider block font-semibold mb-1.5">Specialties ({srv.specialties?.length || 0})</span>
                        <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto">
                          {srv.specialties && srv.specialties.length > 0 ? (
                            srv.specialties.map((spec, index) => (
                              <span key={index} className="text-[10px] font-medium bg-white/5 text-white/70 px-2 py-0.5 rounded border border-white/5">
                                {spec}
                              </span>
                            ))
                          ) : (
                            <span className="text-white/20 italic text-[10px]">No specialties configured</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6">
                      <div className="flex items-center gap-1.5">
                        {srv.isCustom && (
                          <span className="text-[9px] bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded font-bold border border-indigo-500/25 uppercase">
                            Dynamic
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEditService(srv)}
                          className="px-2.5 py-1.5 rounded-lg border border-white/5 text-white/60 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setServiceToDelete(srv)}
                          className="px-2.5 py-1.5 rounded-lg border border-red-500/10 text-red-400 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/30 text-xs font-semibold transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── MODAL: Add / Edit Service ────────────────────────────────────────── */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            
            {/* Close Button */}
            <button
              onClick={() => setIsServiceModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-white/50 hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="13" y2="13" />
                <line x1="13" y1="1" x2="1" y2="13" />
              </svg>
            </button>

            <h3 className="font-extrabold text-xl mb-1">{modalMode === 'add' ? 'Add Service Category' : 'Modify Service Category'}</h3>
            <p className="text-white/40 text-xs mb-5">Configure the label, remote eligibility, and custom sub-skills.</p>

            <form onSubmit={handleSaveService} className="space-y-4">
              
              <div>
                <label className="text-xs text-white/60 font-semibold block mb-1">Service Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Photography & Video"
                  value={formLabel}
                  onChange={e => setFormLabel(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/60 font-semibold block mb-1">Emoji Icon</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 📷"
                    value={formIcon}
                    onChange={e => setFormIcon(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-2 text-sm text-white text-center text-lg placeholder-white/20 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="text-xs text-white/60 font-semibold block mb-1.5">Remote Allowed</label>
                  <button
                    type="button"
                    onClick={() => setFormRemote(!formRemote)}
                    className={`w-full py-2 rounded-xl text-xs font-bold border transition-all ${
                      formRemote 
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {formRemote ? '🟢 Enabled' : '🚗 In-person Only'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/60 font-semibold block mb-1">
                  Specialties (Comma Separated)
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Portrait, Wedding, Drone Shoot, Video Editor"
                  value={formSpecialties}
                  onChange={e => setFormSpecialties(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 transition-all"
                />
                <span className="text-[10px] text-white/30 block mt-1 leading-normal">
                  Provide descriptive specialties that providers can select during registration.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Category'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Delete User Confirmation ─────────────────────────────────── */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog">
          <div className="bg-[#12121a] border border-red-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="font-extrabold text-xl text-red-400 mb-2">Irreversible Deletion!</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              You are about to remove <strong className="text-white">{userToDelete.name}</strong> (<span className="text-xs font-mono">{userToDelete.email}</span>) from the system.
            </p>
            
            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-xs text-red-300 leading-normal space-y-1 mb-5">
              <p className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                ⚠️ Warning: Cascading Deletion
              </p>
              {userToDelete.role === 'provider' ? (
                <>
                  <p>• The Provider profile associated with this user will be removed.</p>
                  <p>• All active and historic bookings relating to this provider will be permanently deleted.</p>
                </>
              ) : (
                <p>• All client bookings associated with this user will be permanently deleted to prevent orphaned references.</p>
              )}
              <p>• This action is permanent and cannot be undone.</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 font-semibold text-sm transition-all text-white/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 font-semibold text-sm shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 text-white"
              >
                {actionLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Delete Service Confirmation ──────────────────────────────── */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="font-extrabold text-xl text-white mb-2">Delete Service Category?</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Are you sure you want to remove the <strong className="text-white">{serviceToDelete.label}</strong> service category from the system taxonomies?
            </p>
            
            <p className="text-xs text-white/40 leading-normal mb-5">
              Providers registered in this category will no longer be mapped correctly. Make sure you migrate or advise providers before deleting standard services.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-[#12121a] font-semibold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteService}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 font-semibold text-sm shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 text-white"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
