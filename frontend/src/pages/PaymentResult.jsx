import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/FormField';

export const PaymentResult = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    // Parse VNPay return query params
    const vnp_ResponseCode = searchParams.get('vnp_ResponseCode');
    const vnp_TxnRef = searchParams.get('vnp_TxnRef');
    const vnp_Amount = searchParams.get('vnp_Amount');
    const vnp_TransactionNo = searchParams.get('vnp_TransactionNo');
    const vnp_BankCode = searchParams.get('vnp_BankCode');
    const vnp_PayDate = searchParams.get('vnp_PayDate');

    setPaymentInfo({
      responseCode: vnp_ResponseCode,
      txnRef: vnp_TxnRef,
      amount: vnp_Amount ? parseInt(vnp_Amount) / 100 : null,
      transactionNo: vnp_TransactionNo,
      bankCode: vnp_BankCode,
      payDate: vnp_PayDate,
      isSuccess: vnp_ResponseCode === '00'
    });
  }, [searchParams]);

  if (!paymentInfo) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-center text-gray-600">Đang xử lý kết quả thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success or Failure Card */}
      <div className={`shadow rounded-lg p-8 ${
        paymentInfo.isSuccess 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-red-50 border border-red-200'
      }`}>
        <div className="text-center">
          {paymentInfo.isSuccess ? (
            <>
              <svg className="w-16 h-16 text-green-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h1 className="text-3xl font-bold text-green-900 mb-2">
                Thanh toán thành công!
              </h1>
              <p className="text-green-700">
                Giao dịch của bạn đã được xử lý thành công.
              </p>
            </>
          ) : (
            <>
              <svg className="w-16 h-16 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h1 className="text-3xl font-bold text-red-900 mb-2">
                Thanh toán thất bại
              </h1>
              <p className="text-red-700">
                Không thể xử lý giao dịch. Vui lòng thử lại.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Payment Details */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết giao dịch</h2>
        
        <div className="space-y-3">
          {paymentInfo.amount && (
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-sm text-gray-600">Số tiền</span>
              <span className="text-lg font-bold text-gray-900">
                {paymentInfo.amount.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
          )}

          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-sm text-gray-600">Mã giao dịch</span>
            <span className="font-mono text-sm text-gray-900">
              {paymentInfo.txnRef || 'N/A'}
            </span>
          </div>

          {paymentInfo.transactionNo && (
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-sm text-gray-600">Mã giao dịch VNPay</span>
              <span className="font-mono text-sm text-gray-900">
                {paymentInfo.transactionNo}
              </span>
            </div>
          )}

          {paymentInfo.bankCode && (
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-sm text-gray-600">Ngân hàng</span>
              <span className="text-sm font-semibold text-gray-900">
                {paymentInfo.bankCode}
              </span>
            </div>
          )}

          {paymentInfo.payDate && (
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-sm text-gray-600">Thời gian</span>
              <span className="text-sm text-gray-900">
                {/* Format: YYYYMMDDHHmmss */}
                {paymentInfo.payDate.replace(
                  /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
                  '$3/$2/$1 $4:$5:$6'
                )}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Trạng thái</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              paymentInfo.isSuccess 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {paymentInfo.isSuccess ? 'Thành công' : 'Thất bại'}
            </span>
          </div>
        </div>
      </div>

      {/* Response Code Info */}
      {!paymentInfo.isSuccess && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-600">
            Mã lỗi: {paymentInfo.responseCode}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            {getResponseCodeMessage(paymentInfo.responseCode)}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => navigate('/dashboard')}
          variant="primary"
          className="flex-1"
        >
          Về Dashboard
        </Button>
        
        {!paymentInfo.isSuccess && (
          <Button
            onClick={() => navigate(-2)}
            variant="outline"
            className="flex-1"
          >
            Thử lại thanh toán
          </Button>
        )}
      </div>
    </div>
  );
};

function getResponseCodeMessage(code) {
  const messages = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
    '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
    '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
    '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
    '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
    '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
    '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
    '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
    '99': 'Các lỗi khác'
  };
  
  return messages[code] || 'Lỗi không xác định';
}
