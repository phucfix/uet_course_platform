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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
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
    <div>
      {/* Course Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {course.title}
          </h1>
          <p className="text-lg text-gray-600 mb-4">{course.description}</p>
          <div className="inline-flex items-center text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {course.weeks.length} weeks total
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weeks List */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Weekly Assignments</h2>
          {course.weeks.map((week: any) => {
            const submission = submissionMap.get(week.id);
            return (
              <div
                key={week.id}
                onClick={() => handleWeekClick(week)}
                className={`bg-white rounded-lg shadow-sm border transition-all duration-200 cursor-pointer ${
                  selectedWeek?.id === week.id 
                    ? 'border-indigo-600 shadow-md' 
                    : 'border-gray-100 hover:border-gray-300 hover:shadow'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg text-sm font-semibold">
                          {week.weekNumber}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {week.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 ml-11">
                        {week.description}
                      </p>
                      {submission && (
                        <div className="mt-3 ml-11 text-xs text-gray-500">
                          Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {submission ? (
                      <span className="flex-shrink-0 inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Completed
                      </span>
                    ) : (
                      <span className="flex-shrink-0 inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        Not submitted
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submission Form */}
        {selectedWeek && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Week {selectedWeek.weekNumber} Submission
              </h3>
              <textarea
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                placeholder="Write your submission here..."
                className="w-full h-64 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
              />
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || !submissionContent.trim()}
                className="mt-4 w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Assignment'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseDetail;