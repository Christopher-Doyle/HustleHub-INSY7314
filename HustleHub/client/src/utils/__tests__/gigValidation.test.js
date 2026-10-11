import { GIG_CATEGORIES } from '../../constants/categories.js';
import { validateGigForm } from '../gigValidation.js';

const valid = { title: 'Logo design', description: 'A clean modern logo for your brand.', category: 'Design', price: '150.50' };
const check = overrides => validateGigForm({ ...valid, ...overrides }, GIG_CATEGORIES);

describe('validateGigForm', () => {
  it('accepts a valid gig and returns a trimmed payload with a numeric price', () => {
    const result = check({ title: '  Logo design  ' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.payload).toEqual({
      title: 'Logo design',
      description: 'A clean modern logo for your brand.',
      category: 'Design',
      price: 150.5
    });
  });

  it('reports every missing field with a message', () => {
    const result = validateGigForm({ title: '', description: '', category: '', price: '' }, GIG_CATEGORIES);
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).sort()).toEqual(['category', 'description', 'price', 'title']);
    expect(result.payload).toBeNull();
  });

  it.each([
    ['title too short', { title: 'ab' }, 'title'],
    ['title too long', { title: 'x'.repeat(121) }, 'title'],
    ['title with markup', { title: '<script>x</script>' }, 'title'],
    ['description too short', { description: 'too short' }, 'description'],
    ['description too long', { description: 'y'.repeat(2001) }, 'description'],
    ['unknown category', { category: 'Hacking' }, 'category']
  ])('rejects %s', (_name, overrides, field) => {
    const result = check(overrides);
    expect(result.valid).toBe(false);
    expect(result.errors[field]).toBeTruthy();
  });

  it.each(['-5', 'abc', '1e3', '10.999', '1,000', '1000001', ' '])('rejects the price %j', price => {
    const result = check({ price });
    expect(result.valid).toBe(false);
    expect(result.errors.price).toBeTruthy();
  });

  it.each([['0', 0], ['99', 99], ['99.5', 99.5], ['1000000', 1000000]])('accepts the price %s', (price, expected) => {
    const result = check({ price });
    expect(result.valid).toBe(true);
    expect(result.payload.price).toBe(expected);
  });
});
