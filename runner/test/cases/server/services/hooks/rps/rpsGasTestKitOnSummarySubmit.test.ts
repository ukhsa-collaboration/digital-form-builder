import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import sinon from "sinon";
import {
  rpsGasTestKitOnSummarySubmit,
  saveGasTestKitDetailsSchema,
} from "../../../../../../src/server/services/hooks/rps/rpsGasTestKitOnSummarySubmit";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { describe, it, afterEach } = lab;

describe("saveGasTestKitDetailsSchema", () => {
  const person = {
    title: "Mr",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@email.com",
  };

  const address = {
    udprn: "23747208",
    fullAddress: "Houses of Parliament, Westminster, London, SW1A 0AA",
    postcode: "SW1A 0AA",
  };

  const manualAddress = {
    udprn: "",
    fullAddress: "1 Test Street, Testville, TE5 7ST",
    postcode: "TE5 7ST",
  };

  const basePayload = {
    uuid: "343d10da-7d57-425e-8b2f-6891b1c563d6",
    orderNumber: "RRR-26154780",
    customer: person,
    measurementAddress: address,
    kitRecipient: person,
    kitRecipientAddress: address,
    resultsRecipient: person,
    resultsRecipientAddress: manualAddress,
    prevTestedAddress: false,
    prevAboveActionLevel: false,
    remediationComplete: false,
  };

  describe("valid payloads", () => {
    it("accepts a fully populated payload", () => {
      const { error, value } = saveGasTestKitDetailsSchema.validate(
        basePayload
      );
      expect(error).to.be.undefined();
      expect(value.customer.telephone).to.equal("dummy-telephone");
      expect(value.resultsRecipientAddress.udprn).to.equal("");
    });

    it("strips unknown top-level fields", () => {
      const { error, value } = saveGasTestKitDetailsSchema.validate({
        ...basePayload,
        somethingUnexpected: "leftover state",
      });
      expect(error).to.be.undefined();
      expect(value).to.not.include("somethingUnexpected");
    });

    it("keeps an explicitly provided telephone", () => {
      const { error, value } = saveGasTestKitDetailsSchema.validate({
        ...basePayload,
        customer: { ...person, telephone: "07865123456" },
      });
      expect(error).to.be.undefined();
      expect(value.customer.telephone).to.equal("07865123456");
    });
  });

  describe("invalid payloads", () => {
    it("errors when uuid is missing", () => {
      const { uuid, ...rest } = basePayload;
      const { error } = saveGasTestKitDetailsSchema.validate(rest);
      expect(error).to.exist();
      expect(error!.message).to.include("uuid");
    });

    it("errors when customer.firstName is missing", () => {
      const { firstName, ...personWithoutFirstName } = person;
      const { error } = saveGasTestKitDetailsSchema.validate({
        ...basePayload,
        customer: personWithoutFirstName,
      });
      expect(error).to.exist();
      expect(error!.message).to.include("firstName");
    });

    it("errors when an address is missing udprn", () => {
      const { udprn, ...addressWithoutUdprn } = address;
      const { error } = saveGasTestKitDetailsSchema.validate({
        ...basePayload,
        measurementAddress: addressWithoutUdprn,
      });
      expect(error).to.exist();
      expect(error!.message).to.include("udprn");
    });

    it("errors when prevTestedAddress is not a boolean", () => {
      const { error } = saveGasTestKitDetailsSchema.validate({
        ...basePayload,
        prevTestedAddress: "yes",
      });
      expect(error).to.exist();
      expect(error!.message).to.include("prevTestedAddress");
    });
  });
});

