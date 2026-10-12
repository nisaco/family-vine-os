import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2.5 max-w-md w-full">
            <div className="flex items-center gap-2">
              <div className="h-5 w-24 bg-stone-200 rounded-full" />
              <div className="h-5 w-32 bg-stone-200 rounded-full" />
            </div>
            <div className="h-7 w-64 bg-stone-200 rounded-lg" />
            <div className="h-4 w-48 bg-stone-100 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 bg-stone-200 rounded-lg" />
            <div className="h-9 w-28 bg-stone-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-20 bg-stone-200 rounded" />
              <div className="w-4 h-4 bg-stone-200 rounded-full" />
            </div>
            <div className="h-7 w-24 bg-stone-300 rounded" />
            <div className="h-3 w-32 bg-stone-100 rounded" />
          </div>
        ))}
      </div>

      {/* Content Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/90 p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="space-y-1.5">
              <div className="h-5 w-40 bg-stone-200 rounded" />
              <div className="h-3 w-56 bg-stone-100 rounded" />
            </div>
            <div className="h-4 w-16 bg-stone-100 rounded" />
          </div>
          <div className="space-y-3 pt-2">
            <div className="h-24 bg-stone-50 border border-stone-100 rounded-xl" />
            <div className="h-24 bg-stone-50 border border-stone-100 rounded-xl" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-6 space-y-4 shadow-2xs">
          <div className="h-5 w-32 bg-stone-200 rounded" />
          <div className="space-y-3">
            <div className="h-16 bg-stone-50 border border-stone-100 rounded-xl" />
            <div className="h-16 bg-stone-50 border border-stone-100 rounded-xl" />
            <div className="h-16 bg-stone-50 border border-stone-100 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

