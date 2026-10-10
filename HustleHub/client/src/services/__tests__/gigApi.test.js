import { vi } from 'vitest';
import {
  ApiRequestError, createGig, deleteGig, fieldErrorsFromDetails, getGig, listGigs, listMyGigs, updateGig
} from '../gigApi.js';
import { clearToken, setToken } from '../tokenStore.js';

function reply(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => {
      if (body === undefined) throw new Error('no body');
      return body;
    }
  };
}

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  clearToken();
});

afterEach(() => vi.unstubAllGlobals());

describe('gigApi requests', () => {
  it('builds the browse query from non-empty filters and sends no auth header', async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true, data: { gigs: [], total: 0 } }));
    await listGigs({ search: ' logo ', category: '', page: 2, limit: 9 });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/gigs/?search=logo&page=2&limit=9');
    expect(options.method).toBe('GET');
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('returns the gig from the detail response and encodes the id', async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true, data: { gig: { id: 'a' } } }));
    expect(await getGig('a/b')).toEqual({ id: 'a' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/gigs/a%2Fb');
  });

  it('sends the Bearer token and JSON body for protected writes', async () => {
    setToken('header.payload.signature');
    fetchMock.mockResolvedValue(reply(201, { success: true, data: { gig: { id: 'new' } } }));
    const gig = await createGig({ title: 'T', price: 5 });

    const [url, options] = fetchMock.mock.calls[0];
    expect(gig).toEqual({ id: 'new' });
    expect(url).toBe('/api/gigs/');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer header.payload.signature');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ title: 'T', price: 5 });
  });

  it('uses PATCH for updates, GET /mine for My Gigs and handles an empty 204 delete', async () => {
    setToken('header.payload.signature');
    fetchMock.mockResolvedValueOnce(reply(200, { success: true, data: { gig: { id: 'g' } } }));
    await updateGig('g', { price: 9 });
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');

    fetchMock.mockResolvedValueOnce(reply(200, { success: true, data: { gigs: [], total: 0 } }));
    await listMyGigs();
    expect(fetchMock.mock.calls[1][0]).toBe('/api/gigs/mine');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer header.payload.signature');

    fetchMock.mockResolvedValueOnce(reply(204));
    expect(await deleteGig('g')).toBeNull();
    expect(fetchMock.mock.calls[2][1].method).toBe('DELETE');
  });
});

describe('gigApi errors', () => {
  it('maps validation details onto form fields with a friendly message', async () => {
    fetchMock.mockResolvedValue(reply(400, {
      success: false,
      error: { code: 'VALIDATION_ERROR', details: ['Price must be a number.', 'Title must be 3–120 characters.', 'Unknown fields are not allowed.'] }
    }));
    const error = await createGig({}).catch(failure => failure);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.status).toBe(400);
    expect(error.fieldErrors).toEqual({ price: 'Price must be a number.', title: 'Title must be 3–120 characters.' });
    expect(error.message).toMatch(/correct the highlighted fields/);
  });

  it.each([
    [401, 'UNAUTHENTICATED', /sign in again/],
    [403, 'FORBIDDEN', /do not have permission/],
    [404, 'GIG_NOT_FOUND', /could not be found/],
    [429, 'RATE_LIMITED', /Too many requests/],
    [500, 'INTERNAL_ERROR', /Something went wrong/]
  ])('translates HTTP %i into a friendly message and never exposes server text', async (status, code, pattern) => {
    fetchMock.mockResolvedValue(reply(status, { success: false, error: { code, message: 'RAW SERVER TEXT mongodb://secret' } }));
    const error = await getGig('x').catch(failure => failure);
    expect(error.message).toMatch(pattern);
    expect(error.message).not.toMatch(/RAW SERVER TEXT|mongodb/);
    expect(error.code).toBe(code);
  });

  it('reports network failures and unreadable responses safely', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    const offline = await listGigs().catch(failure => failure);
    expect(offline.code).toBe('NETWORK_ERROR');
    expect(offline.message).toMatch(/Cannot reach the server/);

    fetchMock.mockResolvedValueOnce(reply(502, undefined));
    const garbage = await getGig('x').catch(failure => failure);
    expect(garbage.message).toMatch(/Something went wrong/);
  });

  it('ignores details that are not strings or not about gig fields', () => {
    expect(fieldErrorsFromDetails(undefined)).toEqual({});
    expect(fieldErrorsFromDetails([42, null, 'Password is wrong'])).toEqual({});
  });
});
