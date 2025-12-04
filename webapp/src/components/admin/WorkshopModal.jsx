import { useState, useEffect } from 'react';
import { workshopsAPI } from '../../services/api';

const WorkshopModal = ({ workshop, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    status: 'DRAFT',
    startDate: '',
    endDate: '',
    requiredPassedAssignments: '',
    s3HomeZipKey: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (workshop) {
      setFormData({
        name: workshop.name || '',
        status: workshop.status || 'DRAFT',
        startDate: workshop.startDate ? workshop.startDate.split('T')[0] : '',
        endDate: workshop.endDate ? workshop.endDate.split('T')[0] : '',
        requiredPassedAssignments: workshop.requiredPassedAssignments || '',
        s3HomeZipKey: workshop.s3HomeZipKey || '',
      });
    }
  }, [workshop]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        status: formData.status,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        requiredPassedAssignments: formData.requiredPassedAssignments ? parseInt(formData.requiredPassedAssignments) : null,
        s3HomeZipKey: formData.s3HomeZipKey || null,
      };

      if (workshop) {
        await workshopsAPI.updateWorkshop(workshop.id, payload);
      } else {
        await workshopsAPI.createWorkshop(payload);
      }

      onClose(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save workshop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">
          {workshop ? 'Edit Workshop' : 'Create New Workshop'}
        </h3>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-control w-full mb-4">
            <label className="label">
              <span className="label-text">Workshop Name *</span>
            </label>
            <input
              type="text"
              name="name"
              className="input input-bordered w-full"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-control w-full mb-4">
            <label className="label">
              <span className="label-text">Status</span>
            </label>
            <select
              name="status"
              className="select select-bordered w-full"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Start Date</span>
              </label>
              <input
                type="date"
                name="startDate"
                className="input input-bordered w-full"
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">End Date</span>
              </label>
              <input
                type="date"
                name="endDate"
                className="input input-bordered w-full"
                value={formData.endDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-control w-full mb-4">
            <label className="label">
              <span className="label-text">Required Passed Assignments</span>
            </label>
            <input
              type="number"
              name="requiredPassedAssignments"
              className="input input-bordered w-full"
              value={formData.requiredPassedAssignments}
              onChange={handleChange}
              placeholder="Leave empty for all compulsory assignments"
              min="0"
            />
          </div>

          <div className="form-control w-full mb-6">
            <label className="label">
              <span className="label-text">S3 Home Zip Key</span>
            </label>
            <input
              type="text"
              name="s3HomeZipKey"
              className="input input-bordered w-full"
              value={formData.s3HomeZipKey}
              onChange={handleChange}
              placeholder="workshops/101/home_content.zip"
            />
          </div>

          <div className="modal-action">
            <button
              type="button"
              className="btn"
              onClick={() => onClose(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn btn-primary ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkshopModal;

