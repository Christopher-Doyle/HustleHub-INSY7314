import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../../../services/gigApi.js', () => ({
  listGigs: vi.fn(),
  listMyGigs: vi.fn(),
  getGig: vi.fn(),
  createGig: vi.fn(),
  updateGig: vi.fn(),
  deleteGig: vi.fn()
}));
import { createGig, deleteGig, getGig, listGigs, listMyGigs, updateGig } from '../../../services/gigApi.js';
import { clearSessionUser, setSessionUser } from '../../../services/session.js';
import App from '../../../App.jsx';

const freelancer = { id: 'u1', fullName: 'Aisha Khan', role: 'freelancer' };
const makeGig = (id, title, overrides = {}) => ({
  id, title, description: 'A helpful description for the gig.', category: 'Design', price: 50,
  freelancer: { id: 'u1', fullName: 'Aisha Khan' }, ...overrides
});

function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

afterEach(() => {
  clearSessionUser();
  vi.clearAllMocks();
});

describe('role-aware access', () => {
  it('blocks clients from My Gigs and from the create page without calling the API', () => {
    setSessionUser({ id: 'c1', fullName: 'Carl Client', role: 'client' });
    const first = renderApp('/my-gigs');
    expect(screen.getByRole('alert')).toHaveTextContent('Only signed-in freelancers');
    expect(screen.queryByRole('link', { name: 'My gigs' })).toBeNull();
    first.unmount();

    renderApp('/my-gigs/new');
    expect(screen.getByRole('alert')).toHaveTextContent('Only signed-in freelancers');
    expect(listMyGigs).not.toHaveBeenCalled();
  });

  it('shows the My gigs navigation item to freelancers only', async () => {
    setSessionUser(freelancer);
    listGigs.mockResolvedValue({ gigs: [], total: 0 });
    renderApp('/gigs');
    expect(screen.getByRole('link', { name: 'My gigs' })).toHaveAttribute('href', '/my-gigs');
  });
});

describe('My Gigs', () => {
  beforeEach(() => setSessionUser(freelancer));

  it('lists the freelancer gigs with edit links and an empty state', async () => {
    listMyGigs.mockResolvedValueOnce({ gigs: [makeGig('g1', 'Logo design')], total: 1 });
    const { unmount } = renderApp('/my-gigs');
    expect(await screen.findByText('Logo design')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/my-gigs/g1/edit');
    unmount();

    listMyGigs.mockResolvedValueOnce({ gigs: [], total: 0 });
    renderApp('/my-gigs');
    expect(await screen.findByText('You have not posted any gigs yet.')).toBeInTheDocument();
  });

  it('deletes after confirmation and refreshes the list from the API', async () => {
    const user = userEvent.setup();
    listMyGigs
      .mockResolvedValueOnce({ gigs: [makeGig('g1', 'First gig'), makeGig('g2', 'Second gig')], total: 2 })
      .mockResolvedValueOnce({ gigs: [makeGig('g2', 'Second gig')], total: 1 });
    deleteGig.mockResolvedValue(null);
    renderApp('/my-gigs');
    await screen.findByText('First gig');

    await user.click(screen.getByRole('button', { name: 'Delete First gig' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByText('"First gig" was deleted.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('link', { name: 'First gig' })).toBeNull());
    expect(screen.getByText('Second gig')).toBeInTheDocument();
    expect(deleteGig).toHaveBeenCalledWith('g1');
    expect(listMyGigs).toHaveBeenCalledTimes(2);
  });

  it('shows a retry option when the list cannot be loaded', async () => {
    const user = userEvent.setup();
    listMyGigs.mockRejectedValueOnce(new Error('Something went wrong. Please try again.'));
    listMyGigs.mockResolvedValueOnce({ gigs: [makeGig('g1', 'Recovered gig')], total: 1 });
    renderApp('/my-gigs');

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Recovered gig')).toBeInTheDocument();
  });
});

describe('Create gig page', () => {
  beforeEach(() => setSessionUser(freelancer));

  it('creates a gig and returns to My Gigs with a success notice', async () => {
    const user = userEvent.setup();
    createGig.mockResolvedValue(makeGig('new1', 'Brand new gig'));
    listMyGigs.mockResolvedValue({ gigs: [makeGig('new1', 'Brand new gig')], total: 1 });
    renderApp('/my-gigs/new');

    await user.type(screen.getByLabelText('Title'), 'Brand new gig');
    await user.selectOptions(screen.getByLabelText('Category'), 'Development');
    await user.type(screen.getByLabelText('Price (ZAR)'), '300');
    await user.type(screen.getByLabelText('Description'), 'Building something useful for you.');
    await user.click(screen.getByRole('button', { name: 'Create gig' }));

    expect(await screen.findByText('Your gig was created.')).toBeInTheDocument();
    expect(createGig).toHaveBeenCalledWith({
      title: 'Brand new gig',
      description: 'Building something useful for you.',
      category: 'Development',
      price: 300
    });
    expect(await screen.findByText('Brand new gig')).toBeInTheDocument();
  });
});

describe('Edit gig page', () => {
  beforeEach(() => setSessionUser(freelancer));

  it('loads the gig, saves changes and returns to My Gigs', async () => {
    const user = userEvent.setup();
    getGig.mockResolvedValue(makeGig('g1', 'Old title', { price: 20 }));
    updateGig.mockResolvedValue(makeGig('g1', 'Old title', { price: 30 }));
    listMyGigs.mockResolvedValue({ gigs: [makeGig('g1', 'Old title', { price: 30 })], total: 1 });
    renderApp('/my-gigs/g1/edit');

    const price = await screen.findByLabelText('Price (ZAR)');
    expect(price).toHaveValue('20');
    await user.clear(price);
    await user.type(price, '30');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateGig).toHaveBeenCalledWith('g1', expect.objectContaining({ title: 'Old title', price: 30 })));
    expect(await screen.findByText('Your gig was updated.')).toBeInTheDocument();
  });

  it('does not show the form for a gig owned by someone else', async () => {
    getGig.mockResolvedValue(makeGig('g9', 'Not mine', { freelancer: { id: 'other', fullName: 'Bongani' } }));
    renderApp('/my-gigs/g9/edit');

    expect(await screen.findByText('You can only edit your own gigs.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });

  it('shows the friendly error when the gig no longer exists', async () => {
    getGig.mockRejectedValue(new Error('That gig could not be found. It may have been removed.'));
    renderApp('/my-gigs/gone/edit');
    expect(await screen.findByText(/could not be found/)).toBeInTheDocument();
  });
});
