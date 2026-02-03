import { useState, useEffect } from 'react';
import { supabase, Patient } from '../lib/supabase';
import { Users, Plus, Phone, Mail, Calendar, AlertCircle, Trash2 } from 'lucide-react';
import { PatientModal } from './PatientModal';

export function PatientsManagement() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteNoNamePatients() {
    if (!confirm('Delete all members with no name? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const noNamePatients = patients.filter(p => p.full_name?.startsWith('Unknown-'));

      for (const patient of noNamePatients) {
        const { error } = await supabase
          .from('patients')
          .delete()
          .eq('id', patient.id);

        if (error) throw error;
      }

      await loadPatients();
      alert(`Successfully deleted ${noNamePatients.length} member(s) with no name.`);
    } catch (error) {
      console.error('Error deleting patients:', error);
      alert('Error deleting members. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  const noNameCount = patients.filter(p => p.full_name?.startsWith('Unknown-')).length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-600 mt-1">Manage member information</p>
        </div>
        <div className="flex gap-3">
          {noNameCount > 0 && (
            <button
              onClick={deleteNoNamePatients}
              disabled={deleting}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-5 h-5" />
              Delete No Name ({noNameCount})
            </button>
          )}
          <button
            onClick={() => {
              setSelectedPatient(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Member
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No members found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((patient) => {
            const displayName = patient.full_name?.startsWith('Unknown-')
              ? `No Name (${patient.member_id || 'No ID'})`
              : patient.full_name || 'No Name';

            return (
              <div
                key={patient.id}
                onClick={() => {
                  setSelectedPatient(patient);
                  setShowModal(true);
                }}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
                  {patient.mobility_needs !== 'ambulatory' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {patient.mobility_needs}
                    </span>
                  )}
                </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{patient.phone}</span>
                </div>

                {patient.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{patient.email}</span>
                  </div>
                )}

                {patient.date_of_birth && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(patient.date_of_birth).toLocaleDateString()}</span>
                  </div>
                )}

                {patient.insurance_provider && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">Insurance</p>
                    <p className="font-medium text-gray-700">{patient.insurance_provider}</p>
                    {patient.insurance_id && (
                      <p className="text-xs text-gray-500 mt-1">ID: {patient.insurance_id}</p>
                    )}
                  </div>
                )}

                {patient.special_instructions && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-700">{patient.special_instructions}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <PatientModal
          patient={selectedPatient}
          onClose={() => {
            setShowModal(false);
            setSelectedPatient(null);
            loadPatients();
          }}
        />
      )}
    </div>
  );
}