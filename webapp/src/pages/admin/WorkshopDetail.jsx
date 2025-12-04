import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { workshopsAPI, loadAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import FileUpload from '../../components/FileUpload';
import AssignmentsManager from '../../components/admin/AssignmentsManager';
import EnrollmentsManager from '../../components/admin/EnrollmentsManager';
import InstructorsManager from '../../components/admin/InstructorsManager';
import WorkshopModal from '../../components/admin/WorkshopModal';

const WorkshopDetail = () => {
  const { workshopId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Initialize activeTab from URL query param or default to 'assignments'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'assignments');
  const [showEditModal, setShowEditModal] = useState(false);
  const [loadingWorkshop, setLoadingWorkshop] = useState(false);

  useEffect(() => {
    fetchWorkshop();
  }, [workshopId]);

  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleEditModalClose = (updated) => {
    setShowEditModal(false);
    if (updated) {
      fetchWorkshop();
    }
  };

  const fetchWorkshop = async () => {
    setLoading(true);
    try {
      const response = await workshopsAPI.getWorkshop(workshopId);
      setWorkshop(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch workshop');
    } finally {
      setLoading(false);
    }
  };

  const handleHomeZipUpload = async (s3Key) => {
    try {
      await workshopsAPI.updateWorkshop(workshopId, { s3HomeZipKey: s3Key });
      fetchWorkshop();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update workshop');
    }
  };

  const handleLoadWorkshop = async () => {
    if (!confirm('This will:\n• Update the active workshop ID in the system\n• Download the workshop home zip\n• Create local system users for all participants and instructors\n\nContinue?')) {
      return;
    }
    
    setLoadingWorkshop(true);
    try {
      const response = await loadAPI.loadWorkshop(workshopId);
      const result = response.data;
      let message = `Workshop "${result.workshopName}" loaded successfully!\n\n`;
      message += `• Users processed: ${result.usersProcessed}\n`;
      message += `• Home zip downloaded: ${result.homeZipDownloaded ? 'Yes' : 'No (not configured)'}`;
      alert(message);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load workshop');
    } finally {
      setLoadingWorkshop(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: 'badge-warning',
      ACTIVE: 'badge-success',
      ARCHIVED: 'badge-neutral',
    };
    return badges[status] || 'badge-ghost';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error || !workshop) {
    return (
      <div className="min-h-screen bg-base-200">
        <div className="navbar bg-base-100 shadow-lg">
          <div className="flex-1">
            <button onClick={() => navigate('/admin')} className="btn btn-ghost">
              ← Back to Admin
            </button>
          </div>
        </div>
        <div className="container mx-auto p-8">
          <div className="alert alert-error">
            <span>{error || 'Workshop not found'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <button onClick={() => navigate('/admin')} className="btn btn-ghost">
            ← Back
          </button>
          <div className="divider divider-horizontal"></div>
          <span className="text-xl font-bold">{workshop.name}</span>
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
      <div className="container mx-auto p-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-base-content">{workshop.name}</h1>
              <button 
                className="btn btn-sm btn-ghost"
                onClick={() => setShowEditModal(true)}
                title="Edit Workshop"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`badge badge-md ${getStatusBadge(workshop.status)}`}>{workshop.status}</span>
              <span className="badge badge-ghost badge-md">
                {formatDate(workshop.startDate)} - {formatDate(workshop.endDate)}
              </span>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              className="btn btn-primary"
              onClick={handleLoadWorkshop}
              disabled={loadingWorkshop}
              title="Load workshop: update env, download home zip, create users"
            >
              {loadingWorkshop ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Loading Workshop...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Load Workshop
                </>
              )}
            </button>
            <div className="stats shadow bg-base-100">
              <div className="stat py-2 px-4">
                <div className="stat-title text-xs uppercase font-bold tracking-wider">Assignments</div>
                <div className="stat-value text-2xl">{workshop.assignments?.length || 0}</div>
              </div>
              <div className="stat py-2 px-4">
                <div className="stat-title text-xs uppercase font-bold tracking-wider">Instructors</div>
                <div className="stat-value text-2xl">{workshop.instructors?.length || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Home Zip Section */}
        <div className="card bg-base-100 shadow-sm border border-base-200 mb-8">
          <div className="card-body p-6">
            <h3 className="card-title text-lg mb-4">Workshop Materials</h3>
            <FileUpload
              purpose="WORKSHOP_HOME"
              workshopId={parseInt(workshopId)}
              currentKey={workshop.s3HomeZipKey}
              onUploadSuccess={handleHomeZipUpload}
              label="Workshop Home Directory (ZIP)"
            />
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" className="tabs tabs-bordered tabs-lg mb-8">
          <a
            role="tab"
            className={`tab ${activeTab === 'assignments' ? 'tab-active' : ''}`}
            onClick={() => handleTabChange('assignments')}
          >
            Assignments
          </a>
          <a
            role="tab"
            className={`tab ${activeTab === 'instructors' ? 'tab-active' : ''}`}
            onClick={() => handleTabChange('instructors')}
          >
            Instructors
          </a>
          <a
            role="tab"
            className={`tab ${activeTab === 'enrollments' ? 'tab-active' : ''}`}
            onClick={() => handleTabChange('enrollments')}
          >
            Enrollments & Scores
          </a>
        </div>

        {/* Tab Content */}
        <div className="bg-base-100 rounded-box shadow-sm border border-base-200 p-6">
          {activeTab === 'assignments' && (
            <AssignmentsManager 
              workshopId={workshopId} 
              assignments={workshop.assignments || []}
              onUpdate={fetchWorkshop}
            />
          )}
          {activeTab === 'instructors' && (
            <InstructorsManager 
              workshopId={workshopId}
              instructors={workshop.instructors || []}
              onUpdate={fetchWorkshop}
            />
          )}
          {activeTab === 'enrollments' && (
            <EnrollmentsManager 
              workshopId={workshopId}
              assignments={workshop.assignments || []}
            />
          )}
        </div>
      </div>

      {/* Edit Workshop Modal */}
      {showEditModal && (
        <WorkshopModal
          workshop={workshop}
          onClose={handleEditModalClose}
        />
      )}
    </div>
  );
};

export default WorkshopDetail;

