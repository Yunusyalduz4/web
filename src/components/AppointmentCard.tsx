"use client";
import { useState } from 'react';
import { trpc } from '../utils/trpcClient';
import { useSession } from 'next-auth/react';
import RescheduleModal from './RescheduleModal';
import RescheduleApprovalModal from './RescheduleApprovalModal';

interface AppointmentCardProps {
  appointment: {
    id: string;
    appointment_datetime: string;
    status: string;
    reschedule_status?: string;
    customer_name?: string;
    customer_phone?: string;
    notes?: string;
    business_id: string;
    business_name?: string;
    employee_id?: string;
    employee_name?: string;
    services?: Array<{
      name: string;
      price: number;
      duration_minutes: number;
    }>;
  };
  userRole: 'user' | 'business' | 'employee' | 'admin';
  onUpdate?: () => void;
}

export default function AppointmentCard({ appointment, userRole, onUpdate }: AppointmentCardProps) {
  const { data: session } = useSession();
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Bekleyen erteleme isteklerini getir
  const { data: pendingRequests } = trpc.reschedule.getPendingRescheduleRequests.useQuery();

  const canReschedule = 
    appointment.status === 'confirmed' || 
    appointment.status === 'pending' ||
    (appointment.reschedule_status === 'rejected');

  const canApprove = userRole !== 'user' && 
    appointment.reschedule_status === 'pending' &&
    pendingRequests?.some(req => req.appointment_id === appointment.id);

  const handleReschedule = () => {
    setShowRescheduleModal(true);
  };

  const handleApprove = () => {
    const request = pendingRequests?.find(req => req.appointment_id === appointment.id);
    if (request) {
      setSelectedRequest(request);
      setShowApprovalModal(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRescheduleStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return '';
    }
  };

  const getRescheduleStatusText = (status?: string) => {
    switch (status) {
      case 'pending': return 'Erteleme Bekliyor';
      case 'approved': return 'Ertelendi';
      case 'rejected': return 'Erteleme Reddedildi';
      default: return '';
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              {appointment.business_name || 'İşletme'}
            </h3>
            {appointment.employee_name && (
              <p className="text-sm text-gray-600 mb-1">
                Çalışan: {appointment.employee_name}
              </p>
            )}
            <p className="text-sm text-gray-500">
              {new Date(appointment.appointment_datetime).toLocaleString('tr-TR')}
            </p>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
              {appointment.status === 'confirmed' ? 'Onaylandı' :
               appointment.status === 'pending' ? 'Bekliyor' :
               appointment.status === 'cancelled' ? 'İptal' :
               appointment.status === 'completed' ? 'Tamamlandı' : appointment.status}
            </span>
            {appointment.reschedule_status && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRescheduleStatusColor(appointment.reschedule_status)}`}>
                {getRescheduleStatusText(appointment.reschedule_status)}
              </span>
            )}
          </div>
        </div>

        {appointment.customer_name && (
          <p className="text-sm text-gray-600 mb-2">
            <strong>Müşteri:</strong> {appointment.customer_name}
          </p>
        )}

        {appointment.customer_phone && (
          <p className="text-sm text-gray-600 mb-2">
            <strong>Telefon:</strong> {appointment.customer_phone}
          </p>
        )}

        {appointment.services && appointment.services.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-700 mb-1">Hizmetler:</p>
            <div className="space-y-1">
              {appointment.services.map((service, index) => (
                <div key={index} className="flex justify-between text-sm text-gray-600">
                  <span>{service.name}</span>
                  <span>{service.price}₺ ({service.duration_minutes}dk)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {appointment.notes && (
          <p className="text-sm text-gray-600 mb-3">
            <strong>Not:</strong> {appointment.notes}
          </p>
        )}

        <div className="flex space-x-2 pt-2 border-t border-gray-100">
          {canReschedule && (
            <button
              onClick={handleReschedule}
              className="flex-1 px-3 py-2 text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all"
            >
              📅 Ertelama
            </button>
          )}
          
          {canApprove && (
            <button
              onClick={handleApprove}
              className="flex-1 px-3 py-2 text-sm bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all"
            >
              ✅ Onayla/Reddet
            </button>
          )}
        </div>
      </div>

      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        appointment={appointment}
        userRole={userRole}
      />

      {selectedRequest && (
        <RescheduleApprovalModal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
        />
      )}
    </>
  );
}
