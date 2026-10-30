export default function ManagerVehiclesLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div
        role="status"
        aria-label="Loading vehicles"
        className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full"
      />
    </div>
  );
}
