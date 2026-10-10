const mongoose = require('mongoose');
const { ApiError } = require('../utils/http.cjs');
// Imported so the User model is registered for populate().
require('../models/user.cjs');

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertValidId(id) {
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id) || String(new mongoose.Types.ObjectId(id)) !== id.toLowerCase()) {
    throw new ApiError(400, 'INVALID_ID', 'The supplied gig id is not valid.');
  }
}

// Only safe public fields leave the service; the freelancer is reduced to id + display name.
function toPublicGig(gig) {
  const value = typeof gig.toObject === 'function' ? gig.toObject() : gig;
  const owner = value.freelancerId;
  const populated = owner && typeof owner === 'object' && owner.fullName !== undefined;
  return {
    id: String(value._id),
    title: value.title,
    description: value.description,
    category: value.category,
    price: value.price,
    freelancer: { id: String(populated ? owner._id : owner), fullName: populated ? owner.fullName : undefined },
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };
}

function readStringParam(query, name, maxLength) {
  const value = query[name];
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Query parameter "${name}" is invalid.`);
  }
  return value.trim();
}

function readIntParam(query, name, fallback, min, max) {
  const value = query[name];
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^\d{1,6}$/.test(value)) throw new ApiError(400, 'VALIDATION_ERROR', `Query parameter "${name}" must be a whole number.`);
  const number = Number(value);
  if (number < min || number > max) throw new ApiError(400, 'VALIDATION_ERROR', `Query parameter "${name}" must be between ${min} and ${max}.`);
  return number;
}

function parseListQuery(query = {}) {
  return {
    category: readStringParam(query, 'category', 80),
    search: readStringParam(query, 'search', 50),
    page: readIntParam(query, 'page', 1, 1, 100000),
    limit: readIntParam(query, 'limit', DEFAULT_LIMIT, 1, MAX_LIMIT)
  };
}

function createGigService(Gig) {
  return {
    async list(query) {
      const { category, search, page, limit } = parseListQuery(query);
      const filter = {};
      if (category) filter.category = category;
      if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i');
        filter.$or = [{ title: pattern }, { description: pattern }];
      }
      const [gigs, total] = await Promise.all([
        Gig.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate('freelancerId', 'fullName'),
        Gig.countDocuments(filter)
      ]);
      return { gigs: gigs.map(toPublicGig), page, limit, total };
    },

    async getById(id) {
      assertValidId(id);
      const gig = await Gig.findById(id).populate('freelancerId', 'fullName');
      if (!gig) throw new ApiError(404, 'GIG_NOT_FOUND', 'Gig not found.');
      return toPublicGig(gig);
    }
  };
}

module.exports = { createGigService, toPublicGig, parseListQuery, assertValidId };
