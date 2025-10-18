import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Eye, User, Phone, Mail, GraduationCap, Edit3, Save, X } from 'lucide-react';

interface Registrant {
  id: number;
  full_name: string;
  raw_full_name?: string;
  normalized_full_name?: string;
  canonical_full_name?: string;
  rut?: string;
  university_email?: string;
  career?: string;
  phone?: string;
  audience?: string;
}

interface ReviewItem {
  id: number;
  similarity: number;
  status: string;
  audience: string;
  created_at?: string;
  decided_at?: string;
  decided_by?: string;
  left_context: string;
  right_context: string;
  left_registrant: Registrant;
  right_registrant: Registrant;
}

interface ReviewResponse {
  items: ReviewItem[];
  total_count: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

const DuplicateReviewPage: React.FC = () => {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [audienceFilter, setAudienceFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [processingDecision, setProcessingDecision] = useState(false);
  const [canonicalName, setCanonicalName] = useState('');
  const [canonicalRegistrantId, setCanonicalRegistrantId] = useState<number | null>(null);
  const [editingRegistrant, setEditingRegistrant] = useState<{ side: 'left' | 'right'; registrant: Registrant } | null>(null);
  const [editForm, setEditForm] = useState<Partial<Registrant>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const itemsPerPage = 10;

  const fetchReviewItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (audienceFilter) {
        params.append('audience', audienceFilter);
      }

      const response = await fetch(`/api/names/review?${params}`);
      const data: ReviewResponse = await response.json();

      setReviewItems(data.items);
      setTotalCount(data.total_count);
    } catch (error) {
      console.error('Error fetching review items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewItems();
  }, [currentPage, statusFilter, audienceFilter]);

  const handleDecision = async (reviewId: number, decision: string, canonicalNameValue?: string, canonicalRegId?: number) => {
    setProcessingDecision(true);
    try {
      const response = await fetch(`/api/names/review/${reviewId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision,
          decided_by: 'admin', // In a real app, this would be the current user
          canonical_name: canonicalNameValue,
          canonical_registrant_id: canonicalRegId,
        }),
      });

      if (response.ok) {
        // Refresh the list
        await fetchReviewItems();
        setSelectedItem(null);
        setCanonicalName('');
        setCanonicalRegistrantId(null);
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error processing decision:', error);
      alert('Error processing decision');
    } finally {
      setProcessingDecision(false);
    }
  };

  const startEdit = (side: 'left' | 'right', registrant: Registrant) => {
    setEditingRegistrant({ side, registrant });
    setEditForm({
      full_name: registrant.full_name,
      rut: registrant.rut,
      university_email: registrant.university_email,
      career: registrant.career,
      phone: registrant.phone,
      audience: registrant.audience,
    });
  };

  const cancelEdit = () => {
    setEditingRegistrant(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingRegistrant) return;

    setSavingEdit(true);
    try {
      const response = await fetch(`/api/database/registrants/${editingRegistrant.registrant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: editForm.full_name || editingRegistrant.registrant.full_name,
          career: editForm.career || editingRegistrant.registrant.career || 'Unknown',
          rut: editForm.rut,
          university_email: editForm.university_email,
          phone: editForm.phone,
          audience: editForm.audience,
        }),
      });

      if (response.ok) {
        // Refresh the review items to show updated data
        await fetchReviewItems();
        setEditingRegistrant(null);
        setEditForm({});
      } else {
        const error = await response.json();
        alert(`Error updating registrant: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('Error saving changes');
    } finally {
      setSavingEdit(false);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 90) return 'text-red-600 bg-red-50';
    if (similarity >= 75) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'accepted': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      case 'skipped': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const RegistrantCard: React.FC<{
    registrant: Registrant;
    title: string;
    side: 'left' | 'right';
    canEdit?: boolean;
  }> = ({ registrant, title, side, canEdit = true }) => {
    const isEditing = editingRegistrant?.side === side && editingRegistrant.registrant.id === registrant.id;

    if (isEditing) {
      return (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center justify-between">
            <span className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              {title} (Editing)
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="h-3 w-3 mr-1" />
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={savingEdit}
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-700 bg-gray-200 hover:bg-gray-300"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </button>
            </div>
          </h4>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block font-medium mb-1">Name:</label>
              <input
                type="text"
                value={editForm.full_name || ''}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">RUT:</label>
              <input
                type="text"
                value={editForm.rut || ''}
                onChange={(e) => setEditForm({ ...editForm, rut: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Email:</label>
              <input
                type="email"
                value={editForm.university_email || ''}
                onChange={(e) => setEditForm({ ...editForm, university_email: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Career:</label>
              <input
                type="text"
                value={editForm.career || ''}
                onChange={(e) => setEditForm({ ...editForm, career: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Phone:</label>
              <input
                type="text"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Audience:</label>
              <select
                value={editForm.audience || ''}
                onChange={(e) => setEditForm({ ...editForm, audience: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select audience</option>
                <option value="estudiantes">Estudiantes</option>
                <option value="colaboradores">Colaboradores</option>
              </select>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center justify-between">
          <span className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            {title}
          </span>
          {canEdit && (
            <button
              onClick={() => startEdit(side, registrant)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-600 bg-gray-100 hover:bg-gray-200"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Edit
            </button>
          )}
        </h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Name:</span> {registrant.full_name}
          </div>
          {registrant.normalized_full_name && registrant.normalized_full_name !== registrant.full_name && (
            <div>
              <span className="font-medium">Normalized:</span> {registrant.normalized_full_name}
            </div>
          )}
          {registrant.rut && (
            <div className="flex items-center">
              <span className="font-medium mr-2">RUT:</span> {registrant.rut}
            </div>
          )}
          {registrant.university_email && (
            <div className="flex items-center">
              <Mail className="h-3 w-3 mr-1" />
              <span className="font-medium mr-2">Email:</span> {registrant.university_email}
            </div>
          )}
          {registrant.career && (
            <div className="flex items-center">
              <GraduationCap className="h-3 w-3 mr-1" />
              <span className="font-medium mr-2">Career:</span> {registrant.career}
            </div>
          )}
          {registrant.phone && (
            <div className="flex items-center">
              <Phone className="h-3 w-3 mr-1" />
              <span className="font-medium mr-2">Phone:</span> {registrant.phone}
            </div>
          )}
          {registrant.audience && (
            <div>
              <span className="font-medium">Audience:</span> {registrant.audience}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Duplicate Review</h1>
        <div className="flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="skipped">Skipped</option>
            <option value="all">All</option>
          </select>
          <select
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Audiences</option>
            <option value="estudiantes">Estudiantes</option>
            <option value="colaboradores">Colaboradores</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="text-sm text-gray-500 mb-4">
                Showing {reviewItems.length} of {totalCount} items
              </div>

              {reviewItems.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No review items</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No duplicate candidates found for the selected criteria.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewItems.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSimilarityColor(item.similarity)}`}>
                            {item.similarity.toFixed(1)}% similar
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {item.audience}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Review
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <RegistrantCard registrant={item.left_registrant} title="Registrant 1" side="left" />
                        <RegistrantCard registrant={item.right_registrant} title="Registrant 2" side="right" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalCount > itemsPerPage && (
                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {Math.ceil(totalCount / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Review Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedItem(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Review Potential Duplicate
                </h3>

                <div className="mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSimilarityColor(selectedItem.similarity)}`}>
                    {selectedItem.similarity.toFixed(1)}% similarity
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <RegistrantCard registrant={selectedItem.left_registrant} title="Registrant 1" side="left" />
                  <RegistrantCard registrant={selectedItem.right_registrant} title="Registrant 2" side="right" />
                </div>

                <div className="mb-6 space-y-4">
                  <div>
                    <label htmlFor="canonical-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Canonical Name (if accepting as duplicate):
                    </label>
                    <input
                      type="text"
                      id="canonical-name"
                      value={canonicalName}
                      onChange={(e) => setCanonicalName(e.target.value)}
                      placeholder="Enter the canonical name to use for both registrants"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Canonical Record (to merge all data into):
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setCanonicalRegistrantId(selectedItem.left_registrant.id)}
                        className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                          canonicalRegistrantId === selectedItem.left_registrant.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-semibold text-sm text-gray-900">Registrant 1</div>
                          <div className="text-sm text-gray-600 mt-1">{selectedItem.left_registrant.full_name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {selectedItem.left_registrant.university_email || 'No email'}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCanonicalRegistrantId(selectedItem.right_registrant.id)}
                        className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                          canonicalRegistrantId === selectedItem.right_registrant.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-semibold text-sm text-gray-900">Registrant 2</div>
                          <div className="text-sm text-gray-600 mt-1">{selectedItem.right_registrant.full_name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {selectedItem.right_registrant.university_email || 'No email'}
                          </div>
                        </div>
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      All registrations from the non-canonical record will be merged into the selected canonical record. Missing data will also be merged.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(selectedItem.id, 'skip')}
                    disabled={processingDecision}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(selectedItem.id, 'reject')}
                    disabled={processingDecision}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Not Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(selectedItem.id, 'accept', canonicalName, canonicalRegistrantId!)}
                    disabled={processingDecision || !canonicalName.trim() || !canonicalRegistrantId}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept as Duplicate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DuplicateReviewPage;