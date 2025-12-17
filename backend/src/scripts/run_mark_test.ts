import { markSubmissionIfPassed } from '../services/gradeService';

(async () => {
  try {
    const res = await markSubmissionIfPassed('student-test', 'week1', 80, 100, 70);
    console.log('mark result:', res ? res.id : 'none');
  } catch (err) {
    console.error('error', err);
  }
})();
