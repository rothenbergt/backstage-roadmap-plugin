import { renderHook, act } from '@testing-library/react';
import { useSimilarFeatures } from './useSimilarFeatures';
import { useFeatures } from '../../hooks';

jest.mock('../../hooks', () => ({
  useFeatures: jest.fn(),
}));

const mockUseFeatures = useFeatures as jest.Mock;

const feature = (id: string, title: string, description: string) => ({
  id,
  title,
  description,
  status: 'Suggested',
  votes: 0,
  hasVoted: false,
  author: 'user:default/guest',
});

const boardFeatures = [
  feature(
    '1',
    'Dark mode support',
    'Respect the Backstage theme and offer a proper dark palette.',
  ),
  feature(
    '2',
    'Export roadmap board to CSV',
    'Pull the current board into spreadsheets for planning reviews.',
  ),
  feature(
    '3',
    'Slack notifications for status changes',
    'Post a message to a channel when a feature moves between columns.',
  ),
];

describe('useSimilarFeatures', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseFeatures.mockReturnValue({ data: boardFeatures });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('returns nothing for queries below the minimum length', () => {
    const { result } = renderHook(() => useSimilarFeatures('da'));
    expect(result.current).toEqual([]);
  });

  it('matches a reworded title against an existing feature', () => {
    const { result } = renderHook(() => useSimilarFeatures('dark theme'));
    expect(result.current.map(f => f.id)).toContain('1');
  });

  it('returns nothing for an unrelated query', () => {
    const { result } = renderHook(() =>
      useSimilarFeatures('kubernetes cluster autoscaling'),
    );
    expect(result.current).toEqual([]);
  });

  it('debounces query changes', () => {
    const { result, rerender } = renderHook(
      ({ query }) => useSimilarFeatures(query),
      { initialProps: { query: '' } },
    );

    rerender({ query: 'dark theme' });
    // The new query has not been applied yet because the debounce is pending
    expect(result.current).toEqual([]);

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current.map(f => f.id)).toContain('1');
  });

  it('returns nothing while the board has not loaded', () => {
    mockUseFeatures.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useSimilarFeatures('dark theme'));
    expect(result.current).toEqual([]);
  });
});
