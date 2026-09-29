import { PageControllerBase, PageViewModel } from "./PageControllerBase";
import { FormModel } from "../models";
import { HapiRequest, HapiResponseToolkit } from "server/types";
import {
  AddressType,
  deriveSelectedFieldName,
  resolveAddressByUdprn,
  addressTypeFormSchema,
} from "../utils/addressUtils";
import { addressSelectionHandlers } from "../utils/addressSelectionHandlers";
import { ControllerError } from "../errors";
import { Address } from "src/server/services/addressLookupService";
import { FormData, FormSubmissionErrors, FormSubmissionState } from "../types";
import { FormComponent } from "../components/FormComponent";
import { isPlainObject } from "server/utils/object";

type FormSubmission = {
  addressType: AddressType;
  isCorrectAddress: string;
  [key: string]: string;
};

const COMPONENT_ADDRESS_TYPE = "addressType";
const COMPONENT_ADDRESSES_HEADING = "addressesFoundHeading";
const COMPONENT_MATCHED_ADDRESS_DISPLAY = "matchedAddressDisplay";

/**
 * Returns a `getDisplayStringFromState` implementation for the given address type.
 * State keys are namespaced by address type (e.g. `reportAddress_selectedAddress`)
 * so that report and delivery addresses coexist without collision.
 * When the stored value is a UDPRN string, it resolves the full address from the
 * cached `${addressType}_addresses` list.
 */
function buildDisplayStringFromState(
  pageAddressType: AddressType
): (state: FormSubmissionState) => string {
  return function (state) {
    const value = state[`${pageAddressType}_selectedAddress`];
    if (!value) return "";
    if (typeof value === "object" && value.address) return value.address;
    const addresses: Address[] = state[`${pageAddressType}_addresses`] || [];
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
  private addresses: Address[] = [];
  private postcodeLookup: string = "";
  private address: string = "";

  private readonly pageAddressType: AddressType;
  private readonly selectedFieldName: string;
  private readonly onAddressSelection?: string;

  constructor(model: FormModel, pageDef: { [prop: string]: any }) {
    super(model, pageDef);

    // Optional handler name (from page config) run once an address is
    // confirmed, e.g. an RPS database check for the risk-report journey.
    this.onAddressSelection = pageDef?.options?.onAddressSelection;

    // pageAddressType is declared on the hidden `addressType` component in the
    // form JSON via options.value, so one controller class serves both the
    // report-address and delivery-address selection pages.
    const rawComponents: { name: string; options?: { value?: AddressType } }[] =
      pageDef.components ?? [];
    this.pageAddressType =
      rawComponents.find((c) => c.name === COMPONENT_ADDRESS_TYPE)?.options
        ?.value ?? "reportAddress";
    this.selectedFieldName = deriveSelectedFieldName(this.pageAddressType);

    const component = this.components.items.find(
      (c): c is FormComponent =>
        c instanceof FormComponent && c.name === this.selectedFieldName
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

  getViewModel(
    formData: FormData,
    iteration?: unknown,
    errors?: FormSubmissionErrors
  ) {
    const viewModel = super.getViewModel(formData, iteration, errors);
    this.populateAddressRadios(viewModel, formData);
    this.updateAddressesHeading(viewModel);
    this.updateMatchedAddressDisplay(viewModel);
    return viewModel;
  }

  private populateAddressRadios(
    viewModel: PageViewModel,
    formData: FormData
  ): void {
    const addresses = this.addresses || [];
    const radiosIndex = this.components.items.findIndex(
      (c) => "name" in c && c.name === this.selectedFieldName
    );

    if (radiosIndex === -1 || !viewModel.components[radiosIndex]) return;

    viewModel.components[radiosIndex].model.items = addresses.map(
      (addr: Address) => ({
        text: addr.address,
        value: addr.udprn,
        checked: `${addr.udprn}` === `${formData[this.selectedFieldName]}`,
      })
    );
  }

  private updateAddressesHeading(viewModel: PageViewModel): void {
    const addresses = this.addresses || [];
    const headingIndex = this.components.items.findIndex(
      (c) => "name" in c && c.name === COMPONENT_ADDRESSES_HEADING
    );

    if (headingIndex === -1 || !viewModel.components[headingIndex]?.model)
      return;

    viewModel.components[
      headingIndex
    ].model.content = `${addresses.length} addresses found for '${this.postcodeLookup}'`;
  }

  private updateMatchedAddressDisplay(viewModel: PageViewModel): void {
    const matchedDisplayIndex = this.components.items.findIndex(
      (c) =>
        "name" in c &&
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
      const payload: Record<string, unknown> = isPlainObject(request.payload)
        ? request.payload
        : {};

      const validation = this.validate<FormSubmission>(
        payload,
        addressTypeFormSchema
      );

      const formResult = this.validateForm(payload);

      if (formResult.errors) {
        return response;
      }

      if (validation.errors) {
        return response;
      }

      const { addressType, isCorrectAddress, selectedAddress } =
        extractInputFromSubmission(validation.value);

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

      const addresses: Address[] =
        currentState[`${addressType}_addresses`] || [];

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
