'use strict';

const fs = require('fs');

// In-memory store for jobs
// Key: jobId
// Value: { id, status, progress, filePath, format, url, createdAt, proc, ffmpegProc }
const jobs = new Map();

// Helper to get a job
function getJob(jobId) {
  return jobs.get(jobId);
}

// Helper to create a job
function createJob(jobId, url, format) {
  const job = {
    id: jobId,
    status: 'downloading', // downloading, merging, completed, error
    progress: 0,
    filePath: null,
    format: format,
    url: url,
    createdAt: Date.now(),
    errorMsg: null,
    proc: null,
    ffmpegProc: null,
  };
  jobs.set(jobId, job);
  return job;
}

// Helper to update a job
function updateJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
  }
}

// Clean up jobs and their temporary files after 10 minutes (600,000 ms)
const CLEANUP_INTERVAL = 10 * 60 * 1000;
const JOB_MAX_AGE = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [jobId, job] of jobs.entries()) {
    if (now - job.createdAt > JOB_MAX_AGE) {
      // Kill any running processes
      if (job.proc) {
        try { job.proc.kill('SIGKILL'); } catch (e) {}
      }
      if (job.ffmpegProc) {
        try { job.ffmpegProc.kill('SIGKILL'); } catch (e) {}
      }
      
      // Delete temporary file
      if (job.filePath && fs.existsSync(job.filePath)) {
        try {
          fs.unlinkSync(job.filePath);
          console.log(`[JobStore] Cleaned up stale file for job ${jobId}`);
        } catch (e) {
          console.error(`[JobStore] Failed to delete file for job ${jobId}:`, e.message);
        }
      }
      
      jobs.delete(jobId);
      console.log(`[JobStore] Removed stale job ${jobId}`);
    }
  }
}, CLEANUP_INTERVAL);

module.exports = {
  getJob,
  createJob,
  updateJob,
  jobs,
};
