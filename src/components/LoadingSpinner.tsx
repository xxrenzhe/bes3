import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="relative">
        {/* 主加载动画 */}
        <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
        
        {/* 品牌标识 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 bg-red-600 rounded-full opacity-20 animate-pulse"></div>
        </div>
      </div>
      
      {/* 加载文本 */}
      <div className="ml-4">
        <div className="text-gray-600 font-medium">Loading...</div>
        <div className="text-gray-400 text-sm">Preparing your content</div>
      </div>
    </div>
  );
};

export default LoadingSpinner;