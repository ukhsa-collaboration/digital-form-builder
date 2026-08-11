import { PageControllerBase } from "./PageControllerBase";
import { FormModel } from "../models";
import { HapiRequest, HapiResponseToolkit } from "server/types";
import Joi from "joi";
import {
  addressTypeSchema,
  AddressType,
  deriveSelectedFieldName,
  resolveAddressByUdprn,
} from "../utils/addressUtils";
import { addressSelectionHandlers } from "../utils/addressSelectionHandlers";
import { ControllerError } from "../errors";

type FormSubmission = {
  addressType: AddressType;
  isCorrectAddress: string;
  [key: string]: string;
};

const COMPONENT_ADDRESS_TYPE = "addressType";
const COMPONENT_ADDRESSES_HEADING = "addressesFoundHeading";
const COMPONENT_MATCHED_ADDRESS_DISPLAY = "matchedAddressDisplay";

const formSchema = Joi.object({
  addressType: addressTypeSchema,
}).unknown(true);

/**
 * Returns a `getDisplayStringFromState` implementation for the given address type.
 * State keys are namespaced by address type (e.g. `reportAddress_selectedAddress`)
 * so that report and delivery addresses coexist without collision.
 * When the stored value is a UDPRN string, it resolves the full address from the
 * cached `${addressType}_addresses` list.
 */
function buildDisplayStringFromState(
  pageAddressType: AddressType
): (state: Record<string, any>) => string {
  return function (state) {
    const value = state[`${pageAddressType}_selectedAddress`];
    if (!value) return "";
    if (typeof value === "object" && value.address) return value.address;
    const addresses: any[] = state[`${pageAddressType}_addresses`] || [];
    const match = addresses.find(
      (addr) => String(addr.udprn) === String(value)
    );
    return match ? match.address : String(value);
  };
}

const extractInputFromSubmission = (data: FormSubmission) => {
  const { addressType, ...rest } = data;

  return {
    addressType,
    selectedAddress: rest[deriveSelectedFieldName(addressType)],
    isCorrectAddress: rest[`${addressType}_isCorrectAddress`],
  };
};

export class SelectAnAddressPageController extends PageControllerBase {
  private addresses: any[] = [];
  private postcodeLookup: string = "";
  private address: string = "";

  private readonly pageAddressType: AddressType;
  private readonly selectedFieldName: string;
  private readonly onAddressSelection?: string;

  constructor(model: FormModel, pageDef: any) {
    super(model, pageDef);

    // Optional handler name (from page config) run once an address is
    // confirmed, e.g. an RPS database check for the risk-report journey.
    this.onAddressSelection = pageDef?.options?.onAddressSelection;

    // pageAddressType is declared on the hidden `addressType` component in the
    // form JSON via options.value, so one controller class serves both the
    // report-address and delivery-address selection pages.
    const addressTypeComponent: any = this.components.items.find(
      (c: any) => c.name === COMPONENT_ADDRESS_TYPE
    );

    this.pageAddressType =
      (addressTypeComponent?.options?.value as AddressType) || "reportAddress";
    this.selectedFieldName = deriveSelectedFieldName(this.pageAddressType);

    const component: any = this.components.items.find(
      (c: any) => c.name === this.selectedFieldName
    );

    if (component) {
      component.getDisplayStringFromState = buildDisplayStringFromState(
        this.pageAddressType
      );
    }
  }

  async onMakeGetRouteHandler(request: HapiRequest) {
    const { cacheService } = request.services([]);
    const currentState = await cacheService.getState(request);

    this.addresses = currentState?.[`${this.pageAddressType}_addresses`];
    this.postcodeLookup =
      currentState?.[`${this.pageAddressType}_postcodeLookup`];
    this.address =
      currentState?.[`${this.pageAddressType}_matchedAddress`]?.address;
  }

  getViewModel(formData: any, iteration?: any, errors?: any) {
    const viewModel = super.getViewModel(formData, iteration, errors);
    this.populateAddressRadios(viewModel, formData);
    this.updateAddressesHeading(viewModel);
    this.updateMatchedAddressDisplay(viewModel);
    return viewModel;
  }

