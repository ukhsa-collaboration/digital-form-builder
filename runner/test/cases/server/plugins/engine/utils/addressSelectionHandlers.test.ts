import * as Code from "@hapi/code";
import * as Lab from "@hapi/lab";
import sinon from "sinon";
import { addressSelectionHandlers } from "../../../../../../src/server/plugins/engine/utils/addressSelectionHandlers";

const { expect } = Code;
const lab = Lab.script();
exports.lab = lab;
const { describe, it, afterEach } = lab;

const { rpsRiskReportOnAddressSelection } = addressSelectionHandlers;

describe("rpsRiskReportOnAddressSelection", () => {
  afterEach(() => {
    sinon.restore();
  });

  const address = {
    address: "10 Downing Street, London",
    postcode: "SW1A 2AA",
    udprn: "23747208",
    uprn: "12345",
    countryCode: "E",
  };

  const buildRequest = (jsonResponse: unknown) => {
    const requestStub = sinon.stub().resolves({
      json: sinon.stub().resolves(jsonResponse),
    });

    const yarStore = new Map<string, unknown>();

    const request: any = {
      service: {
        getName: sinon.stub().returns("rpsBackendService"),
      },
      services: sinon.stub().returns({
        cacheService: {
          getState: sinon.stub().resolves({ progress: ["/back-link"] }),
        },
        rpsBackendService: { request: requestStub },
      }),
      logger: { trace: sinon.stub() },
      yar: {
        get: (key: string) => yarStore.get(key),
        set: (key: string, value: unknown) => yarStore.set(key, value),
      },
    };

    return { request, requestStub };
  };

  const getPostedBody = (requestStub: sinon.SinonStub) => {
    const [path, options] = requestStub.firstCall.args;
    expect(path).to.equal("/lookup");
    return JSON.parse(options.body);
  };

  it("sends uuid, udprn and countryCode (no sessionId or uprn)", async () => {
    const { request, requestStub } = buildRequest({ found: true });

    await rpsRiskReportOnAddressSelection(request, address);

    const body = getPostedBody(requestStub);

    expect(body).to.include(["uuid", "udprn", "countryCode"]);
    expect(body).to.not.include("sessionId");
    expect(body).to.not.include("uprn");
    expect(body.countryCode).to.equal("E");
    expect(body.udprn).to.equal("23747208");
  });

  it("pads udprn to 8 digits", async () => {
    const { request, requestStub } = buildRequest({ found: true });

    await rpsRiskReportOnAddressSelection(request, {
      ...address,
      udprn: "123",
    });

    const body = getPostedBody(requestStub);
    expect(body.udprn).to.equal("00000123");
  });

  it("does not throw when the address is found", async () => {
    const { request } = buildRequest({ found: true });

    await expect(
      rpsRiskReportOnAddressSelection(request, address)
    ).to.not.reject();
  });

  it("throws a 404 ControllerError when the address is not found", async () => {
    const { request } = buildRequest({ found: false });

    const error = await expect(
      rpsRiskReportOnAddressSelection(request, address)
    ).to.reject();
    expect(error.data.code).to.equal(404);
  });

  it("throws a 500 ControllerError when the backend reports an error", async () => {
    const { request } = buildRequest({ error: "boom" });

    const error = await expect(
      rpsRiskReportOnAddressSelection(request, address)
    ).to.reject();
    expect(error.data.code).to.equal(500);
  });
});
