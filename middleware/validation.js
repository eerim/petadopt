const Joi = require("joi");

function formatError(error) {
  if (!error?.details?.length) return "Invalid request body";
  return error.details[0].message;
}

function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({ message: formatError(error) });
    }

    req.body = value;
    next();
  };
}

module.exports = {
  Joi,
  validateBody
};
