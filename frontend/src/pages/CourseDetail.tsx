import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { courseApi, submissionApi, enrollmentApi } from '../lib/api';
import GradeBadge from '../components/GradeBadge';

function CourseDetail({ user }: any) {
  const { slug } = useParams();
  const queryClient = useQueryClient();


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
    // include user id in the key so the query is per-user and refetches when user changes
    queryKey: ['course-submissions', course?.id, user?.id],
    queryFn: async () => {
      const response = await submissionApi.getCourseSubmissions(course.id);
      console.debug('fetched submissions for course', course?.id, 'user', user?.username, response.data);
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

    // If redirected from content site with openSubmit, forward user to the problem page (we no longer show a submission form here)
    if (enrollWeekParam && openSubmit && problem && course) {
      const targetWeek = course.weeks.find((w: any) => String(w.weekNumber) === String(enrollWeekParam));
      if (targetWeek) {
        const probSlug = String(problem);
        const contentUrl = `http://localhost:1313/courses/${slug}/week${enrollWeekParam}/problems/${probSlug}/`;
        window.open(contentUrl, '_blank');
        // remove query params from URL to avoid repeated behavior
        navigate(location.pathname, { replace: true });
      }
    }
  }, [location.search, course]);



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

  // Fallback: some auth endpoints behave inconsistently for authenticated browser sessions
  // so if we don't get submissions from the dedicated endpoint, try to derive them from
  // the user's enrollments (server attaches `submissions` to enrollment). This makes
  // the UI robust even when `/api/submissions/course/:id` doesn't return data.
  if ((submissions || []).length === 0 && Array.isArray(myEnrollments) && course) {
    const myEnrollment = myEnrollments.find((e: any) => e.courseId === course.id);
    if (myEnrollment && Array.isArray(myEnrollment.submissions) && myEnrollment.submissions.length > 0) {
      console.debug('Using enrollment submissions fallback; found', myEnrollment.submissions.length);
      for (const s of myEnrollment.submissions) {
        submissionMap.set(s.assignmentId, s);
      }
    }
  }

  // No-op: assignments are read-only on this page now (no submission or navigation from here)
  const handleAssignmentClick = () => {
    return;
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
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
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
        <div className="lg:col-span-2 max-w-2xl mx-auto">
          <h2 className="text-base font-medium mb-4">Weekly Assignments</h2>

          <div className="space-y-6">
            {course.weeks.map((week: any, wi: number) => {
              // week is considered completed when all assignments have submissions
              const assignments = week.assignments || [];
              const weekCompleted = assignments.length > 0 && assignments.every((a: any) => submissionMap.has(a.id));

              return (
                <div key={week.id} className="flex items-start gap-4">
                  {/* Left timeline column */}
                  <div className="flex flex-col items-center mt-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${weekCompleted ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {week.weekNumber}
                    </div>
                    {/* vertical line between weeks */}
                    {wi !== course.weeks.length - 1 && <div className="w-px bg-gray-200 flex-1 mt-2" style={{ minHeight: '3rem' }} />}
                  </div>

                  {/* Right content */}
                  <div className="flex-1">
                    <div className={`bg-white border border-gray-100 rounded-md p-3 ${weekCompleted ? 'border-l-4 border-green-600 pl-3' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold">{week.title}</h3>
                          {week.description && <p className="text-xs text-gray-500">{week.description}</p>}
                        </div>
                        <div className="text-xs text-gray-400">{assignments.length} problems</div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {assignments.length > 0 ? (
                          assignments.map((a: any) => {
                            const sub = submissionMap.get(a.id);
                            const completed = !!sub;
                            const submittedAt = sub ? (sub as any).submittedAt : null;
                            return (
                              <div key={a.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-semibold ${completed ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    {completed ? '✓' : ''}
                                  </span>
                                  <div className={`text-sm ${completed ? 'text-green-800 font-semibold' : 'text-gray-900'}`}>{a.title}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {submittedAt && <div className="text-xs text-gray-400">Submitted {new Date(submittedAt).toLocaleDateString()}</div>}
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>


      </div>
    </div>
  );
}

export default CourseDetail;