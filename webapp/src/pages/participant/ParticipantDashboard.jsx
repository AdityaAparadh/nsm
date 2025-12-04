import { useAuth } from '../../contexts/AuthContext';

const ParticipantDashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-base-200">
      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">Workshop Management - Participant</a>
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
      <div className="container mx-auto p-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title text-3xl justify-center">Participant Dashboard</h2>
            <p className="text-lg mt-4">Welcome, {user?.fullName}!</p>
            <p className="text-base-content/60 mt-2">
              Participant dashboard features coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;

