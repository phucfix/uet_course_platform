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
    return <div className="text-center py-12">Loading...</div>;
  }

  const enrolledCourseIds = enrollments?.map((e: any) => e.courseId) || [];
  const availableCourses = allCourses?.filter(
    (course: any) => !enrolledCourseIds.includes(course.id)
  ) || [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          My Enrolled Courses
        </h2>
        {enrollments && enrollments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map((enrollment: any) => (
              <Link
                key={enrollment.id}
                to={`/courses/${enrollment.course.slug}`}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {enrollment.course.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {enrollment.course.description}
                </p>
                <div className="text-sm text-gray-500">
                  {enrollment.course.weeks.length} weeks
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-600">
            You haven't enrolled in any courses yet
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Available Courses
        </h2>
        {availableCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.map((course: any) => (
              <Link
                key={course.id}
                to={`/courses/${course.slug}`}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {course.title}
                </h3>
                <p className="text-gray-600 mb-4">{course.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{course._count.weeks} weeks</span>
                  <span>{course._count.enrollments} students</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-600">
            No more courses available
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;