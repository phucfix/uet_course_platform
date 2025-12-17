import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { enrollmentApi, courseApi } from '../lib/api';

function Dashboard() {
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      const response = await enrollmentApi.getMyCourses();
      return response.data;
    }
  });

  const { data: allCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['all-courses'],
    queryFn: async () => {
      const response = await courseApi.getAllCourses();
      return response.data;
    }
  });

  if (enrollmentsLoading || coursesLoading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  const enrolledCourseIds = enrollments?.map((e: any) => e.courseId) || [];
  const availableCourses = allCourses?.filter(
    (course: any) => !enrolledCourseIds.includes(course.id)
  ) || [];

  return (
    <div className="max-w-3xl mx-auto px-2 py-4 sm:py-6">
      <h1 className="text-xl font-semibold mb-4">Dashboard</h1>

      <div className="mb-6">
        <h2 className="text-base font-medium mb-2">My Enrolled Courses</h2>
        {enrollments && enrollments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {enrollments.map((enrollment: any) => {
              const submissionMap = new Map((enrollment.submissions || []).map((s: any) => [s.assignmentId, s]));
              return (
                <Link
                  key={enrollment.id}
                  to={`/courses/${enrollment.course.slug}`}
                  className="border rounded-md p-3 bg-white flex flex-col gap-2 hover:shadow-sm transition"
                >
                  <div>
                    <h3 className="text-sm font-semibold truncate">{enrollment.course.title}</h3>
                    <p className="text-xs text-gray-600 truncate">{enrollment.course.description}</p>
                    <div className="text-xs text-gray-400">{enrollment.course.weeks.length} weeks</div>
                  </div>

                  {/* Compact week + assignment preview with completion */}
                  <div className="mt-2 space-y-2">
                    {enrollment.course.weeks.map((w: any) => (
                      <div key={w.id} className="bg-gray-50 p-2 rounded">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold">Week {w.weekNumber}</div>
                          <div className="text-xs text-gray-400">{w.assignments?.length || 0} problems</div>
                        </div>
                        <div className="mt-2 space-y-1">
                          {w.assignments && w.assignments.length > 0 ? (
                            w.assignments.map((a: any) => {
                              const completed = submissionMap.has(a.id);
                              return (
                                <div key={a.id} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${completed ? 'bg-white border border-green-200' : ''}`}>
                                  <div className={`truncate ${completed ? 'text-green-800 font-medium' : 'text-gray-700'}`}>{a.title}</div>
                                  {completed ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full text-xs font-semibold">✓</span>
                                  ) : (
                                    <span className="text-gray-300">&mdash;</span>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-xs text-gray-400">No problems</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 rounded p-4 text-center">
            <p className="text-gray-400 text-sm">You haven't enrolled in any courses yet</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-medium mb-2">Available Courses</h2>
        {availableCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availableCourses.map((course: any) => (
              <Link
                key={course.id}
                to={`/courses/${course.slug}`}
                className="border rounded-md p-3 bg-white flex flex-col gap-1 hover:shadow-sm transition"
              >
                <h3 className="text-sm font-semibold truncate">{course.title}</h3>
                <p className="text-xs text-gray-600 truncate">{course.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{course._count.weeks}w</span>
                  <span>{course._count.enrollments} students</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded p-4 text-center">
            <p className="text-gray-400 text-sm">No more courses available</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;