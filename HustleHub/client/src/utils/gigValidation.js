// Mirrors the server rules in src/middleware/validateGigInput.cjs so users get instant feedback.
// The server remains the real authority and re-validates everything.
export const MAX_PRICE = 1000000;
const UNSAFE_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/;

function checkText(value, label, min, max) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min || text.length > max) return `${label} must be ${min}–${max} characters.`;
  if (UNSAFE_TEXT.test(text)) return `${label} contains characters that are not allowed.`;
  return null;
}

export function validateGigForm(values, categories) {
  const errors = {};
  const title = checkText(values.title, 'Title', 3, 120);
  if (title) errors.title = title;
  const description = checkText(values.description, 'Description', 10, 2000);
  if (description) errors.description = description;

  const category = typeof values.category === 'string' ? values.category.trim() : '';
  if (!category) errors.category = 'Choose a category.';
  else if (!categories.includes(category)) errors.category = 'Choose a category from the list.';

  const priceText = typeof values.price === 'string' ? values.price.trim() : String(values.price ?? '');
  let price;
  if (!priceText) errors.price = 'Enter a price.';
  else if (!/^\d+(\.\d{1,2})?$/.test(priceText)) errors.price = 'Price must be a number with at most 2 decimal places.';
  else {
    price = Number(priceText);
    if (price > MAX_PRICE) errors.price = `Price cannot be more than ${MAX_PRICE.toLocaleString('en-ZA')}.`;
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    payload: valid ? { title: values.title.trim(), description: values.description.trim(), category, price } : null
  };
}