describe("rpsGasTestKitOnSummarySubmit", () => {
  afterEach(() => {
    sinon.restore();
  });

  const measurementAddress = {
    address: "1 Measurement Way, Manchester",
    postcode: "M1 1AA",
    udprn: "111",
  };

  const kitAddress = {
    address: "2 Kit Street, Leeds",
    postcode: "LS1 1AA",
    udprn: "222",
  };

  const resultsAddress = {
    address: "3 Results Road, Bristol",
    postcode: "BS1 1AA",
    udprn: "333",
  };

  const toAddressDetails = (address: typeof measurementAddress) => ({
    udprn: address.udprn,
    fullAddress: address.address,
    postcode: address.postcode,
  });

  const baseState = {
    title: "Mr",
    firstName: "John",
    lastName: "Smith",
    emailAddress: "john.smith@email.com",
    propertyAddress_selectedAddress: measurementAddress,
    testedBeforeYesNo: false,
    bqmYesNo: false,
    stepsToReduceYesNo: false,
  };

  const buildRequest = () => {
    const jsonStub = sinon.stub().resolves({ ok: true });
    const requestStub = sinon.stub().resolves({
      status: 200,
      headers: { "content-type": "application/json" },
      json: jsonStub,
    });

    const yarStore = new Map<string, unknown>();

    const request: any = {
      service: {
        getServices: sinon.stub().returns({
          rpsBackendService: { request: requestStub },
        }),
      },
      logger: { warn: sinon.stub(), trace: sinon.stub() },
      yar: {
        get: (key: string) => yarStore.get(key),
        set: (key: string, value: unknown) => yarStore.set(key, value),
      },
    };

    return { request, requestStub };
  };

  const getPostedBody = (requestStub: sinon.SinonStub) => {
    const [path, options] = requestStub.firstCall.args;
    expect(path).to.equal("/storegtk");
    return JSON.parse(options.body);
  };

  it("uses the measurement address for both kit and results when both are confirmed as the same as the measurement address", async () => {
    const { request, requestStub } = buildRequest();
    const context: any = {
      state: {
        ...baseState,
        kitAddressConfirmation: true,
        resultsAddressConfirmation: true,
        kitResultsConfirmation: true,
      },
    };

    await rpsGasTestKitOnSummarySubmit(request, context);

    const body = getPostedBody(requestStub);

    expect(body.kitRecipient.firstName).to.equal("John");
    expect(body.kitRecipientAddress).to.equal(
      toAddressDetails(measurementAddress)
    );
    expect(body.resultsRecipient.firstName).to.equal("John");
    expect(body.resultsRecipientAddress).to.equal(
      toAddressDetails(measurementAddress)
    );
    expect(body.resultsRecipientAddress).to.equal(body.kitRecipientAddress);
  });

  it("uses the measurement address for the kit but collects a separate results address when only the kit is confirmed as the same as the measurement address", async () => {
    const { request, requestStub } = buildRequest();
    const context: any = {
      state: {
        ...baseState,
        kitAddressConfirmation: true,
        resultsAddressConfirmation: false,
        resultsTitle: "Mrs",
        resultsFirstName: "Jane",
        resultsLastName: "Doe",
        resultsAddress_selectedAddress: resultsAddress,
      },
    };

    await rpsGasTestKitOnSummarySubmit(request, context);

    const body = getPostedBody(requestStub);

    expect(body.kitRecipient.firstName).to.equal("John");
    expect(body.kitRecipientAddress).to.equal(
      toAddressDetails(measurementAddress)
    );
    expect(body.resultsRecipient).to.equal({
      title: "Mrs",
      firstName: "Jane",
      lastName: "Doe",
      email: "john.smith@email.com",
      telephone: "dummy-telephone",
    });
    expect(body.resultsRecipientAddress).to.equal(
      toAddressDetails(resultsAddress)
    );
    expect(body.resultsRecipientAddress).to.not.equal(body.kitRecipientAddress);
  });

  it("ignores results-same-as-measurement when the kit itself isn't confirmed as the same as the measurement address", async () => {
    const { request, requestStub } = buildRequest();
    const context: any = {
      state: {
        ...baseState,
        kitAddressConfirmation: false,
        resultsAddressConfirmation: true,
        kitResultsConfirmation: false,
        kitTitle: "Dr",
        kitFirstName: "Ken",
        kitLastName: "Adams",
        kitAddress_selectedAddress: kitAddress,
        resultsTitle: "Ms",
        resultsFirstName: "Amy",
        resultsLastName: "Lee",
        resultsAddress_selectedAddress: resultsAddress,
      },
    };

    await rpsGasTestKitOnSummarySubmit(request, context);

    const body = getPostedBody(requestStub);

    expect(body.kitRecipient).to.equal({
      title: "Dr",
      firstName: "Ken",
      lastName: "Adams",
      email: "john.smith@email.com",
      telephone: "dummy-telephone",
    });
    expect(body.kitRecipientAddress).to.equal(toAddressDetails(kitAddress));
    expect(body.resultsRecipient).to.equal({
      title: "Ms",
      firstName: "Amy",
      lastName: "Lee",
      email: "john.smith@email.com",
      telephone: "dummy-telephone",
    });
    expect(body.resultsRecipientAddress).to.equal(
      toAddressDetails(resultsAddress)
    );
    expect(body.resultsRecipientAddress).to.not.equal(
      toAddressDetails(measurementAddress)
    );
  });

  it("overrides any stale separately-entered kit/results addresses when both are confirmed as the same as the measurement address", async () => {
    const { request, requestStub } = buildRequest();
    const context: any = {
      state: {
        ...baseState,
        kitAddressConfirmation: true,
        resultsAddressConfirmation: true,
        // Leftover state from a previous journey through the form, where the
        // kit and results addresses were entered separately and differed.
        kitAddress_selectedAddress: kitAddress,
        resultsAddress_selectedAddress: resultsAddress,
      },
    };

    await rpsGasTestKitOnSummarySubmit(request, context);

    const body = getPostedBody(requestStub);

    expect(body.kitRecipientAddress).to.equal(
      toAddressDetails(measurementAddress)
    );
    expect(body.resultsRecipientAddress).to.equal(
      toAddressDetails(measurementAddress)
    );
    expect(body.resultsRecipientAddress).to.equal(body.kitRecipientAddress);
    expect(body.resultsRecipientAddress).to.not.equal(
      toAddressDetails(resultsAddress)
    );
  });
});
