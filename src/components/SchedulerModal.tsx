import React, { useState } from 'react';
import { useScheduler } from '@/contexts/SchedulerContext';

const SchedulerModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { jobs, addOneTimeJob, addRecurringJob, removeJob } = useScheduler();
  const [oneTimeDate, setOneTimeDate] = useState('');
  const [recurringInterval, setRecurringInterval] = useState(5); // minutes

  const handleAddOneTime = () => {
    if (oneTimeDate) {
      addOneTimeJob(new Date(oneTimeDate));
      setOneTimeDate('');
    }
  };
  const handleAddRecurring = () => {
    if (recurringInterval > 0) {
      addRecurringJob(recurringInterval * 60 * 1000);
      setRecurringInterval(5);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-lg" onClick={onClose} aria-label="Close">✕</button>
        <h2 className="text-xl font-bold mb-4">Capture Scheduler</h2>
        <div className="mb-4">
          <label className="block mb-1 font-semibold">One-Time Capture</label>
          <input type="datetime-local" value={oneTimeDate} onChange={e => setOneTimeDate(e.target.value)} className="border rounded p-2 w-full mb-2" />
          <button onClick={handleAddOneTime} className="bg-blue-600 text-white px-3 py-1 rounded">Schedule</button>
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Recurring Capture</label>
          <input type="number" min={1} value={recurringInterval} onChange={e => setRecurringInterval(Number(e.target.value))} className="border rounded p-2 w-24 mr-2" />
          <span>minutes</span>
          <button onClick={handleAddRecurring} className="bg-blue-600 text-white px-3 py-1 rounded ml-2">Schedule</button>
        </div>
        <h3 className="font-semibold mb-2">Scheduled Jobs</h3>
        <ul className="mb-2 max-h-40 overflow-y-auto">
          {jobs.length === 0 && <li className="text-gray-500">No scheduled jobs.</li>}
          {jobs.map(job => (
            <li key={job.id} className="flex items-center justify-between py-1 border-b last:border-b-0">
              <span>
                {job.type === 'one-time'
                  ? `One-time: ${job.time?.toLocaleString()}`
                  : `Recurring: every ${job.intervalMs! / 60000} min (next: ${job.nextRun.toLocaleTimeString()})`}
              </span>
              <button onClick={() => removeJob(job.id)} className="text-red-600 ml-2" aria-label="Remove job">🗑️</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SchedulerModal;