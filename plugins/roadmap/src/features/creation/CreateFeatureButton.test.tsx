import { CreateFeatureButton } from './CreateFeatureButton';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';

jest.mock('./CreateFeatureModal', () => ({
  CreateFeatureModal: () => null,
}));

const mockUsePermission = jest.fn();
jest.mock('@backstage/plugin-permission-react', () => ({
  ...jest.requireActual('@backstage/plugin-permission-react'),
  usePermission: () => mockUsePermission(),
}));

describe('CreateFeatureButton', () => {
  it('renders the button when permission is allowed', async () => {
    mockUsePermission.mockReturnValue({ loading: false, allowed: true });

    const { findByRole } = await renderInTestApp(
      <TestApiProvider apis={[]}>
        <CreateFeatureButton />
      </TestApiProvider>,
    );

    expect(
      await findByRole('button', { name: /suggest feature/i }),
    ).toBeInTheDocument();
  });

  it('does not render the button when permission is denied', async () => {
    mockUsePermission.mockReturnValue({ loading: false, allowed: false });

    const { queryByRole } = await renderInTestApp(
      <TestApiProvider apis={[]}>
        <CreateFeatureButton />
      </TestApiProvider>,
    );

    expect(
      queryByRole('button', { name: /suggest feature/i }),
    ).not.toBeInTheDocument();
  });
});
