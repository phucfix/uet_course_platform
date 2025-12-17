import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { courseApi, submissionApi, enrollmentApi } from '../lib/api';
import GradeBadge from '../components/GradeBadge';

function CourseDetail({ user }: any) {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissionContent, setSubmissionContent] = useState('');

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', slug],
    queryFn: async () => {
      const response = await courseApi.getCourse(slug!);
      return response.data;
    }
  });

  const location = useLocation();

  // parse enroll-related params early for render logic
  const paramsForRender = new URLSearchParams(location.search || window.location.search);
  const enrollSlugForRender = paramsForRender.get('enrollCourseSlug');

  // Debug info for enroll flow
  if (import.meta.env.DEV) {
    console.debug('CourseDetail debug:', { slug, enrollSlugForRender, locationSearch: location.search, user });
  }


  const { data: submissions } = useQuery({
    queryKey: ['course-submissions', course?.id],
    queryFn: async () => {
      const response = await submissionApi.getCourseSubmissions(course.id);
      return response.data;
    },
    enabled: !!course && !!user
  });

  const { data: myEnrollments } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      if (!user) return [] as any[];
      const res = await fetch('/api/enrollments/my-courses', { credentials: 'include' });
      if (!res.ok) return [] as any[];
      return res.json();
    },
    enabled: !!user
  });

  const isEnrolled = myEnrollments && course && myEnrollments.some((e: any) => e.courseId === course.id);


  const enrollMutation = useMutation({
    mutationFn: (courseId: string) => enrollmentApi.enrollInCourse(courseId),
    onSuccess: () => {
      // refetch enrollments or show success
      queryClient.invalidateQueries({ queryKey: ['my-courses-detail'] });
    }
  });

  const enrollBySlugMutation = useMutation({
    mutationFn: ({ courseSlug, weekNumber }: { courseSlug: string; weekNumber?: number | string }) =>
      enrollmentApi.enrollInCourseBySlug(courseSlug, weekNumber ? Number(weekNumber) : undefined),
    onSuccess: (data: any) => {
      // refetch course and enrollments
      queryClient.invalidateQueries({ queryKey: ['my-courses-detail'] });
      if (data && data.data && data.data.course && data.data.course.slug) {
        queryClient.invalidateQueries({ queryKey: ['course', data.data.course.slug] });
      }
    }
  });

  const navigate = useNavigate();

  useEffect(() => {
    // parse params for potential prefill if course is already known
    const params = new URLSearchParams(location.search);
    const enrollWeekParam = params.get('enrollWeek');
    const openSubmit = params.get('openSubmit');
    const problem = params.get('problem');

    if (enrollWeekParam && openSubmit && problem && course) {
      const targetWeek = course.weeks.find((w: any) => String(w.weekNumber) === String(enrollWeekParam));
      if (targetWeek && targetWeek.assignments && targetWeek.assignments.length > 0) {
        // pre-select the first assignment in the week if problem not specified
        const targetAssignment = targetWeek.assignments[0];
        setSelectedAssignment(targetAssignment);
        setSubmissionContent(`Submission for problem: ${problem}`);
      }
    }

    // No auto-enroll mutations here.
  }, [location.search, course]);

  const submitMutation = useMutation({
    mutationFn: ({ assignmentId, content }: any) => 
      submissionApi.submitAssignment(assignmentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-submissions'] });
      setSelectedAssignment(null);
      setSubmissionContent('');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>
    );
  }

  if (!course) {
    // If we are arriving from an enroll redirect
    if (enrollSlugForRender && enrollSlugForRender === slug) {
      // If user not authenticated, show sign-in prompt
      if (!user) {
        const returnTo = window.location.href;
        return (
          <div className="max-w-3xl mx-auto px-2 py-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm text-yellow-800 mb-3">To enroll in this course please sign in with GitHub.</p>
              <a
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 text-sm"
                href={`http://localhost:3000/auth/github?returnTo=${encodeURIComponent(returnTo)}`}
              >
                Sign in with GitHub
              </a>
            </div>
          </div>
        );
      }

      // If user is authenticated but course does not exist yet, allow them to create/enroll via button
      return (
        <div className="max-w-3xl mx-auto px-2 py-8">
          <div className="bg-white border rounded-md p-6">
            <h2 className="text-lg font-semibold mb-3">Course not published yet</h2>
            <p className="text-sm text-gray-600 mb-4">This course doesn't exist in the platform yet. Click the button below to create and enroll in it.</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => enrollBySlugMutation.mutate({ courseSlug: String(slug), weekNumber: undefined }, {
                  onSuccess: () => {
                    navigate('/');
                  }
                })}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500"
              >
                Create & Enroll
              </button>
              <a href="/" className="text-sm text-gray-500 hover:underline">Go back to dashboard</a>
            </div>
            {enrollBySlugMutation.isError && (
              <div className="mt-3 text-sm text-red-600">Enrollment failed. Please try again.</div>
            )}
          </div>
        </div>
      );
    }

    return <div className="text-center py-20 text-gray-600">Course not found</div>;
  }

  // enrollment feedback
  const enrollMsg = enrollMutation.isSuccess ? 'Enrolled successfully' : enrollMutation.isError ? 'Enrollment failed' : null;
  // Map submissions keyed by assignmentId for quick lookup
  const submissionMap = new Map(submissions?.map((s: any) => [s.assignmentId, s]) || []);

  const handleAssignmentClick = (assignment: any) => {
    setSelectedAssignment(assignment);
    const existingSubmission = submissionMap.get(assignment.id) as any;
    setSubmissionContent((existingSubmission as any)?.content || `Submission for ${assignment.title}`);
  };

  const handleSubmit = () => {
    if (selectedAssignment && submissionContent.trim()) {
      submitMutation.mutate({
        assignmentId: selectedAssignment.id,
        content: submissionContent
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-2 py-4 sm:py-6">
      {/* Course Header */}
      <div className="bg-white border border-gray-100 rounded-md p-4 mb-4 flex flex-col gap-1">
        <h1 className="text-xl font-semibold mb-1 truncate">{course.title}</h1>
        <p className="text-sm text-gray-600 mb-1 truncate">{course.description}</p>
        <div className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded w-fit">{course.weeks.length} weeks</div>
        {enrollMsg && (
          <div className={`mt-3 text-sm ${enrollMutation.isSuccess ? 'text-green-700 bg-green-50 p-2 rounded' : 'text-red-700 bg-red-50 p-2 rounded'}`}>
            {enrollMsg}
          </div>
        )}
        {/* Show enroll CTA if user is logged in but not enrolled */}
        {user && !isEnrolled && (
          <div className="mt-3">
            <div className="bg-blue-50 p-3 rounded-md flex items-center justify-between">
              <div className="text-sm text-blue-700">You are not enrolled in this course yet. Click below to enroll and start submitting.</div>
              <div>
                <button
                  onClick={() => {
                    if (course && course.id) {
                      enrollMutation.mutate(String(course.id), {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
                          navigate('/');
                        }
                      });
                    } else {
                      enrollBySlugMutation.mutate({ courseSlug: String(slug), weekNumber: undefined }, {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
                          navigate('/');
                        }
                      });
                    }
                  }}
                  className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-500 text-sm"
                >
                  Enroll
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weeks List */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          <h2 className="text-base font-medium mb-2">Weekly Assignments</h2>
          {course.weeks.map((week: any) => {
            return (
              <div key={week.id} className={`px-2 py-2 rounded-md bg-white border border-gray-100`}>                
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-semibold flex-shrink-0 bg-gray-100 text-gray-700`}>
                    {week.weekNumber}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{week.title}</h3>
                    <p className="text-xs text-gray-500">{week.description}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {week.assignments && week.assignments.length > 0 ? (
                    week.assignments.map((a: any) => {
                      const sub = submissionMap.get(a.id);
                      const completed = !!sub;
                      const submittedAt = sub ? (sub as any).submittedAt : null;
                      return (
                        <div key={a.id} onClick={() => handleAssignmentClick(a)} className={`transition-all duration-150 cursor-pointer px-2 py-2 rounded-md flex items-center justify-between ${completed ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-100 hover:border-gray-300' }`}>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{a.title}</div>
                            <div className="text-xs text-gray-500 truncate">{a.description}</div>
                            {submittedAt && <div className="mt-1 text-xs text-gray-400">Submitted {new Date(submittedAt).toLocaleDateString()}</div>}
                          </div>
                          <div className="flex items-center gap-3">
                            {completed ? <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">✓</span> : <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-xs rounded-full">–</span>}
                            <GradeBadge username={user?.username} assignmentId={a.id} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-gray-400">No problems defined for this week.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submission Form */}
        {selectedAssignment && (
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-100 rounded-md p-3 sticky top-8 flex flex-col gap-2">
              <h3 className="text-sm font-semibold mb-1">{selectedAssignment.title} Submission</h3>
              <textarea
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                placeholder="Write your submission here..."
                className="w-full h-32 p-2 border border-gray-200 rounded focus:ring-1 focus:ring-gray-300 focus:border-transparent resize-none text-xs"
              />
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || !submissionContent.trim()}
                className="w-full px-3 py-1.5 bg-gray-800 text-white font-medium rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseDetail;