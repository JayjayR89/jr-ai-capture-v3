import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type ScheduledJob = {
  id: string;
  type: 'one-time' | 'recurring';
  time?: Date; // for one-time
  intervalMs?: number; // for recurring
  nextRun: Date;
};

type SchedulerContextType = {
  jobs: ScheduledJob[];
  addOneTimeJob: (date: Date) => void;
  addRecurringJob: (intervalMs: number) => void;
  removeJob: (id: string) => void;
};

const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

export const SchedulerProvider = ({ children, onCapture }: { children: ReactNode; onCapture: () => void }) => {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);

  // Job runner
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    jobs.forEach(job => {
      const now = Date.now();
      const delay = job.nextRun.getTime() - now;
      if (delay > 0) {
        timers.push(setTimeout(() => {
          onCapture();
          if (job.type === 'recurring') {
            setJobs(jobs => jobs.map(j => j.id === job.id ? { ...j, nextRun: new Date(Date.now() + (job.intervalMs || 0)) } : j));
          } else {
            setJobs(jobs => jobs.filter(j => j.id !== job.id));
          }
        }, delay));
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [jobs, onCapture]);

  const addOneTimeJob = (date: Date) => {
    setJobs(jobs => [...jobs, { id: uuidv4(), type: 'one-time', time: date, nextRun: date }]);
  };
  const addRecurringJob = (intervalMs: number) => {
    setJobs(jobs => [...jobs, { id: uuidv4(), type: 'recurring', intervalMs, nextRun: new Date(Date.now() + intervalMs) }]);
  };
  const removeJob = (id: string) => {
    setJobs(jobs => jobs.filter(j => j.id !== id));
  };

  return (
    <SchedulerContext.Provider value={{ jobs, addOneTimeJob, addRecurringJob, removeJob }}>
      {children}
    </SchedulerContext.Provider>
  );
};

export const useScheduler = () => {
  const ctx = useContext(SchedulerContext);
  if (!ctx) throw new Error('useScheduler must be used within SchedulerProvider');
  return ctx;
};