import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { enrollmentApi, submissionApi } from '../lib/api';

function MyCourses() {
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-courses-detail'],
    queryFn: async () => {
      const response = await enrollmentApi.getMyCourses();
      return response.data;
    }
  });

  const getSubmissionsForCourse = async (courseId: string) => {
    const response = await submissionApi.getCourseSubmissions(courseId);
    return response.data;
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Courses</h1>

      {enrollments && enrollments.length > 0 ? (
        <div className="space-y-8">
          {enrollments.map((enrollment: any) => (
            <CourseProgress 
              key={enrollment.id} 
              enrollment={enrollment}
              getSubmissions={getSubmissionsForCourse}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-100 rounded-lg p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">
            You haven't enrolled in any courses yet
          </p>
          <Link 
            to="/dashboard"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Browse Courses
          </Link>
        </div>
      )}
    </div>
  );
}

function CourseProgress({ enrollment, getSubmissions }: any) {
  const { data: submissions } = useQuery({
    queryKey: ['submissions', enrollment.course.id],
    queryFn: () => getSubmissions(enrollment.course.id)
  });

  const submittedWeekIds = new Set(
    submissions?.map((s: any) => s.weekId) || []
  );

  const progress = enrollment.course.weeks.length > 0
    ? (submittedWeekIds.size / enrollment.course.weeks.length) * 100
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {enrollment.course.title}
          </h2>
          <p className="text-gray-600">{enrollment.course.description}</p>
        </div>
        <Link
          to={`/courses/${enrollment.course.slug}`}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          View Course
        </Link>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 mb-3">Weekly Progress:</h3>
        {enrollment.course.weeks.map((week: any) => (
          <div key={week.id} className="flex items-center justify-between py-2 border-b">
            <div>
              <span className="font-medium text-gray-900">
                Week {week.weekNumber}: {week.title}
              </span>
            </div>
            {submittedWeekIds.has(week.id) ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                ✓ Submitted
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                Not submitted
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyCourses;