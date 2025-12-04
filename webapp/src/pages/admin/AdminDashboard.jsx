import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import WorkshopsList from '../../components/admin/WorkshopsList';
import UsersList from '../../components/admin/UsersList';
import CertificatesList from '../../components/admin/CertificatesList';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('workshops');

  const tabs = [
    { id: 'workshops', label: 'Workshops', component: WorkshopsList },
    { id: 'users', label: 'Users', component: UsersList },
    { id: 'certificates', label: 'Certificates', component: CertificatesList },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-base-200">
      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">Workshop Management - Admin</a>
        </div>
        <div className="flex-none gap-2">
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                <span className="text-lg font-bold">
                  {user?.fullName?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
              <li className="menu-title">
                <span>{user?.fullName}</span>
                <span className="text-xs">{user?.email}</span>
              </li>
              <li><a onClick={logout}>Logout</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4">
        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6 bg-base-100 p-2 shadow-md">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              className={`tab tab-lg ${activeTab === tab.id ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </a>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-base-100 rounded-lg shadow-lg p-6">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

