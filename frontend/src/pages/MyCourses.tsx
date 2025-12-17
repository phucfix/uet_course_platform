
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { enrollmentApi, authApi } from '../lib/api';


function MyCourses() {
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-courses-detail'],
    queryFn: async () => {
      const response = await enrollmentApi.getMyCourses();
      return response.data;
    }
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const res = await authApi.getCurrentUser();
      return res.data;
    }
  });
  const username = currentUser?.username;

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-2 py-4 sm:py-6">
      <h1 className="text-xl font-semibold mb-4">My Courses</h1>
      {enrollments && enrollments.length > 0 ? (
        <div className="flex flex-col gap-3">
          {enrollments.map((enrollment: any) => (
            <CourseProgress key={enrollment.id} enrollment={enrollment} username={username} />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded p-4 text-center">
          <p className="text-gray-400 text-sm">You haven't enrolled in any courses yet</p>
        </div>
      )}
    </div>
  );
}

function CourseProgress({ enrollment }: any) {
  // Simulate progress calculation (replace with real logic if needed)
  const totalAssignments = enrollment.course.weeks.reduce((acc: number, w: any) => acc + (w.assignments ? w.assignments.length : 0), 0);
  const completedAssignments = (enrollment.submissions || []).length;
  const progress = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

  return (
    <div className="bg-white border rounded-md p-3 flex flex-col gap-2">
      <div className="flex justify-between items-center gap-2 mb-1">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate">{enrollment.course.title}</h2>
          <p className="text-xs text-gray-500 truncate">{enrollment.course.description}</p>
        </div>
        <Link
          to={`/courses/${enrollment.course.slug}`}
          className="px-3 py-1 bg-gray-800 text-white rounded text-xs hover:bg-gray-700"
        >
          View
        </Link>
      </div>
      <div className="mb-1">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div
            className="bg-gray-800 h-1 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-xs text-gray-700 mb-1">Weekly Progress:</h3>
        {enrollment.course.weeks.map((week: any) => {
          const total = week.assignments ? week.assignments.length : 0;
          const completed = (enrollment.submissions || []).filter((s: any) => s.assignment && s.assignment.weekId === week.id).length;
          return (
            <div key={week.id} className={`flex items-center justify-between py-1 border-b last:border-b-0 ${completed > 0 ? 'bg-green-50' : ''}`}>
              <span className={`font-medium text-xs truncate ${completed > 0 ? 'text-green-700' : 'text-gray-700'}`}>
                W{week.weekNumber}: {week.title}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{completed}/{total} problems</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MyCourses;