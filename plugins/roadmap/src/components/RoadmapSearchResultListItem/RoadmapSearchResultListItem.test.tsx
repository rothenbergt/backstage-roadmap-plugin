import { renderInTestApp } from '@backstage/test-utils';
import { RoadmapSearchResultListItem } from './RoadmapSearchResultListItem';

const result = {
  title: 'Dark mode',
  text: 'Add dark mode support to every page',
  location: '/roadmap?feature=42',
  status: 'Planned',
  votes: 12,
  author: 'user:default/alice',
};

describe('RoadmapSearchResultListItem', () => {
  it('renders title, excerpt, and metadata', async () => {
    const { getByText, getByRole, getByLabelText } = await renderInTestApp(
      <RoadmapSearchResultListItem result={result} />,
    );

    expect(getByRole('link', { name: 'Dark mode' })).toHaveAttribute(
      'href',
      '/roadmap?feature=42',
    );
    expect(
      getByText('Add dark mode support to every page'),
    ).toBeInTheDocument();
    expect(getByText('Planned')).toBeInTheDocument();
    expect(getByLabelText('12 votes')).toBeInTheDocument();
  });

  it('shows the author as a plain username instead of an entity ref', async () => {
    const { getByText, queryByText } = await renderInTestApp(
      <RoadmapSearchResultListItem result={result} />,
    );

    expect(getByText('alice')).toBeInTheDocument();
    expect(queryByText('user:default/alice')).not.toBeInTheDocument();
  });

  it('renders search term highlights', async () => {
    const { getByText } = await renderInTestApp(
      <RoadmapSearchResultListItem
        result={result}
        highlight={{
          preTag: '<x>',
          postTag: '</x>',
          fields: { title: '<x>Dark</x> mode' },
        }}
      />,
    );

    expect(getByText('Dark').tagName).toBe('MARK');
  });

  it('omits metadata the document does not have', async () => {
    const { queryByText, getByText } = await renderInTestApp(
      <RoadmapSearchResultListItem
        result={{
          title: 'Bare result',
          text: 'No extras indexed',
          location: '/roadmap?feature=7',
        }}
      />,
    );

    expect(getByText('Bare result')).toBeInTheDocument();
    expect(queryByText(/votes/)).not.toBeInTheDocument();
  });

  it('shows the roadmap map icon by default', async () => {
    const { getByTitle } = await renderInTestApp(
      <RoadmapSearchResultListItem result={result} />,
    );

    expect(getByTitle('Roadmap feature')).toBeInTheDocument();
  });

  it('lets the app swap in its own icon', async () => {
    const { getByTestId, queryByTitle } = await renderInTestApp(
      <RoadmapSearchResultListItem
        result={result}
        icon={<span data-testid="custom-icon" />}
      />,
    );

    expect(getByTestId('custom-icon')).toBeInTheDocument();
    expect(queryByTitle('Roadmap feature')).not.toBeInTheDocument();
  });

  it('renders nothing without a result', async () => {
    const { container } = await renderInTestApp(
      <RoadmapSearchResultListItem />,
    );

    expect(container.querySelector('li')).toBeNull();
  });
});
