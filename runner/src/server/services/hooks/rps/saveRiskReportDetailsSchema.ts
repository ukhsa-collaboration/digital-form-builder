import Joi from "joi";

export const saveRiskReportDetailsSchema = Joi.object({
  uuid: Joi.string().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  deliveryMethod: Joi.string().valid("email", "post").required(),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .when("deliveryMethod", {
      is: "post",
      then: Joi.optional().allow("", null),
      otherwise: Joi.required(),
    }),
  telephone: Joi.string().default("dummy-telephone"),
  countryCode: Joi.string(),
  fullAddress: Joi.when("deliveryMethod", {
    is: "post",
    then: Joi.alternatives().try(Joi.string(), Joi.object()).required(),
    otherwise: Joi.optional().allow(""),
  }).default("test"),
})
  .rename("emailAddress", "email")
  .rename("deliveryAddress_selectedAddress", "fullAddress")
  .options({ stripUnknown: true });