  private populateAddressRadios(viewModel: any, formData: any): void {
    const addresses = this.addresses || [];
    const radiosIndex = this.components.items.findIndex(
      (c: any) => c.name === this.selectedFieldName
    );

    if (radiosIndex === -1 || !viewModel.components[radiosIndex]) return;

    viewModel.components[radiosIndex].model.items = addresses.map(
      (addr: any) => ({
        text: addr.address,
        value: addr.udprn,
        checked: `${addr.udprn}` === `${formData[this.selectedFieldName]}`,
      })
    );
  }

  private updateAddressesHeading(viewModel: any): void {
    const addresses = this.addresses || [];
    const headingIndex = this.components.items.findIndex(
      (c: any) => c.name === COMPONENT_ADDRESSES_HEADING
    );

    if (headingIndex === -1 || !viewModel.components[headingIndex]?.model)
      return;

    viewModel.components[
      headingIndex
    ].model.content = `${addresses.length} addresses found for '${this.postcodeLookup}'`;
  }

  private updateMatchedAddressDisplay(viewModel: any): void {
    const matchedDisplayIndex = this.components.items.findIndex(
      (c: any) =>
        c.name ===
        `${this.pageAddressType}_${COMPONENT_MATCHED_ADDRESS_DISPLAY}`
    );

    if (
      matchedDisplayIndex === -1 ||
      !viewModel.components[matchedDisplayIndex]?.model
    )
      return;

    viewModel.components[matchedDisplayIndex].model.content = `${this.address}`;
  }

  makePostRouteHandler() {
    return async (request: HapiRequest, h: HapiResponseToolkit) => {
      const response = await this.handlePostRequest(request, h);
      const payload = (request.payload || {}) as Record<string, unknown>;
      const validation = this.validate<FormSubmission>(payload, formSchema);

      const formResult = this.validateForm(payload);

      if (formResult.errors) {
        return response;
      }

      if (validation.errors) {
        return response;
      }

      const {
        addressType,
        isCorrectAddress,
        selectedAddress,
      } = extractInputFromSubmission(validation.value);

      const { cacheService } = request.services([]);
      const currentState = await cacheService.getState(request);

      if (isCorrectAddress) {
        const resolvedSelectedAddress =
          isCorrectAddress === "true"
            ? currentState[`${addressType}_matchedAddress`]
            : null;

        const userSelectedYes = isCorrectAddress === "true";

        if (userSelectedYes && !resolvedSelectedAddress) {
          // throw error invalid data
          throw new ControllerError("cannot find matched report address", {
            code: 500,
          });
        }

        // Run the optional per-page handler (e.g. RPS database check) once the
        // user confirms. Handlers throw ControllerError to render error pages.
        const handler =
          this.onAddressSelection &&
          addressSelectionHandlers[this.onAddressSelection];

        if (userSelectedYes && handler) {
          await handler(request, resolvedSelectedAddress);
        }

        const savedState = await cacheService.mergeState(request, {
          [`${addressType}_isCorrectAddress`]: isCorrectAddress === "true",
          [`${addressType}_selectedAddress`]: resolvedSelectedAddress,
          // clear the selection radios on "No"
          [deriveSelectedFieldName(addressType)]: null,
        });

        const honourReturnUrl = isCorrectAddress === "true";
        return this.proceed(request, h, savedState, honourReturnUrl);
      }

      const addresses: any[] = currentState[`${addressType}_addresses`] || [];

      const resolvedMatchedAddress = resolveAddressByUdprn(
        addresses,
        selectedAddress
      );

      const savedState = await cacheService.mergeState(request, {
        [`${addressType}_isCorrectAddress`]: null,
        [`${addressType}_selectedAddress`]: selectedAddress,
        [`${addressType}_matchedAddress`]: resolvedMatchedAddress,
      });

      return this.proceed(request, h, savedState, false);
    };
  }
}
