import {
  Address,
  Item,
} from "@xgovformbuilder/model/dist/module/data-model/types";
import Joi from "joi";

export type AddressType = "reportAddress" | "deliveryAddress";

export const addressTypeSchema = Joi.string().valid(
  "reportAddress",
  "deliveryAddress"
);

export const addressesToList = (addresses: Address[]): Item[] => {
  return addresses.map((address) => ({
    text: address.address,
    value: address.uprn,
  }));
};

export const formatAddress = (addr: {
  address: string;
  postcode?: string;
}): string => {
  return addr.postcode ? `${addr.address}, ${addr.postcode}` : addr.address;
};
