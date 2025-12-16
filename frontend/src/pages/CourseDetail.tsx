import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { courseApi, submissionApi } from '../lib/api';

function CourseDetail({ user }: any) {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [submissionContent, setSubmissionContent] = useState('');

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', slug],
    queryFn: async () => {
      const response = await courseApi.getCourse(slug!);
      return response.data;
    }
  });

  const { data: submissions } = useQuery({
    queryKey: ['course-submissions', course?.id],
    queryFn: async () => {
      const response = await submissionApi.getCourseSubmissions(course.id);
      return response.data;
    },
    enabled: !!course && !!user
  });

  const submitMutation = useMutation({
    mutationFn: ({ weekId, content }: any) => 
      submissionApi.submitAssignment(weekId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-submissions'] });
      setSelectedWeek(null);
      setSubmissionContent('');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>
    );
  }

  if (!course) {
    return <div className="text-center py-20 text-gray-600">Course not found</div>;
  }

  const submissionMap = new Map(submissions?.map((s: any) => [s.weekId, s]) || []);

  const handleWeekClick = (week: any) => {
    setSelectedWeek(week);
    const existingSubmission = submissionMap.get(week.id);
    setSubmissionContent(existingSubmission?.content || '');
  };

  const handleSubmit = () => {
    if (selectedWeek && submissionContent.trim()) {
      submitMutation.mutate({
        weekId: selectedWeek.id,
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weeks List */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          <h2 className="text-base font-medium mb-2">Weekly Assignments</h2>
          {course.weeks.map((week: any) => {
            const submission = submissionMap.get(week.id);
            return (
              <div
                key={week.id}
                onClick={() => handleWeekClick(week)}
                className={`bg-white border rounded-md transition-all duration-200 cursor-pointer px-2 py-2 flex items-center justify-between gap-2 ${
                  selectedWeek?.id === week.id 
                    ? 'border-gray-400' 
                    : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-700 rounded text-xs font-semibold flex-shrink-0">
                    {week.weekNumber}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">{week.title}</h3>
                    <p className="text-xs text-gray-500 truncate">{week.description}</p>
                    {submission && (
                      <div className="mt-1 text-xs text-gray-400">Submitted {new Date(submission.submittedAt).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
                {submission ? (
                  <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">✓</span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-xs rounded-full">–</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Submission Form */}
        {selectedWeek && (
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-100 rounded-md p-3 sticky top-8 flex flex-col gap-2">
              <h3 className="text-sm font-semibold mb-1">Week {selectedWeek.weekNumber} Submission</h3>
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