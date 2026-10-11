import { useRef, useState } from 'react';
import { GIG_CATEGORIES } from '../constants/categories.js';
import { validateGigForm } from '../utils/gigValidation.js';

const EMPTY = { title: '', description: '', category: '', price: '' };

// Shared by Create and Edit. `onSubmit(payload)` must return a promise; a rejected promise's
// `message` is shown in the form and its `fieldErrors` are shown next to the matching inputs.
export default function GigForm({ initialValues = EMPTY, submitLabel, onSubmit }) {
  const [values, setValues] = useState({ ...EMPTY, ...initialValues });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  // An existing gig may carry a category that is not in the standard list; keep it selectable.
  const categories = values.category && !GIG_CATEGORIES.includes(values.category)
    ? [values.category, ...GIG_CATEGORIES]
    : GIG_CATEGORIES;

  function change(field) {
    return event => {
      setValues(current => ({ ...current, [field]: event.target.value }));
      setErrors(current => (current[field] ? { ...current, [field]: undefined } : current));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    setFormError('');
    const result = validateGigForm(values, categories);
    setErrors(result.errors);
    if (!result.valid) return;

    inFlight.current = true;
    setSubmitting(true);
    try {
      await onSubmit(result.payload);
    } catch (error) {
      setErrors(error.fieldErrors || {});
      setFormError(error.message || 'Something went wrong. Please try again.');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  function field(name, label, control, hint) {
    const errorId = `${name}-error`;
    return (
      <div className="form-field">
        <label htmlFor={`gig-${name}`}>{label}</label>
        {control(errorId)}
        {hint ? <small className="hint">{hint}</small> : null}
        {errors[name] ? <p id={errorId} className="field-error" role="alert">{errors[name]}</p> : null}
      </div>
    );
  }

  const inputProps = (name, errorId) => ({
    id: `gig-${name}`,
    name,
    value: values[name],
    onChange: change(name),
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': errors[name] ? errorId : undefined,
    disabled: submitting
  });

  return (
    <form className="gig-form" onSubmit={handleSubmit} noValidate>
      {formError ? <div role="alert" className="alert alert-error"><p>{formError}</p></div> : null}

      {field('title', 'Title', errorId => <input type="text" maxLength={120} {...inputProps('title', errorId)} />, '3–120 characters')}
      {field('category', 'Category', errorId => (
        <select {...inputProps('category', errorId)}>
          <option value="">Select a category</option>
          {categories.map(category => <option key={category} value={category}>{category}</option>)}
        </select>
      ))}
      {field('price', 'Price (ZAR)', errorId => <input type="text" inputMode="decimal" {...inputProps('price', errorId)} />, 'Up to 2 decimal places, e.g. 250 or 99.50')}
      {field('description', 'Description', errorId => <textarea rows={6} maxLength={2000} {...inputProps('description', errorId)} />, '10–2000 characters')}

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
