export const StatusBadge = ({ status }) => {
  const statusConfig = {
    // Booking statuses
    requested: { label: 'Yêu cầu', color: 'bg-yellow-100 text-yellow-800' },
    searching: { label: 'Đang tìm tài xế', color: 'bg-blue-100 text-blue-800' },
    assigned: { label: 'Đã chỉ định tài xế', color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-800' },
    completed: { label: 'Hoàn thành', color: 'bg-gray-100 text-gray-800' },
    pricing_failed: { label: 'Lỗi tính giá', color: 'bg-red-100 text-red-800' },
    no_drivers_available: { label: 'Không có tài xế', color: 'bg-orange-100 text-orange-800' },
    
    // Ride statuses
    created: { label: 'Đã tạo', color: 'bg-blue-100 text-blue-800' },
    arrived: { label: 'Đã đến điểm đón', color: 'bg-indigo-100 text-indigo-800' },
    picked_up: { label: 'Đã đón khách', color: 'bg-purple-100 text-purple-800' },
    in_progress: { label: 'Đang di chuyển', color: 'bg-green-100 text-green-800' },
    
    // Payment statuses
    pending: { label: 'Chờ thanh toán', color: 'bg-yellow-100 text-yellow-800' },
    processing: { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-800' },
    success: { label: 'Thành công', color: 'bg-green-100 text-green-800' },
    failed: { label: 'Thất bại', color: 'bg-red-100 text-red-800' },
  };

  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};
