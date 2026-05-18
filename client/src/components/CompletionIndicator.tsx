export default function CompletionIndicator() {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
        <svg
          className="w-6 h-6 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <div>
        <p className="text-green-800 font-semibold text-lg">
          All habits completed today! 🎉
        </p>
        <p className="text-green-600 text-sm">
          Great job keeping up with your habits.
        </p>
      </div>
    </div>
  );
}
