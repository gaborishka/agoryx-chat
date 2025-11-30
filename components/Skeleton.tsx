'use client';

interface SkeletonProps {
  className?: string;
}

function SkeletonBase({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-700 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg bg-gray-800">
          <SkeletonBase className="h-4 w-3/4 mb-2" />
          <SkeletonBase className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <SkeletonBase className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBase className="h-4 w-24" />
        <SkeletonBase className="h-4 w-full" />
        <SkeletonBase className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function MessageListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <SkeletonBase className="h-8 w-48" />
        <SkeletonBase className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-800 p-6 rounded-lg">
            <SkeletonBase className="h-4 w-20 mb-2" />
            <SkeletonBase className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <SkeletonBase className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2">
              <SkeletonBase className="h-4 w-48" />
              <SkeletonBase className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <SkeletonBase className="h-8 w-48" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-800 p-4 rounded-lg">
            <SkeletonBase className="h-4 w-16 mb-2" />
            <SkeletonBase className="h-6 w-12" />
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <SkeletonBase className="h-6 w-24" />
        </div>
        <div className="divide-y divide-gray-700">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <SkeletonBase className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <SkeletonBase className="h-4 w-32 mb-1" />
                <SkeletonBase className="h-3 w-48" />
              </div>
              <SkeletonBase className="h-8 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <SkeletonBase className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <SkeletonBase className="h-4 w-24 mb-1" />
          <SkeletonBase className="h-3 w-16" />
        </div>
      </div>
      <SkeletonBase className="h-12 w-full" />
    </div>
  );
}

export { SkeletonBase as Skeleton };
