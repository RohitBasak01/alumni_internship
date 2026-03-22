function createValidationError(issues) {
  const error = new Error("Validation failed");
  error.statusCode = 400;
  error.details = issues;
  return error;
}

export function validateBody(validator) {
  return (req, _res, next) => {
    try {
      const issues = validator(req.body || {});

      if (issues.length) {
        throw createValidationError(issues);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateQuery(validator) {
  return (req, _res, next) => {
    try {
      const issues = validator(req.query || {});

      if (issues.length) {
        throw createValidationError(issues);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateParams(validator) {
  return (req, _res, next) => {
    try {
      const issues = validator(req.params || {});

      if (issues.length) {
        throw createValidationError(issues);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
