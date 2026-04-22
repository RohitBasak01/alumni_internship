/**
 * A wrapper to handle asynchronous route handlers and pass any errors to the global error middleware.
 * This removes the need for repetitive try-catch blocks in controllers.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
