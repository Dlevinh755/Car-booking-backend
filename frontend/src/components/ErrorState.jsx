export const ErrorState = ({ message = 'Có lỗi xảy ra', onRetry }) => {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center max-w-md">
        <div className="text-red-600 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Lỗi</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
};
