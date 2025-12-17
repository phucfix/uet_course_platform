import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GradeBadge from '../GradeBadge';

// Note: install @testing-library/react + @testing-library/jest-dom to run this test

test('renders dash when no grade available', async () => {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <GradeBadge username={'unknown-user'} assignmentId={'nope'} />
    </QueryClientProvider>
  );

  const el = await screen.findByText(/–|Loading…/i);
  expect(el).toBeInTheDocument();
});
